import nltk
import spacy
from keybert import KeyBERT
from sentence_transformers import SentenceTransformer

# ---------------- NLTK DOWNLOADS ----------------
nltk.download('wordnet',   quiet=True)
nltk.download('punkt_tab', quiet=True)
nltk.download('averaged_perceptron_tagger_eng', quiet=True)

# ---------------- PRELOAD ML MODELS ----------------
# All models are loaded exactly ONCE at startup.
# Previously, SentenceTransformer('all-MiniLM-L6-v2') was instantiated twice
# (once as `semantic_model` and again inside get_match_model()), wasting ~90 MB
# per worker.  Now there is a single shared instance used by all callers.

nlp          = None
kw_model     = None
semantic_model = None   # shared by ats_helpers AND score route

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


def get_match_model() -> SentenceTransformer:
    """Return the shared semantic model (no second instantiation)."""
    return semantic_model
