from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import fitz
import json
import re
import time
import logging
from utils.groq_client import chat

logger = logging.getLogger(__name__)

router = APIRouter()

class ResumeParseResponse(BaseModel):
    name: str
    skills: list[str]
    experience_years: float
    education: str
    projects: list[str]
    summary: str
    target_roles: list[str]
    parsing_notes: Optional[str] = None


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
    logger.info(f"Resume upload received — filename: {file.filename}, size: {file.size} bytes")
    
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    start_time = time.time()
    
    try:
        contents = await file.read()
        doc = fitz.open(stream=contents, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        
        char_count = len(text.strip())
        logger.info(f"PDF text extracted — {char_count} characters")
        
        if not text.strip() or char_count < 100:
            logger.warning("PDF text extraction failed or insufficient text")
            raise HTTPException(status_code=422, detail="Could not extract text from this PDF. It may be scanned or image-based. Please use a text-based PDF.")
        
        system_prompt = """You are a resume parser. Extract structured information from the resume text below.
Return ONLY a JSON object with these exact keys:
- name: string (full name)
- skills: array of strings (technical skills, tools, technologies)
- experience_years: number (total years of experience)
- education: string (highest education degree)
- projects: array of strings (notable projects)
- summary: string (2-3 sentence professional summary)
- target_roles: array of 3 strings (potential target job roles)
- parsing_notes: string (a single sentence explaining what you found or any assumptions made)

Do NOT include any markdown fences or additional text. Return ONLY the JSON object."""

        result = chat(system_prompt, text, temperature=0.3)
        result = re.sub(r'^```json\s*', '', result.strip())
        result = re.sub(r'^```\s*', '', result)
        result = re.sub(r'\s*```$', '', result)
        
        data = json.loads(result)
        
        if not data.get('name'):
            raise HTTPException(status_code=422, detail="AI could not parse resume structure. Please ensure your resume has clear sections for skills and experience.")
        
        if not data.get('skills') or len(data.get('skills', [])) < 1:
            logger.warning("No skills found in parsed resume")
            raise HTTPException(status_code=422, detail="AI could not parse resume structure. Please ensure your resume has clear sections for skills and experience.")
        
        if not isinstance(data.get('experience_years'), (int, float)):
            logger.warning("experience_years not a valid number")
            data['experience_years'] = 0
        
        if data.get('experience_years', 0) == 0:
            logger.warning("experience_years defaulted to 0")
        
        if len(data.get('skills', [])) < 3:
            logger.warning(f"Low skill count ({len(data.get('skills', []))}) detected in parsed resume")
        
        elapsed_ms = round((time.time() - start_time) * 1000, 2)
        logger.info(f"Groq parse completed in {elapsed_ms}ms — name: {data.get('name')}, skills: {len(data.get('skills', []))}")
        
        return ResumeParseResponse(**data)
    
    except HTTPException:
        raise
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=422, detail="AI could not parse resume structure. Please ensure your resume has clear sections for skills and experience.")
    except Exception as e:
        logger.error(f"Resume parsing failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to parse resume: {str(e)}")


@router.post("/from-builder", response_model=ResumeParseResponse)
async def parse_resume_from_builder(data: ResumeBuilderData):
    start_time = time.time()
    
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
- parsing_notes: string (a single sentence explaining what you found or any assumptions made)

Do NOT include any markdown fences or additional text. Return ONLY the JSON object."""

        result = chat(system_prompt, resume_text, temperature=0.3)
        result = re.sub(r'^```json\s*', '', result.strip())
        result = re.sub(r'^```\s*', '', result)
        result = re.sub(r'\s*```$', '', result)
        
        parsed = json.loads(result)
        
        if not parsed.get('name'):
            raise HTTPException(status_code=422, detail="AI could not parse resume structure. Please ensure your resume has clear sections for skills and experience.")
        
        if not parsed.get('skills') or len(parsed.get('skills', [])) < 1:
            raise HTTPException(status_code=422, detail="AI could not parse resume structure. Please ensure your resume has clear sections for skills and experience.")
        
        if not isinstance(parsed.get('experience_years'), (int, float)):
            parsed['experience_years'] = 0
        
        if parsed.get('experience_years', 0) == 0:
            logger.warning("experience_years defaulted to 0")
        
        if len(parsed.get('skills', [])) < 3:
            logger.warning(f"Low skill count ({len(parsed.get('skills', []))}) detected in parsed resume")
        
        elapsed_ms = round((time.time() - start_time) * 1000, 2)
        logger.info(f"Groq parse completed in {elapsed_ms}ms — name: {parsed.get('name')}, skills: {len(parsed.get('skills', []))}")
        
        return ResumeParseResponse(**parsed)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resume builder parsing failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to process resume: {str(e)}")
