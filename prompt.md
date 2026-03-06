# PathForge AI — OpenCode Build Prompt

Build a full-stack web application called **PathForge AI** — an agentic career planning platform where an AI acts as the user's "Future Self" (a version of them who already succeeded in their target career 5 years ago). The entire experience is narrated through this Future Self persona.

---

## Tech Stack

- **Backend**: Python, FastAPI, Uvicorn, PyMuPDF (fitz) for PDF parsing, Groq SDK for LLM (model: `llama3-70b-8192`)
- **Frontend**: React 18, Vite, Tailwind CSS v3, React Router v6, Axios, Recharts, Lucide React
- **State**: localStorage only — no database needed
- **API**: All AI calls go through Groq API using key from `backend/.env` as `GROQ_API_KEY`

---

## Project Structure

```
pathforge/
  backend/
    main.py
    requirements.txt
    .env.example
    routers/
      resume.py
      roadmap.py
      interview.py
    utils/
      groq_client.py
  frontend/
    index.html
    package.json
    vite.config.js
    tailwind.config.js
    postcss.config.js
    src/
      main.jsx
      index.css
      utils/api.js
      pages/
        Landing.jsx
        Upload.jsx
        Roadmap.jsx
        Interview.jsx
        Dashboard.jsx
```

---

## Backend

### `utils/groq_client.py`

Create a Groq client that reads `GROQ_API_KEY` from environment using `python-dotenv`. Expose a single `chat(system, user, temperature)` function that calls `llama3-70b-8192` and returns the string response.

### `main.py`

FastAPI app with CORS allowing `http://localhost:5173`. Load `.env` with dotenv. Include routers at prefixes `/resume`, `/roadmap`, `/interview`. Root endpoint returns `{"status": "PathForge AI is running"}`.

### `routers/resume.py`

`POST /resume/parse` — accepts a PDF file upload. Use PyMuPDF to extract text. Send to Groq with a strict system prompt instructing it to return ONLY a JSON object with these exact keys:

```json
{
  "name": "string",
  "skills": ["string"],
  "experience_years": 0,
  "education": "string",
  "projects": ["string"],
  "summary": "string",
  "target_roles": ["string", "string", "string"]
}
```

Strip any markdown fences from the response before parsing. Return a Pydantic model matching this shape. Raise a 400 error if the file is not a PDF. Raise a 500 error if parsing fails.

### `routers/roadmap.py`

`POST /roadmap/generate` — accepts JSON body with `name`, `skills` (list), `experience_years`, `target_role`. Call Groq with a system prompt that instructs the AI to speak as the user's Future Self who became a `{target_role}` 5 years ago. Return ONLY JSON with this shape:

```json
{
  "future_self_intro": "string",
  "skill_gaps": [
    { "skill": "string", "priority": "high|medium|low", "reason": "string" }
  ],
  "milestones": [
    {
      "month": 1,
      "title": "string",
      "description": "string",
      "skills_to_learn": ["string"],
      "resource": "string"
    }
  ],
  "motivational_close": "string"
}
```

Generate 4-5 skill gaps and exactly 4 milestones at months 1, 3, 6, 12. Strip markdown fences before parsing. Return a Pydantic model matching this shape.

### `routers/interview.py`

Three endpoints, all speaking as the user's Future Self persona:

**`POST /interview/start`** — body: `name`, `target_role`, `skill_gaps` (list of strings), `skills` (list). Return:
```json
{ "opening": "string", "first_question": "string" }
```
The opening is a 2-sentence warm intro as Future Self. The first question targets one of the skill gaps.

**`POST /interview/turn`** — body: `name`, `target_role`, `skill_gaps`, `history` (list of `{role, content}` objects), `user_answer`. Count how many assistant messages exist in history. If count >= 4, set `is_complete: true`. Return:
```json
{ "feedback": "string", "next_question": "string or null", "is_complete": false, "score": null }
```
Feedback is 2-3 honest sentences from Future Self. If `is_complete` is true, `next_question` is null and `score` is an integer 0-100.

**`POST /interview/summary`** — body: `name`, `target_role`, `history`. Review the full transcript and return:
```json
{
  "overall_score": 0,
  "strengths": ["string"],
  "improvements": ["string"],
  "future_self_closing": "string"
}
```

All three endpoints must strip markdown fences before JSON parsing and use Pydantic response models.

### `requirements.txt`

```
fastapi==0.111.0
uvicorn==0.30.1
python-multipart==0.0.9
pymupdf==1.24.5
groq==0.9.0
pydantic==2.7.4
python-dotenv==1.0.1
```

---

## Frontend

### Design System

Dark theme only. Use these CSS variables / Tailwind colors throughout:

- Background: `#050D1A`
- Card: `#0A1628`
- Border: `#1A2E4A`
- Accent (cyan): `#00D4FF`
- Gold: `#FFB800`
- Green: `#00FF88`
- Red/danger: `#FF4466`
- Text: `#E8F4FD`
- Muted: `#6B8CAE`

Fonts (load from Google Fonts in `index.html`):
- Display/headings: `Syne` (weights 600, 700, 800)
- Body: `DM Sans` (weights 300, 400, 500)
- Mono: `JetBrains Mono` (weights 400, 500)

### `index.css`

Global styles including:
- Custom scrollbar (dark, thin)
- `.glow-card` class: `#0A1628` background, `#1A2E4A` border, 16px border radius, hover state adds cyan glow
- `.btn-forge` class: cyan gradient button, Syne font, bold, hover lifts with shadow
- `.btn-ghost` class: transparent with cyan border
- `.badge` with `.badge-high` (red tint), `.badge-medium` (gold tint), `.badge-low` (green tint)
- `.timeline-line` class: absolute vertical line with cyan-to-green gradient
- Priority badge styles: pill shape, 11px Syne font, uppercase

### `src/utils/api.js`

Axios instance with `baseURL: 'http://localhost:8000'`.

### `src/main.jsx`

React Router setup with routes:
- `/` → `Landing`
- `/upload` → `Upload`
- `/roadmap` → `Roadmap`
- `/interview` → `Interview`
- `/dashboard` → `Dashboard`

### `pages/Landing.jsx`

Hero page with:
- Subtle dot-grid or line-grid background using CSS
- Radial cyan glow behind title
- Large `PathForge` title in Syne 800, "AI" on second line
- Tagline: *"Don't talk to an AI. Talk to yourself — 5 years from now, who already made it."*
- Single CTA button navigating to `/upload`
- Three feature cards below: Resume Intelligence (Zap icon, cyan), Career Roadmap (Map icon, gold), Future Self Interview (Mic icon, green)
- Footer note about India's 1.5M engineering graduates

### `pages/Upload.jsx`

- Step progress indicator at top showing Upload → Roadmap → Interview → Dashboard (current step highlighted)
- PDF drag-and-drop zone: dashed border glow card, shows filename and size when file is selected, clicking opens file picker
- Role selection grid: 12 preset roles as toggle buttons + a "Custom role" option that reveals a text input
- Submit button disabled until both file and role are selected
- On submit: POST to `/resume/parse` with FormData, save response to `localStorage` as `pf_profile`, save role as `pf_target_role`, navigate to `/roadmap`
- Show loading state with spinner and "Analysing with AI..." text during request
- Show error message if request fails

### `pages/Roadmap.jsx`

- Step indicator (Upload done, Roadmap active)
- On mount: read `pf_profile` and `pf_target_role` from localStorage. If missing, redirect to `/upload`. POST to `/roadmap/generate` and save response to `pf_roadmap` in localStorage.
- Full-page loading state with spinning ring and "Your Future Self is analysing your profile..." text
- **Future Self message card**: left accent bar, avatar circle with user's initial, role label in mono font, intro text large
- Two-column section: left shows skill gaps as cards with priority badges and reason text. Right shows current skills as pills and a quoted summary
- **Career Timeline**: vertical line (cyan-to-green gradient), 4 milestone nodes each with month indicator circle (colored differently per milestone), card showing title, description, skills to learn as mono tags, resource name
- Motivational close in a gold-bordered card, italicised, attributed to "— Your Future Self"
- CTA button to `/interview`

### `pages/Interview.jsx`

- Step indicator (Upload + Roadmap done, Interview active)
- On mount: read profile, role, and roadmap from localStorage. Extract `skill_gaps` names as an array. Call `POST /interview/start` to get opening message and first question.
- **Header bar**: avatar, "Future {name}" label, role in mono, green pulsing "LIVE" indicator
- **Chat window**: scrollable, auto-scrolls to bottom on new message. Message bubbles:
  - User messages: right-aligned, cyan background, dark text
  - AI opening: left-aligned, card with cyan border
  - AI questions: left-aligned, card with "QUESTION" mono label in cyan
  - AI feedback: left-aligned, card with "FEEDBACK" mono label in gold, gold border
  - Complete message: green border
- **Input bar**: voice toggle button (mic icon, toggles red when active using Web Speech API with `lang: 'en-IN'`), text input, send button
- On send: append user message to history, POST to `/interview/turn`, append feedback and next question to chat
- When `is_complete` is true: POST to `/interview/summary`, save score to `pf_interview_score` in localStorage, show summary panel below chat
- **Summary panel**: circular SVG score indicator (colored green/gold/red based on score), two columns for strengths and improvements, Future Self closing quote, CTA to `/dashboard`

### `pages/Dashboard.jsx`

- Header with user's name, target role, and "Start Over" button that clears localStorage and navigates to `/`
- Three stat cards: Resume Score (hardcoded 72), Interview Score (from `pf_interview_score`), Roadmap Milestones count
- **Radar chart** (Recharts): plots skill gaps — current proficiency vs target 100. High priority gaps start at 20, medium at 50, low at 75
- **Bar chart** (Recharts): shows Resume, Interview, Roadmap scores side by side. Dark tooltip style
- Milestone summary grid: 2-column grid of milestone cards with month label, title, and resource
- Two action buttons: "Redo Interview" (navigates to `/interview`) and "New Resume" (navigates to `/upload`)

---

## Running the App

### Backend
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Add GROQ_API_KEY to .env
python -m uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Backend runs at `http://localhost:8000`, frontend at `http://localhost:5173`.
