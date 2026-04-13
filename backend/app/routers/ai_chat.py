"""
Backend AI Chat Router — Free provider via g4f
Uses Yqcloud (free, no auth) with certifi SSL fix for macOS
"""
import os
import certifi

# Fix macOS SSL certificate issue for aiohttp/g4f
os.environ["SSL_CERT_FILE"] = certifi.where()
os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import g4f
from g4f.client import Client
import g4f.Provider as Provider
import signal
import logging
import asyncio

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai", tags=["AI Chat"])

# Conversation history stored per-session (in-memory, per server restart)
# For production, use Redis or DB
_sessions: dict = {}

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"
    history: Optional[List[ChatMessage]] = []

class ChatResponse(BaseModel):
    reply: str
    ok: bool
    provider: str

SYSTEM_PROMPT = """You are an AI Study Assistant for engineering college students at ABIT College.
You help with academic subjects: Computer Science, Mathematics, Physics, Electronics, and all engineering topics.
You can also help with programming, career advice, and study tips.
Be helpful, concise, and educational. Format your responses clearly using bullet points and numbered lists when applicable."""

# Providers in order of preference (working, free, no auth needed)
FREE_PROVIDERS = [
    (Provider.Yqcloud, "gpt-4o"),
    (Provider.Yqcloud, "gpt-4"),
    (Provider.Yqcloud, "gpt-3.5-turbo"),
]

async def call_ai_provider(messages: list, provider, model: str, timeout_sec: int = 20) -> str:
    """Call a g4f provider asynchronously with timeout."""
    loop = asyncio.get_event_loop()
    
    def sync_call():
        try:
            client = Client(provider=provider)
            resp = client.chat.completions.create(
                model=model,
                messages=messages,
                timeout=timeout_sec - 2,
            )
            return resp.choices[0].message.content
        except Exception as e:
            raise e
    
    # Run sync g4f call in executor to not block event loop
    return await asyncio.wait_for(
        loop.run_in_executor(None, sync_call),
        timeout=timeout_sec
    )

@router.post("/chat", response_model=ChatResponse)
async def ai_chat(req: ChatRequest):
    """
    Proxy chat endpoint using free g4f providers.
    Bypasses the exhausted Gemini API quota.
    """
    # Build messages list
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    
    # Add conversation history (last 10 exchanges max)
    for msg in req.history[-10:]:
        messages.append({"role": msg.role, "content": msg.content})
    
    # Add new user message
    messages.append({"role": "user", "content": req.message})
    
    last_error = None
    
    for provider, model in FREE_PROVIDERS:
        provider_name = provider.__name__
        try:
            logger.info(f"Trying provider: {provider_name} with model: {model}")
            reply = await call_ai_provider(messages, provider, model, timeout_sec=20)
            
            if reply and len(reply.strip()) > 0:
                logger.info(f"Success via {provider_name}")
                return ChatResponse(
                    reply=reply.strip(),
                    ok=True,
                    provider=provider_name
                )
        except asyncio.TimeoutError:
            last_error = f"{provider_name}: timed out"
            logger.warning(f"{provider_name} timed out")
        except Exception as e:
            last_error = f"{provider_name}: {str(e)}"
            logger.warning(f"{provider_name} failed: {e}")
    
    # All providers failed
    raise HTTPException(
        status_code=503,
        detail=f"All AI providers unavailable. Last error: {last_error}"
    )

@router.get("/health")
async def ai_health():
    """Check if AI chat backend is reachable."""
    return {"status": "ok", "providers": [p.__name__ for p, _ in FREE_PROVIDERS]}
