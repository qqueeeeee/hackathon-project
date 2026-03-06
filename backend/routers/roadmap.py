from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
import re
from utils.groq_client import chat

router = APIRouter()

class RoadmapGenerateRequest(BaseModel):
    name: str
    skills: list[str]
    experience_years: float
    target_role: str

class SkillGap(BaseModel):
    skill: str
    priority: str
    reason: str

class Milestone(BaseModel):
    month: int
    title: str
    description: str
    skills_to_learn: list[str]
    resource: str

class RoadmapResponse(BaseModel):
    future_self_intro: str
    skill_gaps: list[SkillGap]
    milestones: list[Milestone]
    motivational_close: str

@router.post("/generate", response_model=RoadmapResponse)
async def generate_roadmap(request: RoadmapGenerateRequest):
    try:
        skills_str = ", ".join(request.skills)
        
        system_prompt = f"""You are the user's "Future Self" - a version of them who already succeeded as a {request.target_role} 5 years ago.
You speak with wisdom, encouragement, and honesty. You have walked the path they are about to walk.

Generate a career roadmap for {request.name} who has {request.experience_years} years of experience and current skills: {skills_str}.

Return ONLY a JSON object with this exact structure:
{{
  "future_self_intro": "A warm, personal introduction as their future successful self (2-3 sentences)",
  "skill_gaps": [
    {{"skill": "skill name", "priority": "high|medium|low", "reason": "why this gap matters"}}
  ],
  "milestones": [
    {{
      "month": 1,
      "title": "milestone title",
      "description": "what to accomplish",
      "skills_to_learn": ["skill1", "skill2"],
      "resource": "specific resource name or course"
    }}
  ],
  "motivational_close": "An inspiring closing thought from your future self"
}}

Generate exactly 4-5 skill gaps and exactly 4 milestones at months 1, 3, 6, and 12.
Do NOT include any markdown fences or additional text. Return ONLY the JSON object."""

        result = chat(system_prompt, f"Create a roadmap for {request.name} to become a {request.target_role}", temperature=0.7)
        
        result = re.sub(r'^```json\s*', '', result.strip())
        result = re.sub(r'^```\s*', '', result)
        result = re.sub(r'\s*```$', '', result)
        
        data = json.loads(result)
        return RoadmapResponse(**data)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate roadmap: {str(e)}")
