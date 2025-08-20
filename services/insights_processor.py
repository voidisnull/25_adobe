import os
import json
import logging
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("insights_processor")

# Initialize Gemini API
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

def process_insights(file_id, page_number, selected_text, chunks):
    """
    Process insights to generate a summary and rank chunks by relevance.
    
    Parameters:
    -----------
    file_id : int
        The ID of the file being analyzed
    page_number : int
        The page number in the document
    selected_text : str
        The text selected by the user for analysis
    chunks : list
        List of chunk objects with format:
        {
            "id": int,
            "file_id": int,
            "page_number": int,
            "summary": str,
            "text": str
        }
    
    Returns:
    --------
    dict
        A dictionary with the format:
        {
            "summary": str,
            "results": list[chunk_objects]
        }
        Where results are the chunks sorted by relevance to the selected text
    """
    try:
        # Validate required inputs
        if not selected_text or selected_text.strip() == "":
            logger.warning("Missing or empty selected_text")
            return {"summary": "", "results": chunks}
            
        if not chunks:
            logger.info("No chunks provided to analyze")
            return {"summary": "", "results": []}
            
        # Log processing start
        logger.info(f"Processing insights for file_id: {file_id}, page: {page_number}, chunks: {len(chunks)}")
            
        # Generate overall summary
        summary = generate_overall_summary(selected_text, chunks)
        
        # Rank chunks by relevance
        ranked_chunks = rank_chunks_by_relevance(selected_text, chunks)
        
        return 200, {
            "summary": summary,
            "results": ranked_chunks
        }
        
    except Exception as e:
        logger.exception(f"Insights generation failed: {str(e)}")
        return 200, {"summary": "", "results": chunks}

def generate_overall_summary(selected_text, chunks):
    """
    Generate an overall summary based on the selected text and chunks.
    """
    if not GOOGLE_API_KEY:
        logger.warning("GOOGLE_API_KEY not set; cannot generate summary")
        return ""
        
    try:
        # Extract chunk texts similar to podcast function
        chunk_texts = [chunk.get("text", "") for chunk in chunks[:10] if chunk.get("text")]
        
        # Build prompt
        prompt = (
            "Create a comprehensive summary of the following content, focusing on the selected text. "
            "The summary should be 2-3 sentences and capture the key insights.\n\n"
            f"Selected Text:\n{selected_text}\n\n"
        )
        
        if chunk_texts:
            prompt += "Additional Context:\n"
            for i, text in enumerate(chunk_texts, 1):
                prompt += f"Excerpt {i}:\n{text[:500]}...\n\n"  # Truncate long chunks
                
        prompt += (
            "Instructions:\n"
            "1. Focus on the main themes and insights related to the selected text\n"
            "2. Create a concise sentence summary\n"
            "3. Ensure the summary is informative and provides value\n"
            "4. Do not include any meta-information, just the summary itself\n"
        )
        
        # Configure Gemini
        generation_config = {
            "temperature": 0.2,
            "top_p": 0.9,
            "top_k": 40,
        }
        
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            generation_config=generation_config,
        )
        
        # Generate summary
        response = model.generate_content(prompt)
        summary_text = (response.text or "").strip()
        
        # Clean up the summary
        if summary_text.startswith("```") and summary_text.endswith("```"):
            summary_text = summary_text[3:-3].strip()
            
        # Enforce length limits
        lines = [ln.strip() for ln in summary_text.splitlines() if ln.strip()]
        if not lines:
            return ""
        return " ".join(lines)
        
    except Exception as e:
        logger.exception(f"Error generating overall summary: {str(e)}")
        return ""

def rank_chunks_by_relevance(selected_text, chunks):
    """
    Rank chunks by relevance to the selected text using Gemini.
    Returns the sorted list of chunks.
    """
    if not GOOGLE_API_KEY:
        logger.warning("GOOGLE_API_KEY not set; cannot rank chunks")
        return chunks
        
    try:
        # Log the ranking request
        logger.info(f"Ranking {len(chunks)} chunks by relevance to selected text")
        
        # Create a mapping of chunk IDs to chunks for easy reference
        chunks_by_id = {str(chunk.get("id")): chunk for chunk in chunks}
        chunk_ids = list(chunks_by_id.keys())
        
        # Build a list of short chunk samples for the prompt
        chunk_samples = []
        for chunk_id, chunk in chunks_by_id.items():
            # Get the first 200 characters of the text as a sample
            text = chunk.get("text", "")
            text_sample = text[:200] + "..." if len(text) > 200 else text
            chunk_samples.append(f"ID: {chunk_id}\nSample: {text_sample}\n")
        
        # Build prompt for ranking - similar pattern to podcast prompt
        prompt = (
            "Rank the following excerpts by their relevance to the selected text. "
            "Return ONLY a JSON array of excerpt IDs in descending order of relevance.\n\n"
            f"Selected Text:\n{selected_text}\n\n"
            "Excerpts to rank:\n"
        )
        
        # Add chunks to prompt (limited to avoid token limits)
        for i, sample in enumerate(chunk_samples[:30], 1):  # Limit to 30 chunks
            prompt += f"Excerpt {i}:\n{sample}\n"
            
        prompt += (
            "\nInstructions:\n"
            "1. Analyze each excerpt's relevance to the selected text\n"
            "2. Return ONLY a JSON array of excerpt IDs in decreasing order of relevance\n"
            "3. The most relevant excerpt should be first in the array\n"
            "4. Include all excerpt IDs in the response\n"
            "5. Do not include any explanations, just the JSON array\n"
            "6. Format: [\"id1\", \"id2\", \"id3\", ...]\n"
        )
        
        # Configure Gemini - using similar configuration to podcast generation
        generation_config = {
            "temperature": 0.1,  # Low temperature for more deterministic output
            "top_p": 0.9,
            "top_k": 40,
        }
        
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            generation_config=generation_config,
        )
        
        response = model.generate_content(prompt)
        result_text = (response.text or "").strip()
        
        if result_text.startswith("```json"):
            result_text = result_text[7:]
        if result_text.startswith("```"):
            result_text = result_text[3:]
        if result_text.endswith("```"):
            result_text = result_text[:-3]
            
        result_text = result_text.strip()
        
        # Parse the JSON array
        try:
            ranked_ids = json.loads(result_text)
            
            # Ensure ranked_ids is a list
            if not isinstance(ranked_ids, list):
                logger.warning("Ranked IDs is not a list, using original order")
                return chunks
                
            # Check for missing IDs and append them at the end
            ranked_id_set = set(str(id) for id in ranked_ids)
            missing_ids = [id for id in chunk_ids if id not in ranked_id_set]
            
            # Append missing IDs at the end
            complete_ranked_ids = ranked_ids + missing_ids
            
            # Log the ranking results
            logger.info(f"Successfully ranked chunks: {len(ranked_ids)} ranked, {len(missing_ids)} missing")
            
            # Sort chunks based on the ranking
            sorted_chunks = []
            for chunk_id in complete_ranked_ids:
                if str(chunk_id) in chunks_by_id:
                    sorted_chunks.append(chunks_by_id[str(chunk_id)])
            
            return sorted_chunks
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse ranked IDs JSON: {e}")
            logger.error(f"Raw response: {result_text}")
            return chunks
        
    except Exception as e:
        logger.exception(f"Error ranking chunks: {str(e)}")
        return chunks
