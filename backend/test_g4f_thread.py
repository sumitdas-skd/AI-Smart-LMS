import threading
from g4f.client import Client

def test():
    client = Client()
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Hello"}],
        )
        print("Thread Output:", response.choices[0].message.content)
    except Exception as e:
        print("Thread Error:", type(e).__name__, str(e))

t = threading.Thread(target=test)
t.start()
t.join()
