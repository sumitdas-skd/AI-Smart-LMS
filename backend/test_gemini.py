import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

key = os.getenv("GEMINI_API_KEY")
print(f"Key used: {key[:10]}...")

genai.configure(api_key=key)
model = genai.GenerativeModel('gemini-1.5-flash')

try:
    response = model.generate_content("Hello, write a 1 line C program to print 1.")
    print("Response successful:")
    print(response.text)
except Exception as e:
    print(f"Error: {e}")
