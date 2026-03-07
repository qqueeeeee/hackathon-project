from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
import re
import logging
from utils.groq_client import chat

logger = logging.getLogger(__name__)

router = APIRouter()

class RoadmapGenerateRequest(BaseModel):
    name: str
    skills: list[str]
    experience_years: float
    target_role: str
    duration_months: int = 12

class SkillGap(BaseModel):
    skill: str
    priority: str
    reason: str

class Resource(BaseModel):
    name: str
    url: str

class Milestone(BaseModel):
    month: int
    title: str
    description: str
    skills_to_learn: list[str]
    resources: list[Resource]

class RoadmapResponse(BaseModel):
    future_self_intro: str
    skill_gaps: list[SkillGap]
    milestones: list[Milestone]
    motivational_close: str

@router.post("/generate", response_model=RoadmapResponse)
async def generate_roadmap(request: RoadmapGenerateRequest):
    duration = request.duration_months
    logger.info(f"Roadmap generation started — role: {request.target_role}, duration: {duration} months")
    
    try:
        skills_str = ", ".join(request.skills)
        
        milestone_months = []
        if duration == 3:
            milestone_months = [1, 2, 3]
        elif duration == 6:
            milestone_months = [1, 3, 6]
        elif duration == 12:
            milestone_months = [1, 3, 6, 12]
        elif duration == 18:
            milestone_months = [1, 3, 6, 12, 18]
        elif duration == 24:
            milestone_months = [1, 3, 6, 12, 18, 24]
        else:
            milestone_months = [1, 3, 6, 12]
        
        milestone_months_str = ", ".join(map(str, milestone_months))
        
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
      "resources": [
        {{"name": "Course name", "url": "https://..."}}
      ]
    }}
  ],
  "motivational_close": "An inspiring closing thought from your future self"
}}

Generate exactly 4-6 skill gaps and milestones at months: {milestone_months_str}.
For each milestone, provide 1-3 resources with actual URLs to courses or documentation on well-known platforms like Coursera, freeCodeCamp, MDN Web Docs, official documentation, or YouTube. Do NOT make up URLs — use real, working URLs.
Do NOT include any markdown fences or additional text. Return ONLY the JSON object."""

        result = chat(system_prompt, f"Create a roadmap for {request.name} to become a {request.target_role}", temperature=0.7)
        
        result = re.sub(r'^```json\s*', '', result.strip())
        result = re.sub(r'^```\s*', '', result)
        result = re.sub(r'\s*```$', '', result)
        
        data = json.loads(result)
        
        for milestone in data.get('milestones', []):
            if 'resource' in milestone:
                del milestone['resource']
            if 'resources' not in milestone or not milestone['resources']:
                milestone['resources'] = []
        
        logger.info(f"Roadmap generated — {len(data.get('milestones', []))} milestones, {len(data.get('skill_gaps', []))} skill gaps")
        return RoadmapResponse(**data)
    
    except Exception as e:
        logger.error(f"Roadmap generation failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate roadmap: {str(e)}")
