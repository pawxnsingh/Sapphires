from fastapi import FastAPI, APIRouter
from database import db, connectDB, disconnectDB
from fastapi.middleware.cors import CORSMiddleware
from worker.routers import index

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(index.router, prefix='/api')

@app.get("/")
async def root_route():
    return { "message": "worker is up and running"}
