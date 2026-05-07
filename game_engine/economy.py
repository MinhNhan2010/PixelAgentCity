"""
economy.py — Economy & Financial System
=========================================
Handles coins, transactions, salary payments, revenue tracking,
and the financial simulation loop.
"""

import time
from typing import List, Dict, Tuple
from .models import GameState, LEVEL_THRESHOLDS


class EconomyManager:
    """Manages the in-game economy."""

    def __init__(self, game_state: GameState):
        self.state = game_state
        self._transaction_log: List[Dict] = []

    # ─── Transactions ─────────────────────────────

    def add_coins(self, amount: int, reason: str = "") -> int:
        """Add coins (revenue). Returns new balance."""
        self.state.coins += amount
        self.state.total_earned += amount
        self._log_transaction(amount, reason)
        return self.state.coins

    def spend_coins(self, amount: int, reason: str = "") -> Tuple[bool, int]:
        """Spend coins. Returns (success, new_balance)."""
        if self.state.coins < amount:
            return False, self.state.coins

        self.state.coins -= amount
        self.state.total_spent += amount
        self._log_transaction(-amount, reason)
        return True, self.state.coins

    def can_afford(self, amount: int) -> bool:
        """Check if player can afford an expense."""
        return self.state.coins >= amount

    # ─── Daily Salary ─────────────────────────────

    def pay_daily_salary(self) -> Tuple[int, List[str]]:
        """
        Pay salary to all agents. Called at end of each day.
        Returns (total_paid, messages).
        """
        total = 0
        messages = []

        for agent in self.state.agents.values():
            salary = agent.salary
            total += salary
            messages.append(f"💸 {agent.name}: -{salary}Ⓒ")

        if total > 0:
            self.state.coins -= total
            self.state.total_spent += total
            self._log_transaction(-total, "Daily salary")

        return total, messages

    # ─── XP & Leveling ────────────────────────────

    def add_xp(self, amount: int) -> Dict:
        """
        Add XP and check for level up.
        Returns event dict if leveled up, else empty dict.
        """
        self.state.xp += amount
        old_level = self.state.level

        # Check level thresholds
        for threshold in reversed(LEVEL_THRESHOLDS):
            if self.state.xp >= threshold["xp"]:
                self.state.level = threshold["level"]
                break

        if self.state.level > old_level:
            level_info = next(
                (t for t in LEVEL_THRESHOLDS if t["level"] == self.state.level),
                None
            )
            return {
                "type": "level_up",
                "old_level": old_level,
                "new_level": self.state.level,
                "name": level_info["name"] if level_info else "Unknown",
                "message": f"🎉 LEVEL UP! Level {self.state.level} — {level_info['name'] if level_info else ''}"
            }

        return {}

    # ─── Reputation ───────────────────────────────

    def adjust_reputation(self, delta: float) -> float:
        """Adjust reputation. Clamped to 0-5."""
        self.state.reputation = max(0, min(5, self.state.reputation + delta))
        return self.state.reputation

    # ─── Game Over Check ──────────────────────────

    def is_bankrupt(self) -> bool:
        """Check if player is bankrupt (can't pay next salary)."""
        daily_salary = self.state.daily_salary
        return self.state.coins < 0 or (
            self.state.coins < daily_salary and len(self.state.agents) > 0
        )

    # ─── Financial Summary ────────────────────────

    def get_financial_summary(self) -> Dict:
        """Get complete financial summary."""
        return {
            "coins": self.state.coins,
            "total_earned": self.state.total_earned,
            "total_spent": self.state.total_spent,
            "net_profit": self.state.total_earned - self.state.total_spent,
            "daily_salary": self.state.daily_salary,
            "agent_count": self.state.agent_count,
            "runway_days": (
                self.state.coins // self.state.daily_salary
                if self.state.daily_salary > 0 else 999
            ),
            "level": self.state.level,
            "level_name": self.state.level_name,
            "xp": self.state.xp,
            "next_level_xp": self._next_level_xp(),
            "reputation": round(self.state.reputation, 2),
            "recent_transactions": self._transaction_log[-20:],
        }

    def _next_level_xp(self) -> int:
        """XP needed for next level."""
        for threshold in LEVEL_THRESHOLDS:
            if threshold["level"] > self.state.level:
                return threshold["xp"]
        return self.state.xp  # Max level

    def _log_transaction(self, amount: int, reason: str):
        """Log a transaction."""
        self._transaction_log.append({
            "amount": amount,
            "reason": reason,
            "balance": self.state.coins,
            "timestamp": time.time(),
            "day": self.state.day,
        })
        # Keep only last 100
        if len(self._transaction_log) > 100:
            self._transaction_log = self._transaction_log[-100:]
