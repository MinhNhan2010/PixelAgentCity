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
    "tomato":    {"emoji": "🍅", "name": "Cà chua",    "cost": 10, "grow_time": 30,  "sell_price": 25,  "xp": 5},
    "carrot":    {"emoji": "🥕", "name": "Cà rốt",     "cost": 8,  "grow_time": 25,  "sell_price": 20,  "xp": 4},
    "corn":      {"emoji": "🌽", "name": "Bắp",        "cost": 12, "grow_time": 40,  "sell_price": 30,  "xp": 6},
    "potato":    {"emoji": "🥔", "name": "Khoai tây",  "cost": 6,  "grow_time": 35,  "sell_price": 18,  "xp": 4},
    "strawberry":{"emoji": "🍓", "name": "Dâu tây",    "cost": 15, "grow_time": 45,  "sell_price": 40,  "xp": 8},
    "watermelon":{"emoji": "🍉", "name": "Dưa hấu",    "cost": 20, "grow_time": 60,  "sell_price": 55,  "xp": 10},
    "pumpkin":   {"emoji": "🎃", "name": "Bí ngô",     "cost": 18, "grow_time": 55,  "sell_price": 50,  "xp": 9},
    "rice":      {"emoji": "🌾", "name": "Lúa",        "cost": 5,  "grow_time": 50,  "sell_price": 15,  "xp": 3},
    "coffee":    {"emoji": "☕", "name": "Cà phê",     "cost": 25, "grow_time": 80,  "sell_price": 70,  "xp": 12},
    "grape":     {"emoji": "🍇", "name": "Nho",        "cost": 22, "grow_time": 70,  "sell_price": 60,  "xp": 11},
}

RECIPES = {
    "salad": {
        "name": "🥗 Salad tươi",
        "ingredients": {"tomato": 2, "carrot": 1},
        "sell_price": 80,
        "buff": {"mood": 10},
    },
    "soup": {
        "name": "🍲 Canh rau",
        "ingredients": {"potato": 2, "carrot": 1, "corn": 1},
        "sell_price": 100,
        "buff": {"energy": 15},
    },
    "smoothie": {
        "name": "🥤 Sinh tố",
        "ingredients": {"strawberry": 2, "grape": 1},
        "sell_price": 120,
        "buff": {"mood": 15, "energy": 10},
    },
    "rice_bowl": {
        "name": "🍚 Cơm trộn",
        "ingredients": {"rice": 3, "tomato": 1},
        "sell_price": 90,
        "buff": {"energy": 20},
    },
    "pumpkin_pie": {
        "name": "🥧 Bánh bí",
        "ingredients": {"pumpkin": 2, "strawberry": 1},
        "sell_price": 150,
        "buff": {"mood": 20, "energy": 15},
    },
    "coffee_latte": {
        "name": "☕ Cà phê sữa",
        "ingredients": {"coffee": 2},
        "sell_price": 180,
        "buff": {"speed": 1.2},
    },
}

WEATHER_TYPES = [
    {"name": "☀️ Nắng đẹp",    "growth_mul": 1.0, "wither_chance": 0.02},
    {"name": "🌤️ Nắng nhẹ",    "growth_mul": 1.1, "wither_chance": 0.01},
    {"name": "🌧️ Mưa",         "growth_mul": 1.3, "wither_chance": 0.01},
    {"name": "⛈️ Bão",          "growth_mul": 0.5, "wither_chance": 0.15},
    {"name": "🌫️ Sương mù",    "growth_mul": 0.8, "wither_chance": 0.03},
    {"name": "❄️ Lạnh",         "growth_mul": 0.6, "wither_chance": 0.10},
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

            # Growth rate (watered crops grow 2x faster)
            water_mul = 2.0 if plot.watered else 1.0
            weather_mul = self.weather.get("growth_mul", 1.0)
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

            # Wither chance (storm etc)
            if random.random() < self.weather.get("wither_chance", 0) * delta_seconds:
                plot.stage = "withered"
                events.append({
                    "type": "crop_withered",
                    "plot_id": plot.id,
                    "message": f"💀 Crop on plot {plot.id} withered!"
                })

        return events

    # ─── Weather ──────────────────────────────────

    def change_weather(self) -> Dict:
        """Randomly change weather. Called daily."""
        self.weather = random.choice(WEATHER_TYPES)
        return {
            "type": "weather_change",
            "weather": self.weather["name"],
            "message": f"🌤️ Weather: {self.weather['name']}"
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
            "weather": self.weather["name"],
            "crops": CROPS,
            "recipes": {k: {**v, "can_cook": self._can_cook(k)} for k, v in RECIPES.items()},
        }

    def _can_cook(self, recipe_id: str) -> bool:
        recipe = RECIPES.get(recipe_id, {})
        for crop_type, needed in recipe.get("ingredients", {}).items():
            if self._count_produce(crop_type) < needed:
                return False
        return True
