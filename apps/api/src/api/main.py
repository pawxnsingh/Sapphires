from fastapi import FastAPI, Depends
from pydantic import BaseModel
from .authmiddleware import auth_middleware
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from datetime import datetime
from database import db

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CreateProjectRequest(BaseModel):
    projname: str


class MessageResponse(BaseModel):
    id: str
    type: str
    content: str
    createdAt: datetime


class ConversationResponse(BaseModel):
    messages: List[MessageResponse]


@app.get("/")
def read_root():
    return {"message": "keep the hope alive!!!!"}


# create a new project
@app.post("/project")
async def create_project(
    request: CreateProjectRequest, userId: str = Depends(auth_middleware)
):
    project = db.project.create(
        data={"userId": userId, "description": request.projname}
    )
    return {"projectId": project.id}


# get all the list of projects
@app.get("/projects")
async def get_projects(user_id: str = Depends(auth_middleware)):
    allProjects = db.project.find_many(where={"userId": user_id})
    return allProjects


# fetch conversation history (user + ai prompts) for a project the user owns
@app.get("/conversation/{projectId}", response_model=ConversationResponse)
async def get_conversation(project_id: str, user_id: str = Depends(auth_middleware)):
    try:
        if not project_id:
            return JSONResponse(status_code=400, content={"error": "projectId missing"})

        project = await db.project.find_first(
            where={"id": project_id, "userId": user_id}
        )
        if not project:
            return JSONResponse(status_code=404, content={"error": "project not found"})

        # fetch all prompts for the project
        prompts = await db.prompt.find_many(
            where={"projectId": project_id}, order={"createdAt": "asc"}
        )
        messages = []
        for prompt in prompts:
            messages.append(
                {
                    "id": prompt.id,
                    "type": "user" if prompt.type == "USER" else "ai",
                    "content": prompt.content,
                    "createdAt": prompt.createdAt,
                }
            )
        return {"messages": messages}

    except Exception as e:
        print(f"Error fetching conversation: {e}")
        return JSONResponse(status_code=500, content={"error": "internal error"})
