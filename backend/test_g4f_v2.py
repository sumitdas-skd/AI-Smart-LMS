import g4f

try:
    response = g4f.ChatCompletion.create(
        model=g4f.models.gpt_4o_mini,
        provider=g4f.Provider.DuckDuckGo,
        messages=[{"role": "user", "content": "What is the capital of France?"}],
    )
    print("DuckDuckGo Response:", response)
except Exception as e:
    print("DuckDuckGo Error:", e)
