import sys
import json

content = open('game_engine/mini_games.py', 'r', encoding='utf-8').read()

new_method = '''
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
'''

if 'def submit_fishing_result' not in content:
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if 'def play_fighter' in line:
            lines.insert(i-1, new_method)
            open('game_engine/mini_games.py', 'w', encoding='utf-8').write('\n'.join(lines))
            print('Added submit_fishing_result to MiniGameTracker')
            break
