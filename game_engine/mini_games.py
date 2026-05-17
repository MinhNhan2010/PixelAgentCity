"""
mini_games.py — Mini-Game Server Logic
========================================
Ports the non-UI gameplay logic from poker.js, slot-machine.js, and gold-trading.js
into Python managers usable by Flask and save/load state.
"""

from __future__ import annotations

from itertools import combinations
import random
import time
from typing import Dict, List, Tuple, Any
from .models import GameState


class PokerEngine:
    SUITS = ["♠", "♥", "♦", "♣"]
    RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]
    RANK_VALUES = {rank: idx + 2 for idx, rank in enumerate(RANKS)}
    PERSONALITIES = {
        "coder": {"aggression": 0.45, "bluffRate": 0.15, "tightness": 0.35, "name": "Logical"},
        "tester": {"aggression": 0.30, "bluffRate": 0.10, "tightness": 0.50, "name": "Cautious"},
        "reviewer": {"aggression": 0.35, "bluffRate": 0.12, "tightness": 0.40, "name": "Analytical"},
        "designer": {"aggression": 0.65, "bluffRate": 0.35, "tightness": 0.18, "name": "Creative"},
        "devops": {"aggression": 0.75, "bluffRate": 0.25, "tightness": 0.20, "name": "Aggressive"},
        "researcher": {"aggression": 0.40, "bluffRate": 0.15, "tightness": 0.38, "name": "Methodical"},
        "analyst": {"aggression": 0.45, "bluffRate": 0.12, "tightness": 0.35, "name": "Calculated"},
        "security": {"aggression": 0.50, "bluffRate": 0.18, "tightness": 0.30, "name": "Defensive"},
        "backend": {"aggression": 0.55, "bluffRate": 0.22, "tightness": 0.25, "name": "Balanced"},
        "mobile": {"aggression": 0.50, "bluffRate": 0.20, "tightness": 0.30, "name": "Adaptive"},
        "writer": {"aggression": 0.45, "bluffRate": 0.30, "tightness": 0.28, "name": "Storyteller"},
    }

    @staticmethod
    def create_deck() -> List[dict]:
        deck = [{"suit": suit, "rank": rank, "value": PokerEngine.RANK_VALUES[rank]} for suit in PokerEngine.SUITS for rank in PokerEngine.RANKS]
        random.shuffle(deck)
        return deck

    @staticmethod
    def evaluate_best(hole_cards: List[dict], community_cards: List[dict]) -> dict:
        cards = list(hole_cards) + list(community_cards)
        if len(cards) < 5:
            return {"rank": 0, "name": "Incomplete", "kickers": []}
        best = None
        for combo in combinations(cards, 5):
            result = PokerEngine._evaluate_five(list(combo))
            if not best or result["rank"] > best["rank"] or (result["rank"] == best["rank"] and PokerEngine.compare_kickers(result["kickers"], best["kickers"]) > 0):
                best = result
        return best

    @staticmethod
    def _evaluate_five(cards: List[dict]) -> dict:
        sorted_cards = sorted(cards, key=lambda c: c["value"], reverse=True)
        values = [c["value"] for c in sorted_cards]
        is_flush = len({c["suit"] for c in sorted_cards}) == 1
        unique_desc = sorted(set(values), reverse=True)
        is_low_straight = set(values) == {14, 5, 4, 3, 2}
        is_straight = len(unique_desc) == 5 and (unique_desc[0] - unique_desc[-1] == 4 or is_low_straight)
        straight_kickers = [5, 4, 3, 2, 1] if is_low_straight else unique_desc
        counts: Dict[int, int] = {}
        for value in values:
            counts[value] = counts.get(value, 0) + 1
        groups = sorted(counts.items(), key=lambda kv: (kv[1], kv[0]), reverse=True)

        if is_flush and is_straight and straight_kickers[0] == 14:
            return {"rank": 10, "name": "Royal Flush", "kickers": straight_kickers}
        if is_flush and is_straight:
            return {"rank": 9, "name": "Straight Flush", "kickers": straight_kickers}
        if groups[0][1] == 4:
            return {"rank": 8, "name": "Four of a Kind", "kickers": PokerEngine._group_kickers(groups)}
        if groups[0][1] == 3 and groups[1][1] == 2:
            return {"rank": 7, "name": "Full House", "kickers": PokerEngine._group_kickers(groups)}
        if is_flush:
            return {"rank": 6, "name": "Flush", "kickers": values}
        if is_straight:
            return {"rank": 5, "name": "Straight", "kickers": straight_kickers}
        if groups[0][1] == 3:
            return {"rank": 4, "name": "Three of a Kind", "kickers": PokerEngine._group_kickers(groups)}
        if groups[0][1] == 2 and groups[1][1] == 2:
            return {"rank": 3, "name": "Two Pair", "kickers": PokerEngine._group_kickers(groups)}
        if groups[0][1] == 2:
            return {"rank": 2, "name": "One Pair", "kickers": PokerEngine._group_kickers(groups)}
        return {"rank": 1, "name": "High Card", "kickers": values}

    @staticmethod
    def _group_kickers(groups: List[Tuple[int, int]]) -> List[int]:
        kickers: List[int] = []
        for value, count in groups:
            kickers.extend([value] * count)
        return kickers

    @staticmethod
    def compare_kickers(a: List[int], b: List[int]) -> int:
        for av, bv in zip(a, b):
            if av != bv:
                return av - bv
        return len(a) - len(b)

    @staticmethod
    def hand_strength(hole_cards: List[dict], community_cards: List[dict]) -> float:
        hand = PokerEngine.evaluate_best(hole_cards, community_cards)
        strength = (hand["rank"] - 1) / 9 if hand["rank"] else 0
        max_kicker = (max(hand["kickers"]) / 14) if hand["kickers"] else 0
        return min(1.0, max(0.0, strength * 0.85 + max_kicker * 0.15))

    @staticmethod
    def play_round(bet: int) -> dict:
        deck = PokerEngine.create_deck()
        player_hole = deck[:2]
        dealer_hole = deck[2:4]
        community = deck[4:9]
        player = PokerEngine.evaluate_best(player_hole, community)
        dealer = PokerEngine.evaluate_best(dealer_hole, community)
        cmp = player["rank"] - dealer["rank"] or PokerEngine.compare_kickers(player["kickers"], dealer["kickers"])
        if cmp > 0:
            result, winnings = "win", bet * max(1, player["rank"])
        elif cmp < 0:
            result, winnings = "lose", -bet
        else:
            result, winnings = "draw", 0
        return {
            "player_hole": player_hole,
            "dealer_hole": dealer_hole,
            "community_cards": community,
            "player_hand": player,
            "dealer_hand": dealer,
            "player_hand_name": player["name"],
            "dealer_hand_name": dealer["name"],
            "result": result,
            "winnings": winnings,
            "bet": bet,
        }


class PokerGame:
    """Full Texas Hold'em multi-round game ported from poker.js."""

    def __init__(self, blinds=(1, 2)):
        self.players: List[Dict] = []
        self.deck: List[dict] = []
        self.community_cards: List[dict] = []
        self.pot = 0
        self.current_bet = 0
        self.dealer_index = 0
        self.current_player_index = 0
        self.phase = "waiting"  # waiting/preflop/flop/turn/river/showdown/finished
        self.blinds = {"small": blinds[0], "big": blinds[1]}
        self.hand_number = 0
        self.history: List[dict] = []
        self.acted_this_round: set = set()
        self.logs: List[str] = []

    def add_player(self, pid: str, name: str, role: str, emoji: str, chips: int = 200) -> bool:
        if len(self.players) >= 6:
            return False
        p = PokerEngine.PERSONALITIES.get(role, PokerEngine.PERSONALITIES["coder"])
        self.players.append({
            "id": pid, "name": name, "role": role, "emoji": emoji,
            "chips": chips, "holeCards": [], "folded": False,
            "currentBet": 0, "allIn": False, "personality": p,
            "totalWon": 0, "handsWon": 0,
        })
        return True

    @property
    def active_players(self):
        return [p for p in self.players if not p["folded"] and p["chips"] > 0]

    def start_hand(self) -> dict:
        alive = [p for p in self.players if p["chips"] > 0]
        if len(alive) < 2:
            self.phase = "finished"
            return {"phase": "finished", "winner": alive[0]["name"] if alive else None}
        self.hand_number += 1
        self.deck = PokerEngine.create_deck()
        self.community_cards = []
        self.pot = 0
        self.current_bet = 0
        self.acted_this_round = set()
        for p in self.players:
            p["holeCards"] = []
            p["folded"] = p["chips"] <= 0
            p["currentBet"] = 0
            p["allIn"] = False
        # Move dealer
        for _ in range(len(self.players)):
            self.dealer_index = (self.dealer_index + 1) % len(self.players)
            if self.players[self.dealer_index]["chips"] > 0:
                break
        sb = self._next_active(self.dealer_index)
        bb = self._next_active(sb)
        self._post_blind(sb, self.blinds["small"])
        self._post_blind(bb, self.blinds["big"])
        self.current_bet = self.blinds["big"]
        for p in self.players:
            if not p["folded"]:
                p["holeCards"] = [self.deck.pop(0), self.deck.pop(0)]
        self.current_player_index = self._next_active(bb)
        self.phase = "preflop"
        return {"phase": "preflop", "hand": self.hand_number, "dealer": self.players[self.dealer_index]["name"]}

    def _post_blind(self, idx, amount):
        p = self.players[idx]
        actual = min(amount, p["chips"])
        p["chips"] -= actual
        p["currentBet"] = actual
        self.pot += actual
        if p["chips"] == 0:
            p["allIn"] = True

    def _next_active(self, from_idx):
        idx = (from_idx + 1) % len(self.players)
        for _ in range(len(self.players)):
            if not self.players[idx]["folded"] and self.players[idx]["chips"] > 0:
                return idx
            idx = (idx + 1) % len(self.players)
        return idx

    def make_ai_decision(self, player: dict) -> dict:
        p = player["personality"]
        strength = PokerEngine.hand_strength(player["holeCards"], self.community_cards)
        call_amount = self.current_bet - player["currentBet"]
        phase_bonus = {"preflop": 0.08, "flop": 0.05, "turn": 0.03, "river": 0}.get(self.phase, 0)
        play_threshold = p["tightness"] * 0.25 - phase_bonus
        is_bluffing = random.random() < p["bluffRate"]
        eff_strength = max(strength, 0.3 + random.random() * 0.3) if is_bluffing else strength
        pot_committed = player["currentBet"] > 0 and call_amount < player["chips"] * 0.3
        if eff_strength < play_threshold and not pot_committed:
            if call_amount == 0:
                return {"action": "check"}
            if call_amount <= self.blinds["big"] and random.random() < 0.4:
                return {"action": "call"}
            return {"action": "fold"}
        if call_amount == 0:
            if eff_strength > 0.4 or (is_bluffing and random.random() < p["aggression"]):
                ra = min(int(self.pot * (0.4 + p["aggression"] * 0.8)), player["chips"])
                if ra >= self.blinds["big"]:
                    return {"action": "raise", "amount": ra}
            return {"action": "check"}
        if eff_strength > 0.45 + (1 - p["aggression"]) * 0.2:
            ra = min(int(call_amount + self.pot * (0.4 + p["aggression"] * 0.6)), player["chips"])
            return {"action": "raise", "amount": ra}
        if eff_strength > play_threshold or pot_committed:
            return {"action": "call"}
        if call_amount <= self.blinds["big"] * 2 and random.random() < 0.6:
            return {"action": "call"}
        return {"action": "fold"} if call_amount > 0 else {"action": "check"}

    def execute_action(self, player_idx: int, decision: dict):
        p = self.players[player_idx]
        if p["folded"] or p["allIn"]:
            return
        action = decision["action"]
        if action == "fold":
            p["folded"] = True
        elif action == "call":
            call_amt = min(self.current_bet - p["currentBet"], p["chips"])
            p["chips"] -= call_amt
            p["currentBet"] += call_amt
            self.pot += call_amt
            if p["chips"] == 0:
                p["allIn"] = True
        elif action == "raise":
            ra = min(decision.get("amount", self.blinds["big"]), p["chips"])
            p["chips"] -= ra
            p["currentBet"] += ra
            self.pot += ra
            self.current_bet = p["currentBet"]
            if p["chips"] == 0:
                p["allIn"] = True
            self.acted_this_round = set()
        self.acted_this_round.add(p["id"])

    def step(self) -> dict:
        if self.phase in ("waiting", "finished"):
            return {"phase": self.phase}
        active = self.active_players
        if len(active) <= 1:
            if active:
                self._award_pot(active[0])
            return self._end_hand()
        needs_action = [p for p in active if not p["allIn"] and p["id"] not in self.acted_this_round]
        all_matched = all(p["currentBet"] == self.current_bet or p["allIn"] for p in active)
        non_allin = [p for p in active if not p["allIn"]]
        if not needs_action or (all_matched and len(self.acted_this_round) >= len(non_allin)):
            return self._next_phase()
        p = self.players[self.current_player_index]
        if not p["folded"] and not p["allIn"] and p["chips"] > 0:
            decision = self.make_ai_decision(p)
            self.execute_action(self.current_player_index, decision)
            self.logs.append(f"{p['emoji']} {p['name']}: {decision['action'].upper()}")
        self.current_player_index = self._next_active(self.current_player_index)
        return {"phase": self.phase, "pot": self.pot, "action": self.logs[-1] if self.logs else ""}

    def _next_phase(self) -> dict:
        for p in self.players:
            p["currentBet"] = 0
        self.current_bet = 0
        self.acted_this_round = set()
        if self.phase == "preflop":
            self.community_cards += [self.deck.pop(0) for _ in range(3)]
            self.phase = "flop"
        elif self.phase == "flop":
            self.community_cards.append(self.deck.pop(0))
            self.phase = "turn"
        elif self.phase == "turn":
            self.community_cards.append(self.deck.pop(0))
            self.phase = "river"
        elif self.phase == "river":
            return self._showdown()
        self.current_player_index = self._next_active(self.dealer_index)
        return {"phase": self.phase, "community": [f"{c['rank']}{c['suit']}" for c in self.community_cards]}

    def _showdown(self) -> dict:
        self.phase = "showdown"
        best_hand = None
        winner = None
        results = []
        for p in self.active_players:
            result = PokerEngine.evaluate_best(p["holeCards"], self.community_cards)
            p["_handResult"] = result
            results.append({"name": p["name"], "hand": result["name"], "cards": [f"{c['rank']}{c['suit']}" for c in p["holeCards"]]})
            if not best_hand or result["rank"] > best_hand["rank"] or (result["rank"] == best_hand["rank"] and PokerEngine.compare_kickers(result["kickers"], best_hand["kickers"]) > 0):
                best_hand = result
                winner = p
        if winner:
            self._award_pot(winner)
        return self._end_hand(results)

    def _award_pot(self, winner: dict):
        winner["chips"] += self.pot
        winner["totalWon"] += self.pot
        winner["handsWon"] += 1
        hand_name = winner.get("_handResult", {}).get("name", "Win")
        self.history.append({"hand": self.hand_number, "winner": winner["name"], "amount": self.pot, "handName": hand_name})

    def _end_hand(self, showdown_results=None) -> dict:
        alive = [p for p in self.players if p["chips"] > 0]
        if len(alive) < 2:
            self.phase = "finished"
            return {"phase": "finished", "winner": alive[0]["name"] if alive else None, "history": self.history}
        return {"phase": "hand_complete", "pot": self.pot, "showdown": showdown_results, "history": self.history[-3:]}

    def get_state(self) -> dict:
        return {
            "phase": self.phase, "pot": self.pot, "handNumber": self.hand_number,
            "communityCards": [f"{c['rank']}{c['suit']}" for c in self.community_cards],
            "players": [{"id": p["id"], "name": p["name"], "chips": p["chips"], "folded": p["folded"], "allIn": p["allIn"]} for p in self.players],
            "dealerIndex": self.dealer_index, "blinds": self.blinds, "history": self.history[-10:],
        }


class WeightedSlotMachine:
    SYMBOLS = [
        {"id": "cherry", "emoji": "🍒", "weight": 22, "name": "Cherry"},
        {"id": "lemon", "emoji": "🍋", "weight": 20, "name": "Lemon"},
        {"id": "orange", "emoji": "🍊", "weight": 18, "name": "Orange"},
        {"id": "star", "emoji": "⭐", "weight": 16, "name": "Star"},
        {"id": "seven", "emoji": "7️⃣", "weight": 12, "name": "Seven"},
        {"id": "diamond", "emoji": "💎", "weight": 8, "name": "Diamond"},
        {"id": "jackpot", "emoji": "🎰", "weight": 4, "name": "Jackpot"},
    ]
    PAYOUTS = {
        "jackpot-jackpot-jackpot": {"mul": 50, "name": "🎰 MEGA JACKPOT!"},
        "diamond-diamond-diamond": {"mul": 20, "name": "💎 Triple Diamond!"},
        "seven-seven-seven": {"mul": 15, "name": "7️⃣ Lucky Sevens!"},
        "star-star-star": {"mul": 10, "name": "⭐ Triple Star!"},
        "orange-orange-orange": {"mul": 5, "name": "🍊 Triple Orange!"},
        "lemon-lemon-lemon": {"mul": 4, "name": "🍋 Triple Lemon!"},
        "cherry-cherry-cherry": {"mul": 3, "name": "🍒 Triple Cherry!"},
    }
    TWO_KIND = {"jackpot": 5, "diamond": 3, "seven": 2.5, "star": 2, "orange": 1.5, "lemon": 1.2, "cherry": 1.1}
    BET_OPTIONS = [10, 25, 50, 100]

    @classmethod
    def spin(cls, bet: int) -> dict:
        reels = random.choices(cls.SYMBOLS, weights=[s["weight"] for s in cls.SYMBOLS], k=3)
        ids = [r["id"] for r in reels]
        key = "-".join(ids)
        payout = 0
        name = "No luck this time..."
        if key in cls.PAYOUTS:
            payout = bet * cls.PAYOUTS[key]["mul"]
            name = cls.PAYOUTS[key]["name"]
        else:
            counts: Dict[str, int] = {}
            for sym_id in ids:
                counts[sym_id] = counts.get(sym_id, 0) + 1
            pair_id = next((sid for sid, count in counts.items() if count >= 2), None)
            if pair_id:
                mul = cls.TWO_KIND.get(pair_id, 1)
                if mul > 1:
                    payout = int(bet * mul)
                    sym = next(s for s in cls.SYMBOLS if s["id"] == pair_id)
                    name = f"{sym['emoji']} Double {sym['name']}!"
        net_gain = payout - bet
        return {
            "reels": reels,
            "bet": bet,
            "payout": payout,
            "netGain": net_gain,
            "winnings": net_gain,
            "win": payout > 0,
            "name": name,
            "isJackpot": key == "jackpot-jackpot-jackpot",
            "jackpot": key == "jackpot-jackpot-jackpot",
        }

    @classmethod
    def payout_table(cls) -> List[dict]:
        table = []
        for key, val in cls.PAYOUTS.items():
            sym_id = key.split("-")[0]
            sym = next(s for s in cls.SYMBOLS if s["id"] == sym_id)
            table.append({"symbols": [sym, sym, sym], "multiplier": val["mul"], "name": val["name"]})
        for sym_id, mul in cls.TWO_KIND.items():
            sym = next(s for s in cls.SYMBOLS if s["id"] == sym_id)
            table.append({"symbols": [sym, sym, None], "multiplier": mul, "name": f"2x {sym['name']}"})
        return table


class GoldTrading:
    DEFAULT_PRICE = 2380.0
    SPREAD_PCT = 0.02
    USD_TO_COIN_RATE = 0.1
    MAX_HISTORY = 60

    def __init__(self, state: GameState):
        self.state = state
        if not hasattr(state, "gold_price") or state.gold_price in (None, 100.0):
            state.gold_price = self.DEFAULT_PRICE
        if not hasattr(state, "gold_history") or not state.gold_history:
            state.gold_history = [round(state.gold_price, 2)]
        if not hasattr(state, "gold_holdings"):
            state.gold_holdings = 0.0
        defaults = {
            "gold_open_price": state.gold_price,
            "gold_previous_close": state.gold_price,
            "gold_day_high": state.gold_price,
            "gold_day_low": state.gold_price,
            "gold_avg_buy_price": 0.0,
            "gold_total_buy_volume": 0.0,
            "gold_total_sell_volume": 0.0,
            "gold_realized_pnl": 0,
            "gold_total_invested": 0,
            "gold_trend": 0.0,
            "gold_trend_momentum": 0.0,
        }
        for attr, value in defaults.items():
            if not hasattr(state, attr):
                setattr(state, attr, value)

    @staticmethod
    def price_to_coins(usd_price: float) -> int:
        return int(usd_price * GoldTrading.USD_TO_COIN_RATE)

    @staticmethod
    def coins_to_price(coins: int) -> float:
        return coins / GoldTrading.USD_TO_COIN_RATE

    def get_cost_for_ounces(self, ounces: float) -> int:
        return self.price_to_coins(self.state.gold_price * ounces * (1 + self.SPREAD_PCT))

    MARKET_EVENTS = [
        {"id": "fed_rate", "name": "Fed tăng lãi suất", "impact": -0.02, "weight": 8},
        {"id": "inflation", "name": "Lạm phát tăng", "impact": 0.015, "weight": 10},
        {"id": "war_fear", "name": "Căng thẳng địa chính trị", "impact": 0.025, "weight": 5},
        {"id": "peace_deal", "name": "Thỏa thuận hòa bình", "impact": -0.015, "weight": 4},
        {"id": "dollar_weak", "name": "USD suy yếu", "impact": 0.02, "weight": 8},
        {"id": "dollar_strong", "name": "USD mạnh lên", "impact": -0.02, "weight": 8},
        {"id": "etf_demand", "name": "Nhu cầu ETF vàng tăng", "impact": 0.018, "weight": 7},
        {"id": "mine_closure", "name": "Mỏ vàng đóng cửa", "impact": 0.012, "weight": 5},
        {"id": "new_mine", "name": "Phát hiện mỏ vàng mới", "impact": -0.01, "weight": 4},
        {"id": "central_buy", "name": "NHTW mua vàng dự trữ", "impact": 0.02, "weight": 6},
        {"id": "recession_fear", "name": "Lo ngại suy thoái", "impact": 0.022, "weight": 7},
        {"id": "bull_market", "name": "Thị trường bull", "impact": 0.015, "weight": 6},
        {"id": "bear_market", "name": "Thị trường bear", "impact": -0.018, "weight": 6},
        {"id": "crypto_crash", "name": "Crypto sập giá", "impact": 0.01, "weight": 5},
    ]

    def tick(self):
        # Simplified geometric Brownian motion from gold-trading.js.
        base_vol = 0.15 / 100
        drift = self.state.gold_trend * 0.0003
        mean_price = 2400
        drift += (mean_price - self.state.gold_price) * 0.00005
        noise = (random.random() - 0.5) * 2 * base_vol * self.state.gold_price
        momentum = self.state.gold_trend_momentum * 0.3
        price_change = self.state.gold_price * drift + noise + momentum
        self.state.gold_trend_momentum = price_change * 0.1

        # Market events (14 types from gold-trading.js)
        market_event = None
        if random.random() < 0.03:
            event = random.choices(
                self.MARKET_EVENTS,
                weights=[e["weight"] for e in self.MARKET_EVENTS],
                k=1
            )[0]
            price_change += self.state.gold_price * event["impact"]
            market_event = event

        if random.random() < 0.05:
            self.state.gold_trend += (random.random() - 0.5) * 0.3
            self.state.gold_trend = max(-1, min(1, self.state.gold_trend))
        self.state.gold_price = max(1500, min(5000, round(self.state.gold_price + price_change, 2)))
        self.state.gold_day_high = max(self.state.gold_day_high, self.state.gold_price)
        self.state.gold_day_low = min(self.state.gold_day_low, self.state.gold_price)
        self.state.gold_history.append(round(self.state.gold_price, 2))
        self.state.gold_history = self.state.gold_history[-self.MAX_HISTORY:]
        result = round(self.state.gold_price, 2)
        if market_event:
            return {"price": result, "event": market_event}
        return result

    def buy_ounces(self, ounces: float, available_coins: int | None = None):
        ask_price = self.state.gold_price * (1 + self.SPREAD_PCT)
        cost = self.price_to_coins(ask_price * ounces)
        if available_coins is not None and (cost > available_coins or cost <= 0):
            return None
        total_cost_basis = self.state.gold_avg_buy_price * self.state.gold_holdings + self.state.gold_price * ounces
        self.state.gold_holdings += ounces
        self.state.gold_avg_buy_price = total_cost_basis / self.state.gold_holdings
        self.state.gold_total_buy_volume += ounces
        self.state.gold_total_invested += cost
        return {"type": "buy", "ounces": ounces, "price": self.state.gold_price, "costCoins": cost}

    def sell_ounces(self, ounces: float, max_ounces: float | None = None):
        allowed = self.state.gold_holdings if max_ounces is None else max_ounces
        actual_ounces = min(ounces, allowed, self.state.gold_holdings)
        if actual_ounces <= 0:
            return None
        bid_price = self.state.gold_price * (1 - self.SPREAD_PCT)
        revenue = self.price_to_coins(bid_price * actual_ounces)
        cost_basis = self.price_to_coins(self.state.gold_avg_buy_price * actual_ounces)
        profit = revenue - cost_basis
        self.state.gold_holdings -= actual_ounces
        self.state.gold_realized_pnl += profit
        self.state.gold_total_sell_volume += actual_ounces
        if self.state.gold_holdings < 0.0001:
            self.state.gold_holdings = 0.0
            self.state.gold_avg_buy_price = 0.0
        return {"type": "sell", "ounces": actual_ounces, "price": self.state.gold_price, "revenueCoins": revenue, "profit": profit}

    def buy(self, coins):
        ounces = coins / self.price_to_coins(self.state.gold_price * (1 + self.SPREAD_PCT))
        trade = self.buy_ounces(ounces, coins)
        if trade is None:
            return 0.0, "Not enough coins to buy gold"
        return round(trade["ounces"], 4), f"Bought {round(trade['ounces'], 4)} gold at {round(self.state.gold_price, 2)}Ⓒ/unit"

    def sell(self, gold):
        trade = self.sell_ounces(gold)
        if trade is None:
            return 0, "No gold to sell"
        return trade["revenueCoins"], f"Sold {trade['ounces']} gold for {trade['revenueCoins']}Ⓒ"

    def sell_all(self):
        return self.sell_ounces(self.state.gold_holdings)

    def get_unrealized_pnl(self) -> int:
        if self.state.gold_holdings <= 0:
            return 0
        current_value = self.price_to_coins(self.state.gold_price * self.state.gold_holdings)
        cost_basis = self.price_to_coins(self.state.gold_avg_buy_price * self.state.gold_holdings)
        return current_value - cost_basis

    def get_portfolio_value(self) -> int:
        return self.price_to_coins(self.state.gold_price * self.state.gold_holdings)

    def get_price_change(self) -> dict:
        change = self.state.gold_price - self.state.gold_previous_close
        pct = (change / self.state.gold_previous_close) * 100 if self.state.gold_previous_close else 0
        return {"change": round(change, 2), "pct": round(pct, 2)}

    def get_status(self):
        change = self.get_price_change()
        trend = "📈" if len(self.state.gold_history) > 1 and self.state.gold_history[-1] >= self.state.gold_history[-2] else "📉"
        return {
            "price": round(self.state.gold_price, 2),
            "openPrice": self.state.gold_open_price,
            "previousClose": self.state.gold_previous_close,
            "dayHigh": self.state.gold_day_high,
            "dayLow": self.state.gold_day_low,
            "change": change["change"],
            "pct": change["pct"],
            "goldHeld": self.state.gold_holdings,
            "avgBuyPrice": self.state.gold_avg_buy_price,
            "portfolioValue": self.get_portfolio_value(),
            "unrealizedPnL": self.get_unrealized_pnl(),
            "realizedPnL": self.state.gold_realized_pnl,
            "history": self.state.gold_history[-50:],
            "trend": trend,
        }




class BilliardsEngine:
    """Enhanced billiards engine with cushion physics, spin, foul detection.
    Ported from billiards.js for full parity."""

    TABLE_W = 300  # table width in physics units
    TABLE_H = 150  # table height in physics units
    BALL_RADIUS = 5
    FRICTION = 0.985  # velocity decay per physics step
    POCKET_RADIUS = 12  # pocket detection radius

    POCKETS = [
        (0, 0), (TABLE_W / 2, 0), (TABLE_W, 0),
        (0, TABLE_H), (TABLE_W / 2, TABLE_H), (TABLE_W, TABLE_H),
    ]

    PERSONALITIES = {
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
    STYLE_SPIN = {
        "precise": 0.3,
        "careful": 0.2,
        "analytical": 0.25,
        "creative": 0.5,
        "stable": 0.35,
        "thinking": 0.15,
        "calculated": 0.2,
        "defensive": 0.3,
        "systematic": 0.3,
        "adaptive": 0.35,
        "dramatic": 0.45,
    }

    @classmethod
    def _cushion_bounce(cls, x, y, vx, vy, spin_x=0.0, spin_y=0.0):
        """Apply cushion bounce physics with spin effect (angle reflection)."""
        import math
        bounced = False
        # Left/right cushion
        if x <= cls.BALL_RADIUS:
            vx = abs(vx) * 0.9
            vy += spin_y * 0.3  # spin alters trajectory after cushion hit
            x = cls.BALL_RADIUS + 0.1
            bounced = True
        elif x >= cls.TABLE_W - cls.BALL_RADIUS:
            vx = -abs(vx) * 0.9
            vy += spin_y * 0.3
            x = cls.TABLE_W - cls.BALL_RADIUS - 0.1
            bounced = True
        # Top/bottom cushion
        if y <= cls.BALL_RADIUS:
            vy = abs(vy) * 0.9
            vx += spin_x * 0.3
            y = cls.BALL_RADIUS + 0.1
            bounced = True
        elif y >= cls.TABLE_H - cls.BALL_RADIUS:
            vy = -abs(vy) * 0.9
            vx += spin_x * 0.3
            y = cls.TABLE_H - cls.BALL_RADIUS - 0.1
            bounced = True
        return x, y, vx, vy, bounced

    @classmethod
    def _check_pocket(cls, x, y):
        """Check if ball is in any pocket."""
        import math
        for px, py in cls.POCKETS:
            dist = math.sqrt((x - px) ** 2 + (y - py) ** 2)
            if dist < cls.POCKET_RADIUS:
                return True
        return False

    @classmethod
    def _ball_ball_collision(cls, b1, b2):
        """Elastic collision between two balls."""
        import math
        dx = b2["x"] - b1["x"]
        dy = b2["y"] - b1["y"]
        dist = math.sqrt(dx * dx + dy * dy)
        min_dist = cls.BALL_RADIUS * 2
        if dist < min_dist and dist > 0:
            # Normalize
            nx = dx / dist
            ny = dy / dist
            # Relative velocity
            dvx = b1["vx"] - b2["vx"]
            dvy = b1["vy"] - b2["vy"]
            dot = dvx * nx + dvy * ny
            if dot > 0:
                b1["vx"] -= dot * nx
                b1["vy"] -= dot * ny
                b2["vx"] += dot * nx
                b2["vy"] += dot * ny
                # Separate overlapping balls
                overlap = min_dist - dist
                b1["x"] -= overlap * 0.5 * nx
                b1["y"] -= overlap * 0.5 * ny
                b2["x"] += overlap * 0.5 * nx
                b2["y"] += overlap * 0.5 * ny
                return True
        return False

    @classmethod
    def _simulate_shot(cls, balls, cue_ball, power, accuracy, spin_x=0.0, spin_y=0.0):
        """Simulate a full physics shot with all balls moving simultaneously.
        Returns (pocketed_balls, foul_type, cue_pocketed)."""
        import math
        # Aim at nearest target ball (with accuracy jitter)
        target = None
        best_dist = float("inf")
        for b in balls:
            if b["pocketed"]:
                continue
            dist = math.sqrt((b["x"] - cue_ball["x"]) ** 2 + (b["y"] - cue_ball["y"]) ** 2)
            if dist < best_dist:
                best_dist = dist
                target = b

        if target:
            dx = target["x"] - cue_ball["x"]
            dy = target["y"] - cue_ball["y"]
            angle = math.atan2(dy, dx)
            # Accuracy jitter
            jitter = (1 - accuracy) * 0.4
            angle += random.uniform(-jitter, jitter)
        else:
            angle = random.uniform(0, 2 * math.pi)

        speed = power * 8 + random.uniform(0, 2)
        cue_ball["vx"] = math.cos(angle) * speed
        cue_ball["vy"] = math.sin(angle) * speed

        pocketed_this_shot = []
        cue_pocketed = False
        all_moving = [cue_ball] + [b for b in balls if not b["pocketed"]]

        # Physics loop (max 200 steps)
        for _ in range(200):
            any_moving = False
            for b in all_moving:
                if abs(b["vx"]) < 0.01 and abs(b["vy"]) < 0.01:
                    b["vx"] = b["vy"] = 0.0
                    continue
                any_moving = True
                b["x"] += b["vx"]
                b["y"] += b["vy"]
                b["vx"] *= cls.FRICTION
                b["vy"] *= cls.FRICTION
                # Cushion bounce with spin
                b["x"], b["y"], b["vx"], b["vy"], _ = cls._cushion_bounce(
                    b["x"], b["y"], b["vx"], b["vy"], spin_x, spin_y
                )
                # Pocket check
                if cls._check_pocket(b["x"], b["y"]):
                    if b is cue_ball:
                        cue_pocketed = True
                        b["vx"] = b["vy"] = 0.0
                        b["x"], b["y"] = cls.TABLE_W / 2, cls.TABLE_H / 2
                    elif not b.get("pocketed"):
                        b["pocketed"] = True
                        b["vx"] = b["vy"] = 0.0
                        pocketed_this_shot.append(b)

            # Ball-ball collisions
            for i, b1 in enumerate(all_moving):
                for b2 in all_moving[i + 1:]:
                    if b1.get("pocketed") or b2.get("pocketed"):
                        continue
                    cls._ball_ball_collision(b1, b2)

            if not any_moving:
                break

        return pocketed_this_shot, cue_pocketed

    @classmethod
    def simulate_match(cls, players: List[dict] | None = None, turns: int = 24) -> dict:
        """Simulate a full billiards match with physics, fouls, and 8-ball rules."""
        players = players or [
            {"id": "p1", "name": "Agent A", "role": "coder", "emoji": "\U0001f916"},
            {"id": "p2", "name": "Agent B", "role": "tester", "emoji": "\U0001f9ea"},
        ]
        # Setup balls
        balls = []
        for i in range(1, 16):
            balls.append({
                "number": i,
                "group": "solids" if i <= 7 else ("eight" if i == 8 else "stripes"),
                "pocketed": False,
                "x": 60 + (i % 5) * 15 + random.uniform(-3, 3),
                "y": 40 + (i // 5) * 20 + random.uniform(-3, 3),
                "vx": 0.0, "vy": 0.0,
            })
        cue_ball = {"x": cls.TABLE_W * 0.75, "y": cls.TABLE_H / 2, "vx": 0.0, "vy": 0.0}

        groups = {players[0]["id"]: None, players[1]["id"]: None}
        pocketed_by = {players[0]["id"]: [], players[1]["id"]: []}
        history = []
        fouls = {players[0]["id"]: 0, players[1]["id"]: 0}
        current = 0
        winner = None

        for turn in range(1, max(1, turns) + 1):
            player = players[current]
            persona = cls.PERSONALITIES.get(player.get("role"), cls.PERSONALITIES["coder"])
            spin = cls.STYLE_SPIN.get(persona.get("style"), 0.3)
            spin_x = random.uniform(-1, 1) * spin
            spin_y = random.uniform(-1, 1) * spin

            pocketed_balls, cue_pocketed = cls._simulate_shot(
                balls, cue_ball, persona["power"], persona["accuracy"], spin_x, spin_y
            )

            event = {
                "turn": turn, "playerId": player["id"], "player": player["name"],
                "made": len(pocketed_balls) > 0, "foul": False,
                "pocketed": [b["number"] for b in pocketed_balls],
            }

            # Foul: scratch (cue ball pocketed)
            if cue_pocketed:
                event["foul"] = True
                event["foulType"] = "scratch"
                fouls[player["id"]] += 1

            # Check 8-ball rules
            eight_pocketed = any(b["number"] == 8 for b in pocketed_balls)
            if eight_pocketed:
                my_group = groups.get(player["id"])
                my_balls_left = sum(1 for b in balls if b["group"] == my_group and not b["pocketed"]) if my_group else 7
                if my_balls_left > 0 or cue_pocketed:
                    # 8-ball foul: lose
                    event["foul"] = True
                    event["foulType"] = "8ball_foul"
                    winner = players[1 - current]
                    history.append(event)
                    break
                else:
                    # Legal 8-ball pocket: win!
                    winner = player
                    history.append(event)
                    break

            # Assign groups on first pocket (excluding 8-ball)
            if not event["foul"] and pocketed_balls:
                for b in pocketed_balls:
                    if b["number"] == 8:
                        continue
                    if groups[player["id"]] is None:
                        ball_group = b["group"]
                        groups[player["id"]] = ball_group
                        groups[players[1 - current]["id"]] = "stripes" if ball_group == "solids" else "solids"
                    pocketed_by[player["id"]].append(b["number"])

            history.append(event)

            # Switch turns if foul or no ball pocketed
            if event["foul"] or not pocketed_balls:
                current = 1 - current

        if winner is None:
            winner = max(players, key=lambda p: len(pocketed_by[p["id"]]))

        table = {
            "solids": [b["number"] for b in balls if b["group"] == "solids" and b["pocketed"]],
            "stripes": [b["number"] for b in balls if b["group"] == "stripes" and b["pocketed"]],
            "eight_pocketed": any(b["number"] == 8 and b["pocketed"] for b in balls),
        }

        return {
            "winner": winner, "turns": len(history), "groups": groups,
            "pocketed": pocketed_by, "history": history[-20:], "table": table,
            "fouls": fouls,
        }


class CafeEngine:
    RECIPES = [
        {"id": "espresso", "emoji": "☕", "name": "Espresso", "difficulty": 0.35, "baseMul": 2, "targetSize": 0.30},
        {"id": "latte", "emoji": "🥛", "name": "Latte", "difficulty": 0.40, "baseMul": 2.5, "targetSize": 0.26},
        {"id": "cappuccino", "emoji": "☕", "name": "Cappuccino", "difficulty": 0.45, "baseMul": 3, "targetSize": 0.22},
        {"id": "mocha", "emoji": "🍫", "name": "Mocha", "difficulty": 0.50, "baseMul": 3.5, "targetSize": 0.20},
        {"id": "matcha", "emoji": "🍵", "name": "Matcha Latte", "difficulty": 0.55, "baseMul": 4, "targetSize": 0.18},
        {"id": "boba", "emoji": "🧋", "name": "Trà Sữa Trân Châu", "difficulty": 0.60, "baseMul": 5, "targetSize": 0.15},
    ]

    @staticmethod
    def rating(accuracy: float) -> dict:
        if accuracy >= 0.90: return {"text": "PERFECT!", "stars": 3}
        if accuracy >= 0.60: return {"text": "GREAT!", "stars": 2}
        if accuracy >= 0.30: return {"text": "OK", "stars": 1}
        return {"text": "MISS...", "stars": 0}

    @classmethod
    def play(cls, bet: int, recipe_id: str = "espresso", stops: List[float] | None = None) -> dict:
        recipe = next((r for r in cls.RECIPES if r["id"] == recipe_id), cls.RECIPES[0])
        accuracies = []
        targets = []
        stops = stops or [random.random(), random.random(), random.random()]
        for step in range(3):
            target_size = recipe["targetSize"] * (1 - step * 0.05)
            target_start = 0.15 + random.random() * (0.7 - target_size)
            target_end = target_start + target_size
            pos = max(0.0, min(1.0, float(stops[step])))
            center = (target_start + target_end) / 2
            half = (target_end - target_start) / 2
            if target_start <= pos <= target_end:
                accuracy = 1 - abs(pos - center) / half
            else:
                dist = target_start - pos if pos < target_start else pos - target_end
                accuracy = max(0, -dist * 3)
            accuracies.append(round(accuracy, 3))
            targets.append({"start": round(target_start, 3), "end": round(target_end, 3), "stop": pos})
        stars = sum(cls.rating(a)["stars"] for a in accuracies)
        avg = sum(accuracies) / len(accuracies)
        perfect = stars == 9
        if stars >= 7:
            payout = int(bet * recipe["baseMul"] * (1 + avg))
            name = ("⭐ PERFECT " if perfect else "✨ Tuyệt vời! ") + recipe["name"]
        elif stars >= 4:
            payout, name = int(bet * 1.5), f"👍 {recipe['name']} tạm ổn"
        elif stars >= 2:
            payout, name = int(bet * 0.5), f"😅 {recipe['name']} hơi tệ..."
        else:
            payout, name = 0, "💔 Hỏng rồi! Khách trả lại..."
        return {"recipe": recipe, "bet": bet, "payout": payout, "netGain": payout - bet, "win": payout > bet, "name": name, "isPerfect": perfect, "totalStars": stars, "maxStars": 9, "avgAccuracy": avg, "stepResults": accuracies, "targets": targets}


class FishingEngine:
    FISH_TYPES = [
        {"name": "Cá Rô", "emoji": "🐟", "weight": [0.2, 1.5], "value": 1.2, "rate": 30, "difficulty": 1},
        {"name": "Cá Chép", "emoji": "🐠", "weight": [0.5, 3.0], "value": 1.8, "rate": 25, "difficulty": 2},
        {"name": "Cá Trê", "emoji": "🐡", "weight": [0.3, 2.0], "value": 1.5, "rate": 20, "difficulty": 2},
        {"name": "Cá Lóc", "emoji": "🐟", "weight": [1.0, 5.0], "value": 2.5, "rate": 12, "difficulty": 3},
        {"name": "Cá Koi", "emoji": "🎏", "weight": [0.5, 4.0], "value": 4.0, "rate": 6, "difficulty": 3},
        {"name": "Cá Vàng", "emoji": "✨", "weight": [0.1, 0.5], "value": 6.0, "rate": 4, "difficulty": 4},
        {"name": "Rùa Vàng", "emoji": "🐢", "weight": [2.0, 8.0], "value": 10.0, "rate": 2, "difficulty": 5},
        {"name": "Cá Rồng", "emoji": "🐉", "weight": [3.0, 12.0], "value": 20.0, "rate": 1, "difficulty": 5},
    ]

    @classmethod
    def pick_fish(cls) -> dict:
        fish = random.choices(cls.FISH_TYPES, weights=[f["rate"] for f in cls.FISH_TYPES], k=1)[0].copy()
        fish["actualWeight"] = round(random.uniform(fish["weight"][0], fish["weight"][1]), 1)
        return fish

    @classmethod
    def play(cls, bet: int, skill: float = 0.65) -> dict:
        fish = cls.pick_fish()
        catch_chance = max(0.08, min(0.95, skill - fish["difficulty"] * 0.08 + random.random() * 0.25))
        won = random.random() < catch_chance
        payout = round(bet * fish["value"] * (1 + fish["actualWeight"] * 0.2)) if won else 0
        return {"win": won, "bet": bet, "payout": payout, "netGain": payout - bet, "fish": {"name": fish["name"], "emoji": fish["emoji"], "weight": fish["actualWeight"], "difficulty": fish["difficulty"]}, "escaped": not won}




class FighterEngine:
    ROSTER = [
        {"id": "pixel_ryu", "name": "PixelRyu", "hp": 100, "atk": 12, "def": 5, "spd": 3, "special": "Hadouken", "specialDmg": 25, "emoji": "🥊"},
        {"id": "cyber_ken", "name": "CyberKen", "hp": 95, "atk": 14, "def": 4, "spd": 4, "special": "Shoryuken", "specialDmg": 30, "emoji": "⚡"},
        {"id": "nano_chun", "name": "NanoChun", "hp": 90, "atk": 10, "def": 6, "spd": 5, "special": "Lightning Kick", "specialDmg": 22, "emoji": "👢"},
        {"id": "robo_zang", "name": "RoboZang", "hp": 120, "atk": 16, "def": 8, "spd": 2, "special": "Pile Driver", "specialDmg": 35, "emoji": "🦿"},
        {"id": "ghost_vega", "name": "GhostVega", "hp": 85, "atk": 13, "def": 3, "spd": 6, "special": "Shadow Claw", "specialDmg": 28, "emoji": "👻"},
        {"id": "iron_sagat", "name": "IronSagat", "hp": 110, "atk": 15, "def": 7, "spd": 2, "special": "Tiger Shot", "specialDmg": 32, "emoji": "🐯"},
    ]

    @classmethod
    def play(cls, bet: int, fighter_id: str = "pixel_ryu") -> dict:
        player = next((f.copy() for f in cls.ROSTER if f["id"] == fighter_id), cls.ROSTER[0].copy())
        enemy = random.choice([f.copy() for f in cls.ROSTER if f["id"] != player["id"]])
        player_wins = enemy_wins = 0
        rounds = []
        for round_no in range(1, 4):
            p_hp, e_hp = player["hp"], enemy["hp"]
            log = []
            for tick in range(60):
                p_special = random.random() < 0.08
                p_damage = player["specialDmg"] if p_special else int(player["atk"] * random.uniform(0.8, 1.3))
                e_hp -= max(1, p_damage - int(enemy["def"] * 0.3))
                log.append({"by": player["name"], "special": p_special, "enemyHp": max(0, e_hp)})
                if e_hp <= 0: break
                e_special = random.random() < 0.08
                e_damage = enemy["specialDmg"] if e_special else int(enemy["atk"] * random.uniform(0.8, 1.3))
                p_hp -= max(1, e_damage - int(player["def"] * 0.3))
                if p_hp <= 0: break
            round_winner = "player" if p_hp >= e_hp else "enemy"
            if round_winner == "player": player_wins += 1
            else: enemy_wins += 1
            rounds.append({"round": round_no, "winner": round_winner, "playerHp": max(0, p_hp), "enemyHp": max(0, e_hp), "log": log[-8:]})
            if player_wins >= 2 or enemy_wins >= 2: break
        win = player_wins > enemy_wins
        perfect = win and all(r["winner"] == "player" and r["playerHp"] == player["hp"] for r in rounds)
        payout = int(bet * (2.5 if not perfect else 3.0)) if win else 0
        return {"win": win, "bet": bet, "payout": payout, "netGain": payout - bet, "playerWins": player_wins, "enemyWins": enemy_wins, "playerName": player["name"], "enemyName": enemy["name"], "perfect": perfect, "rounds": rounds}


class FlappyHeliEngine:
    @staticmethod
    def payout_for_score(score: int, bet: int) -> Tuple[int, str, bool]:
        if score >= 30: return bet * 8, "🏆 LEGENDARY PILOT!", True
        if score >= 20: return bet * 5, "⭐ ACE PILOT!", True
        if score >= 15: return bet * 3, "✈️ Pro Pilot!", True
        if score >= 10: return bet * 2, "🚁 Tốt lắm!", True
        if score >= 5:
            payout = int(bet * 1.2)
            return payout, "👍 Khá ổn!", payout > bet
        return 0, f"💥 Rơi rồi! -{bet}Ⓒ", False

    @classmethod
    def play(cls, bet: int, skill: float = 0.55) -> dict:
        score = 0
        pipe_gap = 90
        speed = 2.0
        while True:
            survive = max(0.05, min(0.96, skill + pipe_gap / 220 - speed / 12 - score * 0.008))
            if random.random() > survive:
                break
            score += 1
            if score % 5 == 0 and pipe_gap > 58: pipe_gap -= 3
            if score % 3 == 0 and speed < 4.0: speed += 0.1
            if score >= 45:
                break
        payout, name, win = cls.payout_for_score(score, bet)
        return {"score": score, "bet": bet, "payout": payout, "netGain": payout - bet, "win": win, "name": name, "isLegendary": score >= 30, "isPerfect": score >= 20}


class RoadRacerEngine:
    @staticmethod
    def payout_for_score(score: int, bet: int) -> Tuple[int, str, bool]:
        if score >= 80: return bet * 8, "🏆 LEGEND!", True
        if score >= 50: return bet * 5, "⭐ ACE DRIVER!", True
        if score >= 30: return bet * 3, "🏎️ Pro Racer!", True
        if score >= 20: return bet * 2, "🚗 Tốt lắm!", True
        if score >= 10:
            payout = int(bet * 1.2)
            return payout, "👍 Khá ổn!", payout > bet
        return 0, f"💥 Tai nạn! -{bet}Ⓒ", False

    @classmethod
    def play(cls, bet: int, skill: float = 0.55) -> dict:
        score = 0
        road_speed = 3.0
        spawn_interval = 70
        coins = 0
        while True:
            survive = max(0.04, min(0.97, skill + spawn_interval / 180 - road_speed / 14 - score * 0.004))
            if random.random() > survive:
                break
            score += 1
            if random.random() < 0.16:
                coins += 1
                score += 2
            if score % 8 == 0 and road_speed < 7: road_speed += 0.15
            if score % 10 == 0 and spawn_interval > 28: spawn_interval -= 3
            if score >= 120:
                break
        payout, name, win = cls.payout_for_score(score, bet)
        return {"score": score, "bet": bet, "payout": payout, "netGain": payout - bet, "win": win, "name": name, "coinsCollected": coins}


class MiniGameTracker:
    def __init__(self, game_state: GameState):
        self.state = game_state
        self.gold_trading = GoldTrading(game_state)
        for attr, default in {
            "mini_game_history": [],
            "slot_stats": {"totalSpins": 0, "totalWon": 0, "totalLost": 0, "history": []},
            "cafe_stats": {"totalGames": 0, "totalWon": 0, "totalLost": 0, "perfectDrinks": 0, "history": []},
            "fishing_stats": {"totalGames": 0, "totalCaught": 0, "totalWon": 0, "totalLost": 0, "bestCatch": None, "inventory": []},
            "billiards_stats": {"totalGames": 0, "wins": 0, "history": []},
            "fighter_stats": {"totalGames": 0, "totalWon": 0, "totalLost": 0, "history": []},
            "flappy_stats": {"totalGames": 0, "totalWon": 0, "totalLost": 0, "highScore": 0, "history": []},
            "racer_stats": {"totalGames": 0, "totalWon": 0, "totalLost": 0, "highScore": 0, "coinsCollected": 0, "history": []},
        }.items():
            if not hasattr(game_state, attr):
                setattr(game_state, attr, default.copy() if isinstance(default, dict) else list(default))

    def _record_history(self, game: str, result: dict) -> None:
        entry = {"game": game, "time": time.time(), "result": result}
        self.state.mini_game_history.append(entry)
        self.state.mini_game_history = self.state.mini_game_history[-100:]

    def record_score(self, game, score):
        best = self.state.mini_game_scores.get(game, 0)
        is_new = score > best
        if is_new:
            self.state.mini_game_scores[game] = score
        return {"game": game, "score": score, "best_score": max(score, best), "is_new_record": is_new}

    def play_poker(self, bet):
        if bet <= 0 or bet > self.state.coins:
            return {"error": "Invalid bet"}
        result = PokerEngine.play_round(int(bet))
        self.state.mini_game_flags["poker_played"] = True
        self.state.coins += result["winnings"]
        if result["winnings"] > 0:
            self.state.total_earned += result["winnings"]
        else:
            self.state.total_spent += abs(result["winnings"])
        self._record_history("poker", result)
        return result

    def play_slots(self, bet):
        if bet <= 0 or bet > self.state.coins:
            return {"error": "Invalid bet"}
        result = WeightedSlotMachine.spin(int(bet))
        self.state.coins += result["winnings"]
        stats = self.state.slot_stats
        stats["totalSpins"] = stats.get("totalSpins", 0) + 1
        if result["win"]:
            stats["totalWon"] = stats.get("totalWon", 0) + result["payout"]
            self.state.total_earned += result["payout"]
            if result.get("jackpot") or result["winnings"] > 0:
                self.state.mini_game_flags["slot_won"] = True
        else:
            stats["totalLost"] = stats.get("totalLost", 0) + int(bet)
            self.state.total_spent += int(bet)
        stats.setdefault("history", []).insert(0, result)
        stats["history"] = stats["history"][:10]
        self._record_history("slots", result)
        return result

    def buy_gold(self, coins):
        if coins <= 0 or coins > self.state.coins:
            return {"error": "Invalid amount"}
        self.state.coins -= coins
        self.state.total_spent += coins
        amount, msg = self.gold_trading.buy(coins)
        self.state.gold_holdings += amount
        self.state.mini_game_flags["gold_traded"] = True
        result = {"gold_bought": amount, "gold_holdings": round(self.state.gold_holdings, 4), "message": msg, **self.gold_trading.get_status()}
        self._record_history("gold_buy", result)
        return result

    def sell_gold(self, amount):
        if amount <= 0 or amount > self.state.gold_holdings:
            return {"error": "Invalid amount"}
        self.state.gold_holdings -= amount
        coins, msg = self.gold_trading.sell(amount)
        self.state.coins += coins
        self.state.total_earned += coins
        self.state.mini_game_flags["gold_traded"] = True
        result = {"coins_earned": coins, "gold_holdings": round(self.state.gold_holdings, 4), "message": msg, **self.gold_trading.get_status()}
        self._record_history("gold_sell", result)
        return result

    def play_billiards(self, players=None, turns=24):
        result = BilliardsEngine.simulate_match(players, int(turns))
        stats = self.state.billiards_stats
        stats["totalGames"] = stats.get("totalGames", 0) + 1
        stats["wins"] = stats.get("wins", 0) + 1
        stats.setdefault("history", []).insert(0, result)
        stats["history"] = stats["history"][:10]
        self.state.mini_game_flags["billiards_played"] = True
        self._record_history("billiards", result)
        return result

    def play_cafe(self, bet, recipe="espresso", stops=None):
        if bet <= 0 or bet > self.state.coins:
            return {"error": "Invalid bet"}
        result = CafeEngine.play(int(bet), recipe, stops)
        self.state.coins += result["netGain"]
        stats = self.state.cafe_stats
        stats["totalGames"] = stats.get("totalGames", 0) + 1
        if result["win"]:
            stats["totalWon"] = stats.get("totalWon", 0) + result["payout"]
            self.state.total_earned += result["payout"]
        else:
            stats["totalLost"] = stats.get("totalLost", 0) + int(bet)
            self.state.total_spent += int(bet)
        if result["isPerfect"]:
            stats["perfectDrinks"] = stats.get("perfectDrinks", 0) + 1
            self.state.mini_game_flags["cafe_perfect"] = True
        stats.setdefault("history", []).insert(0, result)
        stats["history"] = stats["history"][:10]
        self._record_history("cafe", result)
        return result

    def play_fishing(self, bet, skill=0.65):
        if bet <= 0 or bet > self.state.coins:
            return {"error": "Invalid bet"}
        result = FishingEngine.play(int(bet), float(skill))
        self.state.coins += result["netGain"]
        stats = self.state.fishing_stats
        stats["totalGames"] = stats.get("totalGames", 0) + 1
        if result["win"]:
            stats["totalCaught"] = stats.get("totalCaught", 0) + 1
            stats["totalWon"] = stats.get("totalWon", 0) + result["payout"]
            self.state.total_earned += result["payout"]
            catch = {"name": result["fish"]["name"], "weight": result["fish"]["weight"], "value": result["payout"]}
            stats.setdefault("inventory", []).append(catch)
            if not stats.get("bestCatch") or result["payout"] > stats["bestCatch"].get("value", 0):
                stats["bestCatch"] = catch
            self.state.mini_game_flags["fish_caught"] = True
        else:
            stats["totalLost"] = stats.get("totalLost", 0) + int(bet)
            self.state.total_spent += int(bet)
        self._record_history("fishing", result)
        return result

    def submit_fishing_result(self, bet, fish_name, won, weight=0.0):
        if bet <= 0 or bet > self.state.coins:
            return {"error": "Invalid bet"}
        
        # Calculate payout
        payout = 0
        fish_data = None
        for f in FishingEngine.FISH_TYPES:
            if f["name"] == fish_name:
                fish_data = f
                break
        
        if won and fish_data:
            payout = round(bet * fish_data["value"] * (1 + weight * 0.2))
            
        result = {
            "win": won,
            "bet": bet,
            "payout": payout,
            "netGain": payout - bet,
            "fish": {"name": fish_name, "weight": weight, "color": fish_data["color"] if fish_data else "#FFFFFF", "emoji": fish_data["emoji"] if fish_data else "🐟"} if won else None
        }
        
        self.state.coins += result["netGain"]
        stats = self.state.fishing_stats
        stats["totalGames"] = stats.get("totalGames", 0) + 1
        if won:
            stats["totalCaught"] = stats.get("totalCaught", 0) + 1
            stats["totalWon"] = stats.get("totalWon", 0) + payout
            self.state.total_earned += payout
            catch = {"name": fish_name, "weight": weight, "value": payout}
            stats.setdefault("inventory", []).append(catch)
            if not stats.get("bestCatch") or payout > stats["bestCatch"].get("value", 0):
                stats["bestCatch"] = catch
            self.state.mini_game_flags["fish_caught"] = True
        else:
            stats["totalLost"] = stats.get("totalLost", 0) + int(bet)
            self.state.total_spent += int(bet)
            
        self._record_history("fishing", result)
        return result


    def play_fighter(self, bet, fighter="pixel_ryu"):
        if bet <= 0 or bet > self.state.coins:
            return {"error": "Invalid bet"}
        result = FighterEngine.play(int(bet), fighter)
        self.state.coins += result["netGain"]
        self._apply_arcade_stats("fighter_stats", "fighter", result, high_score_key=None)
        if result["win"]:
            self.state.mini_game_flags["fighter_won"] = True
        return result

    def submit_fighter_result(self, bet, fighter_id, won, perfect):
        if bet <= 0 or bet > self.state.coins:
            return {"error": "Invalid bet"}
        
        payout = 0
        if won:
            perfBonus = 2 if perfect else 1
            payout = int(bet * (2 + perfBonus * 0.5))
            
        result = {
            "win": won,
            "bet": bet,
            "payout": payout,
            "netGain": payout - bet,
            "fighter": fighter_id,
            "perfect": perfect
        }
        
        self.state.coins += result["netGain"]
        self._apply_arcade_stats("fighter_stats", "fighter", result, high_score_key=None)
        if won:
            self.state.mini_game_flags["fighter_won"] = True
            
        return result


    def play_flappy(self, bet, skill=0.55):
        if bet <= 0 or bet > self.state.coins:
            return {"error": "Invalid bet"}
        result = FlappyHeliEngine.play(int(bet), float(skill))
        self.state.coins += result["netGain"]
        self._apply_arcade_stats("flappy_stats", "flappy", result, high_score_key="score")
        if result.get("isLegendary"):
            self.state.mini_game_flags["flappy_legendary"] = True
        return result

    def play_racer(self, bet, skill=0.55):
        if bet <= 0 or bet > self.state.coins:
            return {"error": "Invalid bet"}
        result = RoadRacerEngine.play(int(bet), float(skill))
        self.state.coins += result["netGain"]
        stats = self._apply_arcade_stats("racer_stats", "road_racer", result, high_score_key="score")
        stats["coinsCollected"] = stats.get("coinsCollected", 0) + result.get("coinsCollected", 0)
        if result["score"] >= 80:
            self.state.mini_game_flags["racer_legend"] = True
        return result

    def submit_flappy_score(self, bet, score):
        if bet <= 0 or bet > self.state.coins:
            return {"error": "Invalid bet"}
        payout, name, win = FlappyHeliEngine.payout_for_score(int(score), int(bet))
        result = {"score": score, "bet": bet, "payout": payout, "netGain": payout - bet, "win": win, "name": name, "isLegendary": score >= 30, "isPerfect": score >= 20}
        self.state.coins += result["netGain"]
        self._apply_arcade_stats("flappy_stats", "flappy", result, high_score_key="score")
        if result.get("isLegendary"):
            self.state.mini_game_flags["flappy_legendary"] = True
        return result

    def submit_racer_score(self, bet, score, coins):
        if bet <= 0 or bet > self.state.coins:
            return {"error": "Invalid bet"}
        payout, name, win = RoadRacerEngine.payout_for_score(int(score), int(bet))
        result = {"score": score, "bet": bet, "payout": payout, "netGain": payout - bet, "win": win, "name": name, "coinsCollected": coins}
        self.state.coins += result["netGain"]
        stats = self._apply_arcade_stats("racer_stats", "road_racer", result, high_score_key="score")
        stats["coinsCollected"] = stats.get("coinsCollected", 0) + coins
        if result["score"] >= 80:
            self.state.mini_game_flags["racer_legend"] = True
        return result


    def _apply_arcade_stats(self, stat_attr: str, game: str, result: dict, high_score_key: str | None = "score"):
        stats = getattr(self.state, stat_attr)
        stats["totalGames"] = stats.get("totalGames", 0) + 1
        if result.get("win"):
            stats["totalWon"] = stats.get("totalWon", 0) + result.get("payout", 0)
            self.state.total_earned += result.get("payout", 0)
        else:
            stats["totalLost"] = stats.get("totalLost", 0) + result.get("bet", 0)
            self.state.total_spent += result.get("bet", 0)
        if high_score_key:
            stats["highScore"] = max(stats.get("highScore", 0), result.get(high_score_key, 0))
            result["highScore"] = stats["highScore"]
        stats.setdefault("history", []).insert(0, result)
        stats["history"] = stats["history"][:10]
        self._record_history(game, result)
        return stats

    def get_slot_stats(self):
        stats = self.state.slot_stats
        spins = stats.get("totalSpins", 0)
        recent = stats.get("history", [])
        wins = len([r for r in recent if r.get("win")])
        return {**stats, "netProfit": stats.get("totalWon", 0) - stats.get("totalLost", 0), "winRate": round((wins / min(len(recent), 10) * 100), 0) if spins and recent else 0, "payoutTable": WeightedSlotMachine.payout_table()}

    def get_all_scores(self):
        return {
            "scores": self.state.mini_game_scores,
            "gold": {"holdings": round(self.state.gold_holdings, 4), **self.gold_trading.get_status()},
            "slots": self.get_slot_stats(),
            "cafe": self.state.cafe_stats,
            "fishing": self.state.fishing_stats,
            "billiards": self.state.billiards_stats,
            "fighter": self.state.fighter_stats,
            "flappy": self.state.flappy_stats,
            "road_racer": self.state.racer_stats,
            "history": self.state.mini_game_history[-20:],
        }
