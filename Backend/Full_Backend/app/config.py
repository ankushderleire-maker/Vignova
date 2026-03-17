import os
from dotenv import load_dotenv
import google.generativeai as genai

# ---------------- CONFIGURATION ----------------

load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.5-flash") # changed to 1.5-flash as 2.5 isn't standard yet, or stick to your working model
