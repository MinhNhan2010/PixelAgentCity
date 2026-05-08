/**
 * Fishing & Life — Mini Game Engine
 * Cast your line, wait for a bite, reel in fish!
 * Pixel-art style rendered on canvas.
 */
class FishingGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.W = canvas.width;
        this.H = canvas.height;

        // Game state
        this.phase = 'idle'; // idle, casting, waiting, hooked, reeling, caught, lost
        this.currentBet = 10;
        this.running = false;
        this.tick = 0;

        // Fish catalog
        this.fishTypes = [
            { name: 'Cá Rô', emoji: '🐟', weight: [0.2, 1.5], value: 1.2, rate: 30, color: '#7AB8D0', difficulty: 1 },
            { name: 'Cá Chép', emoji: '🐠', weight: [0.5, 3.0], value: 1.8, rate: 25, color: '#FFB347', difficulty: 2 },
            { name: 'Cá Trê', emoji: '🐡', weight: [0.3, 2.0], value: 1.5, rate: 20, color: '#8B6914', difficulty: 2 },
            { name: 'Cá Lóc', emoji: '🐟', weight: [1.0, 5.0], value: 2.5, rate: 12, color: '#2C3E50', difficulty: 3 },
            { name: 'Cá Koi', emoji: '🎏', weight: [0.5, 4.0], value: 4.0, rate: 6, color: '#E74C3C', difficulty: 3 },
            { name: 'Cá Vàng', emoji: '✨', weight: [0.1, 0.5], value: 6.0, rate: 4, color: '#FFD700', difficulty: 4 },
            { name: 'Rùa Vàng', emoji: '🐢', weight: [2.0, 8.0], value: 10.0, rate: 2, color: '#27AE60', difficulty: 5 },
            { name: 'Cá Rồng', emoji: '🐉', weight: [3.0, 12.0], value: 20.0, rate: 1, color: '#9B59B6', difficulty: 5 },
        ];

        // Fishing state
        this.rod = { angle: -30, castPower: 0, lineLen: 0, maxLine: 180 };
        this.bobber = { x: 0, y: 0, sinkDepth: 0 };
        this.hookedFish = null;
        this.reelBar = { pos: 50, fishPos: 50, fishDir: 1, speed: 0, zone: [35, 65] };
        this.waitTimer = 0;
        this.maxWait = 0;
        this.biteTimer = 0;
        this.catchResult = null;

        // Render
        this.waterY = 120;
        this.particles = [];
        this.bubbles = [];
        this.fishInWater = [];
        this.clouds = [];

        // Stats
        this.totalCaught = 0;
        this.totalValue = 0;
        this.totalGames = 0;
        this.totalWon = 0;
        this.totalLost = 0;
        this.bestCatch = null;
        this.inventory = [];

        // Callbacks
        this.onScoreChange = null;
        this.onGameOver = null;

        this._initScene();
    }

    _initScene() {
        // Background fish swimming
        for (let i = 0; i < 5; i++) {
            this.fishInWater.push({
                x: Math.random() * this.W,
                y: this.waterY + 30 + Math.random() * (this.H - this.waterY - 60),
                speed: 0.3 + Math.random() * 0.5,
                dir: Math.random() > 0.5 ? 1 : -1,
                size: 4 + Math.random() * 6,
                color: this.fishTypes[Math.floor(Math.random() * 4)].color
            });
        }
        // Clouds
        for (let i = 0; i < 3; i++) {
            this.clouds.push({ x: Math.random() * this.W, y: 10 + Math.random() * 30, w: 30 + Math.random() * 40 });
        }
    }

    setBet(amount) { this.currentBet = amount; }

    start() {
        this.phase = 'casting';
        this.running = true;
        this.rod.castPower = 0;
        this.catchResult = null;
        this.totalGames++;
    }

    castLine() {
        if (this.phase !== 'casting') return;
        const power = Math.min(this.rod.castPower, 100);
        this.bobber.x = 80 + (power / 100) * (this.W - 120);
        this.bobber.y = this.waterY - 5;
        this.bobber.sinkDepth = 0;
        this.rod.lineLen = 0;
        this.phase = 'waiting';
        this.waitTimer = 0;
        this.maxWait = 120 + Math.random() * 240; // 2-6 seconds at 60fps
        this._splash(this.bobber.x, this.waterY);
    }

    _splash(x, y) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x, y, vx: (Math.random() - 0.5) * 4, vy: -2 - Math.random() * 3,
                life: 20 + Math.random() * 15, color: '#87CEEB', size: 2
            });
        }
    }

    _pickFish() {
        const totalRate = this.fishTypes.reduce((s, f) => s + f.rate, 0);
        let roll = Math.random() * totalRate;
        for (const fish of this.fishTypes) {
            roll -= fish.rate;
            if (roll <= 0) {
                const w = fish.weight[0] + Math.random() * (fish.weight[1] - fish.weight[0]);
                return { ...fish, actualWeight: Math.round(w * 10) / 10 };
            }
        }
        return { ...this.fishTypes[0], actualWeight: 0.5 };
    }

    update() {
        if (!this.running) return;
        this.tick++;

        // Update particles
        this.particles = this.particles.filter(p => {
            p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life--;
            return p.life > 0;
        });

        // Update bubbles
        this.bubbles = this.bubbles.filter(b => {
            b.y -= 0.5; b.life--;
            return b.life > 0;
        });

        // Background fish
        this.fishInWater.forEach(f => {
            f.x += f.speed * f.dir;
            if (f.x > this.W + 20) f.dir = -1;
            if (f.x < -20) f.dir = 1;
        });

        // Clouds
        this.clouds.forEach(c => { c.x += 0.15; if (c.x > this.W + 50) c.x = -c.w; });

        switch (this.phase) {
            case 'casting':
                this.rod.castPower = Math.min(this.rod.castPower + 1.5, 100);
                break;

            case 'waiting':
                this.waitTimer++;
                this.bobber.sinkDepth = Math.sin(this.tick * 0.08) * 2;
                if (this.tick % 40 === 0) {
                    this.bubbles.push({ x: this.bobber.x + (Math.random()-0.5)*10, y: this.bobber.y + 10, life: 30 });
                }
                if (this.waitTimer >= this.maxWait) {
                    this.hookedFish = this._pickFish();
                    this.phase = 'hooked';
                    this.biteTimer = 0;
                    this._splash(this.bobber.x, this.bobber.y);
                }
                break;

            case 'hooked':
                this.biteTimer++;
                this.bobber.sinkDepth = 4 + Math.sin(this.tick * 0.3) * 3;
                if (this.biteTimer > 90) {
                    // Missed — fish escaped
                    this.phase = 'lost';
                    this.catchResult = { escaped: true, fish: this.hookedFish };
                    this._endGame(false);
                }
                break;

            case 'reeling':
                this._updateReel();
                break;
        }
    }

    startReel() {
        if (this.phase !== 'hooked') return;
        this.phase = 'reeling';
        this.reelBar.pos = 50;
        this.reelBar.fishPos = 50;
        this.reelBar.speed = 1 + this.hookedFish.difficulty * 0.8;
        this.reelBar.fishDir = 1;
        this.reelBar.progress = 0;
        this.reelBar.tension = 50;
    }

    _updateReel() {
        const rb = this.reelBar;
        // Fish moves erratically
        rb.fishPos += rb.fishDir * rb.speed;
        if (Math.random() < 0.05 + this.hookedFish.difficulty * 0.02) rb.fishDir *= -1;
        if (rb.fishPos < 5) { rb.fishPos = 5; rb.fishDir = 1; }
        if (rb.fishPos > 95) { rb.fishPos = 95; rb.fishDir = -1; }

        // Check if player cursor is near fish
        const dist = Math.abs(rb.pos - rb.fishPos);
        if (dist < 15) {
            rb.progress += 0.8;
            rb.tension = Math.max(rb.tension - 0.3, 0);
        } else {
            rb.progress -= 0.3;
            rb.tension += 0.5;
        }
        rb.progress = Math.max(0, Math.min(100, rb.progress));
        rb.tension = Math.max(0, Math.min(100, rb.tension));

        // Win
        if (rb.progress >= 100) {
            this.phase = 'caught';
            this._endGame(true);
        }
        // Lose — line snapped
        if (rb.tension >= 100) {
            this.phase = 'lost';
            this.catchResult = { escaped: true, fish: this.hookedFish, snapped: true };
            this._endGame(false);
        }
    }

    reelMove(dir) {
        if (this.phase !== 'reeling') return;
        this.reelBar.pos += dir * 3;
        this.reelBar.pos = Math.max(0, Math.min(100, this.reelBar.pos));
    }

    _endGame(won) {
        this.running = false;
        const fish = this.hookedFish;
        const bet = this.currentBet;
        let payout = 0;
        if (won && fish) {
            payout = Math.round(bet * fish.value * (1 + fish.actualWeight * 0.2));
            this.totalCaught++;
            this.totalValue += payout;
            this.totalWon += payout;
            this.inventory.push({ name: fish.name, weight: fish.actualWeight, value: payout });
            if (!this.bestCatch || payout > this.bestCatch.value) {
                this.bestCatch = { name: fish.name, weight: fish.actualWeight, value: payout };
            }
        } else {
            this.totalLost += bet;
        }
        const result = {
            win: won, bet, payout,
            fish: fish ? { name: fish.name, emoji: fish.emoji, weight: fish.actualWeight, color: fish.color } : null,
            totalCaught: this.totalCaught
        };
        this.catchResult = result;
        if (this.onGameOver) this.onGameOver(result);
    }

    getStats() {
        return { totalGames: this.totalGames, totalCaught: this.totalCaught, totalWon: this.totalWon, totalLost: this.totalLost };
    }

    render() {
        const ctx = this.ctx;
        const W = this.W, H = this.H;
        ctx.clearRect(0, 0, W, H);

        // Sky gradient
        const skyGrad = ctx.createLinearGradient(0, 0, 0, this.waterY);
        skyGrad.addColorStop(0, '#1a1a3e');
        skyGrad.addColorStop(0.5, '#2d4a7a');
        skyGrad.addColorStop(1, '#4a8bb5');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, W, this.waterY);

        // Stars
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        for (let i = 0; i < 12; i++) {
            const sx = (i * 37 + 13) % W, sy = (i * 19 + 7) % (this.waterY - 20);
            ctx.fillRect(sx, sy, 1, 1);
        }

        // Moon
        ctx.fillStyle = '#ffd93d';
        ctx.beginPath(); ctx.arc(W - 40, 25, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1a1a3e';
        ctx.beginPath(); ctx.arc(W - 35, 22, 10, 0, Math.PI * 2); ctx.fill();

        // Clouds
        ctx.fillStyle = 'rgba(200,220,240,0.15)';
        this.clouds.forEach(c => {
            ctx.fillRect(c.x, c.y, c.w, 8);
            ctx.fillRect(c.x + 5, c.y - 4, c.w - 10, 6);
        });

        // Water
        const waterGrad = ctx.createLinearGradient(0, this.waterY, 0, H);
        waterGrad.addColorStop(0, '#1a6b8a');
        waterGrad.addColorStop(0.3, '#155a75');
        waterGrad.addColorStop(1, '#0a3a4f');
        ctx.fillStyle = waterGrad;
        ctx.fillRect(0, this.waterY, W, H - this.waterY);

        // Water surface waves
        ctx.fillStyle = 'rgba(100,200,240,0.3)';
        for (let wx = 0; wx < W; wx += 20) {
            const wy = Math.sin(this.tick * 0.05 + wx * 0.03) * 2;
            ctx.fillRect(wx, this.waterY + wy, 15, 2);
        }

        // Background fish
        this.fishInWater.forEach(f => {
            ctx.fillStyle = f.color;
            const fx = f.dir > 0 ? f.x : f.x + f.size;
            ctx.fillRect(fx, f.y, f.size, f.size * 0.5);
            ctx.fillRect(fx - 2 * f.dir, f.y + 1, 3, f.size * 0.3); // tail
        });

        // Bubbles
        ctx.fillStyle = 'rgba(150,220,255,0.5)';
        this.bubbles.forEach(b => { ctx.fillRect(b.x, b.y, 2, 2); });

        // Boat (player's boat)
        this._drawBoat(ctx);

        // Fishing rod & line
        this._drawRod(ctx);

        // Bobber
        if (this.phase !== 'idle' && this.phase !== 'casting') {
            this._drawBobber(ctx);
        }

        // Particles
        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);
        });

        // Reel mini-game bar
        if (this.phase === 'reeling') {
            this._drawReelBar(ctx);
        }

        // Caught / Lost overlay
        if (this.phase === 'caught' || this.phase === 'lost') {
            this._drawResult(ctx);
        }

        // Idle instructions
        if (this.phase === 'idle') {
            this._drawIdleScreen(ctx);
        }

        // Casting power bar
        if (this.phase === 'casting') {
            this._drawPowerBar(ctx);
        }
    }

    _drawBoat(ctx) {
        const bx = 20, by = this.waterY - 18;
        // Hull
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(bx, by + 10, 50, 12);
        ctx.fillStyle = '#A0522D';
        ctx.fillRect(bx + 3, by + 12, 44, 8);
        // Bow
        ctx.fillStyle = '#6B3410';
        ctx.fillRect(bx + 48, by + 12, 6, 8);
        // Deck
        ctx.fillStyle = '#DEB887';
        ctx.fillRect(bx + 5, by + 8, 40, 4);
        // Cabin
        ctx.fillStyle = '#CD853F';
        ctx.fillRect(bx + 8, by, 16, 10);
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(bx + 10, by + 2, 5, 4); // window
        ctx.fillRect(bx + 17, by + 2, 5, 4);
        // Roof
        ctx.fillStyle = '#8B0000';
        ctx.fillRect(bx + 6, by - 3, 20, 4);
        // Ripples
        const r = Math.sin(this.tick * 0.06) * 1;
        ctx.fillStyle = 'rgba(100,200,240,0.3)';
        ctx.fillRect(bx - 3, by + 20 + r, 60, 2);
        ctx.fillRect(bx - 6, by + 24 - r, 64, 1);
    }

    _drawRod(ctx) {
        const rx = 55, ry = this.waterY - 15;
        // Rod
        ctx.fillStyle = '#5C4033';
        ctx.fillRect(rx, ry - 25, 2, 28);
        ctx.fillRect(rx - 1, ry - 28, 4, 3);
        // Reel
        ctx.fillStyle = '#888';
        ctx.fillRect(rx - 1, ry - 8, 4, 4);

        // Line
        if (this.phase !== 'idle' && this.phase !== 'casting') {
            ctx.strokeStyle = '#ccc';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(rx + 1, ry - 28);
            ctx.lineTo(this.bobber.x, this.bobber.y + this.bobber.sinkDepth);
            ctx.stroke();
        }
    }

    _drawBobber(ctx) {
        const bx = this.bobber.x, by = this.bobber.y + this.bobber.sinkDepth;
        // Bobber float
        ctx.fillStyle = '#FF4444';
        ctx.fillRect(bx - 2, by - 4, 4, 4);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(bx - 2, by, 4, 3);
        // Stick
        ctx.fillStyle = '#333';
        ctx.fillRect(bx - 0.5, by - 7, 1, 4);

        if (this.phase === 'hooked') {
            // Exclamation
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('❗', bx, by - 14);
            // Splash
            if (this.tick % 6 < 3) {
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                ctx.fillRect(bx - 6, by - 2, 3, 2);
                ctx.fillRect(bx + 4, by - 1, 3, 2);
            }
        }
    }

    _drawPowerBar(ctx) {
        const bx = this.W / 2 - 40, by = this.H - 50;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(bx - 5, by - 5, 90, 25);
        ctx.fillStyle = '#333';
        ctx.fillRect(bx, by, 80, 15);
        const pct = this.rod.castPower / 100;
        const c = pct < 0.5 ? '#4ecdc4' : pct < 0.8 ? '#ffd93d' : '#ff6b6b';
        ctx.fillStyle = c;
        ctx.fillRect(bx, by, 80 * pct, 15);
        ctx.fillStyle = '#fff';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GIỮ & THẢ ĐỂ QUĂNG', bx + 40, by - 10);
    }

    _drawReelBar(ctx) {
        const rb = this.reelBar;
        const bx = 20, by = this.H - 80, bw = this.W - 40, bh = 20;

        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(bx - 5, by - 25, bw + 10, 55);

        // Progress bar
        ctx.fillStyle = '#333';
        ctx.fillRect(bx, by - 18, bw, 8);
        ctx.fillStyle = '#4ecdc4';
        ctx.fillRect(bx, by - 18, bw * rb.progress / 100, 8);

        // Tension bar
        ctx.fillStyle = '#333';
        ctx.fillRect(bx, by + 22, bw, 6);
        const tc = rb.tension < 60 ? '#27ae60' : rb.tension < 80 ? '#f39c12' : '#e74c3c';
        ctx.fillStyle = tc;
        ctx.fillRect(bx, by + 22, bw * rb.tension / 100, 6);
        ctx.fillStyle = '#fff';
        ctx.font = '6px monospace';
        ctx.fillText('SỨC CĂNG', bx, by + 20);

        // Main reel bar
        ctx.fillStyle = '#1a3a5a';
        ctx.fillRect(bx, by, bw, bh);

        // Safe zone
        ctx.fillStyle = 'rgba(78,205,196,0.3)';
        const zx = bx + (rb.zone[0] / 100) * bw;
        const zw = ((rb.zone[1] - rb.zone[0]) / 100) * bw;
        ctx.fillRect(zx, by, zw, bh);

        // Fish marker
        const fishX = bx + (rb.fishPos / 100) * bw;
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(fishX - 4, by + 2, 8, bh - 4);
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.fillText('🐟', fishX - 5, by + 15);

        // Player cursor
        const plX = bx + (rb.pos / 100) * bw;
        ctx.fillStyle = '#ffd93d';
        ctx.fillRect(plX - 2, by - 2, 4, bh + 4);

        ctx.fillStyle = '#fff';
        ctx.font = '7px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('← → DI CHUYỂN ĐỂ BẮT CÁ', bx + bw / 2, by - 3);
    }

    _drawResult(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, this.W, this.H);

        const cx = this.W / 2, cy = this.H / 2 - 20;
        ctx.textAlign = 'center';

        if (this.phase === 'caught' && this.catchResult && this.catchResult.fish) {
            const f = this.catchResult.fish;
            ctx.fillStyle = '#ffd93d';
            ctx.font = 'bold 14px monospace';
            ctx.fillText('🎣 BẮT ĐƯỢC!', cx, cy - 40);

            ctx.font = '24px monospace';
            ctx.fillText(f.emoji, cx, cy);

            ctx.fillStyle = '#fff';
            ctx.font = '10px monospace';
            ctx.fillText(f.name, cx, cy + 20);
            ctx.fillText(f.weight + ' kg', cx, cy + 35);

            ctx.fillStyle = '#4ecdc4';
            ctx.font = 'bold 12px monospace';
            ctx.fillText('+' + this.catchResult.payout + 'Ⓒ', cx, cy + 55);
        } else {
            ctx.fillStyle = '#ff6b6b';
            ctx.font = 'bold 14px monospace';
            ctx.fillText('💨 CÁ THOÁT!', cx, cy - 10);
            ctx.fillStyle = '#aaa';
            ctx.font = '9px monospace';
            ctx.fillText(this.catchResult && this.catchResult.snapped ? 'Dây câu bị đứt!' : 'Bạn không kịp kéo!', cx, cy + 15);
        }

        ctx.fillStyle = '#888';
        ctx.font = '8px monospace';
        ctx.fillText('Click để chơi tiếp', cx, cy + 80);
    }

    _drawIdleScreen(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(0, this.waterY + 40, this.W, 60);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd93d';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('🎣 FISHING & LIFE', this.W / 2, this.waterY + 58);
        ctx.fillStyle = '#fff';
        ctx.font = '8px monospace';
        ctx.fillText('Nhấn BẮT ĐẦU để câu cá!', this.W / 2, this.waterY + 75);
    }

    destroy() {
        this.running = false;
        this.ctx = null;
        this.canvas = null;
    }
}

window.FishingGame = FishingGame;
