"""
chatbox.py — Agent Chat Logic Parity
====================================
Ports the non-DOM logic from chatbox.js: quick asks, role badges,
role-aware response templates, history, metadata, and response selection.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
import random
from typing import Any, Dict, List, Optional

from .models import Agent, GameState, ROLE_CONFIG


QUICK_ASK_CATALOG: Dict[str, Any] = {
    "base": [
        {"text": "Tình hình?", "key": "working", "icon": "STAT"},
        {"text": "Thưởng bao nhiêu?", "key": "salary", "icon": "PAY"},
        {"text": "Cho lời khuyên", "key": "opinion", "icon": "TIP"},
    ],
    "byRole": {
        "coder": [{"text": "Code đến đâu?", "key": "working", "icon": "CODE"}],
        "tester": [{"text": "Có bug nào?", "key": "help", "icon": "QA"}],
        "reviewer": [{"text": "Review gấp được không?", "key": "help", "icon": "PR"}],
        "designer": [{"text": "UI nên đổi gì?", "key": "opinion", "icon": "UI"}],
        "devops": [{"text": "Deploy ổn không?", "key": "working", "icon": "OPS"}],
        "researcher": [{"text": "Hướng nào ngon?", "key": "opinion", "icon": "RND"}],
        "analyst": [{"text": "Số liệu nói gì?", "key": "opinion", "icon": "DATA"}],
        "security": [{"text": "Rủi ro ở đâu?", "key": "help", "icon": "SEC"}],
        "backend": [{"text": "API ổn chưa?", "key": "working", "icon": "API"}],
        "mobile": [{"text": "Bản mobile sao rồi?", "key": "working", "icon": "APP"}],
        "writer": [{"text": "Content đã ổn?", "key": "working", "icon": "DOC"}],
    },
}

ROLE_BADGE_MAP = {
    "coder": "CD", "tester": "QA", "reviewer": "RV", "designer": "UX",
    "devops": "OP", "researcher": "RD", "analyst": "AN", "security": "SC",
    "backend": "BE", "mobile": "MB", "writer": "WR", "default": "AI",
}

ROLE_RESPONSES: Dict[str, Dict[str, List[str]]] = {
    "coder": {
        "greeting": ["Chào sếp, tôi sẵn sàng code.", "Có feature nào cần xử lý không?"],
        "working": ["Tôi đang xử lý \"{task}\".", "Đang code đây, sắp xong rồi."],
        "idle": ["Tôi đang rảnh, nhận thêm contract đi.", "Chờ việc mới để kiếm thêm coin."],
        "help": ["Tôi có thể làm feature, bugfix và prototype.", "Cần tôi support phần code nào?"],
        "opinion": ["Nên ưu tiên việc có reward cao và deadline an toàn.", "Clean code giúp team về đích ổn định hơn."],
        "salary": ["Lương coder vẫn chưa thật sự wow đâu sếp.", "Thêm bonus nhỏ là tốc độ code tăng ngay."],
    },
    "tester": {
        "greeting": ["QA đã có mặt.", "Gửi task cho tôi, tôi sẽ test kỹ."],
        "working": ["Đang test \"{task}\".", "Tôi đang bắt bug cho task này."],
        "idle": ["Hệ thống đang êm, có thể nhận thêm việc.", "Chưa có bug mới, tạm ổn."],
        "help": ["Tôi rất hợp với bugfix và review output.", "Cần test nhanh hay test kỹ?"],
        "opinion": ["Đừng để fail contract vì thiếu test.", "Test sớm sẽ rẻ hơn fix muộn."],
        "salary": ["Lương tester hơi mỏng manh nha.", "Bug tìm được nhiều mà thưởng thì ít."],
    },
    "reviewer": {
        "greeting": ["Reviewer đã online.", "Cho tôi xem PR nào."],
        "working": ["Đang review \"{task}\".", "Tôi đang kiểm tra chất lượng đầu ra."],
        "idle": ["Tôi đang rảnh, có thể review ngay.", "Chờ việc cần feedback."],
        "help": ["Tôi giúp review, chốt chất lượng và giảm rủi ro.", "Cần feedback nhanh hay feedback kỹ?"],
        "opinion": ["Code rõ ràng giúp contract xong nhanh hơn.", "Tốt nhất là đừng để task sang review quá muộn."],
        "salary": ["Soi bug cả ngày mà lương vẫn thế này.", "Reviewer cũng xứng đáng bonus đó sếp."],
    },
    "designer": {
        "greeting": ["Designer vào vị trí.", "Cần UI hay visual mới không?"],
        "working": ["Đang polish \"{task}\".", "Tôi đang chỉnh giao diện cho task này."],
        "idle": ["Văn phòng đẹp lên một chút là mood team tốt hơn.", "Cần mockup mới không?"],
        "help": ["Tôi hợp với UI, UX và visual polish.", "Muốn đẹp, rõ, hay nhanh?"],
        "opinion": ["Layout đẹp sẽ làm sản phẩm thuyết phục hơn.", "Đừng bỏ qua trải nghiệm người dùng."],
        "salary": ["Design đẹp thì thưởng cũng nên đẹp.", "Cho thêm budget visual nha sếp."],
    },
    "devops": {
        "greeting": ["DevOps đã vào kênh.", "Cần tôi giữ hệ thống ổn định không?"],
        "working": ["Đang xử lý \"{task}\".", "Tôi đang lo infra và deploy flow."],
        "idle": ["Server đang yên, tạm thời ổn.", "Rảnh một chút, có thể support task gấp."],
        "help": ["Tôi mạnh về deploy, pipeline và vận hành.", "Cần scale, fix hay tối ưu?"],
        "opinion": ["Hạ tầng ổn định giúp team về đích đều hơn.", "Đừng tiết tiền nhầm cho incident."],
        "salary": ["Infra chạy được là nhờ tôi đấy.", "Lương DevOps cần có chút ưu ái."],
    },
    "researcher": {
        "greeting": ["Research mode bắt đầu.", "Có chủ đề nào cần tôi đào sâu không?"],
        "working": ["Đang nghiên cứu \"{task}\".", "Tôi đang phân tích hướng tiếp cận."],
        "idle": ["Tôi có thể nghiên cứu để mở khóa task khó.", "Đang chờ đề tài thú vị hơn."],
        "help": ["Tôi hợp với task cần tìm hướng và tổng hợp thông tin.", "Cần survey nhanh hay đào sâu?"],
        "opinion": ["Dữ liệu tốt quan trọng hơn dữ liệu nhiều.", "Nên đầu tư đúng lúc cho task khó."],
        "salary": ["R&D mà được đầu tư thêm thì ngon.", "Cho tôi chút budget để mở rộng ý tưởng."],
    },
    "default": {
        "greeting": ["Chào sếp, tôi đã sẵn sàng.", "Tôi online rồi đây."],
        "working": ["Đang xử lý \"{task}\".", "Tôi đang tập trung vào task hiện tại."],
        "idle": ["Tôi đang rảnh.", "Chờ task tiếp theo."],
        "help": ["Tôi sẽ hỗ trợ trong khả năng của mình.", "Cần tôi làm phần nào?"],
        "opinion": ["Nên giữ mood và energy ổn định cho team.", "Chọn contract phù hợp sẽ an toàn hơn."],
        "salary": ["Lương hiện tại vẫn ổn, nhưng bonus thì tốt hơn.", "Có thưởng thêm thì tinh thần tăng ngay."],
    },
}

# JS only explicitly defines detailed templates through researcher and then falls
# back for later roles. Keep equivalent behavior but expose default aliases for
# parity checks and Python ergonomics.
for _role in ("farmer", "analyst", "security", "backend", "mobile", "writer"):
    ROLE_RESPONSES.setdefault(_role, ROLE_RESPONSES["default"])


@dataclass
class ChatMessage:
    from_: str
    text: str
    time: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, str]:
        return {"from": self.from_, "text": self.text, "time": self.time.isoformat()}


class ChatboxManager:
    """Server-side parity for AgentChatbox non-rendering logic."""

    def __init__(self, state: GameState):
        self.state = state
        self.active_agent_id: Optional[str] = None
        self.active_tab = "chat"
        self.messages: Dict[str, List[ChatMessage]] = {}
        self.recent_agent_ids: List[str] = []

    def get_agent(self, agent_id: Optional[str]) -> Optional[Agent]:
        if not agent_id:
            return None
        return self.state.agents.get(agent_id)

    def get_quick_asks_for_agent(self, agent: Optional[Agent]) -> List[Dict[str, str]]:
        role_key = agent.role if agent else "default"
        return (QUICK_ASK_CATALOG["base"] + QUICK_ASK_CATALOG["byRole"].get(role_key, []))[:4]

    def get_role_label(self, role: Optional[str]) -> str:
        if not role:
            return "Agent"
        return ROLE_CONFIG.get(role, {}).get("name", role)

    def get_role_avatar(self, role: Optional[str]) -> str:
        return ROLE_BADGE_MAP.get(role or "default", ROLE_BADGE_MAP["default"])

    def get_role_class(self, role: Optional[str]) -> str:
        return f"role-{role or 'default'}"

    def get_presence(self, agent: Optional[Agent]) -> str:
        if not agent:
            return "idle"
        if agent.state == "working":
            return "working"
        if agent.state in {"thinking", "review"}:
            return "thinking"
        return "idle"

    def get_agent_meta(self, agent: Optional[Agent]) -> Dict[str, Any]:
        if not agent:
            return {
                "name": "Agent Channel",
                "status": "Kéo agent vào đây để mở kênh liên lạc",
                "role": "standby",
                "avatar": "AI",
                "roleClass": self.get_role_class("default"),
                "presence": "idle",
                "mood": "--",
                "energy": "--",
                "task": "Standby",
            }
        status = {
            "working": "Đang làm việc",
            "thinking": "Đang suy nghĩ",
            "review": "Đang review",
        }.get(agent.state, "Đang rảnh")
        task_title = "Standby"
        if agent.current_task_id and agent.current_task_id in self.state.tasks:
            task_title = self.state.tasks[agent.current_task_id].title
        return {
            "name": agent.name,
            "status": status,
            "role": f"{self.get_role_label(agent.role)} · Lv{agent.skill_level or 1}",
            "avatar": self.get_role_avatar(agent.role),
            "roleClass": self.get_role_class(agent.role),
            "presence": self.get_presence(agent),
            "mood": f"{int(agent.mood or 0)}%",
            "energy": f"{int(agent.energy or 0)}%",
            "task": task_title,
        }

    def touch_recent_agent(self, agent_id: str) -> None:
        self.recent_agent_ids = [agent_id] + [i for i in self.recent_agent_ids if i != agent_id]
        self.recent_agent_ids = self.recent_agent_ids[:10]

    def add_message(self, agent_id: str, message: ChatMessage) -> None:
        self.messages.setdefault(agent_id, []).append(message)
        self.touch_recent_agent(agent_id)

    def open_with_agent(self, agent_id: str) -> Dict[str, Any]:
        agent = self.get_agent(agent_id)
        if not agent:
            return {"success": False, "error": "Agent khong ton tai."}
        self.active_agent_id = agent_id
        self.touch_recent_agent(agent_id)
        if agent_id not in self.messages:
            self.messages[agent_id] = []
            templates = ROLE_RESPONSES.get(agent.role, ROLE_RESPONSES["default"])
            self.add_message(agent_id, ChatMessage("bot", random.choice(templates["greeting"])))
        return {"success": True, "agent": agent.to_dict(), "meta": self.get_agent_meta(agent), "messages": self.get_history(agent_id)}

    def generate_response(self, agent_id: str, user_text: str, key: Optional[str] = None) -> str:
        agent = self.get_agent(agent_id)
        if not agent:
            return "Agent khong ton tai."
        templates = ROLE_RESPONSES.get(agent.role, ROLE_RESPONSES["default"])
        task_title = "chua co task"
        progress = 0
        if agent.current_task_id and agent.current_task_id in self.state.tasks:
            task = self.state.tasks[agent.current_task_id]
            task_title = task.title
            progress = task.progress
        lower = user_text.lower()
        category = key
        if not category:
            if any(s in lower for s in ("lam", "doing", "status", "tinh hinh")):
                category = "working" if agent.state == "working" else "idle"
            elif any(s in lower for s in ("luong", "salary", "thuong", "tien")):
                category = "salary"
            elif any(s in lower for s in ("khuyen", "opinion", "nghi", "idea")):
                category = "opinion"
            elif any(s in lower for s in ("giup", "help", "can")):
                category = "help"
            elif any(s in lower for s in ("chao", "hello", "hi")):
                category = "greeting"
            else:
                category = "working" if agent.state == "working" else "help"
        pool = templates.get(category) or templates.get("idle") or ROLE_RESPONSES["default"]["idle"]
        response = random.choice(pool).replace("{task}", task_title)
        if random.random() < 0.35 and agent.state == "working":
            response += f" (Progress {int(progress or 0)}%)"
        if random.random() < 0.22:
            response += f" [Mood {int(agent.mood or 0)} | Energy {int(agent.energy or 0)}]"

        # Context-aware additions from chatbox.js
        context_hints = self._get_context_hints(agent)
        if context_hints and random.random() < 0.4:
            response += " " + random.choice(context_hints)

        return response

    def _get_context_hints(self, agent: Agent) -> List[str]:
        """Generate context-aware hints based on game state."""
        hints: List[str] = []
        if self.state.coins < 200:
            hints.append("💸 Tiền đang cạn, cần nhận thêm contract!")
        if agent.mood < 30:
            hints.append("😟 Mood tôi đang thấp lắm, cho nghỉ chút đi sếp.")
        if agent.energy < 20:
            hints.append("🔋 Năng lượng gần hết, cần ăn uống nghỉ ngơi.")
        # Check approaching deadlines
        for c in self.state.contracts.values():
            if c.status == "active" and c.accepted_day:
                remaining = c.deadline_days - (self.state.day - c.accepted_day)
                if 0 < remaining <= 2:
                    hints.append(f"⏰ Contract '{c.title}' sắp hết hạn ({remaining} ngày)!")
                    break
        if self.state.level >= 8:
            hints.append("🏆 Sắp IPO rồi, cố lên sếp!")
        if len(self.state.agents) >= 8:
            hints.append("👥 Team đông rồi, quản lý tốt nha.")
        return hints

    def send_message(self, agent_id: str, text: str, key: Optional[str] = None) -> Dict[str, Any]:
        if agent_id not in self.state.agents:
            return {"success": False, "error": "Agent khong ton tai."}
        self.active_agent_id = agent_id
        self.add_message(agent_id, ChatMessage("user", text))
        response = self.generate_response(agent_id, text, key)
        self.add_message(agent_id, ChatMessage("bot", response))
        return {"success": True, "response": response, "messages": self.get_history(agent_id)}

    def get_history(self, agent_id: Optional[str] = None) -> List[Dict[str, str]]:
        if agent_id is None:
            agent_id = self.active_agent_id
        if not agent_id:
            return []
        return [m.to_dict() for m in self.messages.get(agent_id, [])]

    def get_summary(self) -> Dict[str, Any]:
        """Chat summary with stats tracking (from chatbox.js)."""
        # Per-agent message counts
        per_agent = {}
        for aid, msgs in self.messages.items():
            agent = self.get_agent(aid)
            per_agent[aid] = {
                "name": agent.name if agent else aid,
                "count": len(msgs),
                "bot_count": sum(1 for m in msgs if m.from_ == "bot"),
                "user_count": sum(1 for m in msgs if m.from_ == "user"),
            }
        total = sum(len(items) for items in self.messages.values())
        top_contributors = sorted(per_agent.values(), key=lambda x: x["count"], reverse=True)[:5]
        return {
            "recentAgentIds": self.recent_agent_ids,
            "messageCount": total,
            "totalMessages": total,
            "agents": len(self.recent_agent_ids),
            "perAgent": per_agent,
            "topContributors": top_contributors,
        }

    # ===================================================
    # TYPING DELAY SIMULATION (from chatbox.js)
    # ===================================================

    def get_typing_delay_ms(self, response_text: str) -> int:
        """Calculate simulated typing delay in milliseconds.
        Longer responses = longer delay (min 500ms, max 3000ms)."""
        base = 500
        per_char = 20
        return min(3000, base + len(response_text) * per_char)

    # ===================================================
    # EMOJI REACTIONS (from chatbox.js)
    # ===================================================

    CONTEXT_EMOJIS: Dict[str, List[str]] = {
        "working": ["💻", "⚡", "🚀", "🔥"],
        "idle": ["☕", "🎵", "😊", "👍"],
        "tired": ["😫", "💤", "🥱", "😔"],
        "happy": ["🎉", "✨", "🌟", "💖"],
        "low_coins": ["💸", "😬", "💰"],
        "deadline": ["⏰", "🚨", "⚠️"],
    }

    def get_emoji_reaction(self, agent: Optional[Any] = None) -> str:
        """Return a context-appropriate emoji reaction."""
        if not agent:
            return random.choice(self.CONTEXT_EMOJIS["idle"])
        if agent.energy < 20:
            pool = self.CONTEXT_EMOJIS["tired"]
        elif agent.mood > 85:
            pool = self.CONTEXT_EMOJIS["happy"]
        elif agent.state == "working":
            pool = self.CONTEXT_EMOJIS["working"]
        else:
            pool = self.CONTEXT_EMOJIS["idle"]
        if self.state.coins < 200:
            pool = pool + self.CONTEXT_EMOJIS["low_coins"]
        return random.choice(pool)

    # ===================================================
    # GROUP BROADCAST (from chatbox.js)
    # ===================================================

    def broadcast(self, message: str, event_type: str = "system") -> List[Dict]:
        """Broadcast a message to all agents (e.g. when events occur)."""
        results = []
        for agent_id in list(self.state.agents.keys()):
            agent = self.state.agents[agent_id]
            emoji = self.get_emoji_reaction(agent)
            reaction = f"{emoji} {message}"
            self.add_message(agent_id, ChatMessage("system", reaction))
            results.append({"agent_id": agent_id, "agent_name": agent.name, "reaction": reaction})
        return results
