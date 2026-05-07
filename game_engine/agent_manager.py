"""
agent_manager.py — Agent AI & Management
==========================================
Handles agent lifecycle: hiring, firing, task assignment,
mood/energy simulation, skill progression, and AI behavior.
"""

import random
import time
from typing import Optional, List, Dict, Tuple
from .models import (
    Agent, Task, GameState, AgentRole, AgentState,
    ROLE_CONFIG, MODEL_CONFIG, TaskStatus
)


# ═══════════════════════════════════════════════════════
# AGENT NAME GENERATOR
# ═══════════════════════════════════════════════════════

FIRST_NAMES = [
    "Pixel", "Neo", "Cyber", "Nano", "Alpha", "Beta", "Gamma", "Delta",
    "Zeta", "Nova", "Flux", "Byte", "Bit", "Chip", "Core", "Data",
    "Echo", "Flux", "Grid", "Hex", "Ion", "Jade", "Kilo", "Lux",
    "Mux", "Node", "Opal", "Prism", "Quark", "Rune", "Sync", "Vox",
]

LAST_PARTS = [
    "Bot", "AI", "Droid", "Unit", "Agent", "Sys", "Net", "Hub",
    "Link", "Port", "Code", "Dev", "Run", "Flow", "Core", "Mind",
]


def generate_agent_name(existing_names: List[str] = None) -> str:
    """Generate a unique pixel-themed agent name."""
    if existing_names is None:
        existing_names = []

    for _ in range(50):
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_PARTS)
        num = random.randint(1, 999)
        name = f"{first}{last}-{num:03d}"
        if name not in existing_names:
            return name

    return f"Agent-{random.randint(1000, 9999)}"


# ═══════════════════════════════════════════════════════
# AGENT MANAGER
# ═══════════════════════════════════════════════════════

class AgentManager:
    """Manages all agent operations."""

    def __init__(self, game_state: GameState):
        self.state = game_state

    # ─── Hiring ───────────────────────────────────

    def can_hire(self, role: str, model: str) -> Tuple[bool, str]:
        """Check if player can afford to hire an agent."""
        role_cfg = ROLE_CONFIG.get(role)
        model_cfg = MODEL_CONFIG.get(model)

        if not role_cfg:
            return False, f"Unknown role: {role}"
        if not model_cfg:
            return False, f"Unknown model: {model}"

        # Check level unlock
        if self.state.level < role_cfg["unlock_level"]:
            return False, f"Need level {role_cfg['unlock_level']} to unlock {role}"

        cost = int(role_cfg["cost"] * model_cfg["cost_mul"])
        if self.state.coins < cost:
            return False, f"Not enough coins! Need {cost}Ⓒ, have {self.state.coins}Ⓒ"

        return True, f"Ready to hire for {cost}Ⓒ"

    def hire_agent(self, name: str, role: str, model: str, color: str = "#4ecdc4") -> Tuple[Optional[Agent], str]:
        """Hire a new agent. Returns (agent, message)."""
        can, msg = self.can_hire(role, model)
        if not can:
            return None, msg

        # Auto-generate name if empty
        if not name or name.strip() == "":
            existing = [a.name for a in self.state.agents.values()]
            name = generate_agent_name(existing)

        agent = Agent(
            name=name.strip(),
            role=role,
            model=model,
            color=color,
            state="idle",
            energy=100.0,
            mood=random.uniform(70, 95),
        )

        # Deduct cost
        cost = agent.hire_cost
        self.state.coins -= cost
        self.state.total_spent += cost

        # Add to state
        self.state.agents[agent.id] = agent

        return agent, f"✨ Hired {agent.emoji} {agent.name} ({role}) for {cost}Ⓒ"

    def fire_agent(self, agent_id: str) -> Tuple[bool, str]:
        """Remove an agent."""
        agent = self.state.agents.get(agent_id)
        if not agent:
            return False, "Agent not found"

        # Cancel current task
        if agent.current_task_id and agent.current_task_id in self.state.tasks:
            task = self.state.tasks[agent.current_task_id]
            task.status = "pending"
            task.assigned_agent_id = None
            agent.current_task_id = None

        name = agent.name
        del self.state.agents[agent_id]
        return True, f"🔥 Fired {name}"

    # ─── Task Assignment ──────────────────────────

    def assign_task(self, agent_id: str, task_id: str) -> Tuple[bool, str]:
        """Assign a task to an agent."""
        agent = self.state.agents.get(agent_id)
        task = self.state.tasks.get(task_id)

        if not agent:
            return False, "Agent not found"
        if not task:
            return False, "Task not found"
        if agent.current_task_id:
            return False, f"{agent.name} is already working on a task"
        if task.status not in ("pending",):
            return False, f"Task is {task.status}, can't assign"

        agent.current_task_id = task_id
        agent.state = "working"
        task.status = "in_progress"
        task.assigned_agent_id = agent_id

        return True, f"📋 {agent.name} started working on: {task.title}"

    def auto_assign_tasks(self) -> List[str]:
        """Auto-assign pending tasks to idle agents. Returns messages."""
        messages = []
        idle_agents = [a for a in self.state.agents.values()
                       if a.state == "idle" and not a.current_task_id]
        pending_tasks = [t for t in self.state.tasks.values()
                         if t.status == "pending"]

        for task in pending_tasks:
            # Find best matching idle agent
            best_agent = None
            for agent in idle_agents:
                if agent.role == task.required_role:
                    best_agent = agent
                    break

            # Fallback: any idle agent
            if not best_agent and idle_agents:
                best_agent = idle_agents[0]

            if best_agent:
                ok, msg = self.assign_task(best_agent.id, task.id)
                if ok:
                    messages.append(msg)
                    idle_agents.remove(best_agent)

        return messages

    # ─── Simulation Tick ──────────────────────────

    def tick(self, delta_seconds: float) -> List[Dict]:
        """
        Simulate one tick for all agents.
        Returns a list of events that occurred.
        """
        events = []

        for agent in list(self.state.agents.values()):
            agent_events = self._tick_agent(agent, delta_seconds)
            events.extend(agent_events)

        return events

    def _tick_agent(self, agent: Agent, dt: float) -> List[Dict]:
        """Simulate one agent for dt seconds."""
        events = []

        # ─── Energy drain ─────────────────────
        if agent.state == "working":
            agent.energy -= 0.15 * dt
        elif agent.state in ("walking", "chatting"):
            agent.energy -= 0.05 * dt
        elif agent.state in ("resting", "sleeping"):
            agent.energy += 0.3 * dt
        elif agent.state == "eating":
            agent.energy += 0.5 * dt

        agent.energy = max(0, min(100, agent.energy))

        # ─── Mood drift ──────────────────────
        if agent.energy < 20:
            agent.mood -= 0.1 * dt
        elif agent.energy > 80:
            agent.mood += 0.02 * dt

        if agent.state == "playing":
            agent.mood += 0.2 * dt

        agent.mood = max(0, min(100, agent.mood))

        # ─── Force rest if exhausted ─────────
        if agent.energy <= 0 and agent.state == "working":
            agent.state = "resting"
            events.append({
                "type": "agent_exhausted",
                "agent_id": agent.id,
                "message": f"😴 {agent.name} is exhausted! Resting..."
            })

        # ─── Work progress ───────────────────
        if agent.state == "working" and agent.current_task_id:
            task = self.state.tasks.get(agent.current_task_id)
            if task and task.status == "in_progress":
                # Progress based on speed, mood, energy
                mood_factor = 0.5 + (agent.mood / 200)
                energy_factor = 0.5 + (agent.energy / 200)
                progress = agent.work_speed * mood_factor * energy_factor * dt * 2

                task.progress = min(100, task.progress + progress)

                # Task completed!
                if task.progress >= 100:
                    task.status = "completed"
                    task.completed_at = time.time()
                    agent.tasks_completed += 1
                    agent.experience += task.xp_reward
                    agent.current_task_id = None
                    agent.state = "idle"

                    # Level up agent skill
                    new_level = 1 + agent.experience // 100
                    if new_level > agent.skill_level:
                        agent.skill_level = new_level
                        events.append({
                            "type": "agent_level_up",
                            "agent_id": agent.id,
                            "new_level": new_level,
                            "message": f"⬆️ {agent.name} reached skill level {new_level}!"
                        })

                    self.state.total_tasks_done += 1

                    events.append({
                        "type": "task_completed",
                        "agent_id": agent.id,
                        "task_id": task.id,
                        "message": f"✅ {agent.name} completed: {task.title} (+{task.xp_reward} XP)"
                    })

        return events

    # ─── Agent Info ───────────────────────────────

    def get_agent_info(self, agent_id: str) -> Optional[Dict]:
        """Get detailed agent info."""
        agent = self.state.agents.get(agent_id)
        if not agent:
            return None

        return {
            **agent.to_dict(),
            "salary": agent.salary,
            "hire_cost": agent.hire_cost,
            "work_speed": round(agent.work_speed, 2),
            "emoji": agent.emoji,
            "role_config": ROLE_CONFIG.get(agent.role, {}),
            "model_config": MODEL_CONFIG.get(agent.model, {}),
        }

    def get_all_agents_summary(self) -> List[Dict]:
        """Get summary of all agents."""
        return [self.get_agent_info(aid) for aid in self.state.agents]

    def get_available_roles(self) -> List[Dict]:
        """Get roles available at current level."""
        roles = []
        for role_name, cfg in ROLE_CONFIG.items():
            roles.append({
                "role": role_name,
                "emoji": cfg["emoji"],
                "cost": cfg["cost"],
                "salary": cfg["salary"],
                "unlock_level": cfg["unlock_level"],
                "unlocked": self.state.level >= cfg["unlock_level"],
            })
        return roles
