
import React from "react";

export default function Ticker({ items }: { items: string[] }){
  return (
    <div className="ticker bg-neutral-900 border-t border-neutral-800 py-1 text-sm">
      <p>
        {items.map((it, i) => (
          <span key={i} className="mx-8">• {it}</span>
        ))}
      </p>
    </div>
  );
}
