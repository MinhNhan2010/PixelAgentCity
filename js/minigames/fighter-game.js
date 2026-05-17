/**
 * Fighter Game — PixelAgent City Mini-Game
 * "Pixel Fighter": 2D fighting game like Street Fighter
 * Canvas-based with pixel art characters, combos, special moves
 */
class FighterGame {
    constructor(canvasEl) {
        this.canvas = canvasEl;
        this.ctx = canvasEl.getContext('2d');
        this.W = 480;
        this.H = 320;
        canvasEl.width = this.W;
        canvasEl.height = this.H;

        // Fighter roster
        this.roster = [
            { id: 'pixel_ryu', name: 'PixelRyu', color: '#e74c3c', accent: '#c0392b', hp: 100, atk: 12, def: 5, spd: 3, special: 'Hadouken', specialDmg: 25, emoji: '\ud83e\udd4a' },
            { id: 'cyber_ken', name: 'CyberKen', color: '#3498db', accent: '#2980b9', hp: 95, atk: 14, def: 4, spd: 4, special: 'Shoryuken', specialDmg: 30, emoji: '\u26a1' },
            { id: 'nano_chun', name: 'NanoChun', color: '#9b59b6', accent: '#8e44ad', hp: 90, atk: 10, def: 6, spd: 5, special: 'Lightning Kick', specialDmg: 22, emoji: '\ud83d\udc62' },
            { id: 'robo_zang', name: 'RoboZang', color: '#27ae60', accent: '#229954', hp: 120, atk: 16, def: 8, spd: 2, special: 'Pile Driver', specialDmg: 35, emoji: '\ud83e\uddbf' },
            { id: 'ghost_vega', name: 'GhostVega', color: '#f39c12', accent: '#e67e22', hp: 85, atk: 13, def: 3, spd: 6, special: 'Shadow Claw', specialDmg: 28, emoji: '\ud83d\udc7b' },
            { id: 'iron_sagat', name: 'IronSagat', color: '#e67e22', accent: '#d35400', hp: 110, atk: 15, def: 7, spd: 2, special: 'Tiger Shot', specialDmg: 32, emoji: '\ud83d\udc2f' }
        ];

        // Game state
        this.state = 'select'; // select | fight | ko | victory
        this.player = null;
        this.enemy = null;
        this.round = 1;
        this.maxRounds = 3;
        this.playerWins = 0;
        this.enemyWins = 0;
        this.timer = 60;
        this._timerInterval = null;
        this._animFrame = null;
        this._lastTime = 0;
        this.betAmount = 0;

        // Fighter runtime
        this.p1 = null; // { ...rosterData, x, y, hp, maxHp, energy, facing, anim, hitTimer, blockTimer }
        this.p2 = null;

        // Input state
        this.keys = {};
        this._keyDown = null;
        this._keyUp = null;

        // Combo system
        this.comboCount = 0;
        this.comboTimer = 0;
        this.lastHitTime = 0;

        // Callbacks
        this.onStateChange = null;
        this.onGameEnd = null;
        this.onHit = null;
    }

    selectFighter(rosterId) {
        var r = null;
        for (var i = 0; i < this.roster.length; i++) {
            if (this.roster[i].id === rosterId) { r = this.roster[i]; break; }
        }
        if (!r) r = this.roster[0];
        this.player = r;
        // Pick random enemy (different from player)
        var enemies = [];
        for (var j = 0; j < this.roster.length; j++) {
            if (this.roster[j].id !== r.id) enemies.push(this.roster[j]);
        }
        this.enemy = enemies[Math.floor(Math.random() * enemies.length)];
    }

    startFight() {
        if (!this.player || !this.enemy) return;
        this.state = 'fight';
        this.round = 1;
        this.playerWins = 0;
        this.enemyWins = 0;
        this._initRound();
        this._bindKeys();
        this._lastTime = performance.now();
        this._gameLoop();
        if (this.onStateChange) this.onStateChange('fight');
    }

    _initRound() {
        var self = this;
        this.p1 = {
            name: this.player.name, color: this.player.color, accent: this.player.accent,
            hp: this.player.hp, maxHp: this.player.hp, energy: 0, maxEnergy: 100,
            atk: this.player.atk, def: this.player.def, spd: this.player.spd,
            special: this.player.special, specialDmg: this.player.specialDmg,
            x: 80, y: 200, vx: 0, vy: 0, facing: 1, w: 40, h: 64,
            anim: 'idle', animFrame: 0, animTimer: 0,
            hitTimer: 0, blockTimer: 0, attackTimer: 0, stunTimer: 0,
            isJumping: false, isBlocking: false, isCrouching: false
        };
        this.p2 = {
            name: this.enemy.name, color: this.enemy.color, accent: this.enemy.accent,
            hp: this.enemy.hp, maxHp: this.enemy.hp, energy: 0, maxEnergy: 100,
            atk: this.enemy.atk, def: this.enemy.def, spd: this.enemy.spd,
            special: this.enemy.special, specialDmg: this.enemy.specialDmg,
            x: 360, y: 200, vx: 0, vy: 0, facing: -1, w: 40, h: 64,
            anim: 'idle', animFrame: 0, animTimer: 0,
            hitTimer: 0, blockTimer: 0, attackTimer: 0, stunTimer: 0,
            isJumping: false, isBlocking: false, isCrouching: false,
            isAI: true, aiTimer: 0, aiAction: 'idle', aiReactTimer: 0
        };
        this.timer = 60;
        this.comboCount = 0;
        this.comboTimer = 0;
        if (this._timerInterval) clearInterval(this._timerInterval);
        this._timerInterval = setInterval(function() {
            if (self.state === 'fight' && self.timer > 0) {
                self.timer--;
                if (self.timer <= 0) self._timeUp();
            }
        }, 1000);
    }

    _bindKeys() {
        var self = this;
        this._keyDown = function(e) {
            self.keys[e.key.toLowerCase()] = true;
            // Attack inputs
            if (self.state === 'fight') {
                if (e.key.toLowerCase() === 'j') self._playerAttack('punch');
                if (e.key.toLowerCase() === 'k') self._playerAttack('kick');
                if (e.key.toLowerCase() === 'l') self._playerSpecial();
            }
        };
        this._keyUp = function(e) { self.keys[e.key.toLowerCase()] = false; };
        window.addEventListener('keydown', this._keyDown);
        window.addEventListener('keyup', this._keyUp);
    }

    _unbindKeys() {
        if (this._keyDown) window.removeEventListener('keydown', this._keyDown);
        if (this._keyUp) window.removeEventListener('keyup', this._keyUp);
        this._keyDown = null;
        this._keyUp = null;
        this.keys = {};
    }

    _playerAttack(type) {
        var p = this.p1;
        if (p.attackTimer > 0 || p.stunTimer > 0 || p.isBlocking) return;
        p.anim = type === 'punch' ? 'punch' : 'kick';
        p.animFrame = 0;
        p.attackTimer = type === 'punch' ? 15 : 20;
        var dmg = type === 'punch' ? p.atk : Math.floor(p.atk * 1.3);
        this._tryHit(p, this.p2, dmg, type);
    }

    _playerSpecial() {
        var p = this.p1;
        if (p.energy < 100 || p.attackTimer > 0 || p.stunTimer > 0) return;
        p.energy = 0;
        p.anim = 'special';
        p.animFrame = 0;
        p.attackTimer = 30;
        this._tryHit(p, this.p2, p.specialDmg, 'special');
    }

    _tryHit(attacker, defender, dmg, type) {
        var dist = Math.abs(attacker.x - defender.x);
        var range = type === 'special' ? 120 : 70;
        if (dist > range) return;
        if (defender.isBlocking) {
            dmg = Math.floor(dmg * 0.2);
            defender.blockTimer = 10;
        }
        var finalDmg = Math.max(1, dmg - Math.floor(defender.def * 0.3));
        defender.hp = Math.max(0, defender.hp - finalDmg);
        defender.hitTimer = 12;
        defender.stunTimer = type === 'special' ? 20 : 8;
        attacker.energy = Math.min(attacker.maxEnergy, attacker.energy + (type === 'special' ? 0 : 15));

        // Combo tracking
        var now = performance.now();
        if (now - this.lastHitTime < 800) {
            this.comboCount++;
        } else {
            this.comboCount = 1;
        }
        this.lastHitTime = now;
        this.comboTimer = 60;

        if (this.onHit) this.onHit(attacker, defender, finalDmg, type, this.comboCount);

        if (defender.hp <= 0) {
            this._roundEnd(attacker === this.p1 ? 'player' : 'enemy');
        }
    }

    _timeUp() {
        var winner = this.p1.hp > this.p2.hp ? 'player' :
                     this.p2.hp > this.p1.hp ? 'enemy' : 'draw';
        if (winner === 'draw') {
            // Both lose the round
        } else {
            this._roundEnd(winner);
        }
    }

    _roundEnd(winner) {
        if (this._timerInterval) { clearInterval(this._timerInterval); this._timerInterval = null; }
        if (winner === 'player') this.playerWins++;
        else this.enemyWins++;

        this.state = 'ko';
        if (this.onStateChange) this.onStateChange('ko');

        var self = this;
        setTimeout(function() {
            if (self.playerWins >= 2 || self.enemyWins >= 2 || self.round >= self.maxRounds) {
                self._gameOver();
            } else {
                self.round++;
                self.state = 'fight';
                self._initRound();
                if (self.onStateChange) self.onStateChange('fight');
            }
        }, 2000);
    }

    _gameOver() {
        this.state = 'victory';
        this._unbindKeys();
        if (this._animFrame) { cancelAnimationFrame(this._animFrame); this._animFrame = null; }
        if (this._timerInterval) { clearInterval(this._timerInterval); this._timerInterval = null; }

        var win = this.playerWins > this.enemyWins;
        var perfect = win && this.p1.hp === this.p1.maxHp;

        if (this._pythonCoreActive()) {
            this._submitResultPython(win, perfect);
            return;
        }

        var payout = 0;
        if (win) {
            var perfBonus = perfect ? 2 : 1;
            payout = Math.floor(this.betAmount * (2 + perfBonus * 0.5));
        }

        this._completeGame({
            win: win, payout: payout, bet: this.betAmount,
            playerWins: this.playerWins, enemyWins: this.enemyWins,
            playerName: this.player.name, enemyName: this.enemy.name,
            perfect: perfect
        });
    }

    _pythonCoreActive() {
        return !!(window.__pixelAgentUsePythonCore && window.PythonBridge?.isServerMode?.() && window.PythonBridge.submitFighterScore);
    }

    async _submitResultPython(won, perfect) {
        const fighterId = this.player.id;
        const serverResult = await window.PythonBridge.submitFighterScore(this.betAmount, fighterId, won, perfect);
        
        if (!serverResult || serverResult.error) {
            this._completeGame({
                win: false, payout: 0, bet: this.betAmount,
                playerWins: this.playerWins, enemyWins: this.enemyWins,
                playerName: this.player.name, enemyName: this.enemy.name,
                perfect: false, error: serverResult?.error || 'Lỗi máy chủ'
            });
            return;
        }

        this._completeGame({
            win: serverResult.win, payout: serverResult.payout, bet: this.betAmount,
            playerWins: this.playerWins, enemyWins: this.enemyWins,
            playerName: this.player.name, enemyName: this.enemy.name,
            perfect: serverResult.perfect
        });
    }

    _completeGame(result) {
        if (this.onGameEnd) this.onGameEnd(result);
        if (this.onStateChange) this.onStateChange('victory');
    }

    // === AI Logic ===
    _updateAI(dt) {
        var ai = this.p2;
        var pl = this.p1;
        if (!ai.isAI || ai.stunTimer > 0) return;
        ai.aiTimer -= dt * 60;
        if (ai.aiTimer > 0) return;

        var dist = Math.abs(ai.x - pl.x);
        var r = Math.random();

        if (dist > 100) {
            // Approach
            ai.vx = ai.facing * ai.spd * 1.5;
            ai.aiTimer = 20 + Math.random() * 15;
        } else if (dist < 40) {
            // Too close, back off or attack
            if (r < 0.4) {
                ai.vx = -ai.facing * ai.spd;
                ai.aiTimer = 10;
            } else {
                this._aiAttack(ai, pl);
                ai.aiTimer = 25 + Math.random() * 20;
            }
        } else {
            // In range
            if (r < 0.35) {
                this._aiAttack(ai, pl);
                ai.aiTimer = 20 + Math.random() * 15;
            } else if (r < 0.55) {
                ai.isBlocking = true;
                ai.aiTimer = 30;
                setTimeout(function() { ai.isBlocking = false; }, 500);
            } else if (r < 0.7 && ai.energy >= 100) {
                // Special attack
                ai.energy = 0;
                ai.anim = 'special';
                ai.animFrame = 0;
                ai.attackTimer = 30;
                this._tryHit(ai, pl, ai.specialDmg, 'special');
                ai.aiTimer = 40;
            } else {
                ai.vx = (Math.random() < 0.5 ? 1 : -1) * ai.spd;
                ai.aiTimer = 15 + Math.random() * 10;
            }
        }
    }

    _aiAttack(ai, target) {
        if (ai.attackTimer > 0) return;
        var type = Math.random() < 0.5 ? 'punch' : 'kick';
        ai.anim = type;
        ai.animFrame = 0;
        ai.attackTimer = type === 'punch' ? 15 : 20;
        var dmg = type === 'punch' ? ai.atk : Math.floor(ai.atk * 1.3);
        this._tryHit(ai, target, dmg, type);
    }

    // === Game Loop ===
    _gameLoop() {
        var self = this;
        var now = performance.now();
        var dt = Math.min((now - this._lastTime) / 1000, 0.05);
        this._lastTime = now;

        if (this.state === 'fight') {
            this._updatePlayer(dt);
            this._updateAI(dt);
            this._updatePhysics(this.p1, dt);
            this._updatePhysics(this.p2, dt);
            this._updateTimers(this.p1, dt);
            this._updateTimers(this.p2, dt);
            if (this.comboTimer > 0) this.comboTimer--;
        }

        this._render();
        this._animFrame = requestAnimationFrame(function() { self._gameLoop(); });
    }

    _updatePlayer(dt) {
        var p = this.p1;
        if (p.stunTimer > 0) return;
        p.vx = 0;
        if (this.keys['a'] || this.keys['arrowleft']) p.vx = -p.spd * 2;
        if (this.keys['d'] || this.keys['arrowright']) p.vx = p.spd * 2;
        if ((this.keys['w'] || this.keys['arrowup']) && !p.isJumping) {
            p.vy = -8;
            p.isJumping = true;
        }
        p.isCrouching = this.keys['s'] || this.keys['arrowdown'];
        p.isBlocking = this.keys['shift'];
    }

    _updatePhysics(f, dt) {
        f.x += f.vx;
        f.y += f.vy;
        f.vy += 0.4; // gravity
        if (f.y >= 200) { f.y = 200; f.vy = 0; f.isJumping = false; }
        if (f.x < 20) f.x = 20;
        if (f.x > this.W - 60) f.x = this.W - 60;
        // Face opponent
        if (this.p1 && this.p2) {
            if (f === this.p1) f.facing = f.x < this.p2.x ? 1 : -1;
            else f.facing = f.x < this.p1.x ? 1 : -1;
        }
        f.vx *= 0.85;
    }

    _updateTimers(f, dt) {
        if (f.hitTimer > 0) f.hitTimer--;
        if (f.blockTimer > 0) f.blockTimer--;
        if (f.attackTimer > 0) f.attackTimer--;
        if (f.stunTimer > 0) f.stunTimer--;
        f.animTimer++;
        if (f.animTimer >= 8) { f.animTimer = 0; f.animFrame = (f.animFrame + 1) % 4; }
        if (f.attackTimer <= 0 && (f.anim === 'punch' || f.anim === 'kick' || f.anim === 'special')) {
            f.anim = 'idle';
        }
    }

    // === RENDER ===
    _render() {
        var ctx = this.ctx;
        var W = this.W;
        var H = this.H;
        ctx.clearRect(0, 0, W, H);

        // Background - arena
        var bgGrad = ctx.createLinearGradient(0, 0, 0, H);
        bgGrad.addColorStop(0, '#0a0a2e');
        bgGrad.addColorStop(0.6, '#1a1a4e');
        bgGrad.addColorStop(1, '#2d1b69');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // Floor
        ctx.fillStyle = '#1a1a3e';
        ctx.fillRect(0, 260, W, 60);
        // Floor line
        ctx.strokeStyle = '#4a4a8e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 260);
        ctx.lineTo(W, 260);
        ctx.stroke();
        // Grid on floor
        ctx.strokeStyle = 'rgba(100,100,200,0.15)';
        ctx.lineWidth = 1;
        for (var gx = 0; gx < W; gx += 20) {
            ctx.beginPath(); ctx.moveTo(gx, 260); ctx.lineTo(gx, H); ctx.stroke();
        }

        // Neon signs background
        ctx.font = '10px monospace';
        ctx.fillStyle = 'rgba(255,100,100,0.3)';
        ctx.fillText('PIXEL FIGHTER', 180, 20);

        if (this.state === 'fight' || this.state === 'ko') {
            this._drawFighter(this.p1);
            this._drawFighter(this.p2);
            this._drawHUD();
            if (this.comboTimer > 0 && this.comboCount > 1) {
                ctx.font = 'bold 18px monospace';
                ctx.fillStyle = '#ffd93d';
                ctx.textAlign = 'center';
                ctx.fillText(this.comboCount + ' HIT COMBO!', W / 2, 160);
                ctx.textAlign = 'left';
            }
            if (this.state === 'ko') {
                ctx.font = 'bold 32px monospace';
                ctx.fillStyle = '#ff4757';
                ctx.textAlign = 'center';
                ctx.fillText('K.O.!', W / 2, H / 2 - 20);
                ctx.textAlign = 'left';
            }
        }
        // Timer
        if (this.state === 'fight') {
            ctx.font = 'bold 20px monospace';
            ctx.fillStyle = this.timer <= 10 ? '#ff4757' : '#ffd93d';
            ctx.textAlign = 'center';
            ctx.fillText(this.timer, W / 2, 45);
            ctx.textAlign = 'left';
        }
    }

    _drawFighter(f) {
        var ctx = this.ctx;
        var x = Math.floor(f.x);
        var y = Math.floor(f.y);
        var shake = f.hitTimer > 0 ? (Math.random() - 0.5) * 4 : 0;
        x += shake;

        ctx.save();
        if (f.hitTimer > 0 && f.hitTimer % 2 === 0) { ctx.globalAlpha = 0.5; }
        if (f.isBlocking) { ctx.globalAlpha = 0.8; }

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(x + 20, 262, 18, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body
        var bodyY = y - 64 + (f.isCrouching ? 16 : 0);
        var bodyH = f.isCrouching ? 48 : 64;

        // Legs
        ctx.fillStyle = f.accent;
        var legOffset = f.anim === 'kick' ? 10 : (Math.sin(f.animFrame * 1.5) * 3);
        ctx.fillRect(x + 8, bodyY + bodyH - 20, 10, 20);
        ctx.fillRect(x + 22, bodyY + bodyH - 20 + legOffset, 10, 20 - legOffset);

        // Torso
        ctx.fillStyle = f.color;
        ctx.fillRect(x + 5, bodyY + 16, 30, bodyH - 36);

        // Head
        ctx.fillStyle = '#ffd8a8';
        ctx.fillRect(x + 10, bodyY, 20, 20);
        // Eyes
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(x + 14, bodyY + 6, 4, 4);
        ctx.fillRect(x + 22, bodyY + 6, 4, 4);
        // Headband
        ctx.fillStyle = f.color;
        ctx.fillRect(x + 8, bodyY + 2, 24, 4);

        // Arms
        ctx.fillStyle = '#ffd8a8';
        if (f.anim === 'punch') {
            // Extended punch arm
            var punchDir = f.facing;
            ctx.fillRect(x + (punchDir > 0 ? 30 : -15), bodyY + 20, 25, 8);
            // Fist
            ctx.fillStyle = f.color;
            ctx.fillRect(x + (punchDir > 0 ? 52 : -18), bodyY + 18, 10, 12);
        } else if (f.anim === 'special') {
            // Special pose - energy ball
            ctx.fillRect(x - 5, bodyY + 22, 12, 8);
            ctx.fillRect(x + 33, bodyY + 22, 12, 8);
            // Energy effect
            ctx.fillStyle = '#ffd93d';
            ctx.globalAlpha = 0.6 + Math.sin(f.animFrame * 2) * 0.3;
            var ballX = x + (f.facing > 0 ? 50 : -20);
            ctx.beginPath();
            ctx.arc(ballX, bodyY + 26, 12 + Math.sin(f.animFrame) * 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        } else {
            // Idle arms
            ctx.fillRect(x, bodyY + 18, 8, 20);
            ctx.fillRect(x + 32, bodyY + 18, 8, 20);
        }

        // Blocking effect
        if (f.isBlocking) {
            ctx.strokeStyle = '#4ecdc4';
            ctx.lineWidth = 2;
            ctx.strokeRect(x - 2, bodyY - 2, 44, bodyH + 4);
        }

        ctx.restore();

        // Name tag
        ctx.font = '8px monospace';
        ctx.fillStyle = f.color;
        ctx.textAlign = 'center';
        ctx.fillText(f.name, x + 20, bodyY - 5);
        ctx.textAlign = 'left';
    }

    _drawHUD() {
        var ctx = this.ctx;
        var W = this.W;
        // P1 HP bar (left)
        this._drawHPBar(10, 28, 180, this.p1);
        // P2 HP bar (right, mirrored)
        this._drawHPBar(W - 190, 28, 180, this.p2);
        // Energy bars
        this._drawEnergyBar(10, 48, 180, this.p1);
        this._drawEnergyBar(W - 190, 48, 180, this.p2);
        // Names
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = this.p1.color;
        ctx.fillText(this.p1.name, 12, 24);
        ctx.fillStyle = this.p2.color;
        ctx.textAlign = 'right';
        ctx.fillText(this.p2.name, W - 12, 24);
        ctx.textAlign = 'left';
        // Round indicators
        ctx.font = '9px monospace';
        ctx.fillStyle = '#aaa';
        ctx.textAlign = 'center';
        ctx.fillText('ROUND ' + this.round, W / 2, 24);
        // Win dots
        for (var i = 0; i < this.playerWins; i++) {
            ctx.fillStyle = '#ffd93d';
            ctx.beginPath(); ctx.arc(W/2 - 20 + i*12, 55, 4, 0, Math.PI*2); ctx.fill();
        }
        for (var j = 0; j < this.enemyWins; j++) {
            ctx.fillStyle = '#ff4757';
            ctx.beginPath(); ctx.arc(W/2 + 20 + j*12, 55, 4, 0, Math.PI*2); ctx.fill();
        }
        ctx.textAlign = 'left';
    }

    _drawHPBar(x, y, w, fighter) {
        var ctx = this.ctx;
        var ratio = fighter.hp / fighter.maxHp;
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(x, y, w, 14);
        var hpColor = ratio > 0.5 ? '#2ecc71' : ratio > 0.25 ? '#f39c12' : '#e74c3c';
        ctx.fillStyle = hpColor;
        ctx.fillRect(x + 2, y + 2, (w - 4) * ratio, 10);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, 14);
    }

    _drawEnergyBar(x, y, w, fighter) {
        var ctx = this.ctx;
        var ratio = fighter.energy / fighter.maxEnergy;
        ctx.fillStyle = '#0a0a1e';
        ctx.fillRect(x, y, w, 6);
        ctx.fillStyle = ratio >= 1 ? '#ffd93d' : '#3498db';
        ctx.fillRect(x + 1, y + 1, (w - 2) * ratio, 4);
        if (ratio >= 1) {
            ctx.font = '7px monospace';
            ctx.fillStyle = '#ffd93d';
            ctx.fillText('SPECIAL READY!', x + 2, y + 14);
        }
    }

    destroy() {
        this._unbindKeys();
        if (this._animFrame) { cancelAnimationFrame(this._animFrame); this._animFrame = null; }
        if (this._timerInterval) { clearInterval(this._timerInterval); this._timerInterval = null; }
    }
}

window.FighterGame = FighterGame;
