
from datetime import datetime
class NewsAgent:
    def __init__(self):
        self._items = [
            {"headline": "Markets steady after overnight volatility", "ts": datetime.utcnow().isoformat()},
            {"headline": "Local sports team advances to finals", "ts": datetime.utcnow().isoformat()},
            {"headline": "Tech: new AI model sets benchmark", "ts": datetime.utcnow().isoformat()},
        ]
    def latest_items(self):
        return self._items[-5:]
