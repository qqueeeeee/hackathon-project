from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
import re
from utils.groq_client import chat

router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    content: str

class InterviewStartRequest(BaseModel):
    name: str
    target_role: str
    skill_gaps: list[str]
    skills: list[str]

class InterviewStartResponse(BaseModel):
    opening: str
    first_question: str

@router.post("/start", response_model=InterviewStartResponse)
async def start_interview(request: InterviewStartRequest):
    try:
        skill_gaps_str = ", ".join(request.skill_gaps)
        
        system_prompt = f"""You are {request.name}'s "Future Self" - a version of them who became a successful {request.target_role} 5 years ago.
You're conducting a mock interview to help them prepare. Be encouraging but honest.

Generate:
1. A 2-sentence warm opening introducing yourself as their future self
2. A specific interview question that tests one of their skill gaps: {skill_gaps_str}

Return ONLY JSON:
{{
  "opening": "Your opening message",
  "first_question": "Your first interview question"
}}

Do NOT include markdown fences."""

        result = chat(system_prompt, "Start the interview", temperature=0.7)
        
        result = re.sub(r'^```json\s*', '', result.strip())
        result = re.sub(r'^```\s*', '', result)
        result = re.sub(r'\s*```$', '', result)
        
        data = json.loads(result)
        return InterviewStartResponse(**data)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start interview: {str(e)}")


class InterviewTurnRequest(BaseModel):
    name: str
    target_role: str
    skill_gaps: list[str]
    history: list[ChatMessage]
    user_answer: str

class InterviewTurnResponse(BaseModel):
    feedback: str
    next_question: str | None
    is_complete: bool
    score: int | None

@router.post("/turn", response_model=InterviewTurnResponse)
async def interview_turn(request: InterviewTurnRequest):
    try:
        assistant_count = sum(1 for msg in request.history if msg.role == "assistant")
        
        skill_gaps_str = ", ".join(request.skill_gaps)
        
        system_prompt = f"""You are {request.name}'s "Future Self" - a {request.target_role} who succeeded.
You're conducting a mock interview. 

User's latest answer: "{request.user_answer}"
Skill gaps to test: {skill_gaps_str}
Questions answered so far: {assistant_count}

Provide 2-3 sentences of honest feedback on their answer.
If questions answered >= 4, set is_complete to true and provide a score 0-100.
If not complete, ask a follow-up question testing another skill gap.

Return ONLY JSON:
{{
  "feedback": "Your feedback",
  "next_question": "Next question or null if complete",
  "is_complete": true/false,
  "score": number or null
}}

Do NOT include markdown fences."""

        result = chat(system_prompt, f"History: {request.history}", temperature=0.7)
        
        result = re.sub(r'^```json\s*', '', result.strip())
        result = re.sub(r'^```\s*', '', result)
        result = re.sub(r'\s*```$', '', result)
        
        data = json.loads(result)
        return InterviewTurnResponse(**data)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process interview turn: {str(e)}")


class InterviewSummaryRequest(BaseModel):
    name: str
    target_role: str
    history: list[ChatMessage]

class SummaryResponse(BaseModel):
    overall_score: int
    strengths: list[str]
    improvements: list[str]
    future_self_closing: str

@router.post("/summary", response_model=SummaryResponse)
async def get_summary(request: InterviewSummaryRequest):
    try:
        history_text = "\n".join([f"{msg.role}: {msg.content}" for msg in request.history])
        
        system_prompt = f"""You are {request.name}'s Future Self, a successful {request.target_role}.
Review the full interview transcript and provide:
- An overall score (0-100)
- 3-5 strengths they demonstrated
- 3-5 areas for improvement
- A closing message as their future self

Transcript:
{history_text}

Return ONLY JSON:
{{
  "overall_score": number,
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"],
  "future_self_closing": "Your closing message"
}}

Do NOT include markdown fences."""

        result = chat(system_prompt, "Provide summary", temperature=0.7)
        
        result = re.sub(r'^```json\s*', '', result.strip())
        result = re.sub(r'^```\s*', '', result)
        result = re.sub(r'\s*```$', '', result)
        
        data = json.loads(result)
        return SummaryResponse(**data)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate summary: {str(e)}")
