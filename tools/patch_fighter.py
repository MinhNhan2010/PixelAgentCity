import sys

# Patch mini_games.py
content = open('game_engine/mini_games.py', 'r', encoding='utf-8').read()

new_method = '''
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
'''

if 'def submit_fighter_result' not in content:
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if 'def play_flappy' in line:
            lines.insert(i-1, new_method)
            open('game_engine/mini_games.py', 'w', encoding='utf-8').write('\n'.join(lines))
            print('Added submit_fighter_result to MiniGameTracker')
            break

# Patch server.py
content2 = open('server.py', 'r', encoding='utf-8').read()
new_route = '''
@app.route("/api/minigames/fighter/score", methods=["POST"])
def submit_fighter_score():
    data = request.get_json(force=True) if request.is_json else {}
    with state_lock:
        return jsonify(mini_games.submit_fighter_result(data.get("bet", 10), data.get("fighter", "pixel_ryu"), data.get("won", False), data.get("perfect", False)))
'''

if 'def submit_fighter_score' not in content2:
    lines2 = content2.split('\n')
    for i, line in enumerate(lines2):
        if 'def play_flappy' in line:
            lines2.insert(i-1, new_route)
            open('server.py', 'w', encoding='utf-8').write('\n'.join(lines2))
            print('Added submit_fighter_score to server.py')
            break
