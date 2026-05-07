"""
models.py — Data Models for PixelAgent City
=============================================
Defines all game entities: Agents, Contracts, Tasks, Items, Farm plots, etc.
Uses dataclasses for clean, type-safe data structures.
"""

from dataclasses import dataclass, field, asdict
from typing import Optional, List, Dict, Any
from enum import Enum
import time
import uuid
import random


# ═══════════════════════════════════════════════════════
# ENUMS
# ═══════════════════════════════════════════════════════

class AgentRole(str, Enum):
    CODER = "coder"
    TESTER = "tester"
    REVIEWER = "reviewer"
    DESIGNER = "designer"
    DEVOPS = "devops"
    PM = "pm"
    DATA_SCIENTIST = "data_scientist"
    SECURITY = "security"
    AI_ENGINEER = "ai_engineer"
    CTO = "cto"


class AgentState(str, Enum):
    IDLE = "idle"
    WORKING = "working"
    WALKING = "walking"
    RESTING = "resting"
    CHATTING = "chatting"
    EATING = "eating"
    PLAYING = "playing"
    SLEEPING = "sleeping"


class AIModel(str, Enum):
    CLAUDE_OPUS_4 = "claude-opus-4"
    CLAUDE_SONNET_4 = "claude-sonnet-4"
    GEMINI_25_PRO = "gemini-2.5-pro"
    GEMINI_25_FLASH = "gemini-2.5-flash"
    GPT_4O = "gpt-4o"
    GPT_4O_MINI = "gpt-4o-mini"
    DEEPSEEK_V3 = "deepseek-v3"
    LLAMA_4 = "llama-4"


class ContractDifficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"
    EPIC = "epic"


class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class CropStage(str, Enum):
    EMPTY = "empty"
    PLANTED = "planted"
    GROWING = "growing"
    READY = "ready"
    WITHERED = "withered"


# ═══════════════════════════════════════════════════════
# ROLE CONFIG — mirrors game.js ROLE_CONFIG
# ═══════════════════════════════════════════════════════

ROLE_CONFIG: Dict[str, Dict[str, Any]] = {
    "coder":          {"emoji": "💻", "cost": 100, "salary": 15, "speed": 1.0, "unlock_level": 1},
    "tester":         {"emoji": "🧪", "cost": 120, "salary": 18, "speed": 0.9, "unlock_level": 1},
    "reviewer":       {"emoji": "👁️", "cost": 140, "salary": 20, "speed": 0.85, "unlock_level": 2},
    "designer":       {"emoji": "🎨", "cost": 160, "salary": 22, "speed": 0.8, "unlock_level": 2},
    "devops":         {"emoji": "🔧", "cost": 200, "salary": 28, "speed": 0.75, "unlock_level": 3},
    "pm":             {"emoji": "📊", "cost": 250, "salary": 35, "speed": 0.7, "unlock_level": 4},
    "data_scientist": {"emoji": "📈", "cost": 300, "salary": 40, "speed": 0.65, "unlock_level": 5},
    "security":       {"emoji": "🛡️", "cost": 350, "salary": 45, "speed": 0.6, "unlock_level": 6},
    "ai_engineer":    {"emoji": "🤖", "cost": 400, "salary": 50, "speed": 0.55, "unlock_level": 7},
    "cto":            {"emoji": "👔", "cost": 500, "salary": 60, "speed": 0.5, "unlock_level": 8},
}

MODEL_CONFIG: Dict[str, Dict[str, Any]] = {
    "claude-opus-4":    {"tier": "S", "cost_mul": 1.5, "speed_mul": 1.3, "quality_mul": 1.4},
    "claude-sonnet-4":  {"tier": "A", "cost_mul": 1.2, "speed_mul": 1.2, "quality_mul": 1.2},
    "gemini-2.5-pro":   {"tier": "S", "cost_mul": 1.4, "speed_mul": 1.25, "quality_mul": 1.35},
    "gemini-2.5-flash": {"tier": "B", "cost_mul": 0.8, "speed_mul": 1.5, "quality_mul": 0.9},
    "gpt-4o":           {"tier": "A", "cost_mul": 1.3, "speed_mul": 1.15, "quality_mul": 1.25},
    "gpt-4o-mini":      {"tier": "B", "cost_mul": 0.7, "speed_mul": 1.4, "quality_mul": 0.85},
    "deepseek-v3":      {"tier": "A", "cost_mul": 1.0, "speed_mul": 1.1, "quality_mul": 1.1},
    "llama-4":          {"tier": "B", "cost_mul": 0.9, "speed_mul": 1.2, "quality_mul": 1.0},
}


# ═══════════════════════════════════════════════════════
# LEVEL SYSTEM
# ═══════════════════════════════════════════════════════

LEVEL_THRESHOLDS = [
    {"level": 1,  "name": "Startup Garage",   "xp": 0},
    {"level": 2,  "name": "Small Studio",     "xp": 100},
    {"level": 3,  "name": "Growing Team",     "xp": 300},
    {"level": 4,  "name": "Rising Agency",    "xp": 600},
    {"level": 5,  "name": "Established Firm",  "xp": 1000},
    {"level": 6,  "name": "Tech Company",     "xp": 1500},
    {"level": 7,  "name": "Innovation Lab",   "xp": 2200},
    {"level": 8,  "name": "AI Powerhouse",    "xp": 3000},
    {"level": 9,  "name": "Tech Giant",       "xp": 4000},
    {"level": 10, "name": "Global Empire",    "xp": 5500},
]


# ═══════════════════════════════════════════════════════
# DATA CLASSES
# ═══════════════════════════════════════════════════════

@dataclass
class Agent:
    """Represents an AI Agent employee."""
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    name: str = "PixelBot-001"
    role: str = "coder"
    model: str = "claude-opus-4"
    color: str = "#4ecdc4"
    state: str = "idle"

    # Stats
    energy: float = 100.0
    mood: float = 80.0
    experience: int = 0
    skill_level: int = 1
    tasks_completed: int = 0
    tasks_failed: int = 0

    # Position (grid coords)
    x: float = 0.0
    y: float = 0.0
    target_x: float = 0.0
    target_y: float = 0.0
    room_id: int = 0

    # Timing
    hired_at: float = field(default_factory=time.time)
    last_task_time: float = 0.0

    # Current task
    current_task_id: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)

    @property
    def salary(self) -> int:
        role_cfg = ROLE_CONFIG.get(self.role, ROLE_CONFIG["coder"])
        model_cfg = MODEL_CONFIG.get(self.model, MODEL_CONFIG["claude-opus-4"])
        return int(role_cfg["salary"] * model_cfg["cost_mul"])

    @property
    def hire_cost(self) -> int:
        role_cfg = ROLE_CONFIG.get(self.role, ROLE_CONFIG["coder"])
        model_cfg = MODEL_CONFIG.get(self.model, MODEL_CONFIG["claude-opus-4"])
        return int(role_cfg["cost"] * model_cfg["cost_mul"])

    @property
    def work_speed(self) -> float:
        role_cfg = ROLE_CONFIG.get(self.role, ROLE_CONFIG["coder"])
        model_cfg = MODEL_CONFIG.get(self.model, MODEL_CONFIG["claude-opus-4"])
        level_bonus = 1.0 + (self.skill_level - 1) * 0.1
        return role_cfg["speed"] * model_cfg["speed_mul"] * level_bonus

    @property
    def emoji(self) -> str:
        return ROLE_CONFIG.get(self.role, ROLE_CONFIG["coder"])["emoji"]


@dataclass
class Task:
    """A unit of work assigned to an agent."""
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    contract_id: Optional[str] = None
    title: str = ""
    description: str = ""
    required_role: str = "coder"
    difficulty: int = 1  # 1-5
    progress: float = 0.0  # 0-100
    status: str = "pending"
    assigned_agent_id: Optional[str] = None
    xp_reward: int = 20
    created_at: float = field(default_factory=time.time)
    completed_at: Optional[float] = None

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class Contract:
    """A client contract with multiple tasks."""
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    title: str = ""
    client: str = ""
    description: str = ""
    difficulty: str = "easy"
    reward: int = 200
    penalty: int = 50
    deadline_days: int = 5
    required_roles: List[str] = field(default_factory=lambda: ["coder"])
    tasks: List[str] = field(default_factory=list)  # task IDs
    status: str = "available"  # available, active, completed, failed, expired
    progress: float = 0.0
    accepted_day: Optional[int] = None
    completed_day: Optional[int] = None
    xp_reward: int = 50

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class FarmPlot:
    """A single farming plot."""
    id: int = 0
    crop: Optional[str] = None
    stage: str = "empty"
    growth: float = 0.0  # 0-100
    watered: bool = False
    planted_at: Optional[float] = None

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class InventoryItem:
    """An item in the player's inventory."""
    id: str = ""
    name: str = ""
    category: str = ""
    quantity: int = 1
    icon: str = "📦"

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class Achievement:
    """A game achievement."""
    id: str = ""
    title: str = ""
    description: str = ""
    icon: str = "🏆"
    unlocked: bool = False
    unlocked_at: Optional[float] = None

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class TechNode:
    """A node in the tech tree."""
    id: str = ""
    name: str = ""
    branch: str = "engineering"
    description: str = ""
    cost: int = 100
    research_time: int = 60  # seconds
    unlocked: bool = False
    researching: bool = False
    progress: float = 0.0
    prerequisites: List[str] = field(default_factory=list)
    effects: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return asdict(self)


# ═══════════════════════════════════════════════════════
# GAME STATE — master container
# ═══════════════════════════════════════════════════════

@dataclass
class GameState:
    """Complete game state snapshot."""
    # Economy
    coins: int = 500
    total_earned: int = 0
    total_spent: int = 0

    # Progress
    day: int = 1
    day_progress: float = 0.0  # 0-1
    level: int = 1
    xp: int = 0
    reputation: float = 3.0

    # Speed
    speed: int = 1  # 1, 2, 3
    paused: bool = False

    # Entities
    agents: Dict[str, Agent] = field(default_factory=dict)
    tasks: Dict[str, Task] = field(default_factory=dict)
    contracts: Dict[str, Contract] = field(default_factory=dict)
    farm_plots: List[FarmPlot] = field(default_factory=list)
    inventory: List[InventoryItem] = field(default_factory=list)
    achievements: Dict[str, Achievement] = field(default_factory=dict)
    tech_tree: Dict[str, TechNode] = field(default_factory=dict)

    # Stats
    contracts_completed: int = 0
    contracts_failed: int = 0
    total_tasks_done: int = 0
    mini_game_scores: Dict[str, int] = field(default_factory=dict)

    # Unlocked rooms
    unlocked_rooms: List[int] = field(default_factory=lambda: [0, 1, 2, 3])

    # Timestamp
    created_at: float = field(default_factory=time.time)
    last_saved: float = field(default_factory=time.time)

    def to_dict(self) -> dict:
        """Serialize entire game state to dict."""
        d = {
            "coins": self.coins,
            "total_earned": self.total_earned,
            "total_spent": self.total_spent,
            "day": self.day,
            "day_progress": self.day_progress,
            "level": self.level,
            "xp": self.xp,
            "reputation": round(self.reputation, 2),
            "speed": self.speed,
            "paused": self.paused,
            "agents": {k: v.to_dict() for k, v in self.agents.items()},
            "tasks": {k: v.to_dict() for k, v in self.tasks.items()},
            "contracts": {k: v.to_dict() for k, v in self.contracts.items()},
            "farm_plots": [p.to_dict() for p in self.farm_plots],
            "inventory": [i.to_dict() for i in self.inventory],
            "achievements": {k: v.to_dict() for k, v in self.achievements.items()},
            "tech_tree": {k: v.to_dict() for k, v in self.tech_tree.items()},
            "contracts_completed": self.contracts_completed,
            "contracts_failed": self.contracts_failed,
            "total_tasks_done": self.total_tasks_done,
            "mini_game_scores": self.mini_game_scores,
            "unlocked_rooms": self.unlocked_rooms,
            "created_at": self.created_at,
            "last_saved": self.last_saved,
        }
        return d

    @property
    def level_name(self) -> str:
        for t in reversed(LEVEL_THRESHOLDS):
            if self.level >= t["level"]:
                return t["name"]
        return "Unknown"

    @property
    def daily_salary(self) -> int:
        return sum(a.salary for a in self.agents.values())

    @property
    def agent_count(self) -> int:
        return len(self.agents)

    @property
    def success_rate(self) -> float:
        total = self.contracts_completed + self.contracts_failed
        if total == 0:
            return 0.0
        return round(self.contracts_completed / total * 100, 1)

    @property
    def avg_mood(self) -> float:
        if not self.agents:
            return 0.0
        return round(sum(a.mood for a in self.agents.values()) / len(self.agents), 1)

    @property
    def avg_energy(self) -> float:
        if not self.agents:
            return 0.0
        return round(sum(a.energy for a in self.agents.values()) / len(self.agents), 1)
