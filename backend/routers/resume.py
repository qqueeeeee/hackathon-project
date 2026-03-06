from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import fitz
import json
import re
from utils.groq_client import chat

router = APIRouter()

class ResumeParseResponse(BaseModel):
    name: str
    skills: list[str]
    experience_years: float
    education: str
    projects: list[str]
    summary: str
    target_roles: list[str]


class EducationEntry(BaseModel):
    degree: str
    institution: str
    year: int
    cgpa: Optional[str] = None


class ExperienceEntry(BaseModel):
    title: str
    company: str
    start_date: str
    end_date: Optional[str] = None
    is_present: bool = False
    description: str


class ProjectEntry(BaseModel):
    name: str
    tech_stack: str
    description: str


class ResumeBuilderData(BaseModel):
    name: str
    email: str
    phone: str
    linkedin: str
    github: str
    location: str
    education: List[EducationEntry]
    experience: List[ExperienceEntry]
    projects: List[ProjectEntry]
    skills: List[str]

@router.post("/parse", response_model=ResumeParseResponse)
async def parse_resume(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    try:
        contents = await file.read()
        doc = fitz.open(stream=contents, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        
        if not text.strip():
            raise HTTPException(status_code=500, detail="Failed to extract text from PDF")
        
        system_prompt = """You are a resume parser. Extract structured information from the resume text below.
Return ONLY a JSON object with these exact keys:
- name: string (full name)
- skills: array of strings (technical skills, tools, technologies)
- experience_years: number (total years of experience)
- education: string (highest education degree)
- projects: array of strings (notable projects)
- summary: string (2-3 sentence professional summary)
- target_roles: array of 3 strings (potential target job roles)

Do NOT include any markdown fences or additional text. Return ONLY the JSON object."""

        result = chat(system_prompt, text, temperature=0.3)
        result = re.sub(r'^```json\s*', '', result.strip())
        result = re.sub(r'^```\s*', '', result)
        result = re.sub(r'\s*```$', '', result)
        
        data = json.loads(result)
        return ResumeParseResponse(**data)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse resume: {str(e)}")


@router.post("/from-builder", response_model=ResumeParseResponse)
async def parse_resume_from_builder(data: ResumeBuilderData):
    try:
        resume_text = f"""Name: {data.name}
Email: {data.email}
Phone: {data.phone}
LinkedIn: {data.linkedin}
GitHub: {data.github}
Location: {data.location}

EDUCATION:
{chr(10).join([f"- {e.degree} at {e.institution}, {e.year}" + (f", CGPA: {e.cgpa}" if e.cgpa else "") for e in data.education])}

EXPERIENCE:
{chr(10).join([f"- {e.title} at {e.company} ({e.start_date} - {'Present' if e.is_present else e.end_date}): {e.description}" for e in data.experience])}

PROJECTS:
{chr(10).join([f"- {p.name}: {p.description} (Tech: {p.tech_stack})" for p in data.projects])}

SKILLS:
{', '.join(data.skills)}"""
        
        system_prompt = """You are a resume parser. Extract structured information from the resume below.
Return ONLY a JSON object with these exact keys:
- name: string (full name)
- skills: array of strings (technical skills, tools, technologies)
- experience_years: number (total years of experience, estimate from work history)
- education: string (highest education degree)
- projects: array of strings (notable projects)
- summary: string (2-3 sentence professional summary)
- target_roles: array of 3 strings (potential target job roles based on their experience and skills)

Do NOT include any markdown fences or additional text. Return ONLY the JSON object."""

        result = chat(system_prompt, resume_text, temperature=0.3)
        result = re.sub(r'^```json\s*', '', result.strip())
        result = re.sub(r'^```\s*', '', result)
        result = re.sub(r'\s*```$', '', result)
        
        parsed = json.loads(result)
        return ResumeParseResponse(**parsed)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process resume: {str(e)}")
