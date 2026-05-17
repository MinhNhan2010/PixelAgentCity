"""Achievement system ported from legacy_web/achievements.js."""

from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Callable, Dict, List, Optional, Any


@dataclass(frozen=True)
class AchievementDef:
    id: str
    cat: str
    icon: str
    title: str
    desc: str

    def to_dict(self, unlocked: bool = False) -> dict:
        data = asdict(self)
        data["unlocked"] = unlocked
        return data


ACHIEVEMENTS: List[AchievementDef] = [
    AchievementDef("first_coin", "economy", "💰", "Đồng Xu Đầu Tiên", "Kiếm được 100Ⓒ đầu tiên"),
    AchievementDef("rich_1k", "economy", "💎", "Nhà Đầu Tư", "Sở hữu 1,000Ⓒ cùng lúc"),
    AchievementDef("rich_10k", "economy", "🏦", "Tỷ Phú Pixel", "Sở hữu 10,000Ⓒ cùng lúc"),
    AchievementDef("earned_50k", "economy", "📈", "Dòng Tiền Mạnh", "Tổng thu nhập đạt 50,000Ⓒ"),
    AchievementDef("first_contract", "contract", "📋", "Hợp Đồng Đầu Tiên", "Hoàn thành hợp đồng đầu tiên"),
    AchievementDef("contracts_5", "contract", "📑", "Đối Tác Tin Cậy", "Hoàn thành 5 hợp đồng"),
    AchievementDef("contracts_15", "contract", "🏅", "Nhà Thầu Chuyên Nghiệp", "Hoàn thành 15 hợp đồng"),
    AchievementDef("contracts_30", "contract", "👑", "Huyền Thoại Contracts", "Hoàn thành 30 hợp đồng"),
    AchievementDef("no_fail", "contract", "✨", "Hoàn Hảo", "Hoàn thành 10 contract, 0 thất bại"),
    AchievementDef("hire_first", "agent", "🤖", "Tuyển Dụng Đầu Tiên", "Thuê agent đầu tiên"),
    AchievementDef("team_5", "agent", "👥", "Đội Ngũ Nhỏ", "Có 5 agent trong team"),
    AchievementDef("team_10", "agent", "🏢", "Công Ty Lớn", "Có 10 agent trong team"),
    AchievementDef("agent_lvl5", "agent", "🎖️", "Agent Kỳ Cựu", "Có agent đạt level 5"),
    AchievementDef("all_roles", "agent", "🌈", "Đa Dạng Nhân Sự", "Có ít nhất 5 role khác nhau"),
    AchievementDef("level_3", "company", "⭐", "Startup Thành Công", "Đạt Company Level 3"),
    AchievementDef("level_5", "company", "🌟", "Scale-Up", "Đạt Company Level 5"),
    AchievementDef("level_8", "company", "💫", "Unicorn", "Đạt Company Level 8"),
    AchievementDef("level_10", "company", "🏆", "IPO Thành Công!", "Đạt Company Level 10 — Chiến thắng!"),
    AchievementDef("rep_5", "company", "⭐", "5 Sao Danh Tiếng", "Đạt reputation 5.0"),
    AchievementDef("day_30", "company", "📅", "Tháng Đầu Tiên", "Sống sót qua 30 ngày"),
    AchievementDef("poker_play", "minigame", "🃏", "Tay Chơi Poker", "Chơi poker lần đầu"),
    AchievementDef("billiard_play", "minigame", "🎱", "Cơ Thủ", "Chơi billiards lần đầu"),
    AchievementDef("slot_win", "minigame", "🎰", "Lucky Spin", "Thắng slot machine"),
    AchievementDef("gold_trade", "minigame", "📈", "Trader Vàng", "Mua bán vàng lần đầu"),
]


class AchievementManager:
    def __init__(self, state):
        self.state = state
        if not hasattr(self.state, "achievement_unlocked"):
            self.state.achievement_unlocked = []

    @property
    def unlocked(self) -> set[str]:
        return set(getattr(self.state, "achievement_unlocked", []))

    def _set_unlocked(self, unlocked: set[str]) -> None:
        self.state.achievement_unlocked = sorted(unlocked)

    def check(self) -> List[dict]:
        unlocked = self.unlocked
        newly = []
        for ach in ACHIEVEMENTS:
            if ach.id in unlocked:
                continue
            if self._is_met(ach.id):
                unlocked.add(ach.id)
                newly.append(ach.to_dict(True))
        if newly:
            self._set_unlocked(unlocked)
        return newly

    def _is_met(self, ach_id: str) -> bool:
        s = self.state
        agents = list(getattr(s, "agents", {}).values())
        flags = getattr(s, "mini_game_flags", {})
        checks: Dict[str, Callable[[], bool]] = {
            "first_coin": lambda: s.total_earned >= 100,
            "rich_1k": lambda: s.coins >= 1000,
            "rich_10k": lambda: s.coins >= 10000,
            "earned_50k": lambda: s.total_earned >= 50000,
            "first_contract": lambda: s.contracts_completed >= 1,
            "contracts_5": lambda: s.contracts_completed >= 5,
            "contracts_15": lambda: s.contracts_completed >= 15,
            "contracts_30": lambda: s.contracts_completed >= 30,
            "no_fail": lambda: s.contracts_completed >= 10 and s.contracts_failed == 0,
            "hire_first": lambda: len(agents) >= 3,
            "team_5": lambda: len(agents) >= 5,
            "team_10": lambda: len(agents) >= 10,
            "agent_lvl5": lambda: any(getattr(a, "skill_level", 1) >= 5 for a in agents),
            "all_roles": lambda: len({getattr(a, "role", "") for a in agents}) >= 5,
            "level_3": lambda: s.level >= 3,
            "level_5": lambda: s.level >= 5,
            "level_8": lambda: s.level >= 8,
            "level_10": lambda: s.level >= 10,
            "rep_5": lambda: s.reputation >= 5.0,
            "day_30": lambda: s.day >= 30,
            "poker_play": lambda: bool(flags.get("poker_played")),
            "billiard_play": lambda: bool(flags.get("billiard_played")),
            "slot_win": lambda: bool(flags.get("slot_won")),
            "gold_trade": lambda: bool(flags.get("gold_traded")),
        }
        return checks.get(ach_id, lambda: False)()

    def get_all(self) -> List[dict]:
        unlocked = self.unlocked
        return [a.to_dict(a.id in unlocked) for a in ACHIEVEMENTS]

    def get_progress(self) -> dict:
        count = len(self.unlocked)
        total = len(ACHIEVEMENTS)
        return {"unlocked": count, "total": total, "percent": round(count / total * 100) if total else 0}

    def get_by_category(self, category: str) -> List[dict]:
        return [a for a in self.get_all() if a["cat"] == category]
