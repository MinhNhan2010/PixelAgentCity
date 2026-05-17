import sys
content = open('server.py', 'r', encoding='utf-8').read()
new_route = '''
@app.route("/api/minigames/fishing/score", methods=["POST"])
def submit_fishing_score():
    data = request.get_json(force=True) if request.is_json else {}
    with state_lock:
        return jsonify(mini_games.submit_fishing_result(data.get("bet", 10), data.get("fish_name", ""), data.get("won", False), data.get("weight", 0.0)))
'''
if 'def submit_fishing_score' not in content:
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if 'def play_fighter' in line:
            lines.insert(i-1, new_route)
            open('server.py', 'w', encoding='utf-8').write('\n'.join(lines))
            print('Added submit_fishing_score to server.py')
            break
