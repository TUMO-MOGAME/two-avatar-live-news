
from datetime import datetime, timedelta
class EventsAgent:
    def __init__(self):
        now = datetime.utcnow()
        self._items = [
            {"title": "Product Launch", "when": (now + timedelta(hours=1)).isoformat()},
            {"title": "Interview with Guest Analyst", "when": (now + timedelta(hours=2)).isoformat()},
            {"title": "Weekly Roundup Show", "when": (now + timedelta(days=1)).isoformat()},
        ]
    def upcoming_items(self):
        return self._items[:8]
