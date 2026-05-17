"""Tech tree research system ported from legacy_web/tech-tree.js."""

from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import List, Optional


@dataclass(frozen=True)
class TechDef:
    id: str
    branch: str
    tier: int
    name: str
    icon: str
    desc: str
    cost: int
    research_days: float
    requires: List[str]
    effect: str
    value: float

    def to_dict(self) -> dict:
        return asdict(self)


TECHS: List[TechDef] = [
    TechDef("fast_compile", "engineering", 1, "Fast Compile", "⚡", "Tối ưu build pipeline — Task hoàn thành nhanh hơn 15%", 200, 1, [], "task_speed", 0.15),
    TechDef("code_review_bot", "engineering", 2, "Code Review Bot", "🤖", "Bot tự review — 50% chance tự approve task", 400, 2, ["fast_compile"], "auto_review", 0.5),
    TechDef("cicd_mastery", "engineering", 3, "CI/CD Mastery", "🔄", "Pipeline tự động — Deploy tasks nhanh hơn 30%", 700, 2.5, ["code_review_bot"], "deploy_speed", 0.3),
    TechDef("quantum_computing", "engineering", 4, "Quantum Computing", "⚛️", "Sức mạnh tính toán vượt trội — +50% tốc độ mọi task", 1500, 3, ["cicd_mastery"], "task_speed", 0.5),
    TechDef("smart_assign", "ai_research", 1, "Smart Assign", "🧠", "AI tự match role → task — +10% quality bonus", 250, 1.5, [], "quality_bonus", 0.1),
    TechDef("mood_prediction", "ai_research", 2, "Mood Prediction", "🔮", "Dự đoán mood agent — Giảm 25% mood decay", 450, 2, ["smart_assign"], "mood_decay_reduction", 0.25),
    TechDef("neural_optimizer", "ai_research", 3, "Neural Optimizer", "🕸️", "Mạng neural tối ưu workflow — +25% XP toàn team", 800, 2.5, ["mood_prediction"], "xp_bonus", 0.25),
    TechDef("agi_prototype", "ai_research", 4, "AGI Prototype", "🌟", "Đột phá AI! Agent hiệu suất tăng vọt +40% toàn diện", 2000, 3, ["neural_optimizer"], "agi_boost", 0.4),
    TechDef("overtime_policy", "management", 1, "Overtime Policy", "⏰", "Cho phép tăng ca — +20% speed nhưng mood giảm nhanh hơn", 150, 1, [], "overtime", 0.2),
    TechDef("remote_work", "management", 2, "Remote Work", "🏠", "Làm việc từ xa — Giảm 30% mood decay khi idle", 350, 1.5, ["overtime_policy"], "remote_work", 0.3),
    TechDef("team_building", "management", 3, "Team Building", "🤝", "Tăng cường team — +50% pair programming & mentoring chance", 600, 2, ["remote_work"], "teamwork", 0.5),
    TechDef("ipo_express", "management", 4, "IPO Express", "📈", "Tăng tốc IPO — Giảm 40% XP cần để level up", 1200, 3, ["team_building"], "xp_requirement_reduction", 0.4),
]


class TechTreeManager:
    def __init__(self, state):
        self.state = state
        if not hasattr(state, "tech_unlocked"):
            state.tech_unlocked = []
        if not hasattr(state, "tech_current_research"):
            state.tech_current_research = None
        if not hasattr(state, "tech_research_progress"):
            state.tech_research_progress = 0.0

    def get_tech(self, tech_id: str) -> Optional[TechDef]:
        return next((t for t in TECHS if t.id == tech_id), None)

    def is_unlocked(self, tech_id: str) -> bool:
        return tech_id in self.state.tech_unlocked

    def can_research(self, tech_id: str) -> tuple[bool, str]:
        tech = self.get_tech(tech_id)
        if not tech:
            return False, "Technology not found"
        if self.is_unlocked(tech_id):
            return False, "Technology already unlocked"
        if self.state.tech_current_research:
            return False, "Another technology is already researching"
        missing = [req for req in tech.requires if not self.is_unlocked(req)]
        if missing:
            return False, f"Missing prerequisites: {', '.join(missing)}"
        if self.state.coins < tech.cost:
            return False, f"Not enough coins: need {tech.cost}Ⓒ"
        return True, "OK"

    def start_research(self, tech_id: str) -> dict:
        ok, msg = self.can_research(tech_id)
        if not ok:
            return {"success": False, "message": msg}
        tech = self.get_tech(tech_id)
        self.state.coins -= tech.cost
        self.state.total_spent += tech.cost
        self.state.tech_current_research = tech_id
        self.state.tech_research_progress = 0.0
        return {"success": True, "message": f"Research started: {tech.name}", "tech": tech.to_dict()}

    def cancel_research(self) -> dict:
        tech_id = self.state.tech_current_research
        if not tech_id:
            return {"success": False, "message": "No active research"}
        tech = self.get_tech(tech_id)
        refund = int((tech.cost if tech else 0) * 0.5)
        self.state.coins += refund
        self.state.total_earned += refund
        self.state.tech_current_research = None
        self.state.tech_research_progress = 0.0
        return {"success": True, "message": f"Research canceled, refunded {refund}Ⓒ", "refund": refund}

    def tick_research(self, researcher_count: int = 0) -> dict:
        tech_id = self.state.tech_current_research
        if not tech_id:
            return {"active": False}
        tech = self.get_tech(tech_id)
        if not tech:
            self.state.tech_current_research = None
            return {"active": False, "message": "Invalid research cleared"}
        speed = 1.0 + researcher_count * 0.25
        self.state.tech_research_progress = min(100.0, self.state.tech_research_progress + (100.0 / tech.research_days) * speed)
        completed = self.state.tech_research_progress >= 100.0
        result = {"active": True, "tech": tech.to_dict(), "progress": round(self.state.tech_research_progress, 2), "completed": completed}
        if completed:
            self.state.tech_unlocked.append(tech_id)
            self.state.tech_current_research = None
            self.state.tech_research_progress = 0.0
            result["message"] = f"Unlocked: {tech.name}"
        return result

    def _sum_effects(self, *effects: str) -> float:
        return sum(t.value for tid in self.state.tech_unlocked for t in [self.get_tech(tid)] if t and t.effect in effects)

    def get_task_speed_bonus(self) -> float:
        return self._sum_effects("task_speed", "overtime", "agi_boost")

    def get_xp_multiplier(self) -> float:
        return 1.0 + self._sum_effects("xp_bonus") + self._sum_effects("agi_boost") * 0.5

    def get_mood_decay_reduction(self) -> float:
        return min(0.6, self._sum_effects("mood_decay_reduction", "remote_work"))

    def get_auto_review_chance(self) -> float:
        return self._sum_effects("auto_review")

    def get_teamwork_bonus(self) -> float:
        return self._sum_effects("teamwork")

    def get_xp_req_reduction(self) -> float:
        return self._sum_effects("xp_requirement_reduction")

    def get_status(self) -> dict:
        unlocked = set(self.state.tech_unlocked)
        return {
            "techs": [{**t.to_dict(), "unlocked": t.id in unlocked, "can_research": self.can_research(t.id)[0]} for t in TECHS],
            "unlocked": list(self.state.tech_unlocked),
            "current_research": self.state.tech_current_research,
            "research_progress": round(self.state.tech_research_progress, 2),
            "bonuses": {
                "task_speed": self.get_task_speed_bonus(),
                "xp_multiplier": self.get_xp_multiplier(),
                "mood_decay_reduction": self.get_mood_decay_reduction(),
                "auto_review": self.get_auto_review_chance(),
                "teamwork": self.get_teamwork_bonus(),
                "xp_requirement_reduction": self.get_xp_req_reduction(),
            },
        }
