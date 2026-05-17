"""
pixel_engine_bridge.py — Python Bridge for PixelEngine
=======================================================
Server-side parity for python-bridge.js: sprite configs, room defs,
agent position helpers, camera state, and furniture validation.
"""

from __future__ import annotations

import math
import random
from typing import Any, Dict, List, Optional, Tuple

from .models import GameState, ROLE_CONFIG
from .game_app import ROOM_CATALOG


# ═══════════════════════════════════════════════════════
# SPRITE CONFIG — mirrors pixel-engine.js sprite sheet
# ═══════════════════════════════════════════════════════

TILE_SIZE = 32

SPRITE_COLORS: Dict[str, str] = {
    "coder": "#4ecdc4", "tester": "#ff6b6b", "reviewer": "#45b7d1",
    "designer": "#f9ca24", "devops": "#6c5ce7", "pm": "#fd79a8",
    "data_scientist": "#00b894", "security": "#e17055", "ai_engineer": "#a29bfe",
    "cto": "#ffeaa7", "researcher": "#74b9ff", "farmer": "#55efc4",
    "analyst": "#81ecec", "backend": "#fab1a0", "mobile": "#dfe6e9",
    "writer": "#b2bec3",
}

DIRECTION_OFFSETS = {
    "down": (0, 1), "up": (0, -1), "left": (-1, 0), "right": (1, 0),
}

WALK_SPEED = 1.5  # tiles per second


# ═══════════════════════════════════════════════════════
# ROOM HELPERS
# ═══════════════════════════════════════════════════════

def get_room_by_id(room_id: int) -> Optional[Dict[str, Any]]:
    return next((r for r in ROOM_CATALOG if r["id"] == room_id), None)


def can_unlock_room(room_id: int, coins: int, level: int) -> Tuple[bool, str]:
    room = get_room_by_id(room_id)
    if not room:
        return False, "Room not found"
    if level < room["level"]:
        return False, f"Need level {room['level']} to unlock"
    if coins < room["cost"]:
        return False, f"Need {room['cost']}Ⓒ, have {coins}Ⓒ"
    return True, f"Ready to unlock for {room['cost']}Ⓒ"


def buy_room(state: GameState, room_id: int) -> Dict[str, Any]:
    ok, msg = can_unlock_room(room_id, state.coins, state.level)
    if not ok:
        return {"success": False, "message": msg}
    room = get_room_by_id(room_id)
    if room_id in state.unlocked_rooms:
        return {"success": False, "message": "Room already unlocked"}
    state.coins -= room["cost"]
    state.total_spent += room["cost"]
    state.unlocked_rooms.append(room_id)
    return {"success": True, "message": f"🏠 Unlocked: {room['icon']} {room['name']}!", "room": room}


# ═══════════════════════════════════════════════════════
# AGENT POSITION HELPERS
# ═══════════════════════════════════════════════════════

def calc_walk_target(agent_x: float, agent_y: float, room_w: int, room_h: int) -> Tuple[float, float]:
    """Pick a random walk target within room bounds (grid coords)."""
    margin = 2
    tx = random.uniform(margin, room_w - margin)
    ty = random.uniform(margin, room_h - margin)
    return round(tx, 1), round(ty, 1)


def distance(x1: float, y1: float, x2: float, y2: float) -> float:
    return math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)


def move_towards(x: float, y: float, tx: float, ty: float, speed: float, dt: float) -> Tuple[float, float, bool]:
    """Move (x,y) towards (tx,ty). Returns (new_x, new_y, arrived)."""
    d = distance(x, y, tx, ty)
    if d < 0.1:
        return tx, ty, True
    step = min(speed * dt, d)
    ratio = step / d
    return round(x + (tx - x) * ratio, 2), round(y + (ty - y) * ratio, 2), False


def get_direction(x: float, y: float, tx: float, ty: float) -> str:
    dx, dy = tx - x, ty - y
    if abs(dx) > abs(dy):
        return "right" if dx > 0 else "left"
    return "down" if dy > 0 else "up"


# ═══════════════════════════════════════════════════════
# CAMERA / VIEWPORT
# ═══════════════════════════════════════════════════════

def clamp_camera(cam_x: float, cam_y: float, map_w: int, map_h: int,
                 viewport_w: int, viewport_h: int, zoom: float = 1.0) -> Tuple[float, float]:
    """Clamp camera so viewport stays within map bounds."""
    max_x = max(0, map_w * TILE_SIZE * zoom - viewport_w)
    max_y = max(0, map_h * TILE_SIZE * zoom - viewport_h)
    return max(0, min(cam_x, max_x)), max(0, min(cam_y, max_y))


def tile_at_screen(screen_x: int, screen_y: int, cam_x: float, cam_y: float,
                   zoom: float = 1.0) -> Tuple[int, int]:
    """Convert screen coords to tile coords."""
    world_x = (screen_x + cam_x) / zoom
    world_y = (screen_y + cam_y) / zoom
    return int(world_x // TILE_SIZE), int(world_y // TILE_SIZE)


# ═══════════════════════════════════════════════════════
# DESK SLOT ASSIGNMENT
# ═══════════════════════════════════════════════════════

def assign_agent_to_desk(state: GameState, agent_id: str) -> Optional[Dict[str, Any]]:
    """Find a free desk slot and assign agent. Returns slot or None."""
    for slot in state.layout_desk_slots:
        if not slot.get("occupied"):
            slot["occupied"] = True
            slot["agentId"] = agent_id
            return slot
    return None


def free_desk_slot(state: GameState, agent_id: str) -> None:
    for slot in state.layout_desk_slots:
        if slot.get("agentId") == agent_id:
            slot["occupied"] = False
            slot["agentId"] = None


# ═══════════════════════════════════════════════════════
# BRIDGE STATUS (for /api/bridge endpoint)
# ═══════════════════════════════════════════════════════

def get_bridge_status(state: GameState) -> Dict[str, Any]:
    return {
        "rooms": ROOM_CATALOG,
        "unlockedRooms": state.unlocked_rooms,
        "deskSlots": state.layout_desk_slots,
        "agentPositions": {
            aid: {"x": a.x, "y": a.y, "tx": a.target_x, "ty": a.target_y,
                  "room": a.room_id, "state": a.state, "color": SPRITE_COLORS.get(a.role, a.color)}
            for aid, a in state.agents.items()
        },
        "tileSize": TILE_SIZE,
        "walkSpeed": WALK_SPEED,
    }
