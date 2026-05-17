"""
save_manager.py — Save/Load System
====================================
Handles game state persistence to JSON files.
"""

import json
import os
import time
from typing import Optional, Dict, Tuple
from .models import GameState, Agent, Task, Contract, FarmPlot, InventoryItem, Achievement, TechNode

SAVE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "saves")


class SaveManager:
    """Manages game save/load operations."""

    def __init__(self):
        os.makedirs(SAVE_DIR, exist_ok=True)

    def save(self, state: GameState, slot: str = "auto") -> Tuple[bool, str]:
        """Save game state to a JSON file."""
        try:
            state.last_saved = time.time()
            data = state.to_dict()
            filepath = os.path.join(SAVE_DIR, f"save_{slot}.json")
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            size_kb = os.path.getsize(filepath) / 1024
            return True, f"💾 Game saved to slot '{slot}' ({size_kb:.1f} KB)"
        except Exception as e:
            return False, f"❌ Save failed: {str(e)}"

    def load(self, slot: str = "auto") -> Tuple[Optional[GameState], str]:
        """Load game state from a JSON file."""
        filepath = os.path.join(SAVE_DIR, f"save_{slot}.json")
        if not os.path.exists(filepath):
            return None, f"No save found in slot '{slot}'"

        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)

            state = GameState()
            # Restore simple fields
            for key in ["coins", "total_earned", "total_spent", "day", "day_progress",
                         "level", "xp", "reputation", "speed", "paused",
                         "contracts_completed", "contracts_failed", "total_tasks_done",
                         "unlocked_rooms", "created_at", "last_saved"]:
                if key in data:
                    setattr(state, key, data[key])

            # Restore agents
            for aid, adata in data.get("agents", {}).items():
                agent = Agent(**{k: v for k, v in adata.items() if k in Agent.__dataclass_fields__})
                state.agents[aid] = agent

            # Restore tasks
            for tid, tdata in data.get("tasks", {}).items():
                task = Task(**{k: v for k, v in tdata.items() if k in Task.__dataclass_fields__})
                state.tasks[tid] = task

            # Restore contracts
            for cid, cdata in data.get("contracts", {}).items():
                contract = Contract(**{k: v for k, v in cdata.items() if k in Contract.__dataclass_fields__})
                state.contracts[cid] = contract

            # Restore farm plots
            state.farm_plots = []
            for pdata in data.get("farm_plots", []):
                plot = FarmPlot(**{k: v for k, v in pdata.items() if k in FarmPlot.__dataclass_fields__})
                state.farm_plots.append(plot)

            # Restore inventory
            state.inventory = []
            for idata in data.get("inventory", []):
                item = InventoryItem(**{k: v for k, v in idata.items() if k in InventoryItem.__dataclass_fields__})
                state.inventory.append(item)

            # Restore plain data fields added by converted JS systems
            for key in [
                "mini_game_scores", "mini_game_flags", "mini_game_history",
                "slot_stats", "gold_price", "gold_history", "gold_holdings",
                "cafe_stats", "fishing_stats", "billiards_stats",
                "fighter_stats", "flappy_stats", "racer_stats", "analytics_history",
                "agent_stats", "agent_logs", "agent_performance_history", "agent_event_cooldown",
                "achievement_unlocked",
                "tech_unlocked", "tech_current_research", "tech_research_progress",
                "shop_inventory", "shop_equipped_items", "shop_active_buffs",
                "shop_global_bonuses", "shop_daily_specials", "shop_last_refresh_day",
                "shop_agent_buy_tracker", "shop_stats",
                "layout_map", "layout_furniture", "layout_desk_slots",
                "layout_undo_stack", "layout_redo_stack", "layout_saved_at",
            ]:
                if key in data:
                    setattr(state, key, data[key])

            return state, f"📂 Loaded save from slot '{slot}'"
        except Exception as e:
            return None, f"❌ Load failed: {str(e)}"

    def list_saves(self) -> list:
        """List all available save files."""
        saves = []
        for f in os.listdir(SAVE_DIR):
            if f.startswith("save_") and f.endswith(".json"):
                slot = f[5:-5]
                filepath = os.path.join(SAVE_DIR, f)
                size = os.path.getsize(filepath)
                mtime = os.path.getmtime(filepath)
                saves.append({"slot": slot, "size_bytes": size, "modified": mtime,
                               "modified_str": time.strftime("%Y-%m-%d %H:%M", time.localtime(mtime))})
        return sorted(saves, key=lambda s: s["modified"], reverse=True)

    def delete_save(self, slot: str) -> Tuple[bool, str]:
        """Delete a save file."""
        filepath = os.path.join(SAVE_DIR, f"save_{slot}.json")
        if os.path.exists(filepath):
            os.remove(filepath)
            return True, f"🗑️ Deleted save '{slot}'"
        return False, f"Save '{slot}' not found"
