"""
analytics.py — Game Analytics & Statistics
============================================
Tracks and computes game metrics, trends, and reports.
"""

from typing import Dict, List
from .models import GameState


class GameAnalytics:
    """Tracks game performance analytics."""

    def __init__(self, game_state: GameState):
        self.state = game_state
        if not hasattr(self.state, "analytics_history") or not self.state.analytics_history:
            self.state.analytics_history = {"dailyIncome": [], "agentPerformance": [], "contractHistory": []}
        self.max_history = 30

    def take_daily_snapshot(self):
        """Record JS statistics.js-style daily history into persistent state."""
        history = self.state.analytics_history
        agents = list(self.state.agents.values())
        history.setdefault("dailyIncome", []).append({
            "day": self.state.day,
            "income": self.state.total_earned,
            "expense": self.state.total_spent,
            "net": self.state.total_earned - self.state.total_spent,
            "coins": self.state.coins,
        })
        history.setdefault("agentPerformance", []).append({
            "day": self.state.day,
            "count": len(agents),
            "tasks": self.state.total_tasks_done,
            "avgMood": self.state.avg_mood,
            "avgEnergy": self.state.avg_energy,
        })
        history.setdefault("contractHistory", []).append({
            "day": self.state.day,
            "completed": self.state.contracts_completed,
            "failed": self.state.contracts_failed,
        })
        for key in ("dailyIncome", "agentPerformance", "contractHistory"):
            history[key] = history.get(key, [])[-self.max_history:]

    def get_dashboard(self) -> Dict:
        """Get complete analytics dashboard."""
        daily_burn = self.state.daily_salary
        return {
            "overview": {
                "coins": self.state.coins,
                "total_earned": self.state.total_earned,
                "total_spent": self.state.total_spent,
                "net_profit": self.state.total_earned - self.state.total_spent,
                "daily_burn": daily_burn,
                "day": self.state.day,
                "level": self.state.level,
                "level_name": self.state.level_name,
                "xp": self.state.xp,
                "reputation": round(self.state.reputation, 2),
            },
            "agents": {
                "count": self.state.agent_count,
                "daily_salary": daily_burn,
                "avg_mood": self.state.avg_mood,
                "avg_energy": self.state.avg_energy,
                "by_role": self._agents_by_role(),
                "by_model": self._agents_by_model(),
            },
            "contracts": {
                "completed": self.state.contracts_completed,
                "failed": self.state.contracts_failed,
                "success_rate": self.state.success_rate,
                "total_tasks_done": self.state.total_tasks_done,
            },
            "mini_games": self.state.mini_game_scores,
            "history": self.state.analytics_history,
            "trend": self._calc_trend(),
        }

    def _agents_by_role(self) -> Dict[str, int]:
        counts = {}
        for a in self.state.agents.values():
            counts[a.role] = counts.get(a.role, 0) + 1
        return counts

    def _agents_by_model(self) -> Dict[str, int]:
        counts = {}
        for a in self.state.agents.values():
            counts[a.model] = counts.get(a.model, 0) + 1
        return counts

    def _calc_trend(self) -> str:
        income = self.state.analytics_history.get("dailyIncome", [])
        if len(income) < 3:
            return "neutral"
        recent = income[-3:]
        older = income[-6:-3]
        avg_recent = sum(d.get("net", 0) for d in recent) / len(recent)
        if not older:
            return "neutral"
        avg_older = sum(d.get("net", 0) for d in older) / len(older)
        if avg_recent > avg_older * 1.1:
            return "up"
        if avg_recent < avg_older * 0.9:
            return "down"
        return "neutral"

    def get_agent_performance(self) -> List[Dict]:
        """Get performance metrics for each agent."""
        results = []
        for agent in self.state.agents.values():
            total = agent.tasks_completed + agent.tasks_failed
            success_rate = (agent.tasks_completed / total * 100) if total > 0 else 0
            results.append({
                "id": agent.id,
                "name": agent.name,
                "role": agent.role,
                "model": agent.model,
                "tasks_completed": agent.tasks_completed,
                "tasks_failed": agent.tasks_failed,
                "success_rate": round(success_rate, 1),
                "experience": agent.experience,
                "skill_level": agent.skill_level,
                "mood": round(agent.mood, 1),
                "energy": round(agent.energy, 1),
            })
        return sorted(results, key=lambda x: x["tasks_completed"], reverse=True)
