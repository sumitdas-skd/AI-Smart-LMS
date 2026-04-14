import g4f

print("Available providers:")
for provider in g4f.Provider.__providers__:
    if provider.working:
        print(provider.__name__)
