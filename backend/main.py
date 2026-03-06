from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routers import resume, roadmap, interview

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resume.router, prefix="/resume", tags=["resume"])
app.include_router(roadmap.router, prefix="/roadmap", tags=["roadmap"])
app.include_router(interview.router, prefix="/interview", tags=["interview"])

@app.get("/")
def root():
    return {"status": "PathForge AI is running"}
