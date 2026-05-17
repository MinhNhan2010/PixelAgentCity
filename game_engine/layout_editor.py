"""Layout editor logic ported from legacy_web/layout-editor.js.

This module keeps the gameplay/data parts of the browser layout editor:
furniture catalog, placement collision, floor/wall painting, undo/redo, and
save/load snapshots. DOM/canvas rendering remains intentionally excluded.
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any
import copy
import time

TILE_SIZE = 32
DEFAULT_MAP_W = 40
DEFAULT_MAP_H = 30
ALLOWED_PC_SURFACES = {"desk", "mtable", "table_small", "table_low", "counter"}


@dataclass(frozen=True)
class FurnitureDef:
    id: str
    name: str
    category: str
    icon: str
    w: int = 1
    h: int = 1
    has_slot: bool = False
    bonus: str = "Style only"

    def to_dict(self) -> dict:
        return asdict(self)


FURNITURE_CATALOG: Dict[str, List[FurnitureDef]] = {
    "Bàn Ghế": [
        FurnitureDef("desk", "Bàn làm việc", "Bàn Ghế", "DESK", 3, 2, True),
        FurnitureDef("mtable", "Bàn họp", "Bàn Ghế", "TABLE_FRONT", 3, 4, False, "Pair + Mentor boost"),
        FurnitureDef("table_small", "Bàn nhỏ", "Bàn Ghế", "SMALL_TABLE", 2, 2),
        FurnitureDef("table_low", "Bàn trà", "Bàn Ghế", "COFFEE_TABLE", 2, 1),
        FurnitureDef("mchair", "Ghế họp", "Bàn Ghế", "CUSHIONED_CHAIR", 1, 1),
        FurnitureDef("chair", "Ghế gỗ", "Bàn Ghế", "WOODEN_CHAIR", 1, 2),
    ],
    "Sofa & Giường": [
        FurnitureDef("sofa", "Sofa", "Sofa & Giường", "SOFA", 2, 1, False, "Rest recovery +"),
        FurnitureDef("armchair", "Ghế bành", "Sofa & Giường", "CUSHIONED_BENCH", 1, 1, False, "Rest recovery +"),
        FurnitureDef("bench", "Ghế băng", "Sofa & Giường", "WOODEN_BENCH", 1, 1),
        FurnitureDef("bed_single", "Giường đơn", "Sofa & Giường", "🛏️", 2, 3, False, "Rest recovery +"),
        FurnitureDef("bed_double", "Giường đôi", "Sofa & Giường", "🛏️", 3, 3, False, "Rest recovery +"),
        FurnitureDef("rug", "Thảm", "Sofa & Giường", "🟦", 3, 2, False, "Comfort bonus"),
        FurnitureDef("pillow", "Gối", "Sofa & Giường", "💤", 1, 1, False, "Comfort bonus"),
    ],
    "Tủ & Kệ": [
        FurnitureDef("bookshelf", "Kệ sách", "Tủ & Kệ", "BOOKSHELF", 2, 1, False, "XP gain +"),
        FurnitureDef("cabinet", "Tủ", "Tủ & Kệ", "DOUBLE_BOOKSHELF", 2, 1),
        FurnitureDef("shelf", "Kệ treo", "Tủ & Kệ", "📦", 2, 1, False, "XP gain +"),
        FurnitureDef("boxes", "Thùng hàng", "Tủ & Kệ", "BIN", 1, 1),
    ],
    "Thiết Bị": [
        FurnitureDef("pc", "Máy tính", "Thiết Bị", "PC", 1, 2),
        FurnitureDef("whiteboard", "Bảng trắng", "Thiết Bị", "WHITEBOARD", 2, 2),
        FurnitureDef("vending", "Máy bán hàng", "Thiết Bị", "🥤", 1, 2, False, "Energy regen +"),
        FurnitureDef("coffee", "Máy cà phê", "Thiết Bị", "COFFEE", 1, 1, False, "Energy regen +"),
        FurnitureDef("fridge", "Tủ lạnh", "Thiết Bị", "🧊", 1, 2, False, "Energy regen +"),
        FurnitureDef("billiard_table", "Bàn Billiard", "Thiết Bị", "🎱", 3, 2, False, "Mood + Fun boost"),
        FurnitureDef("counter", "Quầy bếp", "Thiết Bị", "🍳", 3, 1, False, "Energy regen +"),
    ],
    "Trang Trí": [
        FurnitureDef("plant", "Cây cảnh", "Trang Trí", "PLANT", 1, 2, False, "Stress reduction"),
        FurnitureDef("large_plant", "Cây lớn", "Trang Trí", "LARGE_PLANT", 2, 3),
        FurnitureDef("plant2", "Cây kiểng", "Trang Trí", "PLANT_2", 1, 1),
        FurnitureDef("hanging_plant", "Cây treo", "Trang Trí", "HANGING_PLANT", 1, 1),
        FurnitureDef("cactus", "Xương rồng", "Trang Trí", "CACTUS", 1, 2, False, "Stress reduction"),
        FurnitureDef("pot", "Chậu hoa", "Trang Trí", "POT", 1, 1),
        FurnitureDef("bamboo", "Tre trúc", "Trang Trí", "🎋", 1, 2, False, "Stress reduction"),
        FurnitureDef("succulent", "Sen đá", "Trang Trí", "🪴", 1, 1, False, "Stress reduction"),
        FurnitureDef("bonsai", "Cây bonsai", "Trang Trí", "🌳", 1, 2, False, "Focus + Zen"),
        FurnitureDef("palm_indoor", "Cây cọ", "Trang Trí", "🌴", 1, 2, False, "Mood boost"),
        FurnitureDef("fern", "Dương xỉ", "Trang Trí", "🌿", 1, 2, False, "Air quality +"),
        FurnitureDef("orchid", "Lan hồ điệp", "Trang Trí", "🌸", 1, 2, False, "Mood + Beauty"),
        FurnitureDef("vine_wall", "Dây leo", "Trang Trí", "🍀", 1, 2, False, "Stress reduction"),
        FurnitureDef("money_tree", "Cây Kim Tiền", "Trang Trí", "💰", 1, 2, False, "Luck + Coin bonus"),
        FurnitureDef("painting", "Tranh treo", "Trang Trí", "LARGE_PAINTING", 2, 1, False, "Mood boost"),
        FurnitureDef("painting2", "Tranh nhỏ", "Trang Trí", "SMALL_PAINTING_2", 1, 1),
        FurnitureDef("lamp", "Đèn đứng", "Trang Trí", "💡", 1, 2, False, "Mood boost"),
        FurnitureDef("clock", "Đồng hồ", "Trang Trí", "CLOCK", 1, 1, False, "Deadline hint"),
        FurnitureDef("pictureframe", "Khung ảnh", "Trang Trí", "SMALL_PAINTING", 1, 1, False, "Mood boost"),
    ],
}


def _default_map(width: int = DEFAULT_MAP_W, height: int = DEFAULT_MAP_H) -> List[List[Optional[str]]]:
    return [["wood" if 1 <= x < width - 1 and 1 <= y < height - 1 else None for x in range(width)] for y in range(height)]


class LayoutEditorManager:
    def __init__(self, state):
        self.state = state
        defaults = {
            "layout_map": _default_map(),
            "layout_furniture": [],
            "layout_desk_slots": [],
            "layout_undo_stack": [],
            "layout_redo_stack": [],
            "layout_saved_at": None,
        }
        for attr, default in defaults.items():
            current = getattr(state, attr, None)
            if current in (None, []) and default is not None:
                setattr(state, attr, copy.deepcopy(default))
            elif not hasattr(state, attr):
                setattr(state, attr, copy.deepcopy(default))

    @staticmethod
    def catalog() -> dict:
        return {cat: [item.to_dict() for item in items] for cat, items in FURNITURE_CATALOG.items()}

    @staticmethod
    def find_catalog_item(item_id: str) -> Optional[FurnitureDef]:
        for items in FURNITURE_CATALOG.values():
            for item in items:
                if item.id == item_id:
                    return item
        return None

    def check_collision(self, tx: int, ty: int, item_type: str, exclude_index: int = -1) -> str:
        item = self.find_catalog_item(item_type)
        if not item:
            return "unknown"
        width = len(self.state.layout_map[0]) if self.state.layout_map else 0
        height = len(self.state.layout_map)
        for dy in range(item.h):
            for dx in range(item.w):
                x, y = tx + dx, ty + dy
                if x < 0 or y < 0 or x >= width or y >= height:
                    return "out"
                if not self.state.layout_map[y][x]:
                    return "nofloor"
        new_rect = {"x": tx * TILE_SIZE, "y": ty * TILE_SIZE, "w": item.w * TILE_SIZE, "h": item.h * TILE_SIZE}
        for idx, furn in enumerate(self.state.layout_furniture):
            if idx == exclude_index:
                continue
            other = self.find_catalog_item(furn.get("t", ""))
            fw, fh = (other.w if other else 1) * TILE_SIZE, (other.h if other else 1) * TILE_SIZE
            if new_rect["x"] < furn["x"] + fw and new_rect["x"] + new_rect["w"] > furn["x"] and new_rect["y"] < furn["y"] + fh and new_rect["y"] + new_rect["h"] > furn["y"]:
                if item_type == "pc" and furn.get("t") in ALLOWED_PC_SURFACES:
                    continue
                if item_type in ALLOWED_PC_SURFACES and furn.get("t") == "pc":
                    continue
                return "overlap"
        return "ok"

    def place_furniture(self, item_type: str, tx: int, ty: int) -> dict:
        collision = self.check_collision(tx, ty, item_type)
        if collision != "ok":
            return {"success": False, "reason": collision, "message": self._collision_message(collision)}
        item = self.find_catalog_item(item_type)
        furn = {"t": item_type, "x": tx * TILE_SIZE, "y": ty * TILE_SIZE, "w": item.w, "h": item.h}
        if item.has_slot:
            furn["slotIdx"] = len(self.state.layout_desk_slots)
            self.state.layout_desk_slots.append({"tx": tx, "ty": ty, "x": (tx + 0.5) * TILE_SIZE, "y": (ty + 0.5) * TILE_SIZE, "occupied": False, "agentId": None})
        self.state.layout_furniture.append(furn)
        self._push_undo({"type": "place", "index": len(self.state.layout_furniture) - 1, "furn": copy.deepcopy(furn)})
        self._mark_saved()
        return {"success": True, "message": f"Đã đặt {item.name} tại ({tx}, {ty})", "furniture": furn}

    def erase_at(self, tx: int, ty: int) -> dict:
        wx, wy = tx * TILE_SIZE, ty * TILE_SIZE
        for idx in range(len(self.state.layout_furniture) - 1, -1, -1):
            furn = self.state.layout_furniture[idx]
            item = self.find_catalog_item(furn.get("t", ""))
            fw, fh = (item.w if item else 1) * TILE_SIZE, (item.h if item else 1) * TILE_SIZE
            if furn["x"] <= wx <= furn["x"] + fw and furn["y"] <= wy <= furn["y"] + fh:
                removed = self.state.layout_furniture.pop(idx)
                self._push_undo({"type": "remove", "index": idx, "furn": copy.deepcopy(removed)})
                self._mark_saved()
                return {"success": True, "message": f"Đã xóa {item.name if item else removed.get('t')}", "furniture": removed}
        return {"success": False, "message": "Không tìm thấy đồ vật"}

    def paint_floor(self, tx: int, ty: int, floor_type: Optional[str]) -> dict:
        if not self._in_bounds(tx, ty):
            return {"success": False, "message": "Ngoài phạm vi bản đồ"}
        old = self.state.layout_map[ty][tx]
        new = None if floor_type == "erase" else floor_type
        if old == new:
            return {"success": True, "changed": False, "tile": [tx, ty], "value": new}
        self.state.layout_map[ty][tx] = new
        self._push_undo({"type": "floor", "tx": tx, "ty": ty, "old": old, "new": new})
        self._mark_saved()
        return {"success": True, "changed": True, "tile": [tx, ty], "value": new}

    def paint_wall(self, tx: int, ty: int) -> dict:
        old = self.state.layout_map[ty][tx] if self._in_bounds(tx, ty) else None
        return self.paint_floor(tx, ty, None if old == "wall" else "wall")

    def undo(self) -> dict:
        if not self.state.layout_undo_stack:
            return {"success": False, "message": "Không có thao tác để hoàn tác"}
        action = self.state.layout_undo_stack.pop()
        self.state.layout_redo_stack.append(copy.deepcopy(action))
        self._apply_undo(action)
        self._mark_saved()
        return {"success": True, "action": action}

    def redo(self) -> dict:
        if not self.state.layout_redo_stack:
            return {"success": False, "message": "Không có thao tác để làm lại"}
        action = self.state.layout_redo_stack.pop()
        self.state.layout_undo_stack.append(copy.deepcopy(action))
        self._apply_redo(action)
        self._mark_saved()
        return {"success": True, "action": action}

    def capture(self) -> dict:
        return {"savedAt": self.state.layout_saved_at, "map": copy.deepcopy(self.state.layout_map), "furniture": copy.deepcopy(self.state.layout_furniture), "deskSlots": copy.deepcopy(self.state.layout_desk_slots)}

    def apply_layout(self, data: dict) -> dict:
        if "map" in data:
            self.state.layout_map = copy.deepcopy(data["map"])
        if "furniture" in data:
            self.state.layout_furniture = copy.deepcopy(data["furniture"])
        if "deskSlots" in data:
            self.state.layout_desk_slots = copy.deepcopy(data["deskSlots"])
        self.state.layout_undo_stack = []
        self.state.layout_redo_stack = []
        self._mark_saved()
        return {"success": True, "layout": self.capture()}

    def status(self) -> dict:
        return {"catalog": self.catalog(), "layout": self.capture(), "undo_count": len(self.state.layout_undo_stack), "redo_count": len(self.state.layout_redo_stack)}

    def _in_bounds(self, tx: int, ty: int) -> bool:
        return bool(self.state.layout_map) and 0 <= ty < len(self.state.layout_map) and 0 <= tx < len(self.state.layout_map[0])

    def _push_undo(self, action: dict) -> None:
        self.state.layout_undo_stack.append(copy.deepcopy(action))
        if len(self.state.layout_undo_stack) > 100:
            self.state.layout_undo_stack.pop(0)
        self.state.layout_redo_stack = []

    def _apply_undo(self, action: dict) -> None:
        if action["type"] == "floor":
            self.state.layout_map[action["ty"]][action["tx"]] = action["old"]
        elif action["type"] == "place":
            if 0 <= action["index"] < len(self.state.layout_furniture):
                self.state.layout_furniture.pop(action["index"])
        elif action["type"] == "remove":
            self.state.layout_furniture.insert(action["index"], copy.deepcopy(action["furn"]))

    def _apply_redo(self, action: dict) -> None:
        if action["type"] == "floor":
            self.state.layout_map[action["ty"]][action["tx"]] = action["new"]
        elif action["type"] == "place":
            self.state.layout_furniture.insert(action["index"], copy.deepcopy(action["furn"]))
        elif action["type"] == "remove" and 0 <= action["index"] < len(self.state.layout_furniture):
            self.state.layout_furniture.pop(action["index"])

    def _mark_saved(self) -> None:
        self.state.layout_saved_at = time.strftime("%Y-%m-%dT%H:%M:%S")

    @staticmethod
    def _collision_message(reason: str) -> str:
        return {"out": "Ngoài phạm vi bản đồ!", "nofloor": "Không thể đặt ngoài sàn nhà!", "overlap": "Bị chồng với đồ vật khác!", "unknown": "Loại nội thất không tồn tại!"}.get(reason, reason)
