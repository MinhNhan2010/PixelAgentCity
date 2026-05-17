"""
agent_manager.py — Agent AI & Management
==========================================
Handles agent lifecycle: hiring, firing, task assignment,
mood/energy simulation, skill progression, AI behavior,
autoChat, burnout, PM auto-breakdown, save/load.
Ports remaining logic from agents.js for full parity.
"""

import json
import os
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
        if not hasattr(self.state, "agent_stats"):
            self.state.agent_stats = {"totalLinesWritten": 0, "totalFilesModified": 0, "totalErrors": 0, "totalCommits": 0, "uptime": 0}
        if not hasattr(self.state, "agent_logs"):
            self.state.agent_logs = []
        if not hasattr(self.state, "agent_performance_history"):
            self.state.agent_performance_history = []
        if not hasattr(self.state, "agent_event_cooldown"):
            self.state.agent_event_cooldown = 0
        self.event_pool = [
            {"id": "bug", "weight": 25, "emoji": "🐛", "title": "Bug phát hiện!", "effect": "create_hotfix"},
            {"id": "coffee", "weight": 20, "emoji": "☕", "title": "Coffee Break!", "effect": "energy_boost"},
            {"id": "incident", "weight": 8, "emoji": "🔥", "title": "Production Incident!", "effect": "all_hands"},
            {"id": "milestone", "weight": 12, "emoji": "🎉", "title": "Milestone đạt được!", "effect": "mood_boost"},
            {"id": "idea", "weight": 15, "emoji": "💡", "title": "Ý tưởng mới!", "effect": "create_task"},
            {"id": "review", "weight": 20, "emoji": "📝", "title": "Code Review Request", "effect": "review_flow"},
            {"id": "team_outing", "weight": 6, "emoji": "🎊", "title": "Team Outing!", "effect": "team_outing"},
            {"id": "hackathon", "weight": 5, "emoji": "🏆", "title": "Hackathon nội bộ!", "effect": "hackathon"},
            {"id": "pizza", "weight": 10, "emoji": "🍕", "title": "Pizza Party!", "effect": "pizza_party"},
            {"id": "pair_prog", "weight": 12, "emoji": "👫", "title": "Pair Programming!", "effect": "pair_programming"},
            # Farm events from agents.js
            {"id": "good_harvest", "weight": 12, "emoji": "🌾", "title": "Mùa thu hoạch tốt!", "effect": "farm_boost"},
            {"id": "pest_attack", "weight": 8, "emoji": "🐛", "title": "Sâu bệnh tấn công!", "effect": "farm_damage"},
            {"id": "rain_blessing", "weight": 10, "emoji": "🌧️", "title": "Mưa lành!", "effect": "farm_rain"},
        ]

        # Auto-chat system ported from agents.js
        self._chat_cooldown = 0
        self._chat_pools = {
            "idle": [
                "🍵 Nghỉ chút đã~", "🎵 *Ngồi hát*", "📱 Check mail nào...", "💭 Hôm nay làm gì nhỉ?",
                "☕ Cần thêm cà phê!", "🌟 Cảm thấy tốt!", "😴 Buồn ngủ quá...", "🎮 Chơi game chút!",
                "📖 Đọc sách nào~", "🤔 Hmm...", "💪 Sẵn sàng làm việc!", "🏃 Đi dạo chút!",
            ],
            "working": [
                "💻 Code chạy rồi!", "🐛 Bug ở đâu ra?!", "📝 Commit xong!", "⚡ Deploy thôi!",
                "🔥 Feature mới ngon!", "✅ Test passed!", "🤯 Logic phức tạp...", "💡 Eureka!",
                "🚀 Push code!", "📊 Analyzing...", "🛡️ Security check...", "📱 UI looking good!",
            ],
            "happy": [
                "🎉 Tuyệt vời!", "😄 Mood 100%!", "🌟 Great day!", "💖 Love this team!",
                "🎊 Celebration!", "✨ Feeling awesome!", "🏆 Productive day!",
            ],
            "tired": [
                "😩 Kiệt sức rồi...", "🔋 Sắp hết pin...", "😵 Cần nghỉ ngơi...", "💤 Zzz...",
                "🥱 Buồn ngủ quá...", "☕ Cà phê đâu?",
            ],
            "dialogue": [
                ["Hey {0}! Khỏe không?", "Khỏe! Đang {task} nè!"],
                ["Bro {0}, review giúp PR!", "Ok để xem!"],
                ["{0} ơi, có bug kìa!", "Để fix ngay!"],
                ["Coffee break không {0}?", "Đi thôi! ☕"],
                ["Code của {0} ngon quá!", "Thanks! 😊"],
                ["Pair programming không?", "Sure! Let's go! 🤝"],
            ],
        }

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
        stats = self.state.agent_stats
        stats["uptime"] = stats.get("uptime", 0) + max(1, int(delta_seconds))

        if stats["uptime"] % 60 == 0:
            total = max(1, len(self.state.agents))
            working = len([a for a in self.state.agents.values() if a.state in ("working", "thinking")])
            self.state.agent_performance_history.append({"time": stats["uptime"], "productivity": round(working / total * 100, 1), "tasks": self.state.total_tasks_done})
            self.state.agent_performance_history = self.state.agent_performance_history[-30:]

        if self.state.agent_event_cooldown > 0:
            self.state.agent_event_cooldown -= 1
        elif random.random() < 0.005 and self.state.agents:
            events.append(self.trigger_random_event())

        self.auto_assign_tasks()
        
        chat_event = self.auto_chat()
        if chat_event:
            events.append(chat_event)
            
        for agent in list(self.state.agents.values()):
            agent_events = self._tick_agent(agent, delta_seconds)
            events.extend(agent_events)

        return events

    def _tick_agent(self, agent: Agent, dt: float) -> List[Dict]:
        """Simulate one agent for dt seconds."""
        events = []

        # ─── Energy drain (with office bonus) ─────
        if agent.state == "working":
            agent.energy -= 0.15 * dt
        elif agent.state in ("walking", "chatting"):
            agent.energy -= 0.05 * dt
        elif agent.state in ("resting", "sleeping"):
            agent.energy += 0.3 * dt
        elif agent.state == "eating":
            agent.energy += 0.5 * dt
        elif agent.state == "idle":
            # Idle energy regen from agents.js
            agent.energy += 0.1 * dt

        agent.energy = max(0, min(100, agent.energy))

        # ─── Mood drift with BURNOUT mechanic (agents.js) ──
        # Burnout: energy < 20 → mood decay rate × 3
        burnout_mul = 3.0 if agent.energy < 20 else 1.0
        if agent.energy < 20:
            agent.mood -= 0.1 * dt * burnout_mul
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

        # ─── Walking state machine ───────────
        if agent.state == "walking":
            dx = agent.target_x - agent.x
            dy = agent.target_y - agent.y
            dist = (dx ** 2 + dy ** 2) ** 0.5
            if dist < 0.2:
                agent.x, agent.y = agent.target_x, agent.target_y
                agent.state = "idle"
            else:
                step = min(1.5 * dt, dist)
                ratio = step / dist
                agent.x += dx * ratio
                agent.y += dy * ratio

        # ─── Idle → random walk chance ───────
        if agent.state == "idle" and not agent.current_task_id and random.random() < 0.003 * dt:
            agent.target_x = agent.x + random.uniform(-4, 4)
            agent.target_y = agent.y + random.uniform(-4, 4)
            agent.state = "walking"

        # ─── Work progress ───────────────────
        if agent.state == "working" and agent.current_task_id:
            task = self.state.tasks.get(agent.current_task_id)
            if task and task.status == "in_progress":
                mood_factor = 0.5 + (agent.mood / 200)
                energy_factor = 0.5 + (agent.energy / 200)
                progress = agent.work_speed * mood_factor * energy_factor * dt * 2

                # Pair programming bonus (+40% speed)
                pair_bonus = self._get_pair_bonus(agent, task)
                progress *= (1 + pair_bonus)

                task.progress = min(100, task.progress + progress)

                # Task completed!
                if task.progress >= 100:
                    task.status = "completed"
                    task.completed_at = time.time()
                    agent.tasks_completed += 1
                    agent.experience += task.xp_reward
                    agent.current_task_id = None
                    agent.state = "idle"

                    # Mentoring: senior shares XP with juniors
                    self._apply_mentoring(agent, task.xp_reward)

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
                    self.state.agent_stats["totalLinesWritten"] = self.state.agent_stats.get("totalLinesWritten", 0) + random.randint(20, 150)
                    self.state.agent_stats["totalCommits"] = self.state.agent_stats.get("totalCommits", 0) + 1
                    if random.random() < 0.3:
                        self.state.agent_stats["totalFilesModified"] = self.state.agent_stats.get("totalFilesModified", 0) + random.randint(1, 5)

                    events.append({
                        "type": "task_completed",
                        "agent_id": agent.id,
                        "task_id": task.id,
                        "message": f"✅ {agent.name} completed: {task.title} (+{task.xp_reward} XP)"
                    })

        return events

    def _get_pair_bonus(self, agent: Agent, task: Task) -> float:
        """Check if another agent with same role is also working → pair programming +40%."""
        for other in self.state.agents.values():
            if other.id != agent.id and other.state == "working" and other.role == agent.role:
                return 0.4
        return 0.0

    def _apply_mentoring(self, senior: Agent, base_xp: int) -> None:
        """Senior agent (level >= 3) shares 20% XP with lower-level agents of same role."""
        if senior.skill_level < 3:
            return
        for junior in self.state.agents.values():
            if junior.id != senior.id and junior.role == senior.role and junior.skill_level < senior.skill_level:
                mentor_xp = max(1, int(base_xp * 0.2))
                junior.experience += mentor_xp
                junior.mood = min(100, junior.mood + 2)

    def add_log(self, agent_name: str, message: str, type_: str = "info") -> Dict:
        entry = {"time": time.strftime("%H:%M:%S"), "agent": agent_name, "message": message, "type": type_}
        self.state.agent_logs.insert(0, entry)
        self.state.agent_logs = self.state.agent_logs[:500]
        return entry

    def trigger_random_event(self) -> Dict:
        total = sum(e["weight"] for e in self.event_pool)
        roll = random.uniform(0, total)
        event = self.event_pool[0]
        for candidate in self.event_pool:
            roll -= candidate["weight"]
            if roll <= 0:
                event = candidate
                break
        self.state.agent_event_cooldown = random.randint(60, 180)
        log = self.add_log("System", f"{event['emoji']} {event['title']}", "warning")
        effect = event["effect"]
        if effect == "energy_boost":
            for agent in self.state.agents.values():
                agent.energy = min(100, agent.energy + 15)
                agent.mood = min(100, agent.mood + 5)
        elif effect == "mood_boost":
            for agent in self.state.agents.values():
                agent.mood = min(100, agent.mood + 10)
                agent.experience += 3
        elif effect == "all_hands":
            for agent in self.state.agents.values():
                agent.mood = max(30, agent.mood - 15)
                agent.energy = max(20, agent.energy - 10)
            self._create_event_task("🔥 Fix Production Incident", "critical")
        elif effect == "create_hotfix":
            self._create_event_task("🐛 Hotfix: Critical Bug", "critical")
        elif effect == "create_task":
            self._create_event_task("💡 Feature: " + random.choice(["Dark Mode", "Notifications", "Search", "Analytics", "Export"]), "medium")
        elif effect == "review_flow":
            candidates = [t for t in self.state.tasks.values() if t.status == "in_progress" and t.progress > 80]
            if candidates:
                task = random.choice(candidates)
                setattr(task, "needs_review", True)
                self.add_log("System", f"📝 Task '{task.title}' cần review trước khi merge", "info")
        elif effect == "team_outing":
            for agent in self.state.agents.values():
                agent.mood = min(100, agent.mood + 20)
                agent.energy = min(100, agent.energy + 10)
        elif effect == "hackathon":
            for agent in self.state.agents.values():
                agent.experience += 10
                agent.mood = min(100, agent.mood + 5)
            self._create_event_task("🏆 Hackathon Project", "medium")
        elif effect == "pizza_party":
            for agent in self.state.agents.values():
                agent.energy = min(100, agent.energy + 20)
                agent.mood = min(100, agent.mood + 15)
        elif effect == "pair_programming":
            working = [a for a in self.state.agents.values() if a.state == "working"]
            if len(working) >= 2:
                pair = random.sample(working, 2)
                for a in pair:
                    a.mood = min(100, a.mood + 8)
                    a.experience += 5
                self.add_log("System", f"👫 {pair[0].name} & {pair[1].name} đang pair programming!", "info")
        # Farm events from agents.js
        elif effect == "farm_boost":
            # Accelerate growing crops by 1 growth stage
            for plot in self.state.farm_plots:
                if plot.stage == "growing":
                    plot.growth = min(100, plot.growth + 33)
                    if plot.growth >= 100:
                        plot.stage = "ready"
        elif effect == "farm_damage":
            growing = [p for p in self.state.farm_plots if p.stage == "growing"]
            if growing:
                victim = random.choice(growing)
                victim.growth = max(0, victim.growth - 25)
                self.add_log("System", f"🐛 Sâu bệnh phá hoại luống {victim.id + 1}!", "warning")
        elif effect == "farm_rain":
            for plot in self.state.farm_plots:
                if plot.stage in ("planted", "growing"):
                    plot.watered = True
            self.add_log("System", "🌧️ Mưa lành tưới mát tất cả vườn!", "info")
        return {"type": "random_event", "event": event, "log": log}

    def _create_event_task(self, title: str, priority: str) -> None:
        task = Task(title=title, description="Generated by random office event", priority=priority)
        self.state.tasks[task.id] = task
        self.add_log("System", f"📋 Created task: {title}", "info")

    def _process_review(self, agent: Agent, task: Task, events: List[Dict]) -> bool:
        if getattr(task, "needs_review", False) and getattr(task, "review_status", None) != "approved":
            reviewer = next((a for a in self.state.agents.values() if a.role == "reviewer" and a.id != agent.id and a.state == "idle"), None)
            if reviewer and random.random() < 0.8:
                setattr(task, "review_status", "approved")
                self.add_log(reviewer.name, f"✅ Approved: {task.title}", "success")
                return False
            task.progress = max(60, task.progress - 20)
            agent.mood = max(30, agent.mood - 10)
            self.state.agent_stats["totalErrors"] = self.state.agent_stats.get("totalErrors", 0) + 1
            self.add_log(reviewer.name if reviewer else "System", f"❌ Rejected: {task.title} — cần sửa lại!", "warning")
            events.append({"type": "task_review_rejected", "task_id": task.id, "agent_id": agent.id})
            return True
        return False

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

    def daily_reset(self) -> List[str]:
        """Reset daily agent stats — called at start of new day."""
        messages = []
        for agent in self.state.agents.values():
            # Partial energy/mood recovery overnight
            agent.energy = min(100, agent.energy + 20)
            agent.mood = min(100, agent.mood + 5)
            # Farmer agents auto-water
            if agent.role == "farmer" and agent.state == "idle":
                messages.append(f"🌾 {agent.name} sẵn sàng tưới nước tự động")
        return messages

    # ═══════════════════════════════════════════════════
    # AUTO-CHAT SYSTEM (from agents.js autoChat())
    # ═══════════════════════════════════════════════════

    def auto_chat(self) -> Optional[Dict]:
        """Trigger random agent speech bubbles and dialogues.
        Ported from agents.js autoChat() — called every tick.
        Returns chat event dict or None."""
        if self._chat_cooldown > 0:
            self._chat_cooldown -= 1
            return None
        if not self.state.agents:
            return None

        # Random interval 30-60 ticks (15-30 seconds)
        self._chat_cooldown = 30 + random.randint(0, 30)

        agents = list(self.state.agents.values())
        agent = random.choice(agents)

        # Pick message based on state
        if agent.energy < 30:
            pool = self._chat_pools["tired"]
        elif agent.mood > 85:
            pool = self._chat_pools["happy"]
        elif agent.state in ("working", "thinking"):
            pool = self._chat_pools["working"]
        else:
            pool = self._chat_pools["idle"]

        msg = random.choice(pool)
        result = {"type": "auto_chat", "agent_id": agent.id, "agent_name": agent.name, "message": msg}

        # 30% chance: nearby agent responds (dialogue)
        if random.random() < 0.3 and len(agents) >= 2:
            others = [a for a in agents if a.id != agent.id]
            if others:
                partner = random.choice(others)
                pair = random.choice(self._chat_pools["dialogue"])
                task_desc = "code" if partner.state == "working" else "chill"
                q = pair[0].replace("{0}", partner.name.split("-")[0])
                a = pair[1].replace("{task}", task_desc)
                result["dialogue"] = {"from": agent.name, "question": q, "to": partner.name, "answer": a}
                self.add_log(agent.name, q, "info")
                self.add_log(partner.name, a, "info")

        return result

    # ═══════════════════════════════════════════════════
    # PM AUTO SUB-TASK BREAKDOWN (from agents.js)
    # ═══════════════════════════════════════════════════

    def pm_breakdown_contract(self, contract) -> List[str]:
        """PM role auto-creates sub-tasks when a contract is accepted.
        Returns list of created task IDs."""
        pm_agents = [a for a in self.state.agents.values() if a.role == "pm" and a.state == "idle"]
        if not pm_agents:
            return []

        pm = pm_agents[0]
        task_ids = []
        task_count = getattr(contract, "tasks_needed", 2)
        roles_needed = getattr(contract, "required_roles", ["coder"])

        for i in range(task_count):
            role = roles_needed[i % len(roles_needed)] if roles_needed else "coder"
            title = f"{contract.title} — Phase {i + 1}"
            task = Task(
                title=title,
                description=f"Sub-task by PM {pm.name}",
                priority="medium",
                required_role=role,
            )
            self.state.tasks[task.id] = task
            task_ids.append(task.id)

        self.add_log(pm.name, f"📋 Đã chia {contract.title} thành {task_count} task nhỏ", "info")
        pm.mood = min(100, pm.mood + 5)
        pm.experience += 3
        return task_ids

    # ═══════════════════════════════════════════════════
    # GET STATS (from agents.js getStats())
    # ═══════════════════════════════════════════════════

    def get_stats(self) -> Dict:
        """Return aggregated stats matching agents.js getStats()."""
        stats = self.state.agent_stats.copy()
        all_tasks = list(self.state.tasks.values())
        stats["agentsOnline"] = len(self.state.agents)
        stats["activeTasks"] = sum(1 for t in all_tasks if t.status == "in_progress")
        stats["pendingTasks"] = sum(1 for t in all_tasks if t.status == "pending")
        stats["completedTasks"] = sum(1 for t in all_tasks if t.status == "completed")
        stats["blockedTasks"] = sum(1 for t in all_tasks if t.status == "blocked")
        stats["reviewTasks"] = sum(1 for t in all_tasks if t.status == "review")
        return stats

    # ═══════════════════════════════════════════════════
    # PERSISTENCE (parity with agents.js save/loadFromStorage)
    # ═══════════════════════════════════════════════════

    def save_to_storage(self, save_dir: str = "saves") -> bool:
        """Save agent data to file (equivalent to localStorage in JS)."""
        try:
            os.makedirs(save_dir, exist_ok=True)
            data = {
                "agents": {aid: a.to_dict() for aid, a in self.state.agents.items()},
                "tasks": {tid: t.to_dict() for tid, t in self.state.tasks.items()},
                "stats": self.state.agent_stats,
                "logs": self.state.agent_logs[:200],
                "performanceHistory": self.state.agent_performance_history,
                "savedAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
            }
            path = os.path.join(save_dir, "pixelAgentData.json")
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            return True
        except Exception:
            return False

    def load_from_storage(self, save_dir: str = "saves") -> bool:
        """Load agent data from file."""
        path = os.path.join(save_dir, "pixelAgentData.json")
        if not os.path.exists(path):
            return False
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            if data.get("stats"):
                self.state.agent_stats.update(data["stats"])
            if data.get("performanceHistory"):
                self.state.agent_performance_history = data["performanceHistory"]
            if data.get("logs"):
                self.state.agent_logs = data["logs"]
            return True
        except Exception:
            return False
