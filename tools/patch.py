import sys

content = open('game_engine/mini_games.py', 'r', encoding='utf-8').read()
if 'def submit_flappy_score' not in content:
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if 'def _apply_arcade_stats' in line:
            insert_idx = i - 1
            break
    
    new_methods = '''
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
'''
    lines.insert(insert_idx, new_methods)
    open('game_engine/mini_games.py', 'w', encoding='utf-8').write('\n'.join(lines))
    print('Methods added')
else:
    print('Methods already exist')
