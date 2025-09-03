
import re, time, uuid
from typing import List, Optional
from pydantic import BaseModel

BACKCHANNELS = {"yes","okay","ok","i understand","right","sure","hmm"}

class ScriptSegment(BaseModel):
    id: str
    speaker: str  # "A" or "B"
    text: str
    est_seconds: float = 4.0

class RundownOrchestrator:
    def __init__(self, debounce_seconds: float = 2.0):
        self.queue: List[ScriptSegment] = []
        self.debounce_seconds = debounce_seconds
        self.next_speaker = "A"

    def _mk(self, speaker: str, text: str, est_seconds: float) -> ScriptSegment:
        return ScriptSegment(id=str(uuid.uuid4()), speaker=speaker, text=text.strip(), est_seconds=est_seconds)

    def prompt_to_script(self, prompt: str) -> List[ScriptSegment]:
        sentences = re.split(r'(?<=[.!?])\s+', prompt.strip())
        return self._sentences_to_segments(sentences)

    def text_to_script(self, text: str) -> List[ScriptSegment]:
        sentences = re.split(r'(?<=[.!?])\s+', text.strip())
        merged, chunk = [], []
        for s in sentences:
            if not s: continue
            chunk.append(s)
            if len(chunk) >= 3 or len(" ".join(chunk)) > 300:
                merged.append(" ".join(chunk)); chunk = []
        if chunk: merged.append(" ".join(chunk))
        return self._sentences_to_segments(merged)

    def _sentences_to_segments(self, items: List[str]) -> List[ScriptSegment]:
        segs: List[ScriptSegment] = []
        current = self.next_speaker
        last_switch = 0.0

        for raw in items:
            text = raw.strip()
            if not text: continue
            is_short = text.lower() in BACKCHANNELS or len(text.split()) <= 2
            now = time.time()
            if not is_short and (now - last_switch) >= self.debounce_seconds:
                current = "B" if current == "A" else "A"
                last_switch = now
            est = max(2.0, min(10.0, len(text.split()) / 2.5))
            segs.append(self._mk(current, text, est))

        self.next_speaker = "B" if current == "A" else "A"
        self.queue.extend(segs)
        return segs

    def next_segment(self) -> Optional[ScriptSegment]:
        if not self.queue: return None
        return self.queue.pop(0)
