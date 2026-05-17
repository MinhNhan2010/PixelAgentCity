"""
game_app.py — Remaining game.js Logic Parity
===========================================
Room catalog, sound event data, office bonus formulas, and helpers from game.js.
Visual/audio playback remains in browser for 100% UI parity.
"""

from __future__ import annotations

from typing import Any, Dict, List


SOUND_EVENTS: Dict[str, Any] = {
    "coin": [(880, 0.08, "square", 0.3, 0), (1174, 0.12, "square", 0.3, 60)],
    "spend": [(330, 0.1, "sawtooth", 0.3, 0), (220, 0.15, "sawtooth", 0.3, 80)],
    "levelUp": [(523, 0.15, "square", 0.25, 0), (659, 0.15, "square", 0.25, 100), (784, 0.15, "square", 0.25, 200), (1047, 0.15, "square", 0.25, 300)],
    "taskComplete": [(660, 0.08, "square", 0.3, 0), (880, 0.1, "square", 0.3, 70), (1100, 0.15, "square", 0.3, 140)],
    "contractNew": [(440, 0.05, "square", 0.3, 0), (660, 0.08, "square", 0.3, 100)],
    "contractFail": [(300, 0.15, "sawtooth", 0.3, 0), (200, 0.3, "sawtooth", 0.3, 150)],
    "gameOver": [(400, 0.3, "sawtooth", 0.2, 0), (350, 0.3, "sawtooth", 0.2, 250), (300, 0.3, "sawtooth", 0.2, 500), (200, 0.3, "sawtooth", 0.2, 750)],
    "click": [(800, 0.03, "square", 0.15, 0)],
    "dayStart": [(440, 0.1, "triangle", 0.2, 0), (554, 0.1, "triangle", 0.2, 80), (659, 0.1, "triangle", 0.2, 160)],
    "hire": [(523, 0.06, "square", 0.3, 0), (659, 0.06, "square", 0.3, 60), (784, 0.12, "square", 0.3, 120)],
    "achievement": [(784, 0.12, "square", 0.2, 0), (988, 0.12, "square", 0.2, 80), (1175, 0.12, "square", 0.2, 160), (1319, 0.12, "square", 0.2, 240), (1568, 0.25, "triangle", 0.15, 340)],
    "notification": [(660, 0.05, "triangle", 0.12, 0), (880, 0.08, "triangle", 0.1, 80)],
    "chat": [(520, 0.03, "triangle", 0.08, 0)],
    "bgmNotes": [261, 329, 392, 523, 392, 329],
}

ROOM_CATALOG: List[Dict[str, Any]] = [
    {"id": 0, "name": "Phòng Họp", "icon": "📋", "cost": 0, "level": 1, "w": 10, "h": 7, "floor": "wood", "desc": "Họp nhóm, brainstorm", "bonus": "Meeting boost"},
    {"id": 1, "name": "Văn Phòng Chính", "icon": "🖥️", "cost": 0, "level": 1, "w": 16, "h": 14, "floor": "wood", "desc": "9 bàn làm việc + máy tính", "bonus": "9 desks"},
    {"id": 2, "name": "Nhà Bếp", "icon": "🍳", "cost": 200, "level": 1, "w": 15, "h": 10, "floor": "tile", "desc": "Máy cà phê, máy bán hàng, tủ lạnh", "bonus": "Energy regen"},
    {"id": 3, "name": "Phòng Game", "icon": "🎱", "cost": 500, "level": 2, "w": 18, "h": 12, "floor": "carpet", "desc": "Poker, Billiard, Slot Machine, Gold Trading", "bonus": "Games & Trading"},
    {"id": 4, "name": "Lounge", "icon": "🛋️", "cost": 400, "level": 2, "w": 15, "h": 7, "floor": "carpet", "desc": "Sofa, nghỉ ngơi, thư giãn", "bonus": "Rest + Mood"},
    {"id": 5, "name": "Server Room", "icon": "🖧", "cost": 800, "level": 3, "w": 12, "h": 8, "floor": "tile", "desc": "Tăng tốc hoàn thành task", "bonus": "+20% productivity"},
    {"id": 6, "name": "Phòng Gym", "icon": "💪", "cost": 600, "level": 3, "w": 12, "h": 8, "floor": "wood", "desc": "Gym tập thể dục cho agent", "bonus": "Energy boost"},
    {"id": 7, "name": "Thư Viện", "icon": "📚", "cost": 700, "level": 4, "w": 14, "h": 8, "floor": "wood", "desc": "Kệ sách lớn, học tập nâng cấp", "bonus": "+XP bonus"},
    {"id": 8, "name": "Vườn Cây", "icon": "🌿", "cost": 500, "level": 4, "w": 12, "h": 8, "floor": "carpet", "desc": "Khu vườn xanh thoáng đãng", "bonus": "Mood boost"},
    {"id": 9, "name": "VIP Lounge", "icon": "👑", "cost": 1200, "level": 5, "w": 14, "h": 8, "floor": "carpet", "desc": "Phòng nghỉ cao cấp, spa", "bonus": "Premium rest"},
    {"id": 10, "name": "R&D Lab", "icon": "🔬", "cost": 1500, "level": 6, "w": 15, "h": 10, "floor": "tile", "desc": "Phòng nghiên cứu công nghệ mới", "bonus": "Research boost"},
    {"id": 11, "name": "Sân Ngoài Trời", "icon": "🏞️", "cost": 800, "level": 3, "w": 18, "h": 12, "floor": "grass", "desc": "Không gian xanh, BBQ, hồ cá", "bonus": "Mood + Energy boost"},
    {"id": 12, "name": "Thang Máy", "icon": "🛗", "cost": 300, "level": 2, "w": 6, "h": 6, "floor": "metal", "desc": "Kết nối các tầng, di chuyển nhanh", "bonus": "Travel speed"},
    {"id": 13, "name": "Tầng Thượng", "icon": "🌆", "cost": 1500, "level": 6, "w": 18, "h": 10, "floor": "concrete", "desc": "Sân thượng ngắm cảnh, kính thiên văn", "bonus": "Premium mood + XP"},
    {"id": 14, "name": "Quán Cafe", "icon": "☕", "cost": 400, "level": 2, "w": 16, "h": 12, "floor": "wood", "desc": "Quán cà phê ấm cúng, trà sữa, bánh ngọt", "bonus": "Energy + Mood"},
    {"id": 15, "name": "PixelMart", "icon": "🏪", "cost": 600, "level": 3, "w": 22, "h": 14, "floor": "tile", "desc": "Siêu thị mua sắm vật phẩm", "bonus": "Items + Buffs"},
    {"id": 16, "name": "Công Viên", "icon": "🌳", "cost": 1000, "level": 4, "w": 34, "h": 24, "floor": "grass", "desc": "Công viên xanh với vườn hoa, sân chơi, hồ cá, sân khấu", "bonus": "Mood + Energy + Rest"},
]


def get_office_bonuses(furniture: List[Dict[str, Any]] | None = None) -> Dict[str, Any]:
    furniture = furniture or []
    counts: Dict[str, int] = {}
    for item in furniture:
        key = item.get("t")
        if key:
            counts[key] = counts.get(key, 0) + 1
    food = sum(counts.get(k, 0) for k in ("coffee", "vending", "fridge", "counter", "bbq_grill"))
    shelf = counts.get("bookshelf", 0) + counts.get("shelf", 0)
    green = counts.get("plant", 0) + counts.get("cactus", 0) + counts.get("pond", 0)
    decor = counts.get("painting", 0) + counts.get("lamp", 0) + counts.get("pictureframe", 0)
    lounge = sum(counts.get(k, 0) for k in ("sofa", "armchair", "bed_single", "bed_double", "rug", "pillow", "parasol"))
    meeting = counts.get("mtable", 0)
    outdoor = sum(counts.get(k, 0) for k in ("parasol", "bench_outdoor", "bbq_grill", "pond"))
    rooftop = sum(counts.get(k, 0) for k in ("telescope", "antenna", "helipad"))
    bonuses = {
        "counts": counts,
        "idleEnergyRegen": min(0.25, food * 0.03 + outdoor * 0.02),
        "workEnergyDrainMul": max(0.78, 1 - food * 0.025 - outdoor * 0.01),
        "interactionEnergyMul": 1 + min(0.55, food * 0.05 + lounge * 0.08 + outdoor * 0.04),
        "xpGainMul": 1 + min(0.32, shelf * 0.06 + rooftop * 0.04),
        "negativeMoodMul": max(0.65, 1 - green * 0.05 - decor * 0.025 - outdoor * 0.03),
        "interactionMoodMul": 1 + min(0.45, green * 0.06 + decor * 0.04 + lounge * 0.03 + outdoor * 0.05 + rooftop * 0.03),
        "pairChanceAdd": min(0.004, meeting * 0.0015),
        "mentorChanceAdd": min(0.004, meeting * 0.001 + shelf * 0.0007),
        "deadlineHintDays": 1 if counts.get("clock") else 0,
        "summary": [],
        "compact": "NONE",
    }
    if bonuses["idleEnergyRegen"] > 0 or bonuses["workEnergyDrainMul"] < 1:
        bonuses["summary"].append(f"Energy +{round((bonuses['interactionEnergyMul'] - 1) * 100)}%")
    if bonuses["xpGainMul"] > 1:
        bonuses["summary"].append(f"XP +{round((bonuses['xpGainMul'] - 1) * 100)}%")
    if bonuses["negativeMoodMul"] < 1:
        bonuses["summary"].append(f"Stress -{round((1 - bonuses['negativeMoodMul']) * 100)}%")
    if bonuses["pairChanceAdd"] > 0 or bonuses["mentorChanceAdd"] > 0:
        bonuses["summary"].append(f"Teamwork +{round((bonuses['pairChanceAdd'] + bonuses['mentorChanceAdd']) * 10000)}%")
    if bonuses["deadlineHintDays"] > 0:
        bonuses["summary"].append(f"Clock +{bonuses['deadlineHintDays']}d")
    bonuses["compact"] = " · ".join(bonuses["summary"][:3]) or "NONE"
    return bonuses


def get_rep_stars(reputation: float) -> str:
    full = int(reputation)
    half = 1 if reputation % 1 >= 0.5 else 0
    return "⭐" * full + ("✨" if half else "") + "☆" * max(0, 5 - full - half)


def get_difficulty_badge(diff: str) -> List[str]:
    return {"easy": ["🟢", "Easy"], "medium": ["🟡", "Medium"], "hard": ["🟠", "Hard"], "epic": ["🔴", "Epic"]}.get(diff, ["🟢", "Easy"])


def format_coins(n: int) -> str:
    return f"{n / 1000:.1f}K" if n >= 10000 else f"{n:,}"


def get_time_of_day(day_timer: float, day_length: float = 120) -> str:
    pct = day_timer / day_length
    if pct < 0.25:
        return "morning"
    if pct < 0.5:
        return "afternoon"
    if pct < 0.75:
        return "evening"
    return "night"


def get_night_overlay_alpha(day_timer: float, day_length: float = 120) -> float:
    """Exact JS parity: getNightOverlayAlpha()."""
    pct = day_timer / day_length
    if pct < 0.5:
        return 0
    if pct < 0.75:
        return (pct - 0.5) * 0.6
    return 0.15 + (pct - 0.75) * 0.8


# ═══════════════════════════════════════════════════════
# LEVEL MILESTONES (from game.js)
# ═══════════════════════════════════════════════════════

LEVEL_MILESTONES = [
    {"level": 2, "xp": 100,  "title": "Small Studio",     "unlock": "Reviewer, Designer"},
    {"level": 3, "xp": 300,  "title": "Growing Team",     "unlock": "DevOps, Researcher, Farmer"},
    {"level": 4, "xp": 600,  "title": "Established Firm", "unlock": "Analyst, Security"},
    {"level": 5, "xp": 1000, "title": "Pro Agency",       "unlock": "Backend, Mobile, Writer"},
    {"level": 6, "xp": 1500, "title": "Tech Company",     "unlock": "Hard contracts"},
    {"level": 7, "xp": 2200, "title": "Scale-up",         "unlock": "Epic contracts"},
    {"level": 8, "xp": 3000, "title": "Enterprise",       "unlock": "Premium furniture"},
    {"level": 9, "xp": 4000, "title": "Corp Giant",       "unlock": "Unlimited agents"},
    {"level": 10, "xp": 5500, "title": "\U0001f3c6 AI Empire", "unlock": "\U0001f389 You Win!"},
]

ROLE_UNLOCK_LEVEL = {
    "coder": 1, "tester": 1,
    "reviewer": 2, "designer": 2,
    "devops": 3, "researcher": 3, "farmer": 3,
    "analyst": 4, "security": 4,
    "backend": 5, "mobile": 5, "writer": 5,
}

SALARY_TABLE = {
    "coder": 15, "reviewer": 18, "tester": 14, "designer": 20,
    "devops": 25, "researcher": 28, "analyst": 22, "security": 30,
    "backend": 25, "mobile": 22, "writer": 12, "farmer": 10,
}


def get_xp_progress(company_level: int, company_xp: int) -> float:
    """Exact JS parity: getXPProgress().
    Returns 0-100 percentage towards next level."""
    next_ms = next((m for m in LEVEL_MILESTONES if m["level"] == company_level + 1), None)
    if not next_ms:
        return 100.0
    prev_xp = 0
    prev_ms = next((m for m in LEVEL_MILESTONES if m["level"] == company_level - 1), None)
    if prev_ms:
        prev_xp = prev_ms["xp"]
    denom = next_ms["xp"] - prev_xp
    if denom <= 0:
        return 100.0
    return min(100.0, ((company_xp - prev_xp) / denom) * 100)


def is_role_unlocked(role: str, company_level: int) -> bool:
    """Exact JS parity: isRoleUnlocked(role)."""
    return company_level >= ROLE_UNLOCK_LEVEL.get(role, 1)


def get_unlocked_roles(company_level: int) -> List[str]:
    """Exact JS parity: getUnlockedRoles()."""
    return [role for role, lvl in ROLE_UNLOCK_LEVEL.items() if company_level >= lvl]


def get_daily_salary(agents: List[Dict[str, Any]]) -> int:
    """Exact JS parity: getDailySalary(agents)."""
    total = 0
    for a in agents:
        role = a.get("role", "coder") if isinstance(a, dict) else getattr(a, "role", "coder")
        total += SALARY_TABLE.get(role, 15)
    return total


def get_day_progress(day_timer: float, day_length: float = 120) -> float:
    """Exact JS parity: getDayProgress()."""
    return min(100.0, (day_timer / day_length) * 100)


def get_time_icon(time_of_day: str) -> str:
    """Exact JS parity: getTimeIcon()."""
    return {"morning": "\U0001f305", "afternoon": "\u2600\ufe0f", "evening": "\U0001f307", "night": "\U0001f319"}.get(time_of_day, "\u2600\ufe0f")


def get_contract_rep_bonus(base_reward: int, reputation: float) -> int:
    """Exact JS parity: reputation bonus on contract reward.
    repBonus = Math.floor(reward * (reputation - 3) * 0.1)"""
    return max(0, int(base_reward * (reputation - 3) * 0.1))
