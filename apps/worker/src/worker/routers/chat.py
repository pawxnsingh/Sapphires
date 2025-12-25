from fastapi import APIRouter
from pydantic import BaseModel

from database import db

router = APIRouter()

@router.get("/")
async def chat_health():
    return {"message": "chat router is healthy"}

class StartChatRequest(BaseModel):
    prompt:  str
    projectId: str

@router.post("/start")
async def start_chat(chat: StartChatRequest):
    
    return {"fsdf":"sdf"}