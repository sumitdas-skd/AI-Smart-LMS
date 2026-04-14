import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.chatbot import ChatbotService

if __name__ == "__main__":
    response = ChatbotService.get_ai_response("Hello, are you working?")
    print(response)
