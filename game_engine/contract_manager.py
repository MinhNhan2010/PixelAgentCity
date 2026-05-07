"""
contract_manager.py — Contract & Task Generation
==================================================
Handles contract generation, acceptance, progress tracking,
deadline management, and reward distribution.
"""

import random
import time
from typing import List, Dict, Tuple, Optional
from .models import (
    GameState, Contract, Task, ContractDifficulty,
    ROLE_CONFIG
)


# ═══════════════════════════════════════════════════════
# CONTRACT TEMPLATES
# ═══════════════════════════════════════════════════════

CONTRACT_TEMPLATES = [
    # Easy
    {"title": "Landing Page Design", "client": "PixelShop Inc.", "difficulty": "easy",
     "reward": 150, "deadline": 5, "roles": ["coder"], "tasks_count": 2},
    {"title": "Bug Fix Sprint", "client": "DataFlow Corp.", "difficulty": "easy",
     "reward": 180, "deadline": 4, "roles": ["coder", "tester"], "tasks_count": 3},
    {"title": "API Documentation", "client": "CloudNine LLC.", "difficulty": "easy",
     "reward": 120, "deadline": 6, "roles": ["coder"], "tasks_count": 2},
    {"title": "Logo Redesign", "client": "FreshBrand Co.", "difficulty": "easy",
     "reward": 130, "deadline": 3, "roles": ["designer"], "tasks_count": 1},

    # Medium
    {"title": "E-Commerce Backend", "client": "MegaMart", "difficulty": "medium",
     "reward": 350, "deadline": 7, "roles": ["coder", "tester", "reviewer"], "tasks_count": 5},
    {"title": "Mobile App UI", "client": "AppVenture", "difficulty": "medium",
     "reward": 400, "deadline": 8, "roles": ["designer", "coder"], "tasks_count": 4},
    {"title": "CI/CD Pipeline", "client": "DevOps Pro", "difficulty": "medium",
     "reward": 300, "deadline": 5, "roles": ["devops", "coder"], "tasks_count": 3},
    {"title": "Data Analytics Dashboard", "client": "InsightAI", "difficulty": "medium",
     "reward": 380, "deadline": 6, "roles": ["data_scientist", "coder"], "tasks_count": 4},

    # Hard
    {"title": "Microservices Architecture", "client": "ScaleUp Tech", "difficulty": "hard",
     "reward": 600, "deadline": 10, "roles": ["coder", "devops", "reviewer"], "tasks_count": 7},
    {"title": "AI Chatbot System", "client": "BotGenius", "difficulty": "hard",
     "reward": 700, "deadline": 12, "roles": ["ai_engineer", "coder", "tester"], "tasks_count": 6},
    {"title": "Security Audit", "client": "SafeNet Corp.", "difficulty": "hard",
     "reward": 550, "deadline": 8, "roles": ["security", "coder"], "tasks_count": 5},

    # Epic
    {"title": "Full SaaS Platform", "client": "Enterprise Global", "difficulty": "epic",
     "reward": 1200, "deadline": 15, "roles": ["coder", "designer", "devops", "pm", "tester"], "tasks_count": 10},
    {"title": "AI Research Project", "client": "NeuraLink Labs", "difficulty": "epic",
     "reward": 1500, "deadline": 20, "roles": ["ai_engineer", "data_scientist", "coder", "reviewer"], "tasks_count": 8},
]

TASK_TITLES = {
    "coder": [
        "Implement authentication module", "Build REST API endpoints",
        "Refactor database queries", "Create unit tests",
        "Implement caching layer", "Build WebSocket handler",
        "Create data models", "Implement search functionality",
    ],
    "tester": [
        "Write integration tests", "Perform load testing",
        "QA regression suite", "Cross-browser testing",
        "Mobile responsiveness check", "API endpoint validation",
    ],
    "designer": [
        "Create wireframes", "Design UI mockups",
        "Build component library", "Create icon set",
        "Design color scheme", "Prototype interactions",
    ],
    "reviewer": [
        "Code review sprint", "Architecture review",
        "Security review", "Performance audit",
    ],
    "devops": [
        "Setup CI/CD pipeline", "Configure monitoring",
        "Setup load balancer", "Database migration",
        "Container orchestration", "Infrastructure as code",
    ],
    "pm": [
        "Sprint planning", "Stakeholder meeting",
        "Requirements gathering", "Risk assessment",
    ],
    "data_scientist": [
        "Data preprocessing pipeline", "Model training",
        "Feature engineering", "Results analysis",
    ],
    "security": [
        "Vulnerability scan", "Penetration testing",
        "Security policy review", "Access control audit",
    ],
    "ai_engineer": [
        "Train ML model", "Optimize inference pipeline",
        "Build training dataset", "Implement RAG system",
    ],
    "cto": [
        "Technical strategy review", "Architecture decision",
        "Team structure optimization", "Technology evaluation",
    ],
}


class ContractManager:
    """Manages contracts and task generation."""

    def __init__(self, game_state: GameState):
        self.state = game_state

    # ─── Contract Generation ──────────────────────

    def generate_contracts(self, count: int = 3) -> List[Contract]:
        """Generate new available contracts based on level and reputation."""
        contracts = []

        # Filter templates by difficulty appropriate for level
        available_difficulties = ["easy"]
        if self.state.level >= 3:
            available_difficulties.append("medium")
        if self.state.level >= 5:
            available_difficulties.append("hard")
        if self.state.level >= 8:
            available_difficulties.append("epic")

        # Filter templates
        templates = [t for t in CONTRACT_TEMPLATES
                     if t["difficulty"] in available_difficulties]

        # Pick random templates
        selected = random.sample(templates, min(count, len(templates)))

        for tmpl in selected:
            # Scale reward by reputation
            rep_mul = 0.8 + (self.state.reputation / 5) * 0.4
            reward = int(tmpl["reward"] * rep_mul)

            contract = Contract(
                title=tmpl["title"],
                client=tmpl["client"],
                difficulty=tmpl["difficulty"],
                reward=reward,
                penalty=reward // 4,
                deadline_days=tmpl["deadline"],
                required_roles=tmpl["roles"],
                xp_reward=self._xp_for_difficulty(tmpl["difficulty"]),
            )

            # Generate tasks for this contract
            task_ids = []
            for i in range(tmpl["tasks_count"]):
                role = tmpl["roles"][i % len(tmpl["roles"])]
                task = self._create_task(contract.id, role, tmpl["difficulty"])
                self.state.tasks[task.id] = task
                task_ids.append(task.id)

            contract.tasks = task_ids
            contract.status = "available"
            self.state.contracts[contract.id] = contract
            contracts.append(contract)

        return contracts

    def _create_task(self, contract_id: str, role: str, difficulty: str) -> Task:
        """Create a task for a contract."""
        titles = TASK_TITLES.get(role, TASK_TITLES["coder"])
        title = random.choice(titles)

        diff_map = {"easy": 1, "medium": 2, "hard": 3, "epic": 4}
        diff_level = diff_map.get(difficulty, 1)

        return Task(
            contract_id=contract_id,
            title=title,
            required_role=role,
            difficulty=diff_level,
            xp_reward=10 + diff_level * 10,
        )

    def _xp_for_difficulty(self, difficulty: str) -> int:
        return {"easy": 30, "medium": 60, "hard": 100, "epic": 200}.get(difficulty, 30)

    # ─── Contract Actions ─────────────────────────

    def accept_contract(self, contract_id: str) -> Tuple[bool, str]:
        """Accept a contract."""
        contract = self.state.contracts.get(contract_id)
        if not contract:
            return False, "Contract not found"
        if contract.status != "available":
            return False, f"Contract is already {contract.status}"

        contract.status = "active"
        contract.accepted_day = self.state.day

        return True, f"📋 Accepted: {contract.title} from {contract.client} ({contract.reward}Ⓒ)"

    def check_contract_progress(self, contract_id: str) -> Dict:
        """Check progress of a contract."""
        contract = self.state.contracts.get(contract_id)
        if not contract:
            return {"error": "Contract not found"}

        # Count completed tasks
        total_tasks = len(contract.tasks)
        completed = sum(
            1 for tid in contract.tasks
            if tid in self.state.tasks and self.state.tasks[tid].status == "completed"
        )

        contract.progress = (completed / total_tasks * 100) if total_tasks > 0 else 0

        # Check deadline
        if contract.accepted_day:
            days_elapsed = self.state.day - contract.accepted_day
            days_remaining = contract.deadline_days - days_elapsed
        else:
            days_remaining = contract.deadline_days

        return {
            "contract_id": contract_id,
            "title": contract.title,
            "progress": round(contract.progress, 1),
            "tasks_done": completed,
            "tasks_total": total_tasks,
            "days_remaining": days_remaining,
            "reward": contract.reward,
            "status": contract.status,
        }

    def complete_contract(self, contract_id: str) -> Tuple[bool, str, int]:
        """
        Complete a contract and pay reward.
        Returns (success, message, reward).
        """
        contract = self.state.contracts.get(contract_id)
        if not contract:
            return False, "Contract not found", 0

        # Check all tasks done
        all_done = all(
            self.state.tasks.get(tid, Task()).status == "completed"
            for tid in contract.tasks
        )

        if not all_done:
            return False, "Not all tasks completed yet", 0

        contract.status = "completed"
        contract.completed_day = self.state.day
        self.state.contracts_completed += 1

        return True, f"✅ Contract completed: {contract.title} (+{contract.reward}Ⓒ)", contract.reward

    def fail_contract(self, contract_id: str) -> Tuple[bool, str, int]:
        """Fail a contract (deadline passed)."""
        contract = self.state.contracts.get(contract_id)
        if not contract:
            return False, "Contract not found", 0

        contract.status = "failed"
        self.state.contracts_failed += 1

        return True, f"❌ Contract failed: {contract.title} (-{contract.penalty}Ⓒ)", contract.penalty

    # ─── Daily Check ──────────────────────────────

    def daily_check(self) -> List[Dict]:
        """
        Check all active contracts for completion/expiry.
        Returns list of events.
        """
        events = []

        for contract in list(self.state.contracts.values()):
            if contract.status != "active":
                continue

            # Check if all tasks done → auto-complete
            progress = self.check_contract_progress(contract.id)
            if progress["progress"] >= 100:
                ok, msg, reward = self.complete_contract(contract.id)
                if ok:
                    events.append({
                        "type": "contract_completed",
                        "contract_id": contract.id,
                        "reward": reward,
                        "message": msg,
                    })

            # Check deadline
            elif progress["days_remaining"] <= 0:
                ok, msg, penalty = self.fail_contract(contract.id)
                if ok:
                    events.append({
                        "type": "contract_failed",
                        "contract_id": contract.id,
                        "penalty": penalty,
                        "message": msg,
                    })

        return events

    # ─── Getters ──────────────────────────────────

    def get_available_contracts(self) -> List[Dict]:
        """Get all available contracts."""
        return [
            c.to_dict() for c in self.state.contracts.values()
            if c.status == "available"
        ]

    def get_active_contracts(self) -> List[Dict]:
        """Get all active contracts with progress."""
        results = []
        for c in self.state.contracts.values():
            if c.status == "active":
                info = self.check_contract_progress(c.id)
                results.append(info)
        return results
