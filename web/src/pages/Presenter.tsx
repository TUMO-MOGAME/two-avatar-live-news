
import React, { useEffect, useMemo, useRef, useState } from "react";
import TopBar from "../components/TopBar";
import Ticker from "../components/Ticker";

type Segment = { id: string; speaker: "A" | "B"; text: string; est_seconds: number; video_url?: string };

export default function Presenter(){
  const [isPlaying, setIsPlaying] = useState(false);
  const [avatars, setAvatars] = useState<any>({"A": {}, "B": {}});
  const [queue, setQueue] = useState<Segment[]>([]);
  const [current, setCurrent] = useState<Segment | null>(null);
  const [news, setNews] = useState<string[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [pushedVideo, setPushedVideo] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const speakingRef = useRef<boolean>(false);
  const lastSwitchRef = useRef<number>(0);

  const voiceFor = (speaker: "A"|"B") => {
    const voices = window.speechSynthesis.getVoices();
    const byAccent = avatars[speaker]?.accent?.toLowerCase() || "";
    const v = voices.find(v => v.lang?.toLowerCase().includes(byAccent));
    return v || voices[0];
  };

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/presenter");
    wsRef.current = ws;
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if(msg.channel === "init"){
        setIsPlaying(msg.data.is_playing);
        setAvatars(msg.data.avatars);
        setNews((msg.data.news || []).map((n:any)=> n.headline));
        setEvents(msg.data.events || []);
      }
      if(msg.channel === "rundown.append"){
        setQueue(q => [...q, ...msg.data.segments]);
      }
      if(msg.channel === "control.playstate"){
        setIsPlaying(msg.data.is_playing);
      }
      if(msg.channel === "control.video"){
        setPushedVideo(msg.data.url);
      }
      if(msg.channel === "avatars.update"){
        setAvatars(msg.data);
      }
    };
    return () => ws.close();
  }, []);

  useEffect(() => {
    if(!isPlaying || speakingRef.current || pushedVideo) return;
    if(current) return;
    const next = queue[0];
    if(!next) return;

    // Debounce: hold quick backchannels within 2s to reduce switching
    const now = Date.now();
    const since = now - lastSwitchRef.current;
    const isShort = next.text.trim().split(/\s+/).length <= 2 || ["yes","ok","okay","i understand"].includes(next.text.toLowerCase());
    if(since < 2000 && isShort){
      setTimeout(()=>{}, 300);
      return;
    }

    setQueue(q => q.slice(1));
    setCurrent(next);
    speakingRef.current = true;

    const utter = new SpeechSynthesisUtterance(next.text);
    const v = voiceFor(next.speaker);
    if(v) utter.voice = v;
    utter.onend = () => {
      speakingRef.current = false;
      lastSwitchRef.current = Date.now();
      setCurrent(null);
    };
    window.speechSynthesis.speak(utter);
  }, [isPlaying, queue, current, pushedVideo]);

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar isPlaying={isPlaying} />
      <div className="flex flex-1">
        <div className="flex-1 relative">
          <div className="h-full flex items-center justify-center">
            {pushedVideo ? (
              <video className="w-full h-full object-contain" src={pushedVideo} autoPlay controls onEnded={()=> setPushedVideo(null)} />
            ) : (
              <div className="w-[90%] max-w-5xl aspect-video bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden relative">
                <div className="absolute inset-0 grid grid-cols-2">
                  <div className={`flex items-center justify-center transition-all duration-500 ${current?.speaker === "A" ? "opacity-100 scale-100" : "opacity-40 scale-95"}`}>
                    <img src={avatars.A?.image || ""} className="h-[75%] object-contain" />
                  </div>
                  <div className={`flex items-center justify-center transition-all duration-500 ${current?.speaker === "B" ? "opacity-100 scale-100" : "opacity-40 scale-95"}`}>
                    <img src={avatars.B?.image || ""} className="h-[75%] object-contain" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                  <div className="flex items-baseline gap-3">
                    <span className="text-lg font-semibold">{current?.speaker === "A" ? avatars.A?.name : avatars.B?.name}</span>
                    <span className="text-neutral-300">{current?.text || "Waiting for next segment..."}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="w-[360px] border-l border-neutral-800 p-4 space-y-6">
          <div>
            <div className="text-sm uppercase tracking-wider text-neutral-400">Upcoming</div>
            <div className="mt-2 space-y-2">
              {events.map((e, i) => (
                <div key={i} className="p-3 rounded-lg bg-neutral-900 border border-neutral-800">
                  <div className="font-medium">{e.title}</div>
                  <div className="text-xs text-neutral-400">{new Date(e.when).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Ticker items={news} />
    </div>
  );
}
