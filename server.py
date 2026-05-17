"""
🎮 PixelAgent City — Python Flask Server
==========================================
Hybrid backend serving the HTML/JS frontend + Python game engine API.

Usage:
    pip install -r requirements.txt
    python server.py

Then open http://localhost:5000 in your browser.
"""

import os
import sys
import time
import json
import threading
from flask import Flask, send_from_directory, jsonify, request
from flask_socketio import SocketIO, emit
from flask_cors import CORS

# Add project root to path
sys.path.insert(0, os.path.dirname(__file__))

from game_engine.models import GameState
from game_engine.agent_manager import AgentManager
from game_engine.economy import EconomyManager
from game_engine.contract_manager import ContractManager
from game_engine.farm_manager import FarmManager
from game_engine.mini_games import MiniGameTracker
from game_engine.save_manager import SaveManager
from game_engine.analytics import GameAnalytics
from game_engine.achievements import AchievementManager
from game_engine.tech_tree import TechTreeManager
from game_engine.item_shop import ItemShopManager
from game_engine.layout_editor import LayoutEditorManager
from game_engine.chatbox import ChatboxManager
from game_engine.statistics import StatsDashboard
from game_engine.error_handler import error_handler
from game_engine.game_app import (
    ROOM_CATALOG,
    SOUND_EVENTS,
    get_office_bonuses,
    get_rep_stars,
    get_difficulty_badge,
    format_coins,
    get_time_of_day,
    get_night_overlay_alpha,
)
from game_engine.pixel_engine_bridge import (
    buy_room,
    get_bridge_status,
)



# ═══════════════════════════════════════════════════════
# APP SETUP
# ═══════════════════════════════════════════════════════

app = Flask(__name__, static_folder=".", static_url_path="")
app.config["SECRET_KEY"] = "pixelagent-city-secret-2026"
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

# ═══════════════════════════════════════════════════════
# GAME STATE (singleton)
# ═══════════════════════════════════════════════════════

game_state = GameState()
agent_mgr = AgentManager(game_state)
economy_mgr = EconomyManager(game_state)
contract_mgr = ContractManager(game_state)
farm_mgr = FarmManager(game_state)
mini_games = MiniGameTracker(game_state)
save_mgr = SaveManager()
layout_mgr = LayoutEditorManager(game_state)
chatbox_mgr = ChatboxManager(game_state)
stats_dashboard = StatsDashboard(game_state)
analytics = GameAnalytics(game_state)
achievement_mgr = AchievementManager(game_state)
tech_tree_mgr = TechTreeManager(game_state)
item_shop_mgr = ItemShopManager(game_state)

# Lock for thread-safe game state access
state_lock = threading.Lock()


# ═══════════════════════════════════════════════════════
# STATIC FILE SERVING
# ═══════════════════════════════════════════════════════

@app.route("/")
def index():
    """Serve the main game HTML."""
    return send_from_directory(".", "index.html")


@app.route("/<path:filename>")
def static_files(filename):
    """Serve static files (JS, CSS, assets)."""
    return send_from_directory(".", filename)


# ═══════════════════════════════════════════════════════
# REST API — GAME STATE
# ═══════════════════════════════════════════════════════

@app.route("/api/state", methods=["GET"])
def get_state():
    """Get current game state."""
    with state_lock:
        return jsonify({
            "status": "ok",
            "state": game_state.to_dict(),
            "server_time": time.time(),
        })


@app.route("/api/state/summary", methods=["GET"])
def get_summary():
    """Get lightweight game summary."""
    with state_lock:
        return jsonify({
            "coins": game_state.coins,
            "day": game_state.day,
            "level": game_state.level,
            "level_name": game_state.level_name,
            "xp": game_state.xp,
            "reputation": round(game_state.reputation, 2),
            "agents": game_state.agent_count,
            "daily_salary": game_state.daily_salary,
            "success_rate": game_state.success_rate,
            "paused": game_state.paused,
            "speed": game_state.speed,
        })


@app.route("/api/agents/logs", methods=["GET"])
def get_agent_logs():
    """Get JS-style agent activity logs."""
    limit = int(request.args.get("limit", 100))
    with state_lock:
        return jsonify({
            "logs": game_state.agent_logs[:limit],
            "stats": game_state.agent_stats,
            "performance": game_state.agent_performance_history[-30:],
        })


# ═══════════════════════════════════════════════════════
# REST API — AGENTS
# ═══════════════════════════════════════════════════════

@app.route("/api/agents", methods=["GET"])
def list_agents():
    """List all agents."""
    with state_lock:
        agents = [agent_mgr.get_agent_info(aid) for aid in game_state.agents]
        return jsonify({"agents": agents, "count": len(agents)})


@app.route("/api/agents/hire", methods=["POST"])
def hire_agent():
    """Hire a new agent."""
    data = request.get_json(force=True)
    with state_lock:
        agent, msg = agent_mgr.hire_agent(
            name=data.get("name", ""),
            role=data.get("role", "coder"),
            model=data.get("model", "claude-opus-4"),
            color=data.get("color", "#4ecdc4"),
        )
        if agent:
            socketio.emit("agent_hired", {"agent": agent.to_dict(), "message": msg})
            return jsonify({"status": "ok", "agent": agent.to_dict(), "message": msg})
        return jsonify({"status": "error", "message": msg}), 400


@app.route("/api/agents/<agent_id>/fire", methods=["POST"])
def fire_agent(agent_id):
    """Fire an agent."""
    with state_lock:
        ok, msg = agent_mgr.fire_agent(agent_id)
        if ok:
            socketio.emit("agent_fired", {"agent_id": agent_id, "message": msg})
            return jsonify({"status": "ok", "message": msg})
        return jsonify({"status": "error", "message": msg}), 400


@app.route("/api/agents/roles", methods=["GET"])
def get_roles():
    """Get available roles."""
    with state_lock:
        return jsonify({"roles": agent_mgr.get_available_roles()})


# ═══════════════════════════════════════════════════════
# REST API — CONTRACTS
# ═══════════════════════════════════════════════════════

@app.route("/api/contracts", methods=["GET"])
def list_contracts():
    """List all contracts."""
    with state_lock:
        return jsonify({
            "available": contract_mgr.get_available_contracts(),
            "active": contract_mgr.get_active_contracts(),
        })


@app.route("/api/contracts/generate", methods=["POST"])
def generate_contracts():
    """Generate new contracts."""
    data = request.get_json(force=True) if request.is_json else {}
    count = data.get("count", 3)
    with state_lock:
        contracts = contract_mgr.generate_contracts(count)
        return jsonify({
            "status": "ok",
            "generated": len(contracts),
            "contracts": [c.to_dict() for c in contracts],
        })


@app.route("/api/contracts/<contract_id>/accept", methods=["POST"])
def accept_contract(contract_id):
    """Accept a contract."""
    with state_lock:
        ok, msg = contract_mgr.accept_contract(contract_id)
        if ok:
            socketio.emit("contract_accepted", {"contract_id": contract_id, "message": msg})
            return jsonify({"status": "ok", "message": msg})
        return jsonify({"status": "error", "message": msg}), 400


# ═══════════════════════════════════════════════════════
# REST API — ECONOMY
# ═══════════════════════════════════════════════════════

@app.route("/api/economy", methods=["GET"])
def economy_info():
    """Get financial summary."""
    with state_lock:
        return jsonify(economy_mgr.get_financial_summary())


@app.route("/api/economy/add", methods=["POST"])
def add_coins():
    """Add coins (debug/reward)."""
    data = request.get_json(force=True)
    amount = data.get("amount", 0)
    reason = data.get("reason", "Manual add")
    with state_lock:
        balance = economy_mgr.add_coins(amount, reason)
        return jsonify({"status": "ok", "balance": balance})


# ═══════════════════════════════════════════════════════
# REST API — FARM
# ═══════════════════════════════════════════════════════

@app.route("/api/farm", methods=["GET"])
def farm_status():
    """Get farm status."""
    with state_lock:
        return jsonify(farm_mgr.get_farm_status())


@app.route("/api/farm/plant", methods=["POST"])
def farm_plant():
    """Plant a crop."""
    data = request.get_json(force=True)
    with state_lock:
        ok, msg = farm_mgr.plant(data.get("plot_id", 0), data.get("crop", "tomato"))
        return jsonify({"status": "ok" if ok else "error", "message": msg})


@app.route("/api/farm/water", methods=["POST"])
def farm_water():
    """Water plots."""
    data = request.get_json(force=True)
    plot_id = data.get("plot_id")
    with state_lock:
        if plot_id is not None:
            ok, msg = farm_mgr.water(plot_id)
        else:
            count, msg = farm_mgr.water_all()
            ok = count > 0
        return jsonify({"status": "ok" if ok else "error", "message": msg})


@app.route("/api/farm/harvest", methods=["POST"])
def farm_harvest():
    """Harvest crops."""
    data = request.get_json(force=True) if request.is_json else {}
    plot_id = data.get("plot_id")
    with state_lock:
        if plot_id is not None:
            ok, msg, xp = farm_mgr.harvest(plot_id)
            if ok: economy_mgr.add_xp(xp)
        else:
            count, xp, msg = farm_mgr.harvest_all()
            ok = count > 0
            if ok: economy_mgr.add_xp(xp)
        return jsonify({"status": "ok" if ok else "error", "message": msg})


@app.route("/api/farm/cook", methods=["POST"])
def farm_cook():
    """Cook a recipe."""
    data = request.get_json(force=True)
    with state_lock:
        ok, msg, buff = farm_mgr.cook(data.get("recipe", ""))
        return jsonify({"status": "ok" if ok else "error", "message": msg, "buff": buff})


@app.route("/api/farm/sell", methods=["POST"])
def farm_sell():
    """Sell all produce."""
    with state_lock:
        coins, msg = farm_mgr.sell_all_produce()
        return jsonify({"status": "ok", "coins_earned": coins, "message": msg})


# ═══════════════════════════════════════════════════════
# REST API — MINI-GAMES
# ═══════════════════════════════════════════════════════

@app.route("/api/minigames/poker", methods=["POST"])
def play_poker():
    data = request.get_json(force=True)
    with state_lock:
        result = mini_games.play_poker(data.get("bet", 10))
        return jsonify(result)


@app.route("/api/minigames/slots", methods=["POST"])
def play_slots():
    data = request.get_json(force=True)
    with state_lock:
        result = mini_games.play_slots(data.get("bet", 10))
        return jsonify(result)


@app.route("/api/minigames/gold/buy", methods=["POST"])
def buy_gold():
    data = request.get_json(force=True)
    with state_lock:
        return jsonify(mini_games.buy_gold(data.get("coins", 0)))


@app.route("/api/minigames/gold/sell", methods=["POST"])
def sell_gold():
    data = request.get_json(force=True)
    with state_lock:
        return jsonify(mini_games.sell_gold(data.get("amount", 0)))


@app.route("/api/minigames/gold/tick", methods=["POST"])
def gold_tick():
    with state_lock:
        mini_games.gold_trading.tick()
        return jsonify(mini_games.gold_trading.get_status())


@app.route("/api/minigames/billiards", methods=["POST"])
def play_billiards():
    data = request.get_json(force=True) if request.is_json else {}
    with state_lock:
        return jsonify(mini_games.play_billiards(data.get("players"), data.get("turns", 24)))


@app.route("/api/minigames/cafe", methods=["POST"])
def play_cafe():
    data = request.get_json(force=True) if request.is_json else {}
    with state_lock:
        return jsonify(mini_games.play_cafe(data.get("bet", 10), data.get("recipe", "espresso"), data.get("stops")))


@app.route("/api/minigames/fishing", methods=["POST"])
def play_fishing():
    data = request.get_json(force=True) if request.is_json else {}
    with state_lock:
        return jsonify(mini_games.play_fishing(data.get("bet", 10), data.get("skill", 0.65)))



@app.route("/api/minigames/fishing/score", methods=["POST"])
def submit_fishing_score():
    data = request.get_json(force=True) if request.is_json else {}
    with state_lock:
        return jsonify(mini_games.submit_fishing_result(data.get("bet", 10), data.get("fish_name", ""), data.get("won", False), data.get("weight", 0.0)))

@app.route("/api/minigames/fighter", methods=["POST"])
def play_fighter():
    data = request.get_json(force=True) if request.is_json else {}
    with state_lock:
        return jsonify(mini_games.play_fighter(data.get("bet", 10), data.get("fighter", "pixel_ryu")))



@app.route("/api/minigames/fighter/score", methods=["POST"])
def submit_fighter_score():
    data = request.get_json(force=True) if request.is_json else {}
    with state_lock:
        return jsonify(mini_games.submit_fighter_result(data.get("bet", 10), data.get("fighter", "pixel_ryu"), data.get("won", False), data.get("perfect", False)))

@app.route("/api/minigames/flappy", methods=["POST"])
def play_flappy():
    data = request.get_json(force=True) if request.is_json else {}
    with state_lock:
        return jsonify(mini_games.play_flappy(data.get("bet", 10), data.get("skill", 0.55)))


@app.route("/api/minigames/flappy/score", methods=["POST"])
def submit_flappy_score():
    data = request.get_json(force=True) if request.is_json else {}
    with state_lock:
        return jsonify(mini_games.submit_flappy_score(data.get("bet", 10), data.get("score", 0)))


@app.route("/api/minigames/road-racer", methods=["POST"])
def play_road_racer():
    data = request.get_json(force=True) if request.is_json else {}
    with state_lock:
        return jsonify(mini_games.play_racer(data.get("bet", 10), data.get("skill", 0.55)))


@app.route("/api/minigames/road-racer/score", methods=["POST"])
def submit_road_racer_score():
    data = request.get_json(force=True) if request.is_json else {}
    with state_lock:
        return jsonify(mini_games.submit_racer_score(data.get("bet", 10), data.get("score", 0), data.get("coins", 0)))


@app.route("/api/minigames/scores", methods=["GET"])
def mini_game_scores():
    with state_lock:
        return jsonify(mini_games.get_all_scores())


@app.route("/api/minigames/score", methods=["POST"])
def record_mini_score():
    data = request.get_json(force=True)
    with state_lock:
        result = mini_games.record_score(data.get("game", ""), data.get("score", 0))
        return jsonify(result)


# ═══════════════════════════════════════════════════════
# REST API — ACHIEVEMENTS / TECH TREE / PIXELMART
# ═══════════════════════════════════════════════════════

@app.route("/api/achievements", methods=["GET"])
def list_achievements():
    with state_lock:
        newly = achievement_mgr.check()
        return jsonify({"achievements": achievement_mgr.get_all(), "progress": achievement_mgr.get_progress(), "newly_unlocked": newly})


@app.route("/api/achievements/check", methods=["POST"])
def check_achievements():
    with state_lock:
        newly = achievement_mgr.check()
        return jsonify({"newly_unlocked": newly, "progress": achievement_mgr.get_progress()})


@app.route("/api/tech", methods=["GET"])
def tech_status():
    with state_lock:
        return jsonify(tech_tree_mgr.get_status())


@app.route("/api/tech/research", methods=["POST"])
def start_tech_research():
    data = request.get_json(force=True)
    with state_lock:
        result = tech_tree_mgr.start_research(data.get("tech_id", ""))
        return jsonify(result), (200 if result.get("success") else 400)


@app.route("/api/tech/cancel", methods=["POST"])
def cancel_tech_research():
    with state_lock:
        result = tech_tree_mgr.cancel_research()
        return jsonify(result), (200 if result.get("success") else 400)


@app.route("/api/tech/tick", methods=["POST"])
def tick_tech_research():
    with state_lock:
        researcher_count = sum(1 for a in game_state.agents.values() if a.role in {"data_scientist", "ai_engineer", "cto"})
        return jsonify(tech_tree_mgr.tick_research(researcher_count))


@app.route("/api/shop", methods=["GET"])
def shop_status():
    with state_lock:
        return jsonify(item_shop_mgr.get_status())


@app.route("/api/shop/buy", methods=["POST"])
def shop_buy():
    data = request.get_json(force=True)
    with state_lock:
        result = item_shop_mgr.buy_item(data.get("item_id", ""), data.get("qty", 1))
        return jsonify(result), (200 if result.get("success") else 400)


@app.route("/api/shop/sell", methods=["POST"])
def shop_sell():
    data = request.get_json(force=True)
    with state_lock:
        result = item_shop_mgr.sell_item(data.get("item_id", ""), data.get("qty", 1))
        return jsonify(result), (200 if result.get("success") else 400)


@app.route("/api/shop/use", methods=["POST"])
def shop_use():
    data = request.get_json(force=True)
    with state_lock:
        result = item_shop_mgr.use_item(data.get("item_id", ""), data.get("agent_id"))
        return jsonify(result), (200 if result.get("success") else 400)


@app.route("/api/shop/daily", methods=["POST"])
def shop_refresh_daily():
    with state_lock:
        return jsonify({"daily_specials": item_shop_mgr.refresh_daily_specials()})


@app.route("/api/layout", methods=["GET"])
def layout_status():
    with state_lock:
        return jsonify(layout_mgr.status())


@app.route("/api/layout/place", methods=["POST"])
def layout_place():
    data = request.get_json(force=True)
    with state_lock:
        result = layout_mgr.place_furniture(data.get("type", ""), int(data.get("tx", 0)), int(data.get("ty", 0)))
        return jsonify(result), (200 if result.get("success") else 400)


@app.route("/api/layout/erase", methods=["POST"])
def layout_erase():
    data = request.get_json(force=True)
    with state_lock:
        result = layout_mgr.erase_at(int(data.get("tx", 0)), int(data.get("ty", 0)))
        return jsonify(result), (200 if result.get("success") else 400)


@app.route("/api/layout/floor", methods=["POST"])
def layout_floor():
    data = request.get_json(force=True)
    with state_lock:
        result = layout_mgr.paint_floor(int(data.get("tx", 0)), int(data.get("ty", 0)), data.get("floor", "wood"))
        return jsonify(result), (200 if result.get("success") else 400)


@app.route("/api/layout/wall", methods=["POST"])
def layout_wall():
    data = request.get_json(force=True)
    with state_lock:
        result = layout_mgr.paint_wall(int(data.get("tx", 0)), int(data.get("ty", 0)))
        return jsonify(result), (200 if result.get("success") else 400)


@app.route("/api/layout/undo", methods=["POST"])
def layout_undo():
    with state_lock:
        result = layout_mgr.undo()
        return jsonify(result), (200 if result.get("success") else 400)


@app.route("/api/layout/redo", methods=["POST"])
def layout_redo():
    with state_lock:
        result = layout_mgr.redo()
        return jsonify(result), (200 if result.get("success") else 400)


@app.route("/api/layout/apply", methods=["POST"])
def layout_apply():
    data = request.get_json(force=True)
    with state_lock:
        return jsonify(layout_mgr.apply_layout(data))


# ═══════════════════════════════════════════════════════
# REST API — SAVE/LOAD
# ═══════════════════════════════════════════════════════

@app.route("/api/save", methods=["POST"])
def save_game():
    data = request.get_json(force=True) if request.is_json else {}
    slot = data.get("slot", "auto")
    with state_lock:
        ok, msg = save_mgr.save(game_state, slot)
        return jsonify({"status": "ok" if ok else "error", "message": msg})


@app.route("/api/load", methods=["POST"])
def load_game():
    global game_state, agent_mgr, economy_mgr, contract_mgr, farm_mgr, mini_games, analytics, achievement_mgr, tech_tree_mgr, item_shop_mgr, layout_mgr, chatbox_mgr, stats_dashboard
    data = request.get_json(force=True) if request.is_json else {}
    slot = data.get("slot", "auto")
    with state_lock:
        loaded, msg = save_mgr.load(slot)
        if loaded:
            game_state = loaded
            agent_mgr = AgentManager(game_state)
            economy_mgr = EconomyManager(game_state)
            contract_mgr = ContractManager(game_state)
            farm_mgr = FarmManager(game_state)
            mini_games = MiniGameTracker(game_state)
            analytics = GameAnalytics(game_state)
            achievement_mgr = AchievementManager(game_state)
            tech_tree_mgr = TechTreeManager(game_state)
            item_shop_mgr = ItemShopManager(game_state)
            layout_mgr = LayoutEditorManager(game_state)
            chatbox_mgr = ChatboxManager(game_state)
            stats_dashboard = StatsDashboard(game_state)
            socketio.emit("game_loaded", {"message": msg})
            return jsonify({"status": "ok", "message": msg, "state": game_state.to_dict()})
        return jsonify({"status": "error", "message": msg}), 404


@app.route("/api/saves", methods=["GET"])
def list_saves():
    return jsonify({"saves": save_mgr.list_saves()})


# ═══════════════════════════════════════════════════════
# REST API — ANALYTICS
# ═══════════════════════════════════════════════════════

@app.route("/api/analytics", methods=["GET"])
def get_analytics():
    with state_lock:
        return jsonify(analytics.get_dashboard())


@app.route("/api/analytics/agents", methods=["GET"])
def get_agent_perf():
    with state_lock:
        return jsonify({"agents": analytics.get_agent_performance()})


# ═══════════════════════════════════════════════════════
# REST API — JS PARITY MODULES
# ═══════════════════════════════════════════════════════

@app.route("/api/chat/open", methods=["POST"])
def chat_open():
    data = request.get_json(force=True)
    with state_lock:
        return jsonify(chatbox_mgr.open_with_agent(data.get("agent_id", "")))


@app.route("/api/chat/send", methods=["POST"])
def chat_send():
    data = request.get_json(force=True)
    with state_lock:
        return jsonify(chatbox_mgr.send_message(data.get("agent_id", ""), data.get("text", ""), data.get("key")))


@app.route("/api/chat/history", methods=["GET"])
def chat_history():
    agent_id = request.args.get("agent_id")
    with state_lock:
        return jsonify({"messages": chatbox_mgr.get_history(agent_id), "summary": chatbox_mgr.get_summary()})


@app.route("/api/statistics", methods=["GET"])
def js_statistics():
    with state_lock:
        return jsonify({"summary": stats_dashboard.get_summary(), "history": stats_dashboard.save_data()})


@app.route("/api/statistics/record", methods=["POST"])
def js_statistics_record():
    with state_lock:
        stats_dashboard.record_day()
        return jsonify({"status": "ok", "history": stats_dashboard.save_data()})


@app.route("/api/errors", methods=["GET", "DELETE"])
def errors_api():
    if request.method == "DELETE":
        error_handler.clear_errors()
        return jsonify({"status": "ok"})
    return jsonify({"errors": error_handler.get_errors()})


@app.route("/api/errors/log", methods=["POST"])
def errors_log():
    data = request.get_json(force=True)
    entry = error_handler.log(data.get("type", "client"), data.get("message", ""))
    return jsonify({"status": "ok", "entry": entry})


@app.route("/api/app/metadata", methods=["GET"])
def app_metadata():
    day_timer = game_state.day_progress * 120
    return jsonify({
        "rooms": ROOM_CATALOG,
        "soundEvents": SOUND_EVENTS,
        "officeBonuses": get_office_bonuses(game_state.layout_furniture),
        "repStars": get_rep_stars(game_state.reputation),
        "difficultyBadges": {d: get_difficulty_badge(d) for d in ["easy", "medium", "hard", "epic"]},
        "coinsFormatted": format_coins(game_state.coins),
        "timeOfDay": get_time_of_day(day_timer),
        "nightOverlayAlpha": get_night_overlay_alpha(day_timer),
    })


# ═══════════════════════════════════════════════════════
# REST API — BRIDGE / ROOMS / EXTRA ENDPOINTS
# ═══════════════════════════════════════════════════════

@app.route("/api/rooms/buy", methods=["POST"])
def room_buy():
    data = request.get_json(force=True)
    with state_lock:
        result = buy_room(game_state, int(data.get("room_id", 0)))
        return jsonify(result), (200 if result.get("success") else 400)


@app.route("/api/bridge", methods=["GET"])
def bridge_status():
    with state_lock:
        return jsonify(get_bridge_status(game_state))


@app.route("/api/agents/<agent_id>", methods=["GET"])
def get_single_agent(agent_id):
    with state_lock:
        info = agent_mgr.get_agent_info(agent_id)
        if info:
            return jsonify(info)
        return jsonify({"error": "Agent not found"}), 404


@app.route("/api/agents/<agent_id>/assign", methods=["POST"])
def assign_task_to_agent(agent_id):
    data = request.get_json(force=True)
    with state_lock:
        ok, msg = agent_mgr.assign_task(agent_id, data.get("task_id", ""))
        return jsonify({"status": "ok" if ok else "error", "message": msg}), (200 if ok else 400)


@app.route("/api/game/day-progress", methods=["POST"])
def update_day_progress():
    data = request.get_json(force=True) if request.is_json else {}
    with state_lock:
        game_state.day_progress = max(0.0, min(1.0, float(data.get("progress", game_state.day_progress))))
        return jsonify({"day_progress": game_state.day_progress})


# ═══════════════════════════════════════════════════════
# REST API — GAME CONTROL
# ═══════════════════════════════════════════════════════

@app.route("/api/game/new", methods=["POST"])
def new_game():
    """Start a new game."""
    global game_state, agent_mgr, economy_mgr, contract_mgr, farm_mgr, mini_games, analytics, achievement_mgr, tech_tree_mgr, item_shop_mgr, layout_mgr, chatbox_mgr, stats_dashboard
    with state_lock:
        game_state = GameState()
        agent_mgr = AgentManager(game_state)
        economy_mgr = EconomyManager(game_state)
        contract_mgr = ContractManager(game_state)
        farm_mgr = FarmManager(game_state)
        mini_games = MiniGameTracker(game_state)
        analytics = GameAnalytics(game_state)
        achievement_mgr = AchievementManager(game_state)
        tech_tree_mgr = TechTreeManager(game_state)
        item_shop_mgr = ItemShopManager(game_state)
        layout_mgr = LayoutEditorManager(game_state)
        chatbox_mgr = ChatboxManager(game_state)
        stats_dashboard = StatsDashboard(game_state)
        contract_mgr.generate_contracts(3)
        return jsonify({"status": "ok", "message": "🎮 New game started!", "state": game_state.to_dict()})


@app.route("/api/game/tick", methods=["POST"])
def game_tick():
    """Advance game simulation by delta time."""
    data = request.get_json(force=True) if request.is_json else {}
    dt = data.get("delta", 1.0)
    with state_lock:
        if game_state.paused:
            return jsonify({"status": "paused"})

        events = []
        # Agent simulation
        events.extend(agent_mgr.tick(dt))
        # Auto-assign tasks
        msgs = agent_mgr.auto_assign_tasks()
        for m in msgs:
            events.append({"type": "task_assigned", "message": m})
        # Farm simulation
        events.extend(farm_mgr.tick(dt))
        # Gold price update
        mini_games.gold_trading.tick()

        return jsonify({"status": "ok", "events": events})


@app.route("/api/game/next_day", methods=["POST"])
def next_day():
    """Advance to next day."""
    with state_lock:
        game_state.day += 1
        events = []

        # Pay salary
        total, msgs = economy_mgr.pay_daily_salary()
        events.append({"type": "salary_paid", "total": total, "messages": msgs})

        # Contract checks
        contract_events = contract_mgr.daily_check()
        for evt in contract_events:
            if evt["type"] == "contract_completed":
                economy_mgr.add_coins(evt["reward"], f"Contract: {evt['contract_id']}")
                xp_event = economy_mgr.add_xp(50)
                economy_mgr.adjust_reputation(0.2)
                if xp_event:
                    events.append(xp_event)
            elif evt["type"] == "contract_failed":
                economy_mgr.spend_coins(evt["penalty"], f"Penalty: {evt['contract_id']}")
                economy_mgr.adjust_reputation(-0.3)
        events.extend(contract_events)

        # Weather change
        weather = farm_mgr.change_weather()
        events.append(weather)

        # Research / shop / achievements updates
        researcher_count = sum(1 for a in game_state.agents.values() if a.role in {"data_scientist", "ai_engineer", "cto"})
        research_event = tech_tree_mgr.tick_research(researcher_count)
        if research_event.get("active"):
            events.append({"type": "research", **research_event})
        item_shop_mgr.refresh_daily_specials()
        newly_unlocked = achievement_mgr.check()
        for ach in newly_unlocked:
            events.append({"type": "achievement_unlocked", "achievement": ach})

        # Analytics snapshot
        analytics.take_daily_snapshot()

        # Bankruptcy check
        if economy_mgr.is_bankrupt():
            events.append({"type": "game_over", "message": "💀 GAME OVER — Bankrupt!"})

        # Win check
        if game_state.level >= 10:
            events.append({"type": "game_win", "message": "🏆 YOU WIN!"})

        socketio.emit("new_day", {"day": game_state.day, "events": events})
        return jsonify({"status": "ok", "day": game_state.day, "events": events})


@app.route("/api/game/speed", methods=["POST"])
def set_speed():
    data = request.get_json(force=True)
    with state_lock:
        game_state.speed = max(1, min(3, data.get("speed", 1)))
        return jsonify({"speed": game_state.speed})


@app.route("/api/game/pause", methods=["POST"])
def toggle_pause():
    with state_lock:
        game_state.paused = not game_state.paused
        return jsonify({"paused": game_state.paused})


# ═══════════════════════════════════════════════════════
# WEBSOCKET EVENTS
# ═══════════════════════════════════════════════════════

@socketio.on("connect")
def handle_connect():
    print(f"🔌 Client connected")
    emit("connected", {"message": "Connected to PixelAgent City server", "server_time": time.time()})


@socketio.on("disconnect")
def handle_disconnect():
    print(f"🔌 Client disconnected")


@socketio.on("sync_state")
def handle_sync(data):
    """Sync state from frontend to backend."""
    with state_lock:
        if "coins" in data:
            game_state.coins = data["coins"]
        if "day" in data:
            game_state.day = data["day"]
        if "level" in data:
            game_state.level = data["level"]
        if "xp" in data:
            game_state.xp = data["xp"]
        if "reputation" in data:
            game_state.reputation = data["reputation"]
        emit("state_synced", {"status": "ok"})


@socketio.on("ping_server")
def handle_ping(data):
    emit("pong_server", {"server_time": time.time(), "day": game_state.day})


# ═══════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════

def print_banner():
    print("""
╔══════════════════════════════════════════════════╗
║        🎮 PixelAgent City — Python Server        ║
║══════════════════════════════════════════════════║
║  Frontend:  http://localhost:5000                ║
║  API Docs:  http://localhost:5000/api/state      ║
║  WebSocket: ws://localhost:5000                  ║
║══════════════════════════════════════════════════║
║  Modules:                                        ║
║    ✅ Agent Manager    ✅ Economy System          ║
║    ✅ Contract Manager ✅ Farm System             ║
║    ✅ Mini-Games       ✅ Save/Load               ║
║    ✅ Analytics        ✅ WebSocket               ║
╚══════════════════════════════════════════════════╝
""")


if __name__ == "__main__":
    print_banner()
    # Generate initial contracts
    with state_lock:
        contract_mgr.generate_contracts(3)
    # Read PORT from environment (for Cloud Run / Render / Heroku)
    port = int(os.environ.get("PORT", 5000))
    debug_mode = os.environ.get("FLASK_ENV", "development") == "development"
    socketio.run(app, host="0.0.0.0", port=port, debug=debug_mode, allow_unsafe_werkzeug=True)
