import nltk
import spacy
from keybert import KeyBERT
from sentence_transformers import SentenceTransformer

# ---------------- NLTK DOWNLOADS ----------------
nltk.download('wordnet', quiet=True)
nltk.download('punkt_tab', quiet=True)
nltk.download('averaged_perceptron_tagger_eng', quiet=True)

# ---------------- PRELOAD ML MODELS ----------------
nlp = None
kw_model = None
semantic_model = None

print("Loading ATS Models...")
try:
    nlp = spacy.load("en_core_web_sm")
except Exception as e:
    print(f"Warning: spacy model failed to load: {e}")

try:
    kw_model = KeyBERT()
except Exception as e:
    print(f"Warning: KeyBERT failed to load: {e}")

try:
    semantic_model = SentenceTransformer('all-MiniLM-L6-v2')
    print("ATS Models Loaded Successfully.")
except Exception as e:
    print(f"Warning: SentenceTransformer failed to load: {e}")

# ---------------- MATCH SCORE MODEL ----------------

match_model = None

def get_match_model():
    global match_model
    if match_model is None:
        print("Loading Match Score Model (Local: all-MiniLM-L6-v2)...")
        # Switch to Bi-Encoder for document similarity instead of QA CrossEncoder
        match_model = SentenceTransformer('all-MiniLM-L6-v2') 
        print("Model Loaded Successfully.")
    return match_model

# Initialize on startup
try:
    get_match_model()
except Exception as e:
    print(f"Warning: Model failed to load on startup: {e}")
