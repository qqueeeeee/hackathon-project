import os
from dotenv import load_dotenv

load_dotenv()

_client = None

def get_client():
    global _client
    if _client is None:
        from groq import Groq
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY not found in environment")
        _client = Groq(api_key=api_key)
    return _client

def chat(system: str, user: str, temperature: float = 0.7) -> str:
    client = get_client()
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile", #openai/gpt-oss-120b
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user}
        ],
        temperature=temperature
    )
    return response.choices[0].message.content
