
# Two-Avatar Live News (Starter)
A full-stack starter for a live "PDF/Prompt → Two Anchors" news presenter with an Admin site and a Presenter screen.

## Quick Start
### Backend
```bash
cd server
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

### Frontend
```bash
cd web
npm i
npm run dev
```

Admin: http://localhost:5173/admin  
Presenter: http://localhost:5173/presenter
