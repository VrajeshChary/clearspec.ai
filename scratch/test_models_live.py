import os
from dotenv import load_dotenv
load_dotenv(".env")
key = os.getenv("GEMINI_API_KEY")

from google import genai
from google.genai import types

client = genai.Client(api_key=key, http_options={"api_version": "v1beta"})

print("--- Testing gemini-3.8-flash generate_content ---")
try:
    r = client.models.generate_content(
        model="gemini-3.8-flash",
        contents="Respond with pure JSON: {\"status\": \"ok\"}",
        config=types.GenerateContentConfig(response_mime_type="application/json", temperature=0.0)
    )
    print("gemini-3.8-flash SUCCESS:", r.text.strip())
except Exception as e:
    print("gemini-3.8-flash error:", type(e), e)

print("\n--- Testing gemini-nano-banana-2.1 generate_content ---")
try:
    r_img = client.models.generate_content(
        model="gemini-nano-banana-2.1",
        contents="A sleek modern dark-mode 16:9 infographic card for export compliance hold",
        config=types.GenerateContentConfig(response_modalities=["IMAGE"])
    )
    print("nano-banana SUCCESS! Candidates:", len(r_img.candidates))
    for p in r_img.candidates[0].content.parts:
        if p.inline_data:
            print("Got image inline_data! mime:", p.inline_data.mime_type, "size:", len(p.inline_data.data))
except Exception as e:
    print("nano-banana error:", type(e), e)
