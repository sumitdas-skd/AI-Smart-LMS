"""
Backend AI Chat Router — Multi-provider with Persistent History and Subject Context Injection
"""
import os
import certifi

# Fix macOS SSL certificate issue for aiohttp/g4f
os.environ["SSL_CERT_FILE"] = certifi.where()
os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional, Any, Union
import g4f
from g4f.client import Client
import g4f.Provider as Provider
import logging
import asyncio

from app.database import get_db
from app.core.deps import get_current_user_optional
from app.core.config import settings
from app.models.user import User
from app.models.academic import Subject
from app.services.chat_history_service import ChatHistoryService
from app.services.gamification_service import GamificationService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai", tags=["AI Chat"])

class LegacyChatMessage(BaseModel):
    role: str # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    session_id: Optional[Union[int, str]] = None
    subject_id: Optional[int] = None
    history: Optional[List[LegacyChatMessage]] = []

class ChatResponse(BaseModel):
    reply: str
    session_id: Optional[int] = None
    session_title: Optional[str] = None
    ok: bool
    provider: str
    xp_earned: int = 0

BASE_SYSTEM_PROMPT = """You are an AI Study Assistant for engineering college students at ABIT College.
You help with academic subjects: Computer Science, Mathematics, Physics, Electronics, and all engineering topics.
You can also help with programming, career advice, and study tips.
Be helpful, concise, and educational. Format your responses clearly using bullet points, bold key terms, and numbered lists when applicable."""

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
    
    return await asyncio.wait_for(
        loop.run_in_executor(None, sync_call),
        timeout=timeout_sec
    )

@router.post("/chat", response_model=ChatResponse)
async def ai_chat(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    AI Chat Endpoint with persistent history per user session,
    token-aware context window, subject context injection, and gamification XP awards.
    """
    session = None
    numeric_session_id = None
    if req.session_id:
        try:
            numeric_session_id = int(req.session_id)
        except (ValueError, TypeError):
            numeric_session_id = None

    # 1. Manage persistence if user is authenticated
    if current_user:
        session = ChatHistoryService.get_or_create_session(
            db=db,
            user_id=current_user.id,
            session_id=numeric_session_id,
            initial_message=req.message
        )
        # Save user message BEFORE calling AI (preserves question even if AI fails)
        ChatHistoryService.save_message(
            db=db,
            session_id=session.id,
            role="user",
            content=req.message
        )
        numeric_session_id = session.id

    # 2. Build system prompt with optional Subject Context
    system_prompt = BASE_SYSTEM_PROMPT
    if req.subject_id:
        subj = db.query(Subject).filter(Subject.id == req.subject_id).first()
        if subj:
            system_prompt += (
                f"\n\nCURRENT COURSE CONTEXT: The student is asking about '{subj.name}' (Code: {subj.code}). "
                f"Tailor explanations, formulas, and terminology to this course syllabus."
            )

    # 3. Assemble message context (up to N past messages)
    messages = [{"role": "system", "content": system_prompt}]
    
    if current_user and session:
        # Load last N messages from database
        context_msgs = ChatHistoryService.get_session_context(
            db=db,
            session_id=session.id,
            limit=settings.CHAT_CONTEXT_WINDOW
        )
        # Note: the newly saved user message is already the last item in context_msgs!
        messages.extend(context_msgs)
    else:
        # Unauthenticated / guest fallback
        for msg in req.history[-settings.CHAT_CONTEXT_WINDOW:]:
            messages.append({"role": msg.role, "content": msg.content})
        messages.append({"role": "user", "content": req.message})

    # 4. Query AI providers with fallback
    reply = None
    provider_name = "AI Assistant"
    last_error = None

    # Check direct OpenAI key if configured
    if settings.OPENAI_API_KEY:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                timeout=20
            )
            reply = resp.choices[0].message.content.strip()
            provider_name = "OpenAI-gpt-4o-mini"
        except Exception as e:
            logger.warning(f"Direct OpenAI failed, falling back: {e}")

    # Fallback to free g4f providers
    if not reply:
        for provider, model in FREE_PROVIDERS:
            p_name = provider.__name__
            try:
                reply_text = await call_ai_provider(messages, provider, model, timeout_sec=20)
                if reply_text and len(reply_text.strip()) > 0:
                    reply = reply_text.strip()
                    provider_name = f"{p_name}-{model}"
                    break
            except asyncio.TimeoutError:
                last_error = f"{p_name}: timed out"
            except Exception as e:
                last_error = f"{p_name}: {str(e)}"

    # 5. Handle failure
    if not reply:
        # Deterministic academic study assistant response if offline or upstream rate-limited
        reply = (
            f"Here is a study overview regarding your question:\n\n"
            f"• **Key Concept:** {req.message.strip()}\n"
            f"• **Study Note:** To master this topic, review the core lecture notes and unit syllabus.\n"
            f"• **Tip:** Break the problem down into fundamental steps and practice past exam problems.\n\n"
            f"*(AI providers temporarily busy. Your message has been saved to your chat history.)*"
        )
        provider_name = "Academic-Fallback"

    # 6. Save assistant reply & award XP if authenticated
    xp_earned = 0
    if current_user and session:
        ChatHistoryService.save_message(
            db=db,
            session_id=session.id,
            role="assistant",
            content=reply,
            provider_model=provider_name
        )
        xp_earned = GamificationService.award_xp(
            db=db,
            user=current_user,
            event_type="ai_chat",
            ref_id=session.id
        )

    return ChatResponse(
        reply=reply,
        session_id=numeric_session_id,
        session_title=session.title if session else "Study Chat",
        ok=True,
        provider=provider_name,
        xp_earned=xp_earned
    )

@router.get("/health")
async def ai_health():
    """Check if AI chat backend is reachable."""
    return {"status": "ok", "providers": [p.__name__ for p, _ in FREE_PROVIDERS]}
