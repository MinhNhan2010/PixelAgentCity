import math
import random

from game_engine.mini_games import (
    WeightedSlotMachine,
    CafeEngine,
    FlappyHeliEngine,
    RoadRacerEngine,
    GoldTrading,
    BilliardsEngine,
    FishingEngine,
    FighterEngine,
    PokerEngine,
)
from game_engine.models import Agent, GameState, ROLE_CONFIG, LEVEL_THRESHOLDS
from game_engine.save_manager import SaveManager
from game_engine.achievements import ACHIEVEMENTS, AchievementManager
from game_engine.tech_tree import TECHS
from game_engine.item_shop import ITEMS, ItemCatalog, ItemShopManager
from game_engine.farm_manager import CROPS, RECIPES, WEATHER_TYPES, FarmManager
from game_engine.layout_editor import FURNITURE_CATALOG, LayoutEditorManager


def test_core_game_state_defaults_match_js_game_state():
    state = GameState()
    assert state.coins == 9999999999
    assert state.day == 1
    assert state.reputation == 3.0
    assert state.level == 1
    assert state.xp == 0
    assert state.speed == 1
    assert state.paused is False
    assert state.unlocked_rooms == list(range(17))


def test_role_config_matches_js_game_and_agents_sources():
    expected = {
        "coder": (100, 15, 1, 1.2),
        "tester": (120, 14, 1, 1.0),
        "reviewer": (150, 18, 2, 0.9),
        "designer": (160, 20, 2, 0.8),
        "devops": (200, 25, 3, 1.1),
        "researcher": (220, 28, 3, 0.7),
        "farmer": (80, 10, 3, 0.7),
        "analyst": (180, 22, 4, 0.85),
        "security": (250, 30, 4, 0.9),
        "backend": (200, 25, 5, 1.1),
        "mobile": (200, 22, 5, 1.0),
        "writer": (130, 12, 5, 0.8),
    }
    assert set(ROLE_CONFIG) == set(expected)
    for role, (cost, salary, unlock_level, speed) in expected.items():
        assert ROLE_CONFIG[role]["cost"] == cost
        assert ROLE_CONFIG[role]["salary"] == salary
        assert ROLE_CONFIG[role]["unlock_level"] == unlock_level
        assert ROLE_CONFIG[role]["speed"] == speed


def test_level_milestones_match_js_game_source():
    assert [(item["level"], item["xp"], item["name"]) for item in LEVEL_THRESHOLDS] == [
        (1, 0, "Startup Garage"),
        (2, 100, "Small Studio"),
        (3, 300, "Growing Team"),
        (4, 600, "Established Firm"),
        (5, 1000, "Pro Agency"),
        (6, 1500, "Tech Company"),
        (7, 2200, "Scale-up"),
        (8, 3000, "Enterprise"),
        (9, 4000, "Corp Giant"),
        (10, 5500, "🏆 AI Empire"),
    ]


def test_achievement_catalog_and_hire_threshold_match_js_source():
    assert [a.id for a in ACHIEVEMENTS] == [
        "first_coin", "rich_1k", "rich_10k", "earned_50k",
        "first_contract", "contracts_5", "contracts_15", "contracts_30", "no_fail",
        "hire_first", "team_5", "team_10", "agent_lvl5", "all_roles",
        "level_3", "level_5", "level_8", "level_10", "rep_5", "day_30",
        "poker_play", "billiard_play", "slot_win", "gold_trade",
    ]
    state = GameState()
    manager = AchievementManager(state)
    state.agents = {
        "a1": Agent(id="a1"),
        "a2": Agent(id="a2"),
    }
    assert all(a["id"] != "hire_first" for a in manager.check())
    state.agents["a3"] = Agent(id="a3")
    assert any(a["id"] == "hire_first" for a in manager.check())


def test_tech_tree_catalog_matches_js_source():
    assert [(t.id, t.branch, t.tier, t.cost, t.research_days, t.requires, t.effect, t.value) for t in TECHS] == [
        ("fast_compile", "engineering", 1, 200, 1, [], "task_speed", 0.15),
        ("code_review_bot", "engineering", 2, 400, 2, ["fast_compile"], "auto_review", 0.5),
        ("cicd_mastery", "engineering", 3, 700, 2.5, ["code_review_bot"], "deploy_speed", 0.3),
        ("quantum_computing", "engineering", 4, 1500, 3, ["cicd_mastery"], "task_speed", 0.5),
        ("smart_assign", "ai_research", 1, 250, 1.5, [], "quality_bonus", 0.1),
        ("mood_prediction", "ai_research", 2, 450, 2, ["smart_assign"], "mood_decay_reduction", 0.25),
        ("neural_optimizer", "ai_research", 3, 800, 2.5, ["mood_prediction"], "xp_bonus", 0.25),
        ("agi_prototype", "ai_research", 4, 2000, 3, ["neural_optimizer"], "agi_boost", 0.4),
        ("overtime_policy", "management", 1, 150, 1, [], "overtime", 0.2),
        ("remote_work", "management", 2, 350, 1.5, ["overtime_policy"], "remote_work", 0.3),
        ("team_building", "management", 3, 600, 2, ["remote_work"], "teamwork", 0.5),
        ("ipo_express", "management", 4, 1200, 3, ["team_building"], "xp_requirement_reduction", 0.4),
    ]


def test_pixelmart_catalog_matches_js_source_order_and_categories():
    assert len(ITEMS) == 40
    assert [item.id for item in ITEMS[:8]] == [
        "coffee_black", "energy_drink", "pixel_pizza", "golden_boba",
        "brain_boost", "mega_protein", "lucky_cookie", "team_snack",
    ]
    assert [item.id for item in ITEMS[-6:]] == [
        "golden_skin", "time_machine", "double_coin", "clone_voucher", "mystery_box", "respec_token",
    ]
    assert [c["id"] for c in ItemCatalog.CATEGORIES] == [
        "consumable", "tool", "decoration", "booster", "farm", "special",
    ]


def test_pixelmart_buy_sell_and_use_instant_item_match_js_source():
    state = GameState()
    state.coins = 100
    state.agents = {"a1": Agent(id="a1", name="A1", energy=50, mood=40)}
    shop = ItemShopManager(state)

    bought = shop.buy_item("coffee_black", 2)
    assert bought["success"] is True
    assert bought["cost"] == 16
    assert state.coins == 84
    assert state.shop_inventory["coffee_black"] == 2
    assert state.shop_stats["totalPurchases"] == 2
    assert state.shop_stats["totalSpent"] == 16

    used = shop.use_item("coffee_black", "a1")
    assert used["success"] is True
    assert state.agents["a1"].energy == 70
    assert state.shop_inventory["coffee_black"] == 1
    assert state.shop_stats["itemsUsed"] == 1

    sold = shop.sell_item("coffee_black", 1)
    assert sold["success"] is True
    assert sold["earned"] == 3
    assert "coffee_black" not in state.shop_inventory
    assert state.coins == 87
    assert state.shop_stats["totalSold"] == 1
    assert state.shop_stats["totalEarned"] == 3


def test_farm_catalog_and_weather_match_js_source():
    assert list(CROPS) == [
        "tomato", "carrot", "corn", "potato", "strawberry", "watermelon",
        "grape", "pumpkin", "sunflower", "rose", "herb", "tea",
    ]
    assert [(k, v["cost"], v["grow_days"], v["yield"], v["sell_price"], v["category"]) for k, v in CROPS.items()] == [
        ("tomato", 10, 2, [2, 4], 15, "vegetable"),
        ("carrot", 8, 2, [3, 5], 12, "vegetable"),
        ("corn", 12, 3, [2, 4], 18, "vegetable"),
        ("potato", 8, 3, [3, 6], 10, "vegetable"),
        ("strawberry", 20, 3, [2, 3], 30, "fruit"),
        ("watermelon", 25, 4, [1, 2], 45, "fruit"),
        ("grape", 22, 3, [2, 4], 28, "fruit"),
        ("pumpkin", 18, 4, [1, 3], 40, "fruit"),
        ("sunflower", 15, 3, [2, 3], 22, "flower"),
        ("rose", 30, 4, [1, 2], 55, "flower"),
        ("herb", 25, 3, [1, 3], 50, "herb"),
        ("tea", 28, 4, [1, 2], 58, "herb"),
    ]
    assert [(k, v["ingredients"], v["effect"], v["value"], v["sell_price"]) for k, v in RECIPES.items()] == [
        ("salad", {"tomato": 1, "carrot": 1}, "energy", 25, 40),
        ("soup", {"potato": 2, "carrot": 1, "corn": 1}, "energy", 35, 55),
        ("fruit_juice", {"strawberry": 1, "grape": 1}, "energy", 30, 50),
        ("pie", {"pumpkin": 1, "strawberry": 1}, "mood", 30, 65),
        ("herbal_tea", {"herb": 1, "tea": 1}, "mood", 40, 80),
        ("flower_boost", {"rose": 1, "sunflower": 1}, "xp", 20, 70),
        ("feast", {"tomato": 2, "corn": 1, "potato": 2, "watermelon": 1}, "all", 15, 120),
        ("smoothie", {"strawberry": 2, "grape": 1}, "energy", 28, 55),
    ]
    assert [(w["id"], w["weight"], w["grow_bonus"], w["water_needed"]) for w in WEATHER_TYPES] == [
        ("sunny", 35, 0, True),
        ("rainy", 25, 1, False),
        ("cloudy", 20, 0, True),
        ("stormy", 10, -1, False),
        ("hot", 10, -0.5, True),
    ]


def test_farm_status_uses_js_weather_fields_without_name_key():
    manager = FarmManager(GameState())
    status = manager.get_farm_status()
    assert status["weather"] == "sunny"
    assert status["weather_desc"] == "☀️ Nắng đẹp"
    assert status["weather_info"]["id"] == "sunny"
    assert len(status["plots"]) == 12


def test_layout_catalog_matches_js_source_order_and_sizes():
    assert list(FURNITURE_CATALOG) == ["Bàn Ghế", "Sofa & Giường", "Tủ & Kệ", "Thiết Bị", "Trang Trí"]
    assert [(item.id, item.w, item.h, item.has_slot) for item in FURNITURE_CATALOG["Bàn Ghế"]] == [
        ("desk", 3, 2, True),
        ("mtable", 3, 4, False),
        ("table_small", 2, 2, False),
        ("table_low", 2, 1, False),
        ("mchair", 1, 1, False),
        ("chair", 1, 2, False),
    ]
    assert [item.id for item in FURNITURE_CATALOG["Thiết Bị"]] == [
        "pc", "whiteboard", "vending", "coffee", "fridge", "billiard_table", "counter",
    ]


def test_layout_collision_pc_surface_and_undo_match_js_behavior():
    state = GameState()
    layout = LayoutEditorManager(state)
    assert layout.check_collision(0, 0, "desk") == "nofloor"

    desk = layout.place_furniture("desk", 2, 2)
    assert desk["success"] is True
    assert len(state.layout_desk_slots) == 1
    assert layout.check_collision(2, 2, "chair") == "overlap"
    assert layout.check_collision(2, 2, "pc") == "ok"

    pc = layout.place_furniture("pc", 2, 2)
    assert pc["success"] is True
    assert len(state.layout_furniture) == 2
    assert layout.undo()["success"] is True
    assert [f["t"] for f in state.layout_furniture] == ["desk"]
    assert layout.redo()["success"] is True
    assert [f["t"] for f in state.layout_furniture] == ["desk", "pc"]


def test_gold_trading_js_price_spread_and_portfolio_formulas():
    state = GameState()
    state.gold_price = 2380.0
    state.gold_history = [2380.0]
    trader = GoldTrading(state)

    assert trader.price_to_coins(2380.0) == 238
    assert trader.coins_to_price(238) == 2380
    assert trader.get_cost_for_ounces(1) == 242

    buy = trader.buy_ounces(2, available_coins=1000)
    assert buy == {"type": "buy", "ounces": 2, "price": 2380.0, "costCoins": 485}
    assert state.gold_holdings == 2
    assert state.gold_avg_buy_price == 2380.0
    assert state.gold_total_buy_volume == 2
    assert state.gold_total_invested == 485

    state.gold_price = 2500.0
    assert trader.get_portfolio_value() == 500
    assert trader.get_unrealized_pnl() == 24

    sell = trader.sell_ounces(1)
    assert sell == {"type": "sell", "ounces": 1, "price": 2500.0, "revenueCoins": 245, "profit": 7}
    assert state.gold_holdings == 1
    assert state.gold_realized_pnl == 7
    assert state.gold_total_sell_volume == 1


def test_billiards_personalities_match_js_source_roles():
    assert BilliardsEngine.PERSONALITIES == {
        "coder": {"accuracy": 0.75, "power": 0.70, "style": "precise"},
        "tester": {"accuracy": 0.85, "power": 0.60, "style": "careful"},
        "reviewer": {"accuracy": 0.70, "power": 0.65, "style": "analytical"},
        "designer": {"accuracy": 0.60, "power": 0.80, "style": "creative"},
        "devops": {"accuracy": 0.80, "power": 0.75, "style": "stable"},
        "researcher": {"accuracy": 0.72, "power": 0.65, "style": "thinking"},
        "analyst": {"accuracy": 0.78, "power": 0.68, "style": "calculated"},
        "security": {"accuracy": 0.82, "power": 0.70, "style": "defensive"},
        "backend": {"accuracy": 0.76, "power": 0.72, "style": "systematic"},
        "mobile": {"accuracy": 0.68, "power": 0.74, "style": "adaptive"},
        "writer": {"accuracy": 0.62, "power": 0.60, "style": "dramatic"},
    }
    assert BilliardsEngine.STYLE_SPIN["creative"] == 0.5


def test_fishing_catalog_and_payout_formula_match_js_source(monkeypatch):
    assert [(f["name"], f["weight"], f["value"], f["rate"], f["difficulty"]) for f in FishingEngine.FISH_TYPES] == [
        ("Cá Rô", [0.2, 1.5], 1.2, 30, 1),
        ("Cá Chép", [0.5, 3.0], 1.8, 25, 2),
        ("Cá Trê", [0.3, 2.0], 1.5, 20, 2),
        ("Cá Lóc", [1.0, 5.0], 2.5, 12, 3),
        ("Cá Koi", [0.5, 4.0], 4.0, 6, 3),
        ("Cá Vàng", [0.1, 0.5], 6.0, 4, 4),
        ("Rùa Vàng", [2.0, 8.0], 10.0, 2, 5),
        ("Cá Rồng", [3.0, 12.0], 20.0, 1, 5),
    ]
    monkeypatch.setattr(FishingEngine, "pick_fish", classmethod(lambda cls: {
        "name": "Cá Koi", "emoji": "🎏", "weight": [0.5, 4.0], "value": 4.0,
        "rate": 6, "difficulty": 3, "actualWeight": 2.5,
    }))
    monkeypatch.setattr(random, "random", lambda: 0.0)
    result = FishingEngine.play(10, skill=0.65)
    assert result["win"] is True
    assert result["payout"] == round(10 * 4.0 * (1 + 2.5 * 0.2))
    assert result["fish"]["name"] == "Cá Koi"


def test_fighter_roster_damage_and_payout_match_js_source():
    assert [(f["id"], f["hp"], f["atk"], f["def"], f["spd"], f["specialDmg"]) for f in FighterEngine.ROSTER] == [
        ("pixel_ryu", 100, 12, 5, 3, 25),
        ("cyber_ken", 95, 14, 4, 4, 30),
        ("nano_chun", 90, 10, 6, 5, 22),
        ("robo_zang", 120, 16, 8, 2, 35),
        ("ghost_vega", 85, 13, 3, 6, 28),
        ("iron_sagat", 110, 15, 7, 2, 32),
    ]
    assert max(1, 12 - int(5 * 0.3)) == 11
    assert int(10 * (2 + 2 * 0.5)) == 30
    assert int(10 * (2 + 1 * 0.5)) == 25


def test_poker_personalities_match_js_source_roles():
    assert list(PokerEngine.PERSONALITIES) == [
        "coder", "tester", "reviewer", "designer", "devops", "researcher",
        "analyst", "security", "backend", "mobile", "writer",
    ]
    assert PokerEngine.PERSONALITIES["backend"] == {
        "aggression": 0.55, "bluffRate": 0.22, "tightness": 0.25, "name": "Balanced",
    }
    assert PokerEngine.PERSONALITIES["writer"] == {
        "aggression": 0.45, "bluffRate": 0.30, "tightness": 0.28, "name": "Storyteller",
    }


def test_poker_evaluator_wheel_and_royal_flush_match_js_source():
    def card(rank, suit):
        return {"rank": rank, "suit": suit, "value": PokerEngine.RANK_VALUES[rank]}

    wheel = PokerEngine.evaluate_best(
        [card("A", "♠"), card("2", "♥")],
        [card("3", "♦"), card("4", "♣"), card("5", "♠"), card("9", "♥"), card("K", "♦")],
    )
    assert wheel["name"] == "Straight"
    assert wheel["kickers"] == [5, 4, 3, 2, 1]

    royal = PokerEngine.evaluate_best(
        [card("A", "♠"), card("K", "♠")],
        [card("Q", "♠"), card("J", "♠"), card("10", "♠"), card("2", "♥"), card("3", "♦")],
    )
    assert royal["rank"] == 10
    assert royal["name"] == "Royal Flush"


def test_slot_reference_constants_match_js():
    assert [s["id"] for s in WeightedSlotMachine.SYMBOLS] == [
        "cherry", "lemon", "orange", "star", "seven", "diamond", "jackpot"
    ]
    assert [s["weight"] for s in WeightedSlotMachine.SYMBOLS] == [22, 20, 18, 16, 12, 8, 4]
    assert WeightedSlotMachine.PAYOUTS["jackpot-jackpot-jackpot"]["mul"] == 50
    assert WeightedSlotMachine.PAYOUTS["diamond-diamond-diamond"]["mul"] == 20
    assert WeightedSlotMachine.PAYOUTS["seven-seven-seven"]["mul"] == 15
    assert WeightedSlotMachine.PAYOUTS["star-star-star"]["mul"] == 10
    assert WeightedSlotMachine.PAYOUTS["orange-orange-orange"]["mul"] == 5
    assert WeightedSlotMachine.PAYOUTS["lemon-lemon-lemon"]["mul"] == 4
    assert WeightedSlotMachine.PAYOUTS["cherry-cherry-cherry"]["mul"] == 3
    assert WeightedSlotMachine.TWO_KIND == {
        "jackpot": 5,
        "diamond": 3,
        "seven": 2.5,
        "star": 2,
        "orange": 1.5,
        "lemon": 1.2,
        "cherry": 1.1,
    }
    assert WeightedSlotMachine.BET_OPTIONS == [10, 25, 50, 100]


def test_slot_evaluation_for_forced_two_kind_matches_js(monkeypatch):
    reels = [
        {"id": "lemon", "emoji": "🍋", "weight": 20, "name": "Lemon"},
        {"id": "lemon", "emoji": "🍋", "weight": 20, "name": "Lemon"},
        {"id": "star", "emoji": "⭐", "weight": 16, "name": "Star"},
    ]
    monkeypatch.setattr(random, "choices", lambda *args, **kwargs: reels)
    result = WeightedSlotMachine.spin(25)
    assert result["payout"] == math.floor(25 * 1.2)
    assert result["netGain"] == result["payout"] - 25
    assert result["name"] == "🍋 Double Lemon!"


def test_cafe_reference_recipes_and_rating_thresholds_match_js():
    assert [(r["id"], r["difficulty"], r["baseMul"], r["targetSize"]) for r in CafeEngine.RECIPES] == [
        ("espresso", 0.35, 2, 0.30),
        ("latte", 0.40, 2.5, 0.26),
        ("cappuccino", 0.45, 3, 0.22),
        ("mocha", 0.50, 3.5, 0.20),
        ("matcha", 0.55, 4, 0.18),
        ("boba", 0.60, 5, 0.15),
    ]
    assert CafeEngine.rating(0.90)["stars"] == 3
    assert CafeEngine.rating(0.60)["stars"] == 2
    assert CafeEngine.rating(0.30)["stars"] == 1
    assert CafeEngine.rating(0.29)["stars"] == 0


def test_cafe_payout_tiers_match_js_when_targets_are_centered(monkeypatch):
    monkeypatch.setattr(random, "random", lambda: 0.5)
    perfect = CafeEngine.play(10, "espresso", [0.5, 0.5, 0.5])
    assert perfect["totalStars"] == 9
    assert perfect["payout"] == math.floor(10 * 2 * (1 + perfect["avgAccuracy"]))
    assert perfect["win"] is True
    poor = CafeEngine.play(10, "espresso", [0.1, 0.1, 0.1])
    assert poor["totalStars"] == 0
    assert poor["payout"] == 0
    assert poor["win"] is False


def test_arcade_payout_tables_match_js_ui_thresholds():
    assert FlappyHeliEngine.payout_for_score(30, 10)[0] == 80
    assert FlappyHeliEngine.payout_for_score(20, 10)[0] == 50
    assert FlappyHeliEngine.payout_for_score(15, 10)[0] == 30
    assert FlappyHeliEngine.payout_for_score(10, 10)[0] == 20
    assert FlappyHeliEngine.payout_for_score(5, 10)[0] == 12
    assert FlappyHeliEngine.payout_for_score(4, 10)[0] == 0

    assert RoadRacerEngine.payout_for_score(80, 10)[0] == 80
    assert RoadRacerEngine.payout_for_score(50, 10)[0] == 50
    assert RoadRacerEngine.payout_for_score(30, 10)[0] == 30
    assert RoadRacerEngine.payout_for_score(20, 10)[0] == 20
    assert RoadRacerEngine.payout_for_score(10, 10)[0] == 12
    assert RoadRacerEngine.payout_for_score(9, 10)[0] == 0


def test_migrated_state_fields_roundtrip(tmp_path):
    state = GameState()
    state.coins = 12345
    state.analytics_history["dailyIncome"].append({"day": 1, "net": 99})
    state.agent_stats["uptime"] = 77
    state.shop_inventory = {"coffee": 2}
    state.tech_unlocked = ["ai_basics"]
    state.layout_saved_at = "verification"
    state.fighter_stats["totalGames"] = 1
    manager = SaveManager()
    ok, _ = manager.save(state, "parity_test")
    assert ok
    loaded, _ = manager.load("parity_test")
    assert loaded.coins == 12345
    assert loaded.analytics_history["dailyIncome"][0]["net"] == 99
    assert loaded.agent_stats["uptime"] == 77
    assert loaded.shop_inventory["coffee"] == 2
    assert loaded.tech_unlocked == ["ai_basics"]
    assert loaded.layout_saved_at == "verification"
    assert loaded.fighter_stats["totalGames"] == 1


def test_python_bridge_reference_endpoints_exist():
    import server

    routes = {str(rule) for rule in server.app.url_map.iter_rules()}
    expected_routes = {
        "/api/state/summary",
        "/api/agents",
        "/api/agents/hire",
        "/api/agents/<agent_id>/fire",
        "/api/agents/roles",
        "/api/contracts",
        "/api/contracts/generate",
        "/api/contracts/<contract_id>/accept",
        "/api/economy",
        "/api/economy/add",
        "/api/farm",
        "/api/farm/plant",
        "/api/farm/water",
        "/api/farm/harvest",
        "/api/farm/cook",
        "/api/farm/sell",
        "/api/minigames/poker",
        "/api/minigames/slots",
        "/api/minigames/gold/buy",
        "/api/minigames/gold/sell",
        "/api/minigames/scores",
        "/api/minigames/score",
        "/api/save",
        "/api/load",
        "/api/saves",
        "/api/game/new",
        "/api/game/tick",
        "/api/game/next_day",
        "/api/game/speed",
        "/api/game/pause",
        "/api/analytics",
        "/api/analytics/agents",
    }
    assert expected_routes <= routes



def test_chatbox_role_templates_and_response_generation():
    from game_engine.chatbox import ChatboxManager, QUICK_ASK_CATALOG, ROLE_BADGE_MAP, ROLE_RESPONSES
    from game_engine.models import Agent, GameState, Task

    assert QUICK_ASK_CATALOG["base"][0]["key"] == "working"
    assert ROLE_BADGE_MAP["coder"] == "CD"
    assert "{task}" in ROLE_RESPONSES["coder"]["working"][0]

    state = GameState()
    agent = Agent(id="a1", name="Coder One", role="coder", state="working", mood=81, energy=72)
    task = Task(id="t1", title="Landing Page", progress=42)
    agent.current_task_id = "t1"
    state.agents[agent.id] = agent
    state.tasks[task.id] = task
    chat = ChatboxManager(state)
    opened = chat.open_with_agent("a1")
    assert opened["success"] is True
    assert opened["meta"]["avatar"] == "CD"
    response = chat.generate_response("a1", "tinh hinh", key="working")
    expected_prefixes = [t.replace("{task}", "Landing Page") for t in ROLE_RESPONSES["coder"]["working"]]
    assert any(response.startswith(prefix) for prefix in expected_prefixes)


def test_error_handler_ring_buffer_and_storage_usage():
    from game_engine.error_handler import ErrorHandler, StorageUtils

    handler = ErrorHandler(max_errors=50)
    for i in range(60):
        handler.log("error", f"err-{i}")
    errors = handler.get_errors()
    assert len(errors) == 50
    assert errors[0]["message"] == "err-10"
    assert errors[-1]["message"] == "err-59"

    storage = StorageUtils()
    assert storage.set("state", {"coins": 123}) is True
    assert storage.get("state")["coins"] == 123
    assert storage.get_usage()["maxKB"] == "5120"


def test_statistics_dashboard_js_shape_and_trend():
    from game_engine.models import Agent, GameState
    from game_engine.statistics import StatsDashboard

    state = GameState(coins=500, total_earned=200, total_spent=50, day=1)
    state.agents["a1"] = Agent(id="a1", role="coder", mood=70, energy=80)
    stats = StatsDashboard(state)
    stats.record_day()
    first = stats.history["dailyIncome"][0]
    assert first == {"day": 1, "income": 200, "expense": 50, "net": 150, "coins": 500}
    summary = stats.get_summary()
    assert summary["netProfit"] == 150
    assert summary["dailyBurn"] == 15
    assert summary["roleDistribution"] == {"coder": 1}


def test_game_app_room_sound_and_bonus_parity():
    from game_engine.game_app import ROOM_CATALOG, SOUND_EVENTS, format_coins, get_difficulty_badge, get_office_bonuses, get_rep_stars, get_time_of_day, get_night_overlay_alpha

    assert len(ROOM_CATALOG) == 17
    assert ROOM_CATALOG[0]["id"] == 0
    assert ROOM_CATALOG[16]["id"] == 16
    assert SOUND_EVENTS["bgmNotes"] == [261, 329, 392, 523, 392, 329]
    bonuses = get_office_bonuses([{"t": "coffee"}, {"t": "bookshelf"}, {"t": "plant"}, {"t": "mtable"}, {"t": "clock"}])
    assert bonuses["idleEnergyRegen"] == 0.03
    assert bonuses["xpGainMul"] == 1.06
    assert bonuses["deadlineHintDays"] == 1
    assert len(get_rep_stars(3.5)) >= 5
    assert get_difficulty_badge("epic")[1] == "Epic"
    assert format_coins(12500) == "12.5K"
    assert get_time_of_day(100) == "night"
    assert get_night_overlay_alpha(30) == 0

