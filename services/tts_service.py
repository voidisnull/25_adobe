"""
Google Cloud Text-to-Speech implementation for podcast generation.

This module provides the necessary functionality to convert text to speech using
Google Cloud TTS API, extracted from the sample-repo implementation.
"""

import os
import requests
import logging
import base64
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logger = logging.getLogger("tts_service")

def generate_tts(text, output_file):
    """
    Generate audio from text using Google Cloud Text-to-Speech.
    
    Args:
        text (str): Text to convert to speech
        output_file (str): Output file path (MP3 format)
    
    Returns:
        str: Path to the generated audio file
    
    Raises:
        RuntimeError: If TTS synthesis fails
        ValueError: If text is empty or API key is missing
    """
    if not text or not text.strip():
        raise ValueError("Text cannot be empty")
    
    # Create output directory if it doesn't exist
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Get API key from environment
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY must be set for Google Cloud TTS")
    
    gcp_voice = os.getenv("GCP_TTS_VOICE", "en-US-Chirp-HD-D")
    language = os.getenv("GCP_TTS_LANGUAGE", "en-US")
    
    # Check if text is too long and needs to be chunked
    max_chars_env = os.getenv("TTS_CLOUD_MAX_CHARS", "5000")
    max_chars = 3000
    try:
        max_chars = int(max_chars_env)
        if max_chars <= 0:
            max_chars = None
    except (TypeError, ValueError):
        max_chars = 3000
    
    # If text is too long, split into chunks and process
    if max_chars and len(text) > max_chars:
        return _generate_chunked_tts(text, output_file, gcp_voice, language, api_key, max_chars)
    
    # Generate audio for the entire text at once
    return _generate_single_tts(text, output_file, gcp_voice, language, api_key)

def _generate_single_tts(text, output_file, voice, language, api_key):
    """Generate TTS for a single text segment."""
    try:
        logger.info(f"Generating TTS for text of length {len(text)} to {output_file}")
        
        url = "https://texttospeech.googleapis.com/v1/text:synthesize"
        headers = {
            "X-Goog-Api-Key": api_key,
            "Content-Type": "application/json"
        }
        
        payload = {
            "input": {"text": text},
            "voice": {
                "languageCode": language,
                "name": voice
            },
            "audioConfig": {
                "audioEncoding": "LINEAR16",
                "pitch": 0,
                "speakingRate": 1
            }
        }
        
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        
        # Decode the base64 audio content
        audio_content = base64.b64decode(response.json()["audioContent"])
        
        # Change file extension to .wav for LINEAR16 encoding
        output_file_path = Path(output_file)
        if output_file_path.suffix.lower() != '.wav' and payload["audioConfig"]["audioEncoding"] == "LINEAR16":
            output_file = str(output_file_path.with_suffix('.wav'))
        
        with open(output_file, "wb") as f:
            f.write(audio_content)
        
        logger.info(f"Google Cloud TTS audio saved to: {output_file}")
        return output_file
    
    except Exception as e:
        logger.exception(f"Google Cloud TTS failed: {str(e)}")
        raise RuntimeError(f"Google Cloud TTS failed: {str(e)}")

def _generate_chunked_tts(text, output_file, voice, language, api_key, max_chars):
    """Generate TTS for long text by chunking and concatenating."""
    try:
        # Import pydub for audio concatenation
        try:
            from pydub import AudioSegment
        except ImportError:
            raise RuntimeError("pydub library not installed. Please install it with: pip install pydub")
        
        # Determine if we're using LINEAR16 encoding (which needs .wav files)
        is_linear16 = True  # Default to LINEAR16 since we've updated the code
        
        chunks = _chunk_text_by_chars(text, max_chars)
        logger.info(f"Text of length {len(text)} split into {len(chunks)} chunks")
        
        output_path = Path(output_file)
        # Change extension to .wav if using LINEAR16
        if is_linear16 and output_path.suffix.lower() != '.wav':
            output_path = output_path.with_suffix('.wav')
            
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        temp_files = []
        try:
            # Generate audio for each chunk
            for index, chunk in enumerate(chunks):
                # Determine file extension based on encoding
                file_ext = '.wav' if is_linear16 else '.mp3'
                temp_file = str(output_path.parent / f".tts_chunk_{index}{file_ext}")
                _generate_single_tts(chunk, temp_file, voice, language, api_key)
                temp_files.append(temp_file)
            
            # Concatenate audio segments
            combined_audio = None
            format_type = "wav" if is_linear16 else "mp3"
            for temp_file in temp_files:
                segment = AudioSegment.from_file(temp_file, format=format_type)
                if combined_audio is None:
                    combined_audio = segment
                else:
                    combined_audio += segment
            
            # Export combined audio - use .wav for LINEAR16
            if is_linear16 and output_path.suffix.lower() != '.wav':
                output_path = output_path.with_suffix('.wav')
            
            export_format = "wav" if is_linear16 else "mp3"
            combined_audio.export(str(output_path), format=export_format)
            
            logger.info(f"Chunked Google Cloud TTS audio saved to: {output_path} ({len(chunks)} chunks)")
            return str(output_path)
        
        finally:
            # Cleanup temporary files
            for temp_file in temp_files:
                try:
                    os.remove(temp_file)
                except Exception:
                    pass
    
    except Exception as e:
        logger.exception(f"Chunked Google Cloud TTS failed: {str(e)}")
        raise RuntimeError(f"Chunked Google Cloud TTS failed: {str(e)}")

def _chunk_text_by_chars(text, max_chars):
    """Split text into chunks not exceeding max_chars, trying to split at sentence boundaries."""
    import re
    
    if len(text) <= max_chars:
        return [text]
    
    # Try to split at sentence boundaries first
    sentences = re.split(r'(?<=[.!?])\s+', text)
    chunks = []
    current = ""
    
    for sentence in sentences:
        if len(current) + len(sentence) + 1 <= max_chars:
            if current:
                current += " " + sentence
            else:
                current = sentence
        else:
            if current:
                chunks.append(current)
            
            # If sentence itself is longer than max_chars, split it into smaller parts
            if len(sentence) > max_chars:
                words = sentence.split()
                current = ""
                for word in words:
                    if len(current) + len(word) + 1 <= max_chars:
                        if current:
                            current += " " + word
                        else:
                            current = word
                    else:
                        if current:
                            chunks.append(current)
                        
                        # If word itself is too long, split it
                        if len(word) > max_chars:
                            for i in range(0, len(word), max_chars):
                                part = word[i:i + max_chars]
                                if part:
                                    chunks.append(part)
                            current = ""
                        else:
                            current = word
                
                if current:
                    chunks.append(current)
                current = ""
            else:
                current = sentence
    
    if current:
        chunks.append(current)
    
    # Ensure no empty chunks
    return [chunk for chunk in chunks if chunk.strip()]


# def test_tts():
#     """Test the TTS functionality with a sample text."""
#     test_text = "This is a test of the Google Cloud Text-to-Speech service. If you hear this message, your setup is working correctly."
#     output_file = "test_tts_output.mp3"
    
#     try:
#         api_key = os.getenv("GOOGLE_API_KEY")
#         if not api_key:
#             print("❌ GOOGLE_API_KEY is not set in environment variables")
#             return False
        
#         print(f"Generating test audio to {output_file}...")
#         output_path = generate_tts(test_text, output_file)
        
#         if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
#             print(f"✅ TTS test successful! Audio saved to: {output_path}")
#             print(f"File size: {os.path.getsize(output_path)} bytes")
#             return True
#         else:
#             print("❌ TTS test failed: Output file is empty or not created")
#             return False
#     except Exception as e:
#         print(f"❌ TTS test failed with error: {str(e)}")
#         return False

if __name__ == "__main__":
    # Set up logging
    logging.basicConfig(level=logging.INFO, 
                       format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
    # Print available information
    print("Google Cloud TTS service initialized.")
    print("This module provides text-to-speech functionality using LINEAR16 encoding.")
    print("Run test_tts_script.py to test the TTS functionality.")