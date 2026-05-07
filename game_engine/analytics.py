"""
analytics.py — Game Analytics & Statistics
============================================
Tracks and computes game metrics, trends, and reports.
"""

import time
from typing import Dict, List
from .models import GameState


class GameAnalytics:
    """Tracks game performance analytics."""

    def __init__(self, game_state: GameState):
        self.state = game_state
        self._daily_snapshots: List[Dict] = []

    def take_daily_snapshot(self):
        """Record a daily snapshot of key metrics."""
        self._daily_snapshots.append({
            "day": self.state.day,
            "coins": self.state.coins,
            "agents": self.state.agent_count,
            "reputation": round(self.state.reputation, 2),
            "level": self.state.level,
            "xp": self.state.xp,
            "contracts_done": self.state.contracts_completed,
            "tasks_done": self.state.total_tasks_done,
            "avg_mood": self.state.avg_mood,
            "avg_energy": self.state.avg_energy,
            "timestamp": time.time(),
        })
        # Keep last 50 days
        if len(self._daily_snapshots) > 50:
            self._daily_snapshots = self._daily_snapshots[-50:]

    def get_dashboard(self) -> Dict:
        """Get complete analytics dashboard."""
        return {
            "overview": {
                "coins": self.state.coins,
                "total_earned": self.state.total_earned,
                "total_spent": self.state.total_spent,
                "net_profit": self.state.total_earned - self.state.total_spent,
                "day": self.state.day,
                "level": self.state.level,
                "level_name": self.state.level_name,
                "xp": self.state.xp,
                "reputation": round(self.state.reputation, 2),
            },
            "agents": {
                "count": self.state.agent_count,
                "daily_salary": self.state.daily_salary,
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
            "trend": self._daily_snapshots[-20:],
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
