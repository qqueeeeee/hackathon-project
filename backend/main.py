from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import logging
import time

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("pathforge")

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

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = round((time.time() - start) * 1000, 2)
    logger.info(f"{request.method} {request.url.path} — {response.status_code} ({duration}ms)")
    return response

app.include_router(resume.router, prefix="/resume", tags=["resume"])
app.include_router(roadmap.router, prefix="/roadmap", tags=["roadmap"])
app.include_router(interview.router, prefix="/interview", tags=["interview"])

@app.get("/")
def root():
    return {"status": "PathForge AI is running"}
