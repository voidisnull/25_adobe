
from flask import Flask, request, jsonify
import services.methods as methods
import services.insights_processor as insights_processor
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

@app.get("/")
def index():
    return "Hello, World!"

@app.post("/ingest")
def jobs_ingest():
    payload = request.get_json(silent=True) or {}
    status_code, body = methods.handle_ingest_request(payload)
    return jsonify(body), status_code

@app.post("/embed")
def embed_text():
    payload = request.get_json(silent=True) or {}
    status_code, body = methods.handle_embed_request(payload)
    return jsonify(body), status_code

@app.post("/podcast")
def podcast_generate():
    payload = request.get_json(silent=True) or {}
    status_code, body = methods.handle_podcast_request(payload)
    return jsonify(body), status_code

@app.post("/insights")
def insights_generate():
    payload = request.get_json(silent=True) or {}
    file_id = payload.get("file_id")
    page_number = payload.get("page_number")
    selected_text = payload.get("selected_text")
    chunks = payload.get("chunks")
    status_code, body = insights_processor.process_insights(file_id, page_number, selected_text, chunks)
    return jsonify(body), status_code


if __name__ == "__main__":
    app.run("127.0.0.1", 5000, debug=False)
