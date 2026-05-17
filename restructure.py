import os
import shutil
import re

dirs = ['css', 'js/core', 'js/managers', 'js/minigames', 'js/ui', 'tools']
for d in dirs:
    os.makedirs(d, exist_ok=True)

moves = {
    # CSS
    'styles.css': 'css/styles.css',
    'mobile.css': 'css/mobile.css',
    'styles-modular.css': 'css/styles-modular.css',
    # JS Core
    'app.js': 'js/core/app.js',
    'game.js': 'js/core/game.js',
    'pixel-engine.js': 'js/core/pixel-engine.js',
    'python-bridge.js': 'js/core/python-bridge.js',
    'error-handler.js': 'js/core/error-handler.js',
    # JS Managers
    'agents.js': 'js/managers/agents.js',
    'achievements.js': 'js/managers/achievements.js',
    'farm.js': 'js/managers/farm.js',
    'tech-tree.js': 'js/managers/tech-tree.js',
    'chatbox.js': 'js/managers/chatbox.js',
    'item-catalog.js': 'js/managers/item-catalog.js',
    'item-shop.js': 'js/managers/item-shop.js',
    'layout-editor.js': 'js/managers/layout-editor.js',
    'statistics.js': 'js/managers/statistics.js',
    'gold-trading.js': 'js/managers/gold-trading.js',
    # JS Minigames
    'billiards.js': 'js/minigames/billiards.js',
    'cafe-game.js': 'js/minigames/cafe-game.js',
    'fighter-game.js': 'js/minigames/fighter-game.js',
    'fishing-game.js': 'js/minigames/fishing-game.js',
    'flappy-heli.js': 'js/minigames/flappy-heli.js',
    'poker.js': 'js/minigames/poker.js',
    'road-racer.js': 'js/minigames/road-racer.js',
    'slot-machine.js': 'js/minigames/slot-machine.js',
    # JS UI
    'mobile-controls.js': 'js/ui/mobile-controls.js',
    'billiards-ui.js': 'js/ui/billiards-ui.js',
    'cafe-game-ui.js': 'js/ui/cafe-game-ui.js',
    'fighter-game-ui.js': 'js/ui/fighter-game-ui.js',
    'fishing-game-ui.js': 'js/ui/fishing-game-ui.js',
    'flappy-heli-ui.js': 'js/ui/flappy-heli-ui.js',
    'gold-trading-ui.js': 'js/ui/gold-trading-ui.js',
    'item-shop-ui.js': 'js/ui/item-shop-ui.js',
    'poker-ui.js': 'js/ui/poker-ui.js',
    'road-racer-ui.js': 'js/ui/road-racer-ui.js',
    'slot-machine-ui.js': 'js/ui/slot-machine-ui.js',
    # Tools
    'patch.py': 'tools/patch.py',
    'patch_fighter.py': 'tools/patch_fighter.py',
    'patch_fishing.py': 'tools/patch_fishing.py',
    'patch_server_fishing.py': 'tools/patch_server_fishing.py',
    'fix_html.js': 'tools/fix_html.js'
}

for src, dst in moves.items():
    if os.path.exists(src):
        # We try git mv first if the file is tracked
        res = os.system(f'git mv "{src}" "{dst}"')
        if res != 0:
            try:
                shutil.move(src, dst)
                print(f'Moved {src} -> {dst}')
            except Exception as e:
                print(f'Failed to move {src} -> {dst}: {e}')
    else:
        print(f'Warning: {src} not found')

print('Finished moving files.')

# Update HTML files
def update_html(filepath):
    if not os.path.exists(filepath): return
    with open(filepath, 'r', encoding='utf-8') as f:
        html = f.read()
    
    for src, dst in moves.items():
        if src.endswith('.js'):
            # match <script src="src"></script>
            html = re.sub(r'(src=["\'])' + re.escape(src) + r'(["\'])', r'\g<1>' + dst + r'\g<2>', html)
        elif src.endswith('.css'):
            # match <link href="src">
            html = re.sub(r'(href=["\'])' + re.escape(src) + r'(["\'])', r'\g<1>' + dst + r'\g<2>', html)
            
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'Updated {filepath}')

update_html('index.html')
update_html('unit-tests.html')
