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

PARTICIPANT_COLORS = ['#4F6EF7', '#22C55E', '#F59E0B', '#EF4444', '#A855F7']

PARTICIPANT_STYLES = ["assertive", "analytical", "collaborative", "devil's_advocate", "quiet_but_sharp"]

INDIAN_NAMES = [
    "Arjun Sharma", "Priya Patel", "Vikram Mehta", "Ananya Singh", "Raj Kapoor",
    "Sneha Reddy", "Karan Nair", "Meera Joshi", "Aditya Verma", "Kavita Iyer",
    "Rohan Shah", "Divya Chatterjee", "Nikhil Gupta", "Riya Malhotra", "Sanjay Rao",
    "Anjali Desai", "Amit Kumar", "Pooja Shah", "Rahul Singh", "Swati Kapur"
]

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

class GDStartRequest(BaseModel):
    topic: str
    participant_count: int = 4
    duration_minutes: int = 10
    target_role: str = ""

class GDStartResponse(BaseModel):
    session_id: str
    topic: str
    participants: List[Participant]
    opening_statement: str
    first_message: GDMessage

@router.post("/start", response_model=GDStartResponse)
async def start_gd(request: GDStartRequest):
    logger.info(f"GD started — topic: {request.topic}, participants: {request.participant_count}")
    
    try:
        participant_count = min(max(request.participant_count, 2), 5)
        
        selected_names = INDIAN_NAMES[:participant_count + 2]
        selected_names = selected_names[:participant_count]
        
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
        
        system_prompt = f"""You are a Group Discussion (GD) moderator. The topic is: "{request.topic}"

You have {participant_count} participants:
{participants_json}

Generate:
1. A brief opening statement (2-3 sentences) as moderator introducing the topic
2. The first message from one participant to kick off the discussion

Return ONLY JSON:
{{
  "opening_statement": "moderator opening",
  "first_message": {{
    "participant_name": "name of speaking participant",
    "participant_color": "hex color",
    "content": "what they say (2-4 sentences)",
    "addresses_user": false
  }}
}}

Do NOT include markdown fences."""

        result = chat(system_prompt, "Start the GD", temperature=0.7)
        
        result = re.sub(r'^```json\s*', '', result.strip())
        result = re.sub(r'^```\s*', '', result)
        result = re.sub(r'\s*```$', '', result)
        
        data = json.loads(result)
        
        return GDStartResponse(
            session_id=str(uuid.uuid4()),
            topic=request.topic,
            participants=participants,
            opening_statement=data.get("opening_statement", ""),
            first_message=GDMessage(**data.get("first_message", {}))
        )
    
    except Exception as e:
        logger.error(f"Failed to start GD: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to start GD: {str(e)}")


class GDTurnRequest(BaseModel):
    session_id: str
    user_message: str
    topic: str
    participants: List[Participant]
    history: List[dict]
    turn_number: int

class GDTurnResponse(BaseModel):
    messages: List[GDMessage]
    should_conclude: bool

@router.post("/turn", response_model=GDTurnResponse)
async def gd_turn(request: GDTurnRequest):
    try:
        participants_json = json.dumps([{
            "name": p.name,
            "style": p.style,
            "avatar": p.avatar,
            "color": p.color
        } for p in request.participants])
        
        history_text = ""
        for msg in request.history:
            history_text += f"{msg.get('participant_name', msg.get('role', 'Unknown'))}: {msg.get('content', '')}\n"
        
        turn_context = ""
        if request.turn_number >= 8:
            turn_context = "The discussion has been going on for a while. Consider wrapping things up."
        
        system_prompt = f"""You are conducting a Group Discussion (GD) on topic: "{request.topic}"

Participants:
{participants_json}

Conversation history:
{history_text}

User just said: "{request.user_message}"

        Instructions:
- Respond as 1-2 of the AI participants (not the user)
- Choose participants strategically:
  - If user made a strong point, the devil's_advocate pushes back
  - If user asked a question, the analytical one answers
  - If user went off topic, the assertive one redirects
  - Occasionally have two participants briefly argue with each other
- Stay in character for each participant
- Keep responses concise (2-4 sentences each)
- Never break character or reference being an AI
- Make responses feel like a real GD with tension, agreement, counterpoints
- CRITICAL: Only ONE message should have addresses_user: true - this is the message directly responding to the user. All other messages should have addresses_user: false (they talk to each other, not to the user)

{turn_context}

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

        result = chat(system_prompt, f"Turn {request.turn_number}", temperature=0.7)
        
        result = re.sub(r'^```json\s*', '', result.strip())
        result = re.sub(r'^```\s*', '', result)
        result = re.sub(r'\s*```$', '', result)
        
        messages_data = json.loads(result)
        if not isinstance(messages_data, list):
            messages_data = [messages_data]
        
        has_user_addressed = False
        for msg in messages_data:
            if msg.get('addresses_user', False):
                if has_user_addressed:
                    msg['addresses_user'] = False
                else:
                    has_user_addressed = True
        
        if not has_user_addressed and messages_data:
            messages_data[0]['addresses_user'] = True
        
        messages = [GDMessage(**msg) for msg in messages_data]
        
        should_conclude = request.turn_number >= 10
        
        logger.info(f"GD turn {request.turn_number} — {len(messages)} messages")
        
        return GDTurnResponse(
            messages=messages,
            should_conclude=should_conclude
        )
    
    except Exception as e:
        logger.error(f"Failed to process GD turn: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to process GD turn: {str(e)}")


class GDConcludeRequest(BaseModel):
    topic: str
    participants: List[Participant]
    history: List[dict]

class UserGDPerformance(BaseModel):
    overall_score: int
    communication_score: int
    content_score: int
    leadership_score: int
    listening_score: int
    strengths: List[str]
    improvements: List[str]
    standout_moment: str
    closing_message: str

class GDConcludeResponse(BaseModel):
    summary: str
    user_performance: UserGDPerformance

@router.post("/conclude", response_model=GDConcludeResponse)
async def conclude_gd(request: GDConcludeRequest):
    try:
        participants_json = json.dumps([{
            "name": p.name,
            "style": p.style,
            "avatar": p.avatar,
            "color": p.color
        } for p in request.participants])
        
        history_text = ""
        for msg in request.history:
            role = msg.get('participant_name', msg.get('role', 'Unknown'))
            content = msg.get('content', '')
            history_text += f"{role}: {content}\n"
        
        system_prompt = f"""You are evaluating a candidate's performance in a Group Discussion (GD).

Topic: "{request.topic}"

Participants:
{participants_json}

Full conversation:
{history_text}

Provide a detailed evaluation:
1. Summary of the discussion (2-3 sentences)
2. User's performance scores:
   - communication_score: 0-100 (clarity, articulation, vocabulary)
   - content_score: 0-100 (knowledge, depth, relevance)
   - leadership_score: 0-100 (initiating discussion, building on others' points, coordinating)
   - listening_score: 0-100 (responding to others, acknowledging points, not interrupting)
   - overall_score: weighted average
3. 3-5 strengths
4. 3-5 areas for improvement
5. standout_moment: the user's best contribution (quote it)
6. closing_message: encouraging note as their future self

Return ONLY JSON:
{{
  "summary": "discussion summary",
  "user_performance": {{
    "overall_score": number,
    "communication_score": number,
    "content_score": number,
    "leadership_score": number,
    "listening_score": number,
    "strengths": ["strength1", "strength2"],
    "improvements": ["improvement1", "improvement2"],
    "standout_moment": "best user quote",
    "closing_message": "encouraging note"
  }}
}}

Do NOT include markdown fences."""

        result = chat(system_prompt, "Conclude GD", temperature=0.7)
        
        result = re.sub(r'^```json\s*', '', result.strip())
        result = re.sub(r'^```\s*', '', result)
        result = re.sub(r'\s*```$', '', result)
        
        data = json.loads(result)
        
        logger.info(f"GD concluded — score: {data.get('user_performance', {}).get('overall_score', 'N/A')}")
        
        return GDConcludeResponse(**data)
    
    except Exception as e:
        logger.error(f"Failed to conclude GD: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to conclude GD: {str(e)}")
