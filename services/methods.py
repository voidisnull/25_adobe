
import os
import requests
import fitz          # PyMuPDF
from concurrent.futures import ThreadPoolExecutor
import psycopg2
import psycopg2.extras
from pgvector.psycopg2 import register_vector
from pgvector import Vector
import google.generativeai as genai
import logging

from services.chunker import chunk_page_by_paragraphs

from dotenv import load_dotenv

load_dotenv()

# ---- Configuration ----
POSTGRES_DSN = os.getenv("POSTGRES_DSN")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
MAX_IN_MEMORY_BYTES = 50 * 1024 * 1024  # keep small for memory safety
DOWNLOAD_TIMEOUT = 15
EMBED_WORKERS = 4
EMBED_MODEL = "models/embedding-001"  # Google's embedding model

if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

EMBED_EXECUTOR = ThreadPoolExecutor(max_workers=EMBED_WORKERS)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ingest")

def get_db_conn():
    conn = psycopg2.connect(POSTGRES_DSN)
    register_vector(conn)
    return conn

def stream_url_to_bytes(url, max_bytes=MAX_IN_MEMORY_BYTES, timeout=DOWNLOAD_TIMEOUT):
    resp = requests.get(url, stream=True, timeout=timeout)
    if resp.status_code != 200:
        raise RuntimeError(f"download failed: status {resp.status_code}")
    buf = bytearray()
    total = 0
    for chunk in resp.iter_content(chunk_size=8192):
        if not chunk:
            continue
        total += len(chunk)
        if total > max_bytes:
            raise ValueError("file too large to hold in memory")
        buf.extend(chunk)
    return bytes(buf)

def compute_embedding(text: str):
    if not GOOGLE_API_KEY:
        raise RuntimeError("GOOGLE_API_KEY not set; cannot compute embeddings")
    
    # Generate embeddings using Google's embedding model
    result = genai.embed_content(
        model=EMBED_MODEL,
        content=text,
        task_type="RETRIEVAL_QUERY"
    )
    
    # Extract the embedding values
    return result["embedding"]

def compute_summary(text: str) -> str:
    if not GOOGLE_API_KEY:
        raise RuntimeError("GOOGLE_API_KEY not set; cannot generate summary")

    # Build a concise summarization prompt targeting 1–2 lines
    prompt = (
        "Summarize the following content in 1 to 2 concise sentences. "
        "Output only the summary text without titles, bullets, or extra formatting.\n\n"
        "Content:\n" + text
    )

    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash"
    )

    response = model.generate_content(prompt)
    summary_text = (response.text or "").strip()

    # Simple cleanup: remove surrounding code fences if present
    if summary_text.startswith("```") and summary_text.endswith("```"):
        summary_text = summary_text[3:-3].strip()

    return summary_text

def process_chunk_and_store_embedding(chunk_id):
    conn = None
    try:
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT id, text, embedding FROM chunks WHERE id = %s", (chunk_id,))
        row = cur.fetchone()
        if not row:
            logger.warning("process_chunk: chunk id %s not found", chunk_id)
            return
        if row.get("embedding") is not None:
            logger.info("process_chunk: chunk id %s already has embedding", chunk_id)
            return
        text = row["text"] ################### 
        # Try summarization first, but do not fail the whole operation if it errors
        summary_text = None
        try:
            summary_text = compute_summary(text)
        except Exception as summary_err:
            logger.exception("process_chunk: summary generation failed for chunk %s: %s", chunk_id, summary_err)

        emb = compute_embedding(text)               # may raise
        v = Vector(emb)
        if summary_text is not None:
            cur.execute("UPDATE chunks SET embedding = %s, summary = %s WHERE id = %s", (v, summary_text, chunk_id))
        else:
            cur.execute("UPDATE chunks SET embedding = %s WHERE id = %s", (v, chunk_id))
        conn.commit()
        logger.info("process_chunk: wrote embedding for chunk %s", chunk_id)
    except Exception as e:
        if conn:
            conn.rollback()
        logger.exception("process_chunk: failed for chunk %s: %s", chunk_id, e)
    finally:
        if conn:
            conn.close()

def handle_ingest_request(payload):
    url = payload.get("url")
    file_id = payload.get("file_id")

    conn = None
    doc = None
    try:
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        if not file_id:
            return 400, {"error": "no file_id provided"}

        if not url:
            return 400, {"error": "no url provided to download PDF for ingestion"}

        # download PDF bytes and open with PyMuPDF
        pdf_bytes = stream_url_to_bytes(url)
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        page_count = doc.page_count

        # update num_pages in files
        cur.execute("UPDATE files SET num_pages = %s WHERE id = %s", (page_count, file_id))
        conn.commit()

        inserted_chunk_ids = []
        for pno in range(doc.page_count):
            page = doc.load_page(pno)
            page_text = page.get_textpage().extractText()
            if not page_text or not page_text.strip():
                continue
            # chunk by paragraph (chunker returns list of dicts or texts)
            chunks = chunk_page_by_paragraphs(page_text)
            for ch in chunks:
                # ch is a dict with 'text' at minimum
                text = ch["text"]
                cur.execute(
                    "INSERT INTO chunks (file_id, text, page_number) VALUES (%s, %s, %s) RETURNING id",
                    (file_id, text, pno + 1)
                )
                cid = cur.fetchone()["id"]
                inserted_chunk_ids.append(cid)
        conn.commit()
        doc.close()
        doc = None

        for cid in inserted_chunk_ids:
            EMBED_EXECUTOR.submit(process_chunk_and_store_embedding, cid)

        return 202, {"status": "ingest_started", "file_id": file_id, "chunks_created": len(inserted_chunk_ids)}

    except ValueError as e:
        if conn:
            conn.rollback()
        return 413, {"error": str(e)}
    except Exception as e:
        if conn:
            conn.rollback()
        logger.exception("ingest failed")
        return 500, {"error": f"ingest failed: {e}"}
    finally:
        if doc:
            try:
                doc.close()
            except Exception:
                pass
        if conn:
            conn.close()

def handle_embed_request(payload):
    """
    payload: { "text": "<selection text>" }
    returns: (status_code:int, body:dict)
    """
    text = payload.get("text")
    if not text:
        return 400, {"error": "missing 'text' in request body"}
    try:
        emb = compute_embedding(text)  # list[float]
        return 200, {"embedding": emb}
    except Exception as e:
        logger.exception("embed error")
        return 500, {"error": f"embedding failed: {e}"}

def handle_podcast_request(payload):
    """
    Podcast generator.

    payload expected keys:
      - podcast_id (int)
      - selection_text (str)
      - chunks (list of chunk dicts)

    Behavior:
      - Build a prompt from selection text and provided chunks
      - Use Gemini to generate a podcast script
      - Convert script to audio using Google Cloud TTS
      - Save the audio file locally
      - Return {"audio_url": "<url>"}
    """
    podcast_id = payload.get("podcast_id")
    selection_text = payload.get("selection_text", "")
    chunks = payload.get("chunks", [])
    
    if not podcast_id:
        return 400, {"error": "missing podcast_id in request"}
        
    logger.info(f"Processing podcast request for podcast_id: {podcast_id}")
    
    try:
        # 1. Format content into a prompt for Gemini
        prompt_content = _format_podcast_prompt(selection_text, chunks)
        
        # 2. Generate podcast script using Gemini
        script = _generate_podcast_script(prompt_content)
        if not script:
            raise RuntimeError("Failed to generate podcast script")
            
        logger.info(f"Generated script for podcast_id: {podcast_id}")
        
        # 3. Generate audio using Google Cloud TTS
        output_filename = f"{podcast_id}.wav"
        
        # Create audio directory if it doesn't exist
        audio_dir = os.path.join(os.getcwd(), "data", "podcasts")
        os.makedirs(audio_dir, exist_ok=True)

        output_path = os.path.join(audio_dir, output_filename)
        
        audio_path = _generate_audio_from_script(script, output_path)
        if not audio_path:
            raise RuntimeError("Failed to generate audio")
            
        logger.info(f"Generated audio for podcast_id: {podcast_id} at {audio_path}")
        return 200, {}
        
    except Exception as e:
        logger.exception(f"Podcast generation failed: {str(e)}")
        return 500, {"error": f"Podcast generation failed: {str(e)}"}

def _format_podcast_prompt(selection_text, chunks):
    """Format selection text and chunks into a prompt for Gemini."""
    # Combine all chunk texts
    chunk_texts = [chunk.get("text", "") for chunk in chunks if chunk.get("text")]
    
    # Build prompt
    prompt = "Create a single-person podcast script based on the following content.\n\n"
    
    if selection_text:
        prompt += f"Main focus:\n{selection_text}\n\n"
        
    if chunk_texts:
        prompt += "Additional context:\n"
        for i, text in enumerate(chunk_texts, 1):
            prompt += f"Excerpt {i}:\n{text}\n\n"
    
    # Using f-string to properly insert the selection_text variable
    prompt += f"""
Instructions:
1. Write an engaging, conversational podcast script for a single speaker
2. Focus on the main topics from the provided content
3. Use a friendly, informative tone
4. Include a brief introduction and conclusion
5. Keep the script between 2-5 minutes when read aloud depending on the Main Focus provided
6. IMPORTANT: Generate ONLY the script itself - no title, no notes, no metadata
7. Do not include any disclaimers, meta instructions, formatting tags, or introductory text
8. Do not include phrases like "here's the script" or similar prefacing text
9. Start directly with the podcast content and end with a conclusion
10. The output must contain ONLY the content that would be spoken by the podcast host
11. Your script should be a maximum of 3000 characters only. Make sure you concluse before you reach the limit. THIS IS AN IMPORTANT CONSTRAINT, PLEASE DO NOT IGNORE.
"""
    
    return prompt

def _generate_podcast_script(prompt):
    """Generate podcast script using Gemini."""
    if not GOOGLE_API_KEY:
        raise RuntimeError("GOOGLE_API_KEY not set; cannot generate podcast script")
    
    try:
        # Configure the Gemini model
        generation_config = {
            "temperature": 0.8,
            "top_p": 0.95,
            "top_k": 40,
        }
        
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            generation_config=generation_config
        )
        
        # Generate the podcast script
        response = model.generate_content(prompt)
        
        # Extract the script text
        script = response.text
        
        # Clean up any potential metadata or formatting
        script = _clean_script_output(script)
        
        return script
    except Exception as e:
        logger.exception(f"Error generating podcast script: {str(e)}")
        return None

def _clean_script_output(script_text):
    """
    Clean up the script text to ensure it only contains the actual podcast content.
    Removes any potential metadata, headings, or formatting artifacts.
    """
    if not script_text:
        return script_text
        
    # Remove common prefixes that models sometimes add
    prefixes_to_remove = [
        "Podcast Script:", "Script:", "Here's the podcast script:", 
        "Here is the podcast script:", "Here's a podcast script:", 
        "Podcast:", "Transcript:", "Here's the script:",
        "Below is a podcast script:", "The podcast script:"
    ]
    
    cleaned_text = script_text
    for prefix in prefixes_to_remove:
        if cleaned_text.startswith(prefix):
            cleaned_text = cleaned_text[len(prefix):].strip()
    
    # Remove any markdown formatting
    if cleaned_text.startswith("```") and cleaned_text.endswith("```"):
        cleaned_text = cleaned_text[3:-3].strip()
    
    # Remove tags like <podcast> or [podcast]
    if cleaned_text.startswith("<") and ">" in cleaned_text:
        first_tag_end = cleaned_text.find(">")
        if first_tag_end > 0:
            cleaned_text = cleaned_text[first_tag_end + 1:].strip()
    
    if cleaned_text.startswith("[") and "]" in cleaned_text:
        first_tag_end = cleaned_text.find("]")
        if first_tag_end > 0:
            cleaned_text = cleaned_text[first_tag_end + 1:].strip()
    
    # Remove any trailing notes or metadata
    endings_to_remove = [
        "End of script.", "End of podcast script.", 
        "End of transcript.", "End of podcast.",
        "[End]", "<End>", "//End", "-- End --"
    ]
    
    for ending in endings_to_remove:
        if cleaned_text.endswith(ending):
            cleaned_text = cleaned_text[:-len(ending)].strip()
    
    return cleaned_text

def _generate_audio_from_script(script, output_file):
    """Generate audio from script using Google Cloud TTS."""
    try:
        # Import our custom TTS service
        from tts_service import generate_tts
        
        # Generate audio using Google Cloud TTS
        audio_path = generate_tts(script, output_file)
        
        return audio_path
    except Exception as e:
        logger.exception(f"Error generating audio: {str(e)}")
        return None