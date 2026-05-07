/**
 * Flappy Helicopter - PixelAgent City
 * A Flappy-Bird-style minigame: tap/click to make helicopter fly between buildings.
 * Pixel art rendered entirely on canvas. Integrates with the coin economy.
 */
class FlappyHeli {
    constructor(canvas, opts = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.W = canvas.width;
        this.H = canvas.height;

        // Physics
        this.gravity = 0.35;
        this.flapForce = -5.5;
        this.maxFallSpeed = 8;

        // Helicopter
        this.heli = { x: 60, y: this.H / 2, vy: 0, w: 28, h: 18, rotation: 0 };
        this.bladeAngle = 0;

        // Pipes (buildings)
        this.pipes = [];
        this.pipeWidth = 36;
        this.pipeGap = 90;       // gap between top and bottom pipe
        this.pipeSpeed = 2.0;
        this.pipeSpawnInterval = 100; // frames
        this.pipeTimer = 60;

        // Difficulty scaling
        this.minGap = 58;
        this.maxSpeed = 4.0;

        // State
        this.score = 0;
        this.highScore = 0;
        this.phase = 'idle'; // idle | playing | dead
        this.deathTimer = 0;
        this.frameCount = 0;

        // Particles
        this.particles = [];
        this.clouds = [];
        this._initClouds();

        // Bet system
        this.betOptions = [10, 25, 50, 100];
        this.currentBet = 10;

        // Stats
        this.totalGames = 0;
        this.totalWon = 0;
        this.totalLost = 0;
        this.history = [];

        // Animation
        this._animFrame = null;
        this._lastTime = 0;

        // Callbacks
        this.onScoreChange = null;  // (score)
        this.onGameOver = null;     // (result)
        this.onTick = null;

        // Load high score
        try {
            this.highScore = parseInt(localStorage.getItem('flappyHeliHigh') || '0');
        } catch(e) {}
    }

    _initClouds() {
        this.clouds = [];
        for (var i = 0; i < 5; i++) {
            this.clouds.push({
                x: Math.random() * this.W,
                y: 10 + Math.random() * 80,
                w: 30 + Math.random() * 40,
                speed: 0.2 + Math.random() * 0.3,
                opacity: 0.15 + Math.random() * 0.15
            });
        }
    }

    setBet(amount) {
        if (this.phase === 'playing') return;
        if (this.betOptions.indexOf(amount) !== -1) this.currentBet = amount;
    }

    start() {
        if (this.phase === 'playing') return;
        this.phase = 'playing';
        this.score = 0;
        this.frameCount = 0;
        this.pipes = [];
        this.particles = [];
        this.pipeTimer = 60;
        this.pipeGap = 90;
        this.pipeSpeed = 2.0;
        this.heli.y = this.H / 2;
        this.heli.vy = 0;
        this.heli.rotation = 0;
        this.totalGames++;
        this.deathTimer = 0;
    }

    flap() {
        if (this.phase === 'idle') {
            this.start();
        }
        if (this.phase === 'playing') {
            this.heli.vy = this.flapForce;
            // Exhaust particles
            for (var i = 0; i < 3; i++) {
                this.particles.push({
                    x: this.heli.x - 5,
                    y: this.heli.y + this.heli.h / 2 + Math.random() * 4,
                    vx: -1 - Math.random() * 2,
                    vy: 1 + Math.random() * 1.5,
                    life: 15 + Math.random() * 10,
                    maxLife: 25,
                    size: 2 + Math.random() * 2,
                    color: Math.random() > 0.5 ? '#ff9f43' : '#f39c12'
                });
            }
        }
    }

    tick(dt) {
        if (this.phase === 'dead') {
            this.deathTimer++;
            this._updateParticles();
            return;
        }
        if (this.phase !== 'playing') return;

        this.frameCount++;

        // Helicopter physics
        this.heli.vy += this.gravity;
        if (this.heli.vy > this.maxFallSpeed) this.heli.vy = this.maxFallSpeed;
        this.heli.y += this.heli.vy;

        // Rotation based on velocity
        this.heli.rotation = Math.max(-25, Math.min(45, this.heli.vy * 3));

        // Blade animation
        this.bladeAngle += 0.6;

        // Spawn pipes
        this.pipeTimer--;
        if (this.pipeTimer <= 0) {
            this._spawnPipe();
            this.pipeTimer = this.pipeSpawnInterval;
        }

        // Move pipes
        for (var i = this.pipes.length - 1; i >= 0; i--) {
            var p = this.pipes[i];
            p.x -= this.pipeSpeed;

            // Score when passing
            if (!p.scored && p.x + this.pipeWidth < this.heli.x) {
                p.scored = true;
                this.score++;
                if (this.onScoreChange) this.onScoreChange(this.score);
                this._adjustDifficulty();
            }

            // Remove off-screen
            if (p.x + this.pipeWidth < -10) {
                this.pipes.splice(i, 1);
            }
        }

        // Collision detection
        if (this._checkCollision()) {
            this._die();
            return;
        }

        // Ceiling / floor
        if (this.heli.y < 0) {
            this.heli.y = 0;
            this.heli.vy = 1;
        }
        if (this.heli.y + this.heli.h > this.H) {
            this._die();
            return;
        }

        // Update particles
        this._updateParticles();

        // Update clouds
        for (var ci = 0; ci < this.clouds.length; ci++) {
            var c = this.clouds[ci];
            c.x -= c.speed;
            if (c.x + c.w < 0) {
                c.x = this.W + 10;
                c.y = 10 + Math.random() * 80;
            }
        }

        if (this.onTick) this.onTick(this.score);
    }

    _spawnPipe() {
        var minTop = 40;
        var maxTop = this.H - this.pipeGap - 40;
        var topH = minTop + Math.random() * (maxTop - minTop);
        var bottomY = topH + this.pipeGap;

        // Building color variation
        var colorSeed = this.pipes.length % 5;
        var colors = ['#3a4a6b', '#4a3a6b', '#3a6b5a', '#6b4a3a', '#4a6b3a'];
        var windowColors = ['#ffd93d', '#4ecdc4', '#ff6b6b', '#78e08f', '#a29bfe'];

        this.pipes.push({
            x: this.W + 10,
            topH: topH,
            bottomY: bottomY,
            scored: false,
            color: colors[colorSeed],
            windowColor: windowColors[colorSeed],
            // Random building details
            hasAntenna: Math.random() > 0.6,
            windowRows: 2 + Math.floor(Math.random() * 3),
            ledgeWidth: 2 + Math.floor(Math.random() * 3)
        });
    }

    _adjustDifficulty() {
        // Gradually increase difficulty
        if (this.score % 5 === 0 && this.pipeGap > this.minGap) {
            this.pipeGap -= 3;
        }
        if (this.score % 3 === 0 && this.pipeSpeed < this.maxSpeed) {
            this.pipeSpeed += 0.1;
        }
    }

    _checkCollision() {
        var hx = this.heli.x;
        var hy = this.heli.y;
        var hw = this.heli.w - 4; // slight hitbox forgiveness
        var hh = this.heli.h - 4;

        for (var i = 0; i < this.pipes.length; i++) {
            var p = this.pipes[i];
            // Check horizontal overlap
            if (hx + hw > p.x && hx < p.x + this.pipeWidth) {
                // Top pipe
                if (hy < p.topH) return true;
                // Bottom pipe
                if (hy + hh > p.bottomY) return true;
            }
        }
        return false;
    }

    _die() {
        this.phase = 'dead';
        this.deathTimer = 0;

        // Explosion particles
        for (var i = 0; i < 15; i++) {
            var angle = Math.random() * Math.PI * 2;
            var speed = 1 + Math.random() * 3;
            this.particles.push({
                x: this.heli.x + this.heli.w / 2,
                y: this.heli.y + this.heli.h / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 20 + Math.random() * 20,
                maxLife: 40,
                size: 2 + Math.random() * 4,
                color: ['#ff6b6b', '#ffd93d', '#ff9f43', '#fff'][Math.floor(Math.random() * 4)]
            });
        }

        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            try { localStorage.setItem('flappyHeliHigh', String(this.highScore)); } catch(e) {}
        }

        // Calculate payout
        var payout = 0;
        var winName = '';
        var win = false;

        if (this.score >= 30) {
            payout = this.currentBet * 8;
            winName = '🏆 LEGENDARY PILOT! +' + payout + 'Ⓒ';
            win = true;
        } else if (this.score >= 20) {
            payout = this.currentBet * 5;
            winName = '⭐ ACE PILOT! +' + payout + 'Ⓒ';
            win = true;
        } else if (this.score >= 15) {
            payout = this.currentBet * 3;
            winName = '✈️ Pro Pilot! +' + payout + 'Ⓒ';
            win = true;
        } else if (this.score >= 10) {
            payout = Math.floor(this.currentBet * 2);
            winName = '🚁 Tốt lắm! +' + payout + 'Ⓒ';
            win = true;
        } else if (this.score >= 5) {
            payout = Math.floor(this.currentBet * 1.2);
            winName = '👍 Khá ổn! +' + payout + 'Ⓒ';
            win = payout > this.currentBet;
        } else {
            payout = 0;
            winName = '💥 Rơi rồi! -' + this.currentBet + 'Ⓒ';
            win = false;
        }

        if (win) this.totalWon += payout;
        else this.totalLost += this.currentBet;

        var result = {
            score: this.score,
            highScore: this.highScore,
            bet: this.currentBet,
            payout: payout,
            win: win,
            name: winName,
            isLegendary: this.score >= 30,
            isPerfect: this.score >= 20
        };

        this.history.unshift(result);
        if (this.history.length > 10) this.history.pop();

        if (this.onGameOver) this.onGameOver(result);
    }

    _updateParticles() {
        for (var i = this.particles.length - 1; i >= 0; i--) {
            var p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    // ===================== RENDERING =====================
    render() {
        var ctx = this.ctx;
        var W = this.W;
        var H = this.H;
        ctx.clearRect(0, 0, W, H);

        // Sky gradient
        var grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, '#0c1445');
        grad.addColorStop(0.4, '#1a237e');
        grad.addColorStop(0.7, '#283593');
        grad.addColorStop(1, '#1565c0');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Stars (subtle)
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        var starSeed = [12,45,78,120,200,250,340,390,30,67,89,150,180,280,310,370];
        for (var si = 0; si < starSeed.length; si++) {
            var sx = starSeed[si] % W;
            var sy = (starSeed[si] * 7 + si * 31) % (H * 0.4);
            ctx.fillRect(sx, sy, 1, 1);
        }

        // Clouds
        for (var ci = 0; ci < this.clouds.length; ci++) {
            var cl = this.clouds[ci];
            ctx.fillStyle = 'rgba(255,255,255,' + cl.opacity + ')';
            // Simple cloud shape
            ctx.beginPath();
            ctx.arc(cl.x + cl.w * 0.3, cl.y, cl.w * 0.2, 0, Math.PI * 2);
            ctx.arc(cl.x + cl.w * 0.6, cl.y - 3, cl.w * 0.25, 0, Math.PI * 2);
            ctx.arc(cl.x + cl.w * 0.8, cl.y + 1, cl.w * 0.18, 0, Math.PI * 2);
            ctx.fill();
        }

        // Distant city skyline (background)
        this._drawSkyline(ctx, W, H);

        // Pipes (buildings)
        for (var pi = 0; pi < this.pipes.length; pi++) {
            this._drawPipe(ctx, this.pipes[pi]);
        }

        // Particles
        for (var pai = 0; pai < this.particles.length; pai++) {
            var pa = this.particles[pai];
            var alpha = pa.life / pa.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = pa.color;
            ctx.fillRect(Math.floor(pa.x), Math.floor(pa.y), Math.ceil(pa.size), Math.ceil(pa.size));
        }
        ctx.globalAlpha = 1;

        // Helicopter
        if (this.phase !== 'dead' || this.deathTimer < 10) {
            this._drawHelicopter(ctx);
        }

        // Ground line
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, H - 2, W, 2);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(0, H - 3, W, 1);

        // Score display
        this._drawScore(ctx, W);

        // Idle screen
        if (this.phase === 'idle') {
            this._drawIdleScreen(ctx, W, H);
        }

        // Dead screen
        if (this.phase === 'dead' && this.deathTimer > 30) {
            this._drawDeadScreen(ctx, W, H);
        }
    }

    _drawSkyline(ctx, W, H) {
        // Background buildings — distant
        ctx.fillStyle = 'rgba(20,25,50,0.6)';
        var buildings = [
            {x:0,w:35,h:50},{x:40,w:25,h:70},{x:70,w:30,h:45},{x:110,w:20,h:80},{x:140,w:40,h:55},
            {x:190,w:25,h:65},{x:220,w:35,h:40},{x:260,w:30,h:75},{x:300,w:25,h:50},{x:330,w:40,h:60},
            {x:380,w:20,h:85}
        ];
        for (var bi = 0; bi < buildings.length; bi++) {
            var b = buildings[bi];
            ctx.fillRect(b.x, H - b.h, b.w, b.h);
            // Tiny windows
            ctx.fillStyle = 'rgba(255,215,80,0.15)';
            for (var wy = H - b.h + 5; wy < H - 5; wy += 8) {
                for (var wx = b.x + 3; wx < b.x + b.w - 3; wx += 6) {
                    if (Math.random() > 0.3) ctx.fillRect(wx, wy, 2, 3);
                }
            }
            ctx.fillStyle = 'rgba(20,25,50,0.6)';
        }
    }

    _drawPipe(ctx, pipe) {
        var W = this.pipeWidth;
        var topH = pipe.topH;
        var bottomY = pipe.bottomY;
        var x = Math.floor(pipe.x);
        var H = this.H;

        // Top building (hangs from top)
        ctx.fillStyle = pipe.color;
        ctx.fillRect(x, 0, W, topH);
        // Bottom lip
        ctx.fillStyle = this._lighten(pipe.color, 20);
        ctx.fillRect(x - 2, topH - 6, W + 4, 6);
        // Ledge detail
        ctx.fillStyle = this._darken(pipe.color, 20);
        ctx.fillRect(x - 2, topH - 7, W + 4, 1);

        // Bottom building (rises from bottom)
        ctx.fillStyle = pipe.color;
        ctx.fillRect(x, bottomY, W, H - bottomY);
        // Top lip
        ctx.fillStyle = this._lighten(pipe.color, 20);
        ctx.fillRect(x - 2, bottomY, W + 4, 6);
        // Ledge highlight
        ctx.fillStyle = this._lighten(pipe.color, 35);
        ctx.fillRect(x - 2, bottomY, W + 4, 1);

        // Windows on buildings
        ctx.fillStyle = pipe.windowColor;
        // Top building windows
        for (var wy = 5; wy < topH - 10; wy += 8) {
            for (var wx = x + 4; wx < x + W - 4; wx += 8) {
                ctx.globalAlpha = 0.4 + Math.random() * 0.3;
                ctx.fillRect(wx, wy, 3, 4);
            }
        }
        // Bottom building windows
        for (var bwy = bottomY + 10; bwy < H - 5; bwy += 8) {
            for (var bwx = x + 4; bwx < x + W - 4; bwx += 8) {
                ctx.globalAlpha = 0.4 + Math.random() * 0.3;
                ctx.fillRect(bwx, bwy, 3, 4);
            }
        }
        ctx.globalAlpha = 1;

        // Antenna on top building
        if (pipe.hasAntenna) {
            ctx.fillStyle = '#8a8a8a';
            ctx.fillRect(x + Math.floor(W / 2), 0, 2, 8);
            ctx.fillStyle = '#ff4444';
            ctx.fillRect(x + Math.floor(W / 2), 0, 2, 2);
        }
    }

    _drawHelicopter(ctx) {
        var h = this.heli;
        var cx = Math.floor(h.x + h.w / 2);
        var cy = Math.floor(h.y + h.h / 2);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(h.rotation * Math.PI / 180);

        // Body — main fuselage
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(-12, -5, 24, 12);
        // Cockpit (front glass)
        ctx.fillStyle = '#85c1e9';
        ctx.fillRect(8, -4, 6, 10);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(10, -3, 2, 5);
        // Tail
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(-18, -3, 8, 6);
        // Tail fin
        ctx.fillStyle = '#1e8449';
        ctx.fillRect(-18, -8, 4, 6);
        // Landing skids
        ctx.fillStyle = '#555';
        ctx.fillRect(-8, 7, 18, 2);
        ctx.fillRect(-9, 5, 2, 4);
        ctx.fillRect(9, 5, 2, 4);

        // Rotor blade (animated)
        var bladeX = Math.cos(this.bladeAngle) * 16;
        ctx.fillStyle = '#bbb';
        ctx.fillRect(-bladeX - 1, -8, bladeX * 2 + 2, 2);
        // Rotor hub
        ctx.fillStyle = '#888';
        ctx.fillRect(-1, -9, 3, 3);

        // Tail rotor
        var tailBlade = Math.sin(this.bladeAngle * 1.5) * 4;
        ctx.fillStyle = '#aaa';
        ctx.fillRect(-19, -3 + tailBlade - 1, 2, Math.abs(tailBlade) + 2);

        ctx.restore();
    }

    _drawScore(ctx, W) {
        if (this.phase === 'playing' || this.phase === 'dead') {
            // Score with outline
            ctx.font = 'bold 24px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillText(String(this.score), W / 2 + 1, 31);
            ctx.fillStyle = '#fff';
            ctx.fillText(String(this.score), W / 2, 30);

            // High score
            ctx.font = '8px "Press Start 2P", monospace';
            ctx.fillStyle = 'rgba(255,215,80,0.7)';
            ctx.fillText('BEST: ' + this.highScore, W / 2, 44);
        }
    }

    _drawIdleScreen(ctx, W, H) {
        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(0, 0, W, H);

        ctx.textAlign = 'center';

        // Title
        ctx.font = 'bold 14px "Press Start 2P", monospace';
        ctx.fillStyle = '#ffd93d';
        ctx.fillText('FLAPPY', W / 2, H / 2 - 35);
        ctx.fillStyle = '#4ecdc4';
        ctx.fillText('HELI', W / 2, H / 2 - 18);

        // Instruction
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.fillStyle = '#fff';
        var blink = Math.floor(Date.now() / 500) % 2;
        if (blink) ctx.fillText('TAP TO FLY!', W / 2, H / 2 + 10);

        // High score
        if (this.highScore > 0) {
            ctx.fillStyle = 'rgba(255,215,80,0.8)';
            ctx.fillText('BEST: ' + this.highScore, W / 2, H / 2 + 30);
        }

        // Helicopter emoji for decoration
        ctx.font = '20px sans-serif';
        ctx.fillText('🚁', W / 2, H / 2 + 55);
    }

    _drawDeadScreen(ctx, W, H) {
        var alpha = Math.min(1, (this.deathTimer - 30) / 20);
        ctx.fillStyle = 'rgba(0,0,0,' + (alpha * 0.5) + ')';
        ctx.fillRect(0, 0, W, H);

        if (alpha < 0.5) return;

        ctx.textAlign = 'center';

        ctx.font = 'bold 12px "Press Start 2P", monospace';
        ctx.fillStyle = '#ff6b6b';
        ctx.fillText('CRASH!', W / 2, H / 2 - 25);

        ctx.font = '10px "Press Start 2P", monospace';
        ctx.fillStyle = '#ffd93d';
        ctx.fillText('Score: ' + this.score, W / 2, H / 2);

        if (this.score === this.highScore && this.score > 0) {
            ctx.fillStyle = '#4ecdc4';
            ctx.font = '8px "Press Start 2P", monospace';
            ctx.fillText('NEW BEST!', W / 2, H / 2 + 15);
        }

        ctx.font = '7px "Press Start 2P", monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        var blink = Math.floor(Date.now() / 600) % 2;
        if (blink) ctx.fillText('TAP TO RETRY', W / 2, H / 2 + 35);
    }

    _lighten(hex, amount) {
        var num = parseInt(hex.replace('#',''), 16);
        var r = Math.min(255, (num >> 16) + amount);
        var g = Math.min(255, ((num >> 8) & 0xff) + amount);
        var b = Math.min(255, (num & 0xff) + amount);
        return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
    }

    _darken(hex, amount) {
        return this._lighten(hex, -amount);
    }

    getStats() {
        var winCount = 0;
        for (var i = 0; i < Math.min(this.history.length, 10); i++) {
            if (this.history[i].win) winCount++;
        }
        return {
            totalGames: this.totalGames,
            totalWon: this.totalWon,
            totalLost: this.totalLost,
            netProfit: this.totalWon - this.totalLost,
            highScore: this.highScore,
            winRate: this.totalGames > 0
                ? ((winCount / Math.min(this.history.length || 1, 10)) * 100).toFixed(0)
                : 0
        };
    }

    destroy() {
        this.phase = 'idle';
        if (this._animFrame) {
            cancelAnimationFrame(this._animFrame);
            this._animFrame = null;
        }
    }
}

window.FlappyHeli = FlappyHeli;
