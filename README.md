# 📚 PDF Intelligence Platform

A platform to **upload, explore, and connect knowledge across PDFs** with advanced search, contextual insights, and podcast-style content consumption.  

---

## 🚀 Core Features (Mandatory)

### 📂 PDF Handling
- **Bulk Upload**: Upload multiple PDFs at once (represents *past documents* you’ve read).  
- **Fresh Upload**: Open an additional new PDF (represents the *current document* you’re reading).  
- **High-Fidelity Display**: Render PDFs with accurate formatting (PDF Embed API preferred).  

### 🔗 Connecting the Dots
- **Relevant Sections**: Identify & highlight up to **5 highly relevant sections** across PDFs.  
- **Section Definition**: Headings + their content (logical chunks of the document).  
- **Snippet Preview**: Show **2–4 sentence extracts** from relevant sections (like search-engine results).  
- **Deep Linking**: Clicking a snippet opens the corresponding PDF and jumps to the exact section.  

### ⚡ Speed & Performance
- **Fast Retrieval**: Related sections/snippets load quickly for seamless user engagement.  
- **Efficient Ingestion**: Past documents are processed within earlier round performance limits.  

---

## 🌟 Follow-On Features (Optional)

### 💡 Insights Bulb (+5 points)
- LLM-powered insights across PDFs.  
- Summaries, contextual connections, and knowledge synthesis from multiple documents.  

---

## 🎧 Main User Features

1. **Smart Search** – Search across all your documents with contextual snippets.  
2. **Podcast** – Generate and listen to audio summaries for your PDFs.  
3. **Insights** – AI-powered insights that connect the dots across your reading history.  

---

## 🛠️ Tech Stack

- **Frontend**: React (TypeScript + TSX)  
- **Backend**: GoLang & Python  
- **Database**: PostgreSQL  
- **Deployment**: Docker (command below)  

---

## 🐳 Run with Docker

```bash
docker run -e ADOBE_EMBED_API_KEY=<> -e GOOGLE_API_KEY=<> -p 8080:8080 -p 8081:8081 <image_name>
```


```bash
 ADOBE embeded api : 5da540d215fd4f1a9cd89f97a45bae83
```

## Our Video Link 

 In case of some any issue with docker please consider this video

```bash 
https://drive.google.com/drive/folders/1BDh66AfRQ__DbGhgpxGt4lYS0AZfLHY-?usp=sharing
```
