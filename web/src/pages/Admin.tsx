
import React, { useEffect, useRef, useState } from "react";

const API = "http://localhost:8000";

export default function Admin(){
  const [isPlaying, setIsPlaying] = useState(false);
  const [avatars, setAvatars] = useState<any>({A:{}, B:{}});
  const [calendar, setCalendar] = useState<any[]>([]);
  const [prompt, setPrompt] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/admin");
    wsRef.current = ws;
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if(msg.channel === "init"){
        setIsPlaying(msg.data.is_playing);
        setAvatars(msg.data.avatars);
        setCalendar(msg.data.calendar || []);
      }
      if(msg.channel === "control.playstate"){
        setIsPlaying(msg.data.is_playing);
      }
      if(msg.channel === "avatars.update"){
        setAvatars(msg.data);
      }
      if(msg.channel === "calendar.update"){
        setCalendar(msg.data.calendar);
      }
    };
    return () => ws.close();
  }, []);

  const play = async () => { await fetch(`${API}/control/play`, { method: "POST" }); };
  const pause = async () => { await fetch(`${API}/control/pause`, { method: "POST" }); };

  const submitPrompt = async () => {
    await fetch(`${API}/admin/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    setPrompt("");
  };

  const uploadPDF = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    await fetch(`${API}/admin/upload/pdf`, { method: "POST", body: fd });
  };

  const uploadVideo = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    await fetch(`${API}/admin/upload/video`, { method: "POST", body: fd });
  };

  const saveAvatars = async () => {
    const body = {
      A_name: avatars.A.name || "Anchor A",
      B_name: avatars.B.name || "Anchor B",
      A_voice: avatars.A.voice || "en-US",
      B_voice: avatars.B.voice || "en-GB",
      A_accent: avatars.A.accent || "US",
      B_accent: avatars.B.accent || "UK",
      A_image_url: avatars.A.image || "",
      B_image_url: avatars.B.image || ""
    };
    await fetch(`${API}/admin/avatars`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(body)
    });
  };

  const addEvent = async (title: string, start: string, end: string, description: string) => {
    await fetch(`${API}/admin/calendar/add`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ title, start, end, description })
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <h1 className="text-2xl font-semibold">Admin Console</h1>

      <section className="p-4 rounded-xl border border-neutral-800 bg-neutral-900">
        <div className="flex items-center gap-3">
          <button onClick={play} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500">Play</button>
          <button onClick={pause} className="px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500">Pause</button>
          <div className="text-sm text-neutral-400">State: {isPlaying ? "LIVE" : "PAUSED"}</div>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-6">
        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900">
          <h2 className="font-medium mb-2">Prompt → Script</h2>
          <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} className="w-full h-32 p-3 rounded bg-neutral-950 border border-neutral-800" placeholder="Type a prompt for the anchors..."/>
          <div className="mt-2 flex justify-end">
            <button onClick={submitPrompt} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500">Send to Rundown</button>
          </div>
        </div>
        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900">
          <h2 className="font-medium mb-2">Upload PDF (PDF → Script)</h2>
          <input type="file" accept="application/pdf" onChange={e => e.target.files && uploadPDF(e.target.files[0])} />
          <div className="text-sm text-neutral-400 mt-2">Uses simple extractor unless external pdf-to-podcast is configured.</div>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-6">
        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900">
          <h2 className="font-medium mb-2">Upload Video (interrupt anchors)</h2>
          <input type="file" accept="video/*" onChange={e => e.target.files && uploadVideo(e.target.files[0])} />
        </div>
        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900">
          <h2 className="font-medium mb-2">Presenters</h2>
          <div className="grid grid-cols-2 gap-4">
            {["A","B"].map(k => (
              <div key={k} className="space-y-2">
                <div className="text-sm text-neutral-400">Anchor {k}</div>
                <input placeholder="Name" value={avatars[k]?.name || ""} onChange={e=> setAvatars({...avatars, [k]: {...avatars[k], name: e.target.value}})} className="w-full p-2 rounded bg-neutral-950 border border-neutral-800"/>
                <input placeholder="Image URL" value={avatars[k]?.image || ""} onChange={e=> setAvatars({...avatars, [k]: {...avatars[k], image: e.target.value}})} className="w-full p-2 rounded bg-neutral-950 border border-neutral-800"/>
                <input placeholder="Accent (e.g., US, UK)" value={avatars[k]?.accent || ""} onChange={e=> setAvatars({...avatars, [k]: {...avatars[k], accent: e.target.value}})} className="w-full p-2 rounded bg-neutral-950 border border-neutral-800"/>
                <input placeholder="Voice code (e.g., en-US)" value={avatars[k]?.voice || ""} onChange={e=> setAvatars({...avatars, [k]: {...avatars[k], voice: e.target.value}})} className="w-full p-2 rounded bg-neutral-950 border border-neutral-800"/>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <button onClick={saveAvatars} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500">Save Avatars</button>
          </div>
        </div>
      </section>

      <section className="p-4 rounded-xl border border-neutral-800 bg-neutral-900">
        <h2 className="font-medium mb-3">Calendar</h2>
        <CalendarForm onSubmit={(ev) => addEvent(ev.title, ev.start, ev.end, ev.description)} />
        <div className="mt-4 grid md:grid-cols-2 gap-3">
          {calendar.map((c, i) => (
            <div key={i} className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg">
              <div className="font-medium">{c.title}</div>
              <div className="text-xs text-neutral-400">{new Date(c.start).toLocaleString()} — {new Date(c.end).toLocaleString()}</div>
              <div className="text-sm mt-1">{c.description}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function CalendarForm({ onSubmit }:{ onSubmit: (x:{title:string; start:string; end:string; description:string})=>void }){
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [description, setDescription] = useState("");
  return (
    <div className="grid md:grid-cols-4 gap-3">
      <input placeholder="Title" className="p-2 rounded bg-neutral-950 border border-neutral-800" value={title} onChange={e=>setTitle(e.target.value)} />
      <input type="datetime-local" className="p-2 rounded bg-neutral-950 border border-neutral-800" value={start} onChange={e=>setStart(e.target.value)} />
      <input type="datetime-local" className="p-2 rounded bg-neutral-950 border border-neutral-800" value={end} onChange={e=>setEnd(e.target.value)} />
      <div className="flex gap-2">
        <input placeholder="Description" className="flex-1 p-2 rounded bg-neutral-950 border border-neutral-800" value={description} onChange={e=>setDescription(e.target.value)} />
        <button onClick={()=> { onSubmit({title, start, end, description}); setTitle(''); setStart(''); setEnd(''); setDescription(''); }} className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500">Add</button>
      </div>
    </div>
  );
}
