from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
import re
import logging
from utils.groq_client import chat

logger = logging.getLogger(__name__)

router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    content: str

class InterviewStartRequest(BaseModel):
    name: str
    target_role: str
    skill_gaps: list[str]
    skills: list[str]
    round_type: str = 'technical'

class InterviewStartResponse(BaseModel):
    opening: str
    first_question: str

@router.post("/start", response_model=InterviewStartResponse)
async def start_interview(request: InterviewStartRequest):
    logger.info(f"Interview started — round: {request.round_type}, role: {request.target_role}")
    
    try:
        skill_gaps_str = ", ".join(request.skill_gaps)
        
        round_prompts = {
            'mcq': """You are conducting an EASY Multiple Choice Question (MCQ) interview round for beginners. Generate basic concept questions relevant to the candidate's target role. Each question should have 4 simple options (A, B, C, D). Focus on fundamentals, basic definitions, and simple concepts that a beginner should know. Examples: "What does HTML stand for?", "Which of these is a programming language?", "What is a variable?". Keep questions very easy and approachable for someone just starting out.""",
            'hr': """You are conducting an HR/Behavioural interview round. Ask general, easy questions about teamwork, communication, and career goals. Topics: strengths/weaknesses, why this role, remote work preferences, learning style, favorite project, handling disagreements. Keep it conversational and low-pressure. Focus on getting to know the person, not testing them.""",
            'technical': """You are conducting a Technical interview round. Act as a senior engineer. Ask questions about the candidate's skills and experience - past projects, technologies they've used, problems they've solved. Then move to fundamentals of their tech stack, then basic system design. Be encouraging but expect genuine answers."""
        }
        
        round_prompt = round_prompts.get(request.round_type, round_prompts['technical'])
        
        system_prompt = f"""{round_prompt}

You are {request.name}'s "Future Self" - a version of them who became a successful {request.target_role} 5 years ago.
You're conducting a mock interview to help them prepare. Be encouraging but honest.

Generate:
1. A 2-sentence warm opening introducing yourself as their future self
2. Your first interview question based on the round type

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
        logger.error(f"Failed to start interview: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to start interview: {str(e)}")


class InterviewTurnRequest(BaseModel):
    name: str
    target_role: str
    skill_gaps: list[str]
    history: list[ChatMessage]
    user_answer: str
    round_type: str = 'technical'

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
        
        round_prompts = {
            'mcq': 'For MCQ rounds, keep asking very easy basic concept questions. If they answer correctly, praise them and ask the next easy question. If incorrect, gently explain the correct answer and encourage them. Ask 5 questions total.',
            'hr': 'For HR rounds, keep the conversation easy and friendly. Ask simple questions about their experience, preferences, and goals. Be conversational, not testing.',
            'technical': 'For technical rounds, ask about their past projects and experience first, then move to basic technical concepts. Be encouraging but expect real answers.'
        }
        
        round_prompt = round_prompts.get(request.round_type, round_prompts['technical'])
        
        system_prompt = f"""You are {request.name}'s "Future Self" - a {request.target_role} who succeeded.
You're conducting a mock interview. 

{round_prompt}

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
        
        logger.info(f"Interview turn {assistant_count + 1} — response length: {len(request.user_answer)}")
        
        return InterviewTurnResponse(**data)
    
    except Exception as e:
        logger.error(f"Failed to process interview turn: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to process interview turn: {str(e)}")


class InterviewSummaryRequest(BaseModel):
    name: str
    target_role: str
    history: list[ChatMessage]
    round_type: str = 'technical'

class SummaryResponse(BaseModel):
    overall_score: int
    strengths: list[str]
    improvements: list[str]
    future_self_closing: str

@router.post("/summary", response_model=SummaryResponse)
async def get_summary(request: InterviewSummaryRequest):
    try:
        history_text = "\n".join([f"{msg.role}: {msg.content}" for msg in request.history])
        
        summary_prompts = {
            'mcq': 'For MCQ rounds, focus on the number of correct answers and knowledge of core concepts. Provide feedback on understanding fundamentals.',
            'hr': 'For HR rounds, focus on communication skills, teamwork, leadership, and cultural fit. Provide feedback on STAR method usage.',
            'technical': 'For technical rounds, focus on technical depth, problem-solving approach, system design skills, and code quality understanding.'
        }
        
        summary_prompt = summary_prompts.get(request.round_type, summary_prompts['technical'])
        
        system_prompt = f"""You are {request.name}'s Future Self, a successful {request.target_role}.
Review the full interview transcript and provide:
- An overall score (0-100)
- 3-5 strengths they demonstrated
- 3-5 areas for improvement
- A closing message as their future self

{summary_prompt}

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
        
        logger.info(f"Interview completed — score: {data.get('overall_score', 'N/A')}")
        
        return SummaryResponse(**data)
    
    except Exception as e:
        logger.error(f"Failed to generate summary: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate summary: {str(e)}")
