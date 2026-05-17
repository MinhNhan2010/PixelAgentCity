"""
statistics.py — JS StatsDashboard Parity
=======================================
Complements analytics.py with the exact summary/history shape from statistics.js.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from .models import GameState, ROLE_CONFIG


class StatsDashboard:
    def __init__(self, state: Optional[GameState] = None):
        self.state = state
        if state is not None:
            if not getattr(state, "analytics_history", None):
                state.analytics_history = {"dailyIncome": [], "agentPerformance": [], "contractHistory": []}
            self.history = state.analytics_history
        else:
            self.history = {"dailyIncome": [], "agentPerformance": [], "contractHistory": []}
        self.max_history = 30

    def record_day(self, state: Optional[GameState] = None) -> None:
        game = state or self.state
        if game is None:
            return
        agents = list(game.agents.values())
        day = game.day
        self.history.setdefault("dailyIncome", []).append({
            "day": day,
            "income": game.total_earned,
            "expense": game.total_spent,
            "net": game.total_earned - game.total_spent,
            "coins": game.coins,
        })
        avg_mood = sum((a.mood or 70) for a in agents) / len(agents) if agents else 0
        avg_energy = sum((a.energy or 80) for a in agents) / len(agents) if agents else 0
        self.history.setdefault("agentPerformance", []).append({
            "day": day,
            "count": len(agents),
            "tasks": game.agent_stats.get("totalTasksCompleted", game.total_tasks_done),
            "avgMood": round(avg_mood),
            "avgEnergy": round(avg_energy),
        })
        self.history.setdefault("contractHistory", []).append({
            "day": day,
            "completed": game.contracts_completed,
            "failed": game.contracts_failed,
        })
        for key in ("dailyIncome", "agentPerformance", "contractHistory"):
            if len(self.history[key]) > self.max_history:
                self.history[key] = self.history[key][-self.max_history:]
        if game is not None:
            game.analytics_history = self.history

    def get_summary(self, state: Optional[GameState] = None) -> Dict[str, Any]:
        game = state or self.state
        if game is None:
            return {}
        agents = list(game.agents.values())
        return {
            "coins": game.coins,
            "totalEarned": game.total_earned,
            "totalSpent": game.total_spent,
            "netProfit": game.total_earned - game.total_spent,
            "dailyBurn": self._calc_daily_burn(game, agents),
            "day": game.day,
            "level": game.level,
            "reputation": game.reputation,
            "completedContracts": game.contracts_completed,
            "failedContracts": game.contracts_failed,
            "successRate": f"{round((game.contracts_completed / (game.contracts_completed + game.contracts_failed)) * 100):.0f}" if game.contracts_completed > 0 else "0",
            "agentCount": len(agents),
            "totalTasks": game.agent_stats.get("totalTasksCompleted", game.total_tasks_done),
            "totalLines": game.agent_stats.get("totalLinesWritten", game.agent_stats.get("total_lines_written", 0)),
            "totalCommits": game.agent_stats.get("totalCommits", game.agent_stats.get("total_commits", 0)),
            "avgMood": round(sum((a.mood or 70) for a in agents) / len(agents)) if agents else 0,
            "avgEnergy": round(sum((a.energy or 80) for a in agents) / len(agents)) if agents else 0,
            "roleDistribution": self._get_role_distribution(agents),
            "trend": self._calc_trend(),
        }

    def _calc_daily_burn(self, game: GameState, agents: List[Any]) -> int:
        salary = 0
        for agent in agents:
            salary += ROLE_CONFIG.get(agent.role, ROLE_CONFIG["coder"]).get("salary", 15)
        return salary

    def _get_role_distribution(self, agents: List[Any]) -> Dict[str, int]:
        dist: Dict[str, int] = {}
        for agent in agents:
            dist[agent.role] = dist.get(agent.role, 0) + 1
        return dist

    def _calc_trend(self) -> str:
        inc = self.history.get("dailyIncome", [])
        if len(inc) < 3:
            return "neutral"
        recent = inc[-3:]
        avg_recent = sum(d.get("net", 0) for d in recent) / len(recent)
        older = inc[-6:-3]
        if len(older) == 0:
            return "neutral"
        avg_older = sum(d.get("net", 0) for d in older) / len(older)
        if avg_recent > avg_older * 1.1:
            return "up"
        if avg_recent < avg_older * 0.9:
            return "down"
        return "neutral"

    def save_data(self) -> Dict[str, List[Dict[str, Any]]]:
        return {k: list(v) for k, v in self.history.items()}

    def load_data(self, data: Optional[Dict[str, List[Dict[str, Any]]]]) -> None:
        if data:
            self.history = {
                "dailyIncome": data.get("dailyIncome", []),
                "agentPerformance": data.get("agentPerformance", []),
                "contractHistory": data.get("contractHistory", []),
            }
            if self.state is not None:
                self.state.analytics_history = self.history
