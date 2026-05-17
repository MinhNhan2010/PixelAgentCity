"""
farm_manager.py — Farm & Cooking System
=========================================
Handles crop planting, growth simulation, harvesting,
cooking recipes, and farm produce management.
"""

import random
import time
from typing import List, Dict, Tuple, Optional
from .models import GameState, FarmPlot, InventoryItem, CropStage


# ═══════════════════════════════════════════════════════
# CROP DATABASE
# ═══════════════════════════════════════════════════════

CROPS = {
    "tomato":     {"emoji": "🍅", "icon": "🍅", "name": "Cà Chua", "cost": 10, "grow_days": 2, "grow_time": 2, "yield": [2, 4], "sell_price": 15, "category": "vegetable", "color": "#e74c3c", "xp": 5},
    "carrot":     {"emoji": "🥕", "icon": "🥕", "name": "Cà Rốt", "cost": 8, "grow_days": 2, "grow_time": 2, "yield": [3, 5], "sell_price": 12, "category": "vegetable", "color": "#e67e22", "xp": 4},
    "corn":       {"emoji": "🌽", "icon": "🌽", "name": "Ngô", "cost": 12, "grow_days": 3, "grow_time": 3, "yield": [2, 4], "sell_price": 18, "category": "vegetable", "color": "#f1c40f", "xp": 6},
    "potato":     {"emoji": "🥔", "icon": "🥔", "name": "Khoai Tây", "cost": 8, "grow_days": 3, "grow_time": 3, "yield": [3, 6], "sell_price": 10, "category": "vegetable", "color": "#d4a76a", "xp": 4},
    "strawberry": {"emoji": "🍓", "icon": "🍓", "name": "Dâu Tây", "cost": 20, "grow_days": 3, "grow_time": 3, "yield": [2, 3], "sell_price": 30, "category": "fruit", "color": "#e84393", "xp": 8},
    "watermelon": {"emoji": "🍉", "icon": "🍉", "name": "Dưa Hấu", "cost": 25, "grow_days": 4, "grow_time": 4, "yield": [1, 2], "sell_price": 45, "category": "fruit", "color": "#27ae60", "xp": 10},
    "grape":      {"emoji": "🍇", "icon": "🍇", "name": "Nho", "cost": 22, "grow_days": 3, "grow_time": 3, "yield": [2, 4], "sell_price": 28, "category": "fruit", "color": "#8e44ad", "xp": 11},
    "pumpkin":    {"emoji": "🎃", "icon": "🎃", "name": "Bí Ngô", "cost": 18, "grow_days": 4, "grow_time": 4, "yield": [1, 3], "sell_price": 40, "category": "fruit", "color": "#d35400", "xp": 9},
    "sunflower":  {"emoji": "🌻", "icon": "🌻", "name": "Hoa Hướng Dương", "cost": 15, "grow_days": 3, "grow_time": 3, "yield": [2, 3], "sell_price": 22, "category": "flower", "color": "#f9ca24", "xp": 6},
    "rose":       {"emoji": "🌹", "icon": "🌹", "name": "Hoa Hồng", "cost": 30, "grow_days": 4, "grow_time": 4, "yield": [1, 2], "sell_price": 55, "category": "flower", "color": "#c0392b", "xp": 12},
    "herb":       {"emoji": "🌿", "icon": "🌿", "name": "Thảo Dược", "cost": 25, "grow_days": 3, "grow_time": 3, "yield": [1, 3], "sell_price": 50, "category": "herb", "color": "#2ecc71", "xp": 10},
    "tea":        {"emoji": "🍵", "icon": "🍵", "name": "Trà Xanh", "cost": 28, "grow_days": 4, "grow_time": 4, "yield": [1, 2], "sell_price": 58, "category": "herb", "color": "#16a085", "xp": 12},
}

RECIPES = {
    "salad":       {"name": "Salad Tươi", "icon": "🥗", "ingredients": {"tomato": 1, "carrot": 1}, "effect": "energy", "value": 25, "sell_price": 40, "buff": {"energy": 25}},
    "soup":        {"name": "Súp Rau Củ", "icon": "🍲", "ingredients": {"potato": 2, "carrot": 1, "corn": 1}, "effect": "energy", "value": 35, "sell_price": 55, "buff": {"energy": 35}},
    "fruit_juice": {"name": "Nước Ép Trái", "icon": "🧃", "ingredients": {"strawberry": 1, "grape": 1}, "effect": "energy", "value": 30, "sell_price": 50, "buff": {"energy": 30}},
    "pie":         {"name": "Bánh Bí Ngô", "icon": "🥧", "ingredients": {"pumpkin": 1, "strawberry": 1}, "effect": "mood", "value": 30, "sell_price": 65, "buff": {"mood": 30}},
    "herbal_tea":  {"name": "Trà Thảo Dược", "icon": "🍵", "ingredients": {"herb": 1, "tea": 1}, "effect": "mood", "value": 40, "sell_price": 80, "buff": {"mood": 40}},
    "flower_boost":{"name": "Tinh Dầu Hoa", "icon": "💐", "ingredients": {"rose": 1, "sunflower": 1}, "effect": "xp", "value": 20, "sell_price": 70, "buff": {"xp": 20}},
    "feast":       {"name": "Bữa Tiệc Lớn", "icon": "🍽️", "ingredients": {"tomato": 2, "corn": 1, "potato": 2, "watermelon": 1}, "effect": "all", "value": 15, "sell_price": 120, "buff": {"mood": 15, "energy": 15}},
    "smoothie":    {"name": "Sinh Tố Dâu", "icon": "🥤", "ingredients": {"strawberry": 2, "grape": 1}, "effect": "energy", "value": 28, "sell_price": 55, "buff": {"energy": 28}},
}

WEATHER_EFFECTS = {
    "sunny":  {"grow_bonus": 0, "water_needed": True, "desc": "☀️ Nắng đẹp", "color": "#f9ca24"},
    "rainy":  {"grow_bonus": 1, "water_needed": False, "desc": "🌧️ Mưa", "color": "#3498db"},
    "cloudy": {"grow_bonus": 0, "water_needed": True, "desc": "☁️ Mây", "color": "#95a5a6"},
    "stormy": {"grow_bonus": -1, "water_needed": False, "desc": "⛈️ Bão", "color": "#7f8c8d", "damage_chance": 0.15},
    "hot":    {"grow_bonus": -0.5, "water_needed": True, "desc": "🔥 Nóng", "color": "#e74c3c", "drought_chance": 0.2},
}

WEATHER_TYPES = [
    {"id": "sunny", "weight": 35, **WEATHER_EFFECTS["sunny"]},
    {"id": "rainy", "weight": 25, **WEATHER_EFFECTS["rainy"]},
    {"id": "cloudy", "weight": 20, **WEATHER_EFFECTS["cloudy"]},
    {"id": "stormy", "weight": 10, **WEATHER_EFFECTS["stormy"]},
    {"id": "hot", "weight": 10, **WEATHER_EFFECTS["hot"]},
]


class FarmManager:
    """Manages the farming system."""

    def __init__(self, game_state: GameState):
        self.state = game_state
        self.weather = WEATHER_TYPES[0]

        # Initialize farm plots if empty
        if not self.state.farm_plots:
            self.state.farm_plots = [FarmPlot(id=i) for i in range(12)]

    # ─── Planting ─────────────────────────────────

    def plant(self, plot_id: int, crop_type: str) -> Tuple[bool, str]:
        """Plant a crop in a plot."""
        if plot_id < 0 or plot_id >= len(self.state.farm_plots):
            return False, "Invalid plot"

        plot = self.state.farm_plots[plot_id]
        crop = CROPS.get(crop_type)

        if not crop:
            return False, f"Unknown crop: {crop_type}"
        if plot.stage != "empty":
            return False, "Plot is not empty"
        if self.state.coins < crop["cost"]:
            return False, f"Need {crop['cost']}Ⓒ to plant {crop['name']}"

        # Deduct cost
        self.state.coins -= crop["cost"]
        self.state.total_spent += crop["cost"]

        # Plant
        plot.crop = crop_type
        plot.stage = "planted"
        plot.growth = 0.0
        plot.watered = False
        plot.planted_at = time.time()

        return True, f"🌱 Planted {crop['emoji']} {crop['name']} (cost: {crop['cost']}Ⓒ)"

    # ─── Watering ─────────────────────────────────

    def water(self, plot_id: int) -> Tuple[bool, str]:
        """Water a plot."""
        if plot_id < 0 or plot_id >= len(self.state.farm_plots):
            return False, "Invalid plot"

        plot = self.state.farm_plots[plot_id]
        if plot.stage in ("empty", "ready", "withered"):
            return False, "Nothing to water"
        if plot.watered:
            return False, "Already watered"

        plot.watered = True
        return True, "💧 Watered!"

    def water_all(self) -> Tuple[int, str]:
        """Water all plots that need it."""
        count = 0
        for plot in self.state.farm_plots:
            if plot.stage in ("planted", "growing") and not plot.watered:
                plot.watered = True
                count += 1
        return count, f"💧 Watered {count} plots"

    # ─── Harvesting ───────────────────────────────

    def harvest(self, plot_id: int) -> Tuple[bool, str, int]:
        """Harvest a ready crop. Returns (success, message, coins_earned)."""
        if plot_id < 0 or plot_id >= len(self.state.farm_plots):
            return False, "Invalid plot", 0

        plot = self.state.farm_plots[plot_id]
        if plot.stage != "ready":
            return False, "Crop not ready", 0

        crop = CROPS.get(plot.crop, {})
        emoji = crop.get("emoji", "🌿")
        name = crop.get("name", plot.crop)

        # Add to inventory
        self._add_produce(plot.crop, 1)

        # Reset plot
        plot.crop = None
        plot.stage = "empty"
        plot.growth = 0.0
        plot.watered = False
        plot.planted_at = None

        return True, f"🌾 Harvested {emoji} {name}!", crop.get("xp", 5)

    def harvest_all(self) -> Tuple[int, int, str]:
        """Harvest all ready crops. Returns (count, total_xp, message)."""
        count = 0
        total_xp = 0
        for i, plot in enumerate(self.state.farm_plots):
            if plot.stage == "ready":
                ok, _, xp = self.harvest(i)
                if ok:
                    count += 1
                    total_xp += xp
        return count, total_xp, f"🌾 Harvested {count} crops! (+{total_xp} XP)"

    # ─── Growth Tick ──────────────────────────────

    def tick(self, delta_seconds: float) -> List[Dict]:
        """Simulate farm growth. Returns events."""
        events = []

        for plot in self.state.farm_plots:
            if plot.stage not in ("planted", "growing"):
                continue

            crop = CROPS.get(plot.crop, {})
            grow_time = crop.get("grow_time", 60)

            # Growth rate remains compatible with the legacy Python real-time tick,
            # while sourcing weather semantics from farm.js.
            water_mul = 2.0 if plot.watered else 1.0
            weather_mul = max(0.0, 1.0 + float(self.weather.get("grow_bonus", 0)))
            growth_per_sec = (100.0 / grow_time) * water_mul * weather_mul

            plot.growth += growth_per_sec * delta_seconds
            plot.stage = "growing"

            # Ready to harvest
            if plot.growth >= 100:
                plot.growth = 100
                plot.stage = "ready"
                events.append({
                    "type": "crop_ready",
                    "plot_id": plot.id,
                    "crop": plot.crop,
                    "message": f"🌿 {crop.get('emoji', '🌱')} {crop.get('name', plot.crop)} is ready to harvest!"
                })

            # JS weather hazards: storm damage and hot-weather drought.
            hazard_chance = self.weather.get("damage_chance", self.weather.get("drought_chance", 0))
            if hazard_chance and random.random() < hazard_chance * delta_seconds:
                plot.stage = "withered"
                events.append({
                    "type": "crop_withered",
                    "plot_id": plot.id,
                    "message": f"💀 Crop on plot {plot.id} withered!"
                })

        return events

    # ─── Weather ──────────────────────────────────

    def change_weather(self) -> Dict:
        """Randomly change weather using the weighted farm.js table."""
        self.weather = random.choices(
            WEATHER_TYPES,
            weights=[w.get("weight", 1) for w in WEATHER_TYPES],
            k=1,
        )[0]
        return {
            "type": "weather_change",
            "weather": self.weather["desc"],
            "message": f"🌤️ Weather: {self.weather['desc']}"
        }

    # ─── Cooking ──────────────────────────────────

    def cook(self, recipe_id: str) -> Tuple[bool, str, Dict]:
        """Cook a recipe. Returns (success, message, buff_dict)."""
        recipe = RECIPES.get(recipe_id)
        if not recipe:
            return False, "Unknown recipe", {}

        # Check ingredients
        for crop_type, needed in recipe["ingredients"].items():
            count = self._count_produce(crop_type)
            if count < needed:
                crop = CROPS.get(crop_type, {})
                return False, f"Need {needed}x {crop.get('emoji', '')} {crop.get('name', crop_type)}, have {count}", {}

        # Consume ingredients
        for crop_type, needed in recipe["ingredients"].items():
            self._remove_produce(crop_type, needed)

        return True, f"🍳 Cooked: {recipe['name']}!", recipe.get("buff", {})

    def sell_all_produce(self) -> Tuple[int, str]:
        """Sell all farm produce. Returns (coins_earned, message)."""
        total = 0
        items_sold = 0
        for item in list(self.state.inventory):
            if item.category == "produce":
                crop = CROPS.get(item.id, {})
                earnings = crop.get("sell_price", 10) * item.quantity
                total += earnings
                items_sold += item.quantity
                self.state.inventory.remove(item)

        if total > 0:
            self.state.coins += total
            self.state.total_earned += total

        return total, f"💰 Sold {items_sold} items for {total}Ⓒ"

    # ─── Inventory Helpers ────────────────────────

    def _add_produce(self, crop_type: str, quantity: int):
        """Add produce to inventory."""
        for item in self.state.inventory:
            if item.id == crop_type and item.category == "produce":
                item.quantity += quantity
                return

        crop = CROPS.get(crop_type, {})
        self.state.inventory.append(InventoryItem(
            id=crop_type,
            name=crop.get("name", crop_type),
            category="produce",
            quantity=quantity,
            icon=crop.get("emoji", "🌿"),
        ))

    def _remove_produce(self, crop_type: str, quantity: int):
        """Remove produce from inventory."""
        for item in self.state.inventory:
            if item.id == crop_type and item.category == "produce":
                item.quantity -= quantity
                if item.quantity <= 0:
                    self.state.inventory.remove(item)
                return

    def _count_produce(self, crop_type: str) -> int:
        """Count produce in inventory."""
        for item in self.state.inventory:
            if item.id == crop_type and item.category == "produce":
                return item.quantity
        return 0

    # ─── Status ───────────────────────────────────

    def get_farm_status(self) -> Dict:
        """Get complete farm status."""
        planted = sum(1 for p in self.state.farm_plots if p.stage not in ("empty",))
        ready = sum(1 for p in self.state.farm_plots if p.stage == "ready")
        produce_count = sum(
            item.quantity for item in self.state.inventory
            if item.category == "produce"
        )

        return {
            "plots": [p.to_dict() for p in self.state.farm_plots],
            "planted_count": planted,
            "ready_count": ready,
            "produce_count": produce_count,
            "weather": self.weather.get("id", "sunny"),
            "weather_desc": self.weather.get("desc", self.weather.get("id", "sunny")),
            "weather_info": self.weather,
            "crops": CROPS,
            "recipes": {k: {**v, "can_cook": self._can_cook(k)} for k, v in RECIPES.items()},
        }

    def _can_cook(self, recipe_id: str) -> bool:
        recipe = RECIPES.get(recipe_id, {})
        for crop_type, needed in recipe.get("ingredients", {}).items():
            if self._count_produce(crop_type) < needed:
                return False
        return True
