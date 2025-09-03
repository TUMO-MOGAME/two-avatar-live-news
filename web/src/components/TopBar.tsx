
import React, { useEffect, useState } from "react";

export default function TopBar({ isPlaying }: { isPlaying: boolean }){
  const [now, setNow] = useState<string>(new Date().toLocaleString());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date().toLocaleString()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex items-center justify-between p-3 bg-neutral-900 border-b border-neutral-800">
      <div className="flex items-center gap-2">
        <span className="live-dot" />
        <span className="text-red-400 font-semibold">{isPlaying ? "LIVE" : "PAUSED"}</span>
      </div>
      <div className="font-mono text-sm">{now}</div>
    </div>
  );
}
