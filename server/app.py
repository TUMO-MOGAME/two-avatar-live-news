
import os
import time
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from starlette.websockets import WebSocketState
from PyPDF2 import PdfReader

from orchestrator import RundownOrchestrator, ScriptSegment
from agents.news_agent import NewsAgent
from agents.events_agent import EventsAgent

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="Two-Avatar Live News API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

state = {
    "is_playing": False,
    "current_time": None,
    "admin_avatars": {
        "A": {"name": "Anchor A", "image": "/avatars/a.png", "voice": "en-US", "accent": "US"},
        "B": {"name": "Anchor B", "image": "/avatars/b.png", "voice": "en-GB", "accent": "UK"}
    },
    "calendar": [],
    "pushed_video": None
}

presenter_clients: List[WebSocket] = []
admin_clients: List[WebSocket] = []

orchestrator = RundownOrchestrator(debounce_seconds=2.0)
news_agent = NewsAgent()
events_agent = EventsAgent()

def now_iso():
    return datetime.utcnow().isoformat()

async def broadcast(channel: str, payload: Dict[str, Any]):
    dead = []
    for ws in presenter_clients + admin_clients:
        if ws.application_state != WebSocketState.CONNECTED:
            dead.append(ws)
            continue
        try:
            await ws.send_json({"channel": channel, "data": payload})
        except Exception:
            dead.append(ws)
    for ws in dead:
        if ws in presenter_clients:
            presenter_clients.remove(ws)
        if ws in admin_clients:
            admin_clients.remove(ws)

@app.websocket("/ws/presenter")
async def ws_presenter(ws: WebSocket):
    await ws.accept()
    presenter_clients.append(ws)
    await ws.send_json({"channel": "init", "data": {
        "is_playing": state["is_playing"],
        "avatars": state["admin_avatars"],
        "news": news_agent.latest_items(),
        "events": events_agent.upcoming_items(),
    }})
    try:
        while True:
            msg = await ws.receive_text()
            if msg == "ping":
                await ws.send_text("pong")
    except WebSocketDisconnect:
        pass
    finally:
        if ws in presenter_clients:
            presenter_clients.remove(ws)

@app.websocket("/ws/admin")
async def ws_admin(ws: WebSocket):
    await ws.accept()
    admin_clients.append(ws)
    await ws.send_json({"channel": "init", "data": {
        "is_playing": state["is_playing"],
        "avatars": state["admin_avatars"],
        "calendar": state["calendar"],
    }})
    try:
        while True:
            _ = await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        if ws in admin_clients:
            admin_clients.remove(ws)

class PromptIn(BaseModel):
    prompt: str

@app.post("/admin/prompt")
async def admin_prompt(p: PromptIn):
    segments = orchestrator.prompt_to_script(p.prompt)
    await broadcast("rundown.append", {"segments": [s.model_dump() for s in segments]})
    return {"ok": True, "segments": [s.model_dump() for s in segments]}

@app.post("/admin/upload/pdf")
async def upload_pdf(file: UploadFile = File(...)):
    fname = f"{int(time.time())}_{file.filename}"
    path = os.path.join(UPLOAD_DIR, fname)
    with open(path, "wb") as f:
        f.write(await file.read())

    text = ""
    try:
        reader = PdfReader(path)
        for page in reader.pages:
            text += page.extract_text() or ""
    except Exception as e:
        return JSONResponse({"ok": False, "error": f"PDF read failed: {e}"}, status_code=400)

    segments = orchestrator.text_to_script(text)
    await broadcast("rundown.append", {"segments": [s.model_dump() for s in segments]})
    return {"ok": True, "segments": [s.model_dump() for s in segments]}

@app.post("/admin/upload/video")
async def upload_video(file: UploadFile = File(...)):
    fname = f"{int(time.time())}_{file.filename}"
    path = os.path.join(UPLOAD_DIR, fname)
    with open(path, "wb") as f:
        f.write(await file.read())

    state["pushed_video"] = f"/api/media/{fname}"
    state["is_playing"] = False
    await broadcast("control.video", {"url": state["pushed_video"]})
    await broadcast("control.playstate", {"is_playing": state["is_playing"], "ts": now_iso()})
    return {"ok": True, "url": state["pushed_video"]}

@app.get("/api/media/{name}")
async def serve_media(name: str):
    path = os.path.join(UPLOAD_DIR, name)
    if not os.path.exists(path):
        return JSONResponse({"ok": False, "error": "Not found"}, status_code=404)
    return FileResponse(path)

class AvatarConfig(BaseModel):
    A_name: str
    B_name: str
    A_voice: str
    B_voice: str
    A_accent: str
    B_accent: str
    A_image_url: str | None = None
    B_image_url: str | None = None

@app.post("/admin/avatars")
async def set_avatars(cfg: AvatarConfig):
    if cfg.A_image_url:
        state["admin_avatars"]["A"]["image"] = cfg.A_image_url
    if cfg.B_image_url:
        state["admin_avatars"]["B"]["image"] = cfg.B_image_url
    state["admin_avatars"]["A"]["name"] = cfg.A_name
    state["admin_avatars"]["B"]["name"] = cfg.B_name
    state["admin_avatars"]["A"]["voice"] = cfg.A_voice
    state["admin_avatars"]["B"]["voice"] = cfg.B_voice
    state["admin_avatars"]["A"]["accent"] = cfg.A_accent
    state["admin_avatars"]["B"]["accent"] = cfg.B_accent
    await broadcast("avatars.update", state["admin_avatars"])
    return {"ok": True, "avatars": state["admin_avatars"]}

class CalendarItem(BaseModel):
    title: str
    start: str
    end: str
    description: str | None = ""

@app.post("/admin/calendar/add")
async def add_calendar(item: CalendarItem):
    state["calendar"].append(item.model_dump())
    await broadcast("calendar.update", {"calendar": state["calendar"]})
    return {"ok": True, "calendar": state["calendar"]}

@app.post("/control/play")
async def control_play():
    state["is_playing"] = True
    state["current_time"] = now_iso()
    await broadcast("control.playstate", {"is_playing": True, "ts": state["current_time"]})
    return {"ok": True}

@app.post("/control/pause")
async def control_pause():
    state["is_playing"] = False
    await broadcast("control.playstate", {"is_playing": False, "ts": now_iso()})
    return {"ok": True}
