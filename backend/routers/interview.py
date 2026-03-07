from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import json
import re
import uuid
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
    # GD-specific fields
    topic: Optional[str] = None
    participant_count: Optional[int] = 4
    duration_minutes: Optional[int] = 10

class Participant(BaseModel):
    name: str
    style: str
    avatar: str
    color: str

class GDMessage(BaseModel):
    participant_name: str
    participant_color: str
    content: str
    addresses_user: bool = False

class InterviewStartResponse(BaseModel):
    opening: str
    first_question: str
    # GD-specific
    session_id: Optional[str] = None
    topic: Optional[str] = None
    participants: Optional[List[Participant]] = None
    messages: Optional[List[GDMessage]] = None

PARTICIPANT_COLORS = ['#4F6EF7', '#22C55E', '#F59E0B', '#EF4444', '#A855F7']
PARTICIPANT_STYLES = ["assertive", "analytical", "collaborative", "devil's_advocate", "quiet_but_sharp"]
INDIAN_NAMES = [
    "Arjun Sharma", "Priya Patel", "Vikram Mehta", "Ananya Singh", "Raj Kapoor",
    "Sneha Reddy", "Karan Nair", "Meera Joshi", "Aditya Verma", "Kavita Iyer",
    "Rohan Shah", "Divya Chatterjee", "Nikhil Gupta", "Riya Malhotra", "Sanjay Rao"
]

@router.post("/start", response_model=InterviewStartResponse)
async def start_interview(request: InterviewStartRequest):
    logger.info(f"Interview started — round: {request.round_type}, role: {request.target_role}")
    
    try:
        # Handle GD round
        if request.round_type == 'gd':
            participant_count = min(max(request.participant_count or 4, 2), 5)
            topic = request.topic or "General discussion topic"
            
            selected_names = INDIAN_NAMES[:participant_count + 2][:participant_count]
            
            participants = []
            for i in range(participant_count):
                name = selected_names[i]
                style = PARTICIPANT_STYLES[i % len(PARTICIPANT_STYLES)]
                color = PARTICIPANT_COLORS[i % len(PARTICIPANT_COLORS)]
                participants.append(Participant(
                    name=name,
                    style=style,
                    avatar=name[0],
                    color=color
                ))
            
            participants_json = json.dumps([{
                "name": p.name,
                "style": p.style,
                "avatar": p.avatar,
                "color": p.color
            } for p in participants])
            
            system_prompt = f"""You are a Group Discussion (GD) moderator. The topic is: "{topic}"

You have {participant_count} participants:
{participants_json}

Generate:
1. A brief opening statement (2-3 sentences) as moderator introducing the topic
2. The first message from one participant to kick off the discussion

Return ONLY JSON:
{{
  "opening": "moderator opening",
  "messages": [
    {{
      "participant_name": "name of speaking participant",
      "participant_color": "hex color", 
      "content": "what they say (2-4 sentences)",
      "addresses_user": true
    }}
  ]
}}

IMPORTANT: Only ONE message should have addresses_user: true. Do NOT include markdown fences."""

            result = chat(system_prompt, "Start the GD", temperature=0.7)
            
            result = re.sub(r'^```json\s*', '', result.strip())
            result = re.sub(r'^```\s*', '', result)
            result = re.sub(r'\s*```$', '', result)
            
            data = json.loads(result)
            
            return InterviewStartResponse(
                opening=data.get("opening", ""),
                first_question="",
                session_id=str(uuid.uuid4()),
                topic=topic,
                participants=participants,
                messages=[GDMessage(**msg) for msg in data.get("messages", [])]
            )
        
        # Handle regular interview rounds
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
    # GD-specific
    session_id: Optional[str] = None
    topic: Optional[str] = None
    participants: Optional[List[Participant]] = None
    turn_number: Optional[int] = 0

class InterviewTurnResponse(BaseModel):
    feedback: str
    next_question: str | None
    is_complete: bool
    score: int | None
    # GD-specific
    messages: Optional[List[GDMessage]] = None

@router.post("/turn", response_model=InterviewTurnResponse)
async def interview_turn(request: InterviewTurnRequest):
    try:
        assistant_count = sum(1 for msg in request.history if msg.role == "assistant")
        
        # Handle GD round
        if request.round_type == 'gd':
            participants = request.participants or []
            topic = request.topic or "General discussion"
            
            participants_json = json.dumps([{
                "name": p.name,
                "style": p.style,
                "avatar": p.avatar,
                "color": p.color
            } for p in participants])
            
            history_text = ""
            for msg in request.history:
                history_text += f"{msg.role}: {msg.content}\n"
            
            system_prompt = f"""You are conducting a Group Discussion (GD) on topic: "{topic}"

Participants:
{participants_json}

Conversation history:
{history_text}

User just said: "{request.user_answer}"

Instructions:
- Respond as 1-2 of the AI participants (not the user)
- Choose participants strategically based on what the user said
- Stay in character for each participant
- Keep responses concise (2-4 sentences each)
- Never break character or reference being an AI

IMPORTANT: 
- ONLY ONE message should have "addresses_user": true
- The other participant message (if any) should have "addresses_user": false
- They can agree, disagree, or build on what the other participant said

Return ONLY JSON as an array of messages:
[
  {{
    "participant_name": "name",
    "participant_color": "hex color", 
    "content": "what they say",
    "addresses_user": true/false
  }}
]

Do NOT include markdown fences."""

            result = chat(system_prompt, f"Turn {request.turn_number or 1}", temperature=0.7)
            
            result = re.sub(r'^```json\s*', '', result.strip())
            result = re.sub(r'^```\s*', '', result)
            result = re.sub(r'\s*```$', '', result)
            
            messages_data = json.loads(result)
            if not isinstance(messages_data, list):
                messages_data = [messages_data]
            
            # Ensure only ONE message has addresses_user: true
            has_user_address = False
            for msg in messages_data:
                if msg.get("addresses_user", False):
                    if has_user_address:
                        msg["addresses_user"] = False
                    else:
                        has_user_address = True
            
            messages = [GDMessage(**msg) for msg in messages_data]
            
            should_conclude = (request.turn_number or 0) >= 10
            
            logger.info(f"GD turn {request.turn_number or 1} — {len(messages)} messages")
            
            return InterviewTurnResponse(
                feedback="",
                next_question=None,
                is_complete=should_conclude,
                score=None,
                messages=messages
            )
        
        # Handle regular interview rounds
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
    # GD-specific
    topic: Optional[str] = None
    participants: Optional[List[Participant]] = None

class SummaryResponse(BaseModel):
    overall_score: int
    strengths: list[str]
    improvements: list[str]
    future_self_closing: str
    # GD-specific
    communication_score: Optional[int] = None
    content_score: Optional[int] = None
    leadership_score: Optional[int] = None
    listening_score: Optional[int] = None
    standout_moment: Optional[str] = None

@router.post("/summary", response_model=SummaryResponse)
async def get_summary(request: InterviewSummaryRequest):
    try:
        history_text = "\n".join([f"{msg.role}: {msg.content}" for msg in request.history])
        
        # Handle GD round
        if request.round_type == 'gd':
            participants = request.participants or []
            topic = request.topic or "General discussion"
            
            participants_json = json.dumps([{
                "name": p.name,
                "style": p.style,
                "avatar": p.avatar,
                "color": p.color
            } for p in participants])
            
            system_prompt = f"""You are evaluating a candidate's performance in a Group Discussion (GD).

Topic: "{topic}"

Participants:
{participants_json}

Full conversation:
{history_text}

Provide a detailed evaluation:
1. User's performance scores:
   - communication_score: 0-100 (clarity, articulation, vocabulary)
   - content_score: 0-100 (knowledge, depth, relevance)
   - leadership_score: 0-100 (initiating discussion, building on others' points, coordinating)
   - listening_score: 0-100 (responding to others, acknowledging points)
   - overall_score: weighted average
2. 3-5 strengths
3. 3-5 areas for improvement
4. standout_moment: the user's best contribution (quote it)
5. closing_message: encouraging note

Return ONLY JSON:
{{
  "overall_score": number,
  "communication_score": number,
  "content_score": number,
  "leadership_score": number,
  "listening_score": number,
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"],
  "standout_moment": "best user quote",
  "future_self_closing": "encouraging note"
}}

Do NOT include markdown fences."""

            result = chat(system_prompt, "Conclude GD", temperature=0.7)
            
            result = re.sub(r'^```json\s*', '', result.strip())
            result = re.sub(r'^```\s*', '', result)
            result = re.sub(r'\s*```$', '', result)
            
            data = json.loads(result)
            
            logger.info(f"GD concluded — score: {data.get('overall_score', 'N/A')}")
            
            return SummaryResponse(**data)
        
        # Handle regular interview rounds
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
