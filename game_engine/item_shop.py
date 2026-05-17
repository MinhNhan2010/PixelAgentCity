"""PixelMart item catalog and shop manager ported from item-catalog.js/item-shop.js."""

from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any
import random
import time


@dataclass(frozen=True)
class ItemDef:
    id: str
    name: str
    icon: str
    category: str
    price: int
    sell_price: int
    rarity: str
    max_stack: int
    effect: Dict[str, Any]
    description: str
    daily: bool = False

    def to_dict(self) -> dict:
        return asdict(self)


ITEMS: List[ItemDef] = [
    ItemDef("coffee_black", "Cà Phê Đen", "☕", "consumable", 8, 3, "common", 20, {"type": "instant", "stat": "energy", "value": 20}, "Tăng Energy +20 ngay lập tức"),
    ItemDef("energy_drink", "Energy Drink", "⚡", "consumable", 15, 6, "common", 15, {"type": "buff", "stat": "energy", "value": 40, "speed": 10, "duration": 60}, "Energy +40, Speed +10% (60s)"),
    ItemDef("pixel_pizza", "Pixel Pizza", "🍕", "consumable", 12, 5, "common", 20, {"type": "instant", "stat": "both", "mood": 15, "energy": 10}, "Mood +15, Energy +10 tức thì"),
    ItemDef("golden_boba", "Golden Boba", "🧋", "consumable", 20, 8, "uncommon", 10, {"type": "instant", "stat": "mood", "value": 25}, "Mood +25 tức thì"),
    ItemDef("brain_boost", "Brain Boost Pill", "💊", "consumable", 30, 12, "uncommon", 10, {"type": "buff", "stat": "xp", "value": 30, "duration": 120}, "XP gain +30% trong 120s"),
    ItemDef("mega_protein", "Mega Protein", "💪", "consumable", 25, 10, "uncommon", 10, {"type": "buff", "stat": "taskSpeed", "value": 20, "duration": 90}, "Task speed +20% trong 90s"),
    ItemDef("lucky_cookie", "Lucky Cookie", "🥠", "consumable", 18, 7, "common", 15, {"type": "random", "stats": ["mood", "energy", "xp"], "range": [10, 30]}, "Random buff (mood/energy/xp)"),
    ItemDef("team_snack", "Team Snack Box", "🎁", "consumable", 50, 20, "uncommon", 5, {"type": "team", "mood": 10, "energy": 5}, "Tất cả agents: Mood +10, Energy +5"),
    ItemDef("mech_keyboard", "Mechanical Keyboard", "⌨️", "tool", 80, 30, "uncommon", 1, {"type": "equip", "stat": "codingSpeed", "value": 10}, "Coding speed +10% (vĩnh viễn)"),
    ItemDef("dual_monitor", "Dual Monitor", "🖥️", "tool", 120, 45, "rare", 1, {"type": "equip", "stat": "taskSpeed", "value": 15}, "Task speed +15% (vĩnh viễn)"),
    ItemDef("standing_desk", "Standing Desk", "🪑", "tool", 100, 40, "uncommon", 1, {"type": "equip", "stat": "energyDrain", "value": -10}, "Energy drain giảm 10% (vĩnh viễn)"),
    ItemDef("headphones", "NC Headphones", "🎧", "tool", 90, 35, "uncommon", 1, {"type": "equip", "stat": "moodDecay", "value": -15}, "Mood decay giảm 15% (vĩnh viễn)"),
    ItemDef("ai_copilot", "AI Copilot License", "🤖", "tool", 200, 80, "rare", 1, {"type": "equip", "stat": "xpGain", "value": 20}, "XP gain +20% (vĩnh viễn)"),
    ItemDef("vpn_premium", "VPN Premium", "🔐", "tool", 60, 22, "common", 1, {"type": "equip", "stat": "security", "value": 25}, "Security agent +25% effectiveness"),
    ItemDef("test_framework", "Testing Framework", "🧪", "tool", 150, 60, "rare", 1, {"type": "equip", "stat": "bugFind", "value": 30}, "Tester bug-find rate +30%"),
    ItemDef("design_toolkit", "Design Toolkit", "🎨", "tool", 140, 55, "rare", 1, {"type": "equip", "stat": "designSpeed", "value": 20}, "Designer mood decay giảm 20%"),
    ItemDef("neon_sign", "Neon Sign \"OPEN\"", "🔆", "decoration", 40, 15, "common", 1, {"type": "global", "stat": "mood", "value": 5}, "Mood +5% toàn team"),
    ItemDef("arcade_mini", "Mini Arcade Cabinet", "🕹️", "decoration", 70, 28, "uncommon", 1, {"type": "global", "stat": "idleMoodRegen", "value": 8}, "Idle mood regen +8%"),
    ItemDef("fish_tank", "Fish Tank", "🐠", "decoration", 55, 22, "common", 1, {"type": "global", "stat": "stress", "value": -10}, "Stress reduction -10%"),
    ItemDef("trophy_case", "Trophy Case", "🏆", "decoration", 65, 26, "uncommon", 1, {"type": "global", "stat": "contractXp", "value": 5}, "XP bonus +5% sau mỗi contract"),
    ItemDef("wall_clock_gold", "Wall Clock (Gold)", "⏰", "decoration", 45, 18, "common", 1, {"type": "global", "stat": "deadline", "value": 1}, "Deadline awareness +1 day"),
    ItemDef("team_photo", "Team Photo Frame", "📸", "decoration", 30, 12, "common", 1, {"type": "global", "stat": "collaboration", "value": 10}, "Collaboration chance +10%"),
    ItemDef("motivational", "Motivational Poster", "📜", "decoration", 20, 8, "common", 1, {"type": "global", "stat": "moodFloor", "value": 5}, "Mood floor +5 (tối thiểu 35)"),
    ItemDef("premium_client", "Premium Client Contact", "📱", "booster", 100, 40, "rare", 3, {"type": "contract", "bonus": 50}, "Unlock 1 contract thưởng cao hơn 50%"),
    ItemDef("deadline_ext", "Deadline Extension", "⏳", "booster", 40, 15, "common", 5, {"type": "contract", "extraDays": 2}, "+2 ngày cho 1 active contract"),
    ItemDef("rep_booster", "Reputation Booster", "⭐", "booster", 80, 32, "uncommon", 3, {"type": "reputation", "value": 0.3}, "+0.3 Reputation"),
    ItemDef("contract_refresh", "Contract Refresh", "🔄", "booster", 30, 12, "common", 5, {"type": "refresh"}, "Refresh bảng contract available"),
    ItemDef("difficulty_reducer", "Difficulty Reducer", "📉", "booster", 60, 24, "uncommon", 3, {"type": "contract", "taskReduction": 25}, "Giảm task count -25% cho 1 contract"),
    ItemDef("sprinkler", "Sprinkler System", "💦", "farm", 120, 48, "rare", 1, {"type": "farm", "autoWater": 4}, "Auto-water 4 plots/ngày"),
    ItemDef("greenhouse", "Greenhouse", "🏡", "farm", 200, 80, "rare", 1, {"type": "farm", "weatherProtect": 4}, "Weather protection cho 4 plots"),
    ItemDef("fertilizer", "Fertilizer Pack (x5)", "🧪", "farm", 35, 14, "common", 10, {"type": "farm", "growthSpeed": 50, "uses": 5}, "Growth speed +50% (5 lần dùng)"),
    ItemDef("golden_seeds", "Golden Seeds Box", "✨", "farm", 80, 32, "uncommon", 5, {"type": "farm", "rareSeed": True, "yieldMultiplier": 2}, "Random rare seed (yield 2x)"),
    ItemDef("scarecrow_item", "Scarecrow", "🧣", "farm", 50, 20, "common", 1, {"type": "farm", "pestReduction": 50}, "Giảm 50% pest damage"),
    ItemDef("farm_expansion", "Farm Expansion", "🗺️", "farm", 300, 120, "epic", 1, {"type": "farm", "extraPlots": 4}, "+4 plots (max 16)"),
    ItemDef("golden_skin", "Golden Agent Skin", "👑", "special", 500, 200, "rare", 1, {"type": "cosmetic", "mood": 10}, "Cosmetic + Mood +10 khi equipped", True),
    ItemDef("time_machine", "Time Machine Chip", "⏰", "special", 300, 120, "epic", 1, {"type": "skipDay"}, "Skip 1 ngày (giữ contracts)", True),
    ItemDef("double_coin", "Double Coin Token", "💎", "special", 250, 100, "rare", 2, {"type": "doubleReward"}, "Nhân đôi reward contract tiếp theo", True),
    ItemDef("clone_voucher", "Agent Clone Voucher", "🧬", "special", 400, 160, "epic", 1, {"type": "cloneAgent"}, "Clone 1 agent (giữ level + stats)", True),
    ItemDef("mystery_box", "Mystery Box", "🎁", "special", 100, 40, "common", 5, {"type": "mystery"}, "Random item bất kỳ (có chance Rare)", True),
    ItemDef("respec_token", "Respec Token", "🔄", "special", 150, 60, "rare", 2, {"type": "respec"}, "Đổi role 1 agent (giữ level)", True),
]


class ItemCatalog:
    CATEGORIES = [
        {"id": "consumable", "name": "Tiêu Hao", "icon": "☕", "color": "#e74c3c"},
        {"id": "tool", "name": "Công Cụ", "icon": "🛠️", "color": "#3498db"},
        {"id": "decoration", "name": "Trang Trí", "icon": "🏠", "color": "#2ecc71"},
        {"id": "booster", "name": "Booster", "icon": "📜", "color": "#f39c12"},
        {"id": "farm", "name": "Nông Trại", "icon": "🌱", "color": "#27ae60"},
        {"id": "special", "name": "Đồ Hiếm", "icon": "🎰", "color": "#9b59b6"},
    ]

    def __init__(self):
        self.items = ITEMS

    def get_by_id(self, item_id: str) -> Optional[ItemDef]:
        return next((i for i in self.items if i.id == item_id), None)

    def get_by_category(self, category: str) -> List[dict]:
        return [i.to_dict() for i in self.items if i.category == category]

    def get_daily_pool(self) -> List[ItemDef]:
        return [i for i in self.items if i.daily]

    def get_non_daily_items(self) -> List[ItemDef]:
        return [i for i in self.items if not i.daily]

    def all_items(self) -> List[dict]:
        return [i.to_dict() for i in self.items]


class ItemShopManager:
    AGENT_FREE_BUYS_PER_DAY = 3

    def __init__(self, state):
        self.state = state
        self.catalog = ItemCatalog()
        for attr, default in {
            "shop_inventory": {},
            "shop_equipped_items": {},
            "shop_active_buffs": [],
            "shop_global_bonuses": {},
            "shop_daily_specials": [],
            "shop_last_refresh_day": -1,
            "shop_agent_buy_tracker": {},
            "shop_stats": {"totalPurchases": 0, "totalSpent": 0, "totalSold": 0, "totalEarned": 0, "itemsUsed": 0},
        }.items():
            if not hasattr(state, attr):
                setattr(state, attr, default.copy() if isinstance(default, dict) else list(default) if isinstance(default, list) else default)

    def buy_item(self, item_id: str, qty: int = 1) -> dict:
        item = self.catalog.get_by_id(item_id)
        if not item:
            return {"success": False, "msg": "Vật phẩm không tồn tại!"}
        qty = max(1, int(qty))
        total = item.price * qty
        if self.state.coins < total:
            return {"success": False, "msg": f"Không đủ tiền! Cần {total}Ⓒ"}
        current = self.state.shop_inventory.get(item_id, 0)
        if item.max_stack and current + qty > item.max_stack:
            return {"success": False, "msg": f"Kho đã đầy! Max: {item.max_stack}"}
        self.state.coins -= total
        self.state.total_spent += total
        self.state.shop_inventory[item_id] = current + qty
        self.state.shop_stats["totalPurchases"] += qty
        self.state.shop_stats["totalSpent"] += total
        if item.category == "decoration":
            self._apply_decoration_bonus(item)
        return {"success": True, "msg": f"Đã mua {item.icon} {item.name} x{qty}!", "item": item.to_dict(), "qty": qty, "cost": total}

    def sell_item(self, item_id: str, qty: int = 1) -> dict:
        item = self.catalog.get_by_id(item_id)
        if not item:
            return {"success": False, "msg": "Vật phẩm không tồn tại!"}
        qty = max(1, int(qty))
        current = self.state.shop_inventory.get(item_id, 0)
        if current < qty:
            return {"success": False, "msg": f"Không đủ số lượng! Còn: {current}"}
        earned = item.sell_price * qty
        new_qty = current - qty
        if new_qty:
            self.state.shop_inventory[item_id] = new_qty
        else:
            self.state.shop_inventory.pop(item_id, None)
        self.state.coins += earned
        self.state.total_earned += earned
        self.state.shop_stats["totalSold"] += qty
        self.state.shop_stats["totalEarned"] += earned
        if item.category == "decoration" and item_id not in self.state.shop_inventory:
            self._remove_decoration_bonus(item)
        return {"success": True, "msg": f"Đã bán {item.icon} {item.name} x{qty} lấy {earned}Ⓒ!", "item": item.to_dict(), "qty": qty, "earned": earned}

    def use_item(self, item_id: str, agent_id: Optional[str] = None) -> dict:
        item = self.catalog.get_by_id(item_id)
        if not item:
            return {"success": False, "msg": "Vật phẩm không tồn tại!"}
        if self.state.shop_inventory.get(item_id, 0) <= 0:
            return {"success": False, "msg": "Hết vật phẩm này rồi!"}
        if item.category not in {"consumable", "booster", "special"}:
            return {"success": False, "msg": "Vật phẩm này không thể sử dụng!"}
        result = self._apply_item_effect(item, agent_id)
        if not result.get("success"):
            return result
        self.state.shop_inventory[item_id] -= 1
        if self.state.shop_inventory[item_id] <= 0:
            self.state.shop_inventory.pop(item_id, None)
        self.state.shop_stats["itemsUsed"] += 1
        return {"success": True, "msg": f"{item.icon} Đã dùng {item.name}! {result.get('detail', '')}", "item": item.to_dict(), **{k: v for k, v in result.items() if k not in {"success", "detail"}}}

    def _apply_item_effect(self, item: ItemDef, agent_id: Optional[str]) -> dict:
        eff = item.effect
        agents = self.state.agents
        target = agents.get(agent_id) if agent_id else self._lowest_stat_agent()
        if eff.get("type") == "instant":
            if not target:
                return {"success": False, "msg": "Chưa có agent nào!"}
            self._restore_agent(target, eff)
            return {"success": True, "detail": f"{target.name}: stats restored!"}
        if eff.get("type") == "team":
            for agent in agents.values():
                agent.mood = min(100, agent.mood + eff.get("mood", 0))
                agent.energy = min(100, agent.energy + eff.get("energy", 0))
            return {"success": True, "detail": f"{len(agents)} agents: Mood+{eff.get('mood', 0)}, Energy+{eff.get('energy', 0)}"}
        if eff.get("type") == "random":
            if not target:
                return {"success": False, "msg": "Chưa có agent nào!"}
            stat = random.choice(eff.get("stats", ["mood"]))
            low, high = eff.get("range", [10, 30])
            val = random.randint(low, high)
            if stat == "energy":
                target.energy = min(100, target.energy + val)
            elif stat == "mood":
                target.mood = min(100, target.mood + val)
            return {"success": True, "detail": f"Random: {stat} +{val}!"}
        if eff.get("type") == "buff":
            self.state.shop_active_buffs.append({"itemId": item.id, "stat": eff.get("stat"), "value": eff.get("value", 0), "expiresAt": time.time() + eff.get("duration", 60), "agentId": agent_id})
            return {"success": True, "detail": f"Buff {eff.get('stat')} +{eff.get('value')}% cho {eff.get('duration', 60)}s"}
        if eff.get("type") == "reputation":
            self.state.reputation = min(5, self.state.reputation + eff.get("value", 0))
            return {"success": True, "detail": f"Reputation +{eff.get('value', 0)}!"}
        if eff.get("type") == "refresh":
            return {"success": True, "detail": "Contract board refreshed!", "action": "refreshContracts"}
        if eff.get("type") == "contract":
            return {"success": True, "detail": "Contract booster activated!", "action": "contractBoost", "data": eff}
        if eff.get("type") == "mystery":
            picked = self._pick_weighted(self.catalog.get_non_daily_items())
            self.state.shop_inventory[picked.id] = self.state.shop_inventory.get(picked.id, 0) + 1
            return {"success": True, "detail": f"🎁 Nhận được: {picked.icon} {picked.name} ({picked.rarity})!"}
        if eff.get("type") == "skipDay":
            self.state.day += 1
            return {"success": True, "detail": "Skipped 1 day!"}
        return {"success": True, "detail": "Hiệu ứng đã áp dụng!"}

    def _restore_agent(self, agent, eff: dict) -> None:
        if eff.get("stat") == "energy":
            agent.energy = min(100, agent.energy + eff.get("value", 0))
        elif eff.get("stat") == "mood":
            agent.mood = min(100, agent.mood + eff.get("value", 0))
        elif eff.get("stat") == "both":
            agent.mood = min(100, agent.mood + eff.get("mood", 0))
            agent.energy = min(100, agent.energy + eff.get("energy", 0))

    def _lowest_stat_agent(self):
        if not self.state.agents:
            return None
        return min(self.state.agents.values(), key=lambda a: a.energy + a.mood)

    def _pick_weighted(self, pool: List[ItemDef]) -> ItemDef:
        weights = {"common": 5, "uncommon": 3, "rare": 1.5, "epic": 0.5}
        return random.choices(pool, weights=[weights.get(i.rarity, 1) for i in pool], k=1)[0]

    def _apply_decoration_bonus(self, item: ItemDef) -> None:
        if item.effect.get("type") == "global":
            self.state.shop_global_bonuses[item.id] = {"stat": item.effect.get("stat"), "value": item.effect.get("value", 0)}

    def _remove_decoration_bonus(self, item: ItemDef) -> None:
        self.state.shop_global_bonuses.pop(item.id, None)

    def get_global_bonus(self, stat: str) -> int:
        return sum(b.get("value", 0) for b in self.state.shop_global_bonuses.values() if b.get("stat") == stat)

    def refresh_daily_specials(self) -> List[dict]:
        if self.state.shop_last_refresh_day == self.state.day:
            return [self.catalog.get_by_id(i).to_dict() for i in self.state.shop_daily_specials if self.catalog.get_by_id(i)]
        pool = self.catalog.get_daily_pool()
        specials = random.sample(pool, min(3, len(pool)))
        self.state.shop_daily_specials = [i.id for i in specials]
        self.state.shop_last_refresh_day = self.state.day
        return [i.to_dict() for i in specials]

    def update_buffs(self) -> None:
        now = time.time()
        self.state.shop_active_buffs = [b for b in self.state.shop_active_buffs if b.get("expiresAt", 0) > now]

    def get_active_buff(self, stat: str, agent_id: Optional[str] = None) -> float:
        self.update_buffs()
        return sum(b.get("value", 0) for b in self.state.shop_active_buffs if b.get("stat") == stat and (not b.get("agentId") or b.get("agentId") == agent_id))

    def get_inventory_items(self) -> List[dict]:
        items = []
        for item_id, qty in self.state.shop_inventory.items():
            item = self.catalog.get_by_id(item_id)
            if item and qty > 0:
                items.append({**item.to_dict(), "owned": qty})
        return items

    def get_status(self) -> dict:
        return {
            "categories": ItemCatalog.CATEGORIES,
            "items": self.catalog.all_items(),
            "inventory": self.get_inventory_items(),
            "daily_specials": self.refresh_daily_specials(),
            "global_bonuses": self.state.shop_global_bonuses,
            "active_buffs": self.state.shop_active_buffs,
            "stats": self.state.shop_stats,
        }
