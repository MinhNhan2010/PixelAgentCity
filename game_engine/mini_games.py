"""
mini_games.py — Mini-Game Server Logic
========================================
Poker, Slots, Gold Trading scoring and validation.
"""

import random
import time
from typing import Dict, List, Tuple
from .models import GameState


class PokerEngine:
    SUITS = ["♠", "♥", "♦", "♣"]
    RANKS = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"]

    @staticmethod
    def create_deck():
        deck = []
        for suit in PokerEngine.SUITS:
            for i, rank in enumerate(PokerEngine.RANKS):
                deck.append({"suit": suit, "rank": rank, "value": i + 2})
        random.shuffle(deck)
        return deck

    @staticmethod
    def evaluate_hand(cards):
        if len(cards) < 5:
            return 0, "Invalid"
        values = sorted([c["value"] for c in cards], reverse=True)
        suits = [c["suit"] for c in cards]
        is_flush = len(set(suits)) == 1
        is_straight = (values[0] - values[4] == 4 and len(set(values)) == 5)
        if set(values) == {14, 5, 4, 3, 2}:
            is_straight = True
        freq = {}
        for v in values:
            freq[v] = freq.get(v, 0) + 1
        counts = sorted(freq.values(), reverse=True)
        if is_straight and is_flush:
            return (9 if values[0] == 14 else 8), ("Royal Flush" if values[0] == 14 else "Straight Flush")
        if counts == [4, 1]: return 7, "Four of a Kind"
        if counts == [3, 2]: return 6, "Full House"
        if is_flush: return 5, "Flush"
        if is_straight: return 4, "Straight"
        if counts == [3, 1, 1]: return 3, "Three of a Kind"
        if counts == [2, 2, 1]: return 2, "Two Pair"
        if counts == [2, 1, 1, 1]: return 1, "Pair"
        return 0, "High Card"

    @staticmethod
    def play_round(bet):
        deck = PokerEngine.create_deck()
        ph, dh = deck[:5], deck[5:10]
        ps, pn = PokerEngine.evaluate_hand(ph)
        ds, dn = PokerEngine.evaluate_hand(dh)
        if ps > ds: result, winnings = "win", bet * (ps + 1)
        elif ps < ds: result, winnings = "lose", -bet
        else: result, winnings = "draw", 0
        return {"player_hand": ph, "dealer_hand": dh, "player_hand_name": pn,
                "dealer_hand_name": dn, "result": result, "winnings": winnings, "bet": bet}


class SlotMachine:
    SYMBOLS = ["🍒","🍋","🍊","🍇","⭐","💎","7️⃣"]
    PAYOUTS = {"🍒🍒🍒":5,"🍋🍋🍋":8,"🍊🍊🍊":10,"🍇🍇🍇":15,"⭐⭐⭐":25,"💎💎💎":50,"7️⃣7️⃣7️⃣":100}

    @staticmethod
    def spin(bet):
        reels = [random.choice(SlotMachine.SYMBOLS) for _ in range(3)]
        combo = "".join(reels)
        mul = SlotMachine.PAYOUTS.get(combo, 0)
        if mul == 0 and (reels[0]==reels[1] or reels[1]==reels[2]): mul = 2
        elif mul == 0 and reels[0]==reels[2]: mul = 1
        winnings = bet * mul - bet if mul > 0 else -bet
        return {"reels": reels, "multiplier": mul, "winnings": winnings, "bet": bet, "jackpot": mul >= 50}


class GoldTrading:
    def __init__(self):
        self.price = 100.0
        self.history = [100.0]
    def tick(self):
        change = random.gauss(0, 0.05)
        if self.price > 150: change -= 0.02
        elif self.price < 50: change += 0.02
        self.price = max(10, min(500, self.price * (1 + change)))
        self.history.append(round(self.price, 2))
        if len(self.history) > 100: self.history = self.history[-100:]
        return round(self.price, 2)
    def buy(self, coins):
        amt = coins / self.price
        return round(amt, 4), f"Bought {round(amt,4)} gold at {round(self.price,2)}Ⓒ/unit"
    def sell(self, gold):
        coins = int(gold * self.price)
        return coins, f"Sold {gold} gold for {coins}Ⓒ"
    def get_status(self):
        trend = "📈" if len(self.history)>1 and self.price > self.history[-2] else "📉"
        return {"price": round(self.price,2), "history": self.history[-50:], "trend": trend}


class MiniGameTracker:
    def __init__(self, game_state: GameState):
        self.state = game_state
        self.gold_trading = GoldTrading()
        self.gold_holdings = 0.0

    def record_score(self, game, score):
        best = self.state.mini_game_scores.get(game, 0)
        is_new = score > best
        if is_new: self.state.mini_game_scores[game] = score
        return {"game": game, "score": score, "best_score": max(score, best), "is_new_record": is_new}

    def play_poker(self, bet):
        if bet <= 0 or bet > self.state.coins: return {"error": "Invalid bet"}
        r = PokerEngine.play_round(bet)
        self.state.coins += r["winnings"]
        if r["winnings"] > 0: self.state.total_earned += r["winnings"]
        else: self.state.total_spent += abs(r["winnings"])
        return r

    def play_slots(self, bet):
        if bet <= 0 or bet > self.state.coins: return {"error": "Invalid bet"}
        r = SlotMachine.spin(bet)
        self.state.coins += r["winnings"]
        if r["winnings"] > 0: self.state.total_earned += r["winnings"]
        else: self.state.total_spent += abs(r["winnings"])
        return r

    def buy_gold(self, coins):
        if coins <= 0 or coins > self.state.coins: return {"error": "Invalid amount"}
        self.state.coins -= coins
        self.state.total_spent += coins
        amt, msg = self.gold_trading.buy(coins)
        self.gold_holdings += amt
        return {"gold_bought": amt, "gold_holdings": round(self.gold_holdings,4), "message": msg, **self.gold_trading.get_status()}

    def sell_gold(self, amount):
        if amount <= 0 or amount > self.gold_holdings: return {"error": "Invalid amount"}
        self.gold_holdings -= amount
        coins, msg = self.gold_trading.sell(amount)
        self.state.coins += coins
        self.state.total_earned += coins
        return {"coins_earned": coins, "gold_holdings": round(self.gold_holdings,4), "message": msg, **self.gold_trading.get_status()}

    def get_all_scores(self):
        return {"scores": self.state.mini_game_scores, "gold": {"holdings": round(self.gold_holdings,4), **self.gold_trading.get_status()}}
