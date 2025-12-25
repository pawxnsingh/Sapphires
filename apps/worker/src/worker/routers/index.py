from fastapi import APIRouter
from worker.routers import chat

router = APIRouter()

router.include_router(chat.router, prefix="/chat", tags=["agentic", "chat"])