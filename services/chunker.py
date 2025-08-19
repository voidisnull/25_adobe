
import re
from dotenv import load_dotenv

load_dotenv()

# tuning parameters
MIN_WORDS = 40
MAX_WORDS = 400
TARGET_WORDS = 250
OVERLAP_WORDS = 125

def split_paragraphs_with_offsets(page_text):
    text = page_text.replace("\r\n", "\n").replace("\r", "\n")
    raw_paras = re.split(r'\n\s*\n+', text)
    paras = []
    for raw in raw_paras:
        para = raw.strip()
        if not para:
            continue
        words = [w for w in para.split() if w]
        paras.append({'text': para, 'words': words})
    return paras

def paragraph_to_subchunks(para):
    words = para['words']
    n = len(words)
    if n <= MAX_WORDS:
        return [{'text': para['text']}]
    chunks = []
    step = max(1, TARGET_WORDS - OVERLAP_WORDS)
    i = 0
    while i < n:
        j = min(n, i + TARGET_WORDS)
        chunk_text = " ".join(words[i:j])
        chunks.append({'text': chunk_text})
        if j == n:
            break
        i += step
    return chunks

def chunk_page_by_paragraphs(page_text):
    paras = split_paragraphs_with_offsets(page_text)
    if not paras:
        return []

    merged = []
    i = 0
    while i < len(paras):
        p = paras[i]
        if len(p['words']) >= MIN_WORDS:
            merged.append(p)
            i += 1
            continue
        # merge with next until threshold or end
        merged_text = p['text']
        merged_words = list(p['words'])
        j = i + 1
        while j < len(paras) and len(merged_words) < MIN_WORDS:
            next_p = paras[j]
            merged_text = merged_text + "\n\n" + next_p['text']
            merged_words.extend(next_p['words'])
            j += 1
        merged.append({'text': merged_text, 'words': merged_words})
        i = j

    # now split large paragraphs
    chunks = []
    for m in merged:
        if len(m['words']) > MAX_WORDS:
            chunks.extend(paragraph_to_subchunks(m))
        else:
            chunks.append({'text': m['text']})
    return chunks