/**
 * Billiards UI v1.0 — Visual pool table overlay for PixelAgent City
 * Canvas-based rendering with pixel-art aesthetic
 */
class BilliardUI {
    constructor(containerEl, game) {
        this.container = containerEl || document.getElementById('billiardOverlay');
        this.game = game;
        this.isOpen = false;
        this.onClose = () => {};
        this._logLines = [];
        this.canvas = null;
        this.ctx = null;
        this._animFrame = null;
        this._cueAnim = { active: false, angle: 0, progress: 0 };
    }

    show() {
        this.isOpen = true;
        this._logLines = [];
        this.container.style.display = 'flex';
        this._buildUI();
        requestAnimationFrame(() => this.container.classList.add('open'));
        this._startRenderLoop();
    }

    close() {
        this.container.classList.remove('open');
        if (this._animFrame) {
            cancelAnimationFrame(this._animFrame);
            this._animFrame = null;
        }
        setTimeout(() => {
            this.container.style.display = 'none';
            this.isOpen = false;
            if (this.game) this.game.stop();
            this.onClose();
        }, 300);
    }

    _buildUI() {
        const state = this.game.getState();
        this.container.innerHTML = `
            <div class="billiard-scene">
                <div class="billiard-close-btn" id="billiardCloseBtn" title="Đóng">✕</div>
                
                <div class="billiard-header">
                    <div class="billiard-player-score p1 ${state.currentPlayerIndex === 0 ? 'active' : ''}">
                        <span class="bp-emoji">${state.players[0]?.emoji || '🤖'}</span>
                        <span class="bp-name">${state.players[0]?.name || 'Player 1'}</span>
                        <span class="bp-group" id="bp1Group"></span>
                        <div class="bp-pocketed" id="bp1Balls"></div>
                    </div>
                    <div class="billiard-center-info">
                        <div class="billiard-phase" id="billiardPhase">⏳ Chờ bắt đầu...</div>
                        <div class="billiard-turn" id="billiardTurn">Lượt #0</div>
                    </div>
                    <div class="billiard-player-score p2 ${state.currentPlayerIndex === 1 ? 'active' : ''}">
                        <span class="bp-emoji">${state.players[1]?.emoji || '🤖'}</span>
                        <span class="bp-name">${state.players[1]?.name || 'Player 2'}</span>
                        <span class="bp-group" id="bp2Group"></span>
                        <div class="bp-pocketed" id="bp2Balls"></div>
                    </div>
                </div>

                <div class="billiard-table-container">
                    <canvas id="billiardCanvas" width="560" height="300"></canvas>
                </div>

                <div class="billiard-log" id="billiardLog"></div>

                <div class="billiard-controls">
                    ${state.phase === 'waiting' ? '<button class="billiard-btn billiard-btn-start" id="billiardStartBtn">🎱 Bắt đầu chơi</button>' : ''}
                    ${state.phase === 'finished' ? '<button class="billiard-btn billiard-btn-start" id="billiardNewBtn">🔄 Ván mới</button>' : ''}
                    <button class="billiard-btn billiard-btn-close" id="billiardCloseBtnAlt">🚪 Đóng bàn</button>
                </div>
            </div>
        `;

        this.canvas = document.getElementById('billiardCanvas');
        this.ctx = this.canvas.getContext('2d');

        this._bindEvents();
    }

    _bindEvents() {
        this.container.querySelector('#billiardCloseBtn')?.addEventListener('click', () => this.close());
        this.container.querySelector('#billiardCloseBtnAlt')?.addEventListener('click', () => this.close());
        this.container.querySelector('#billiardStartBtn')?.addEventListener('click', () => {
            if (this.game) this.game.start();
            this._updateControls();
        });
        this.container.querySelector('#billiardNewBtn')?.addEventListener('click', () => {
            if (this.game) {
                this.game.reset();
                this.game.start();
                this._logLines = [];
                this._updateControls();
            }
        });
    }

    _updateControls() {
        const controls = this.container.querySelector('.billiard-controls');
        if (!controls) return;
        const state = this.game.getState();
        let html = '';
        if (state.phase === 'waiting') html += '<button class="billiard-btn billiard-btn-start" id="billiardStartBtn">🎱 Bắt đầu chơi</button>';
        if (state.phase === 'finished') html += '<button class="billiard-btn billiard-btn-start" id="billiardNewBtn">🔄 Ván mới</button>';
        html += '<button class="billiard-btn billiard-btn-close" id="billiardCloseBtnAlt">🚪 Đóng bàn</button>';
        controls.innerHTML = html;
        this._bindEvents();
    }

    attach(game) {
        this.game = game;
        const self = this;
        game.onUpdate = () => self._render();
        game.onPhaseChange = (phase) => {
            self._updateScoreboard();
            self._updateControls();
        };
        game.onGameLog = (msg) => {
            self._logLines.unshift(msg);
            if (self._logLines.length > 20) self._logLines.pop();
            self._updateLog();
        };
        game.onGameComplete = () => {
            self._updateScoreboard();
            self._updateControls();
        };
    }

    _startRenderLoop() {
        const loop = () => {
            if (!this.isOpen) return;
            this._render();
            this._animFrame = requestAnimationFrame(loop);
        };
        this._animFrame = requestAnimationFrame(loop);
    }

    // ============ CANVAS RENDERING ============
    _render() {
        if (!this.ctx || !this.canvas) return;
        const ctx = this.ctx;
        const state = this.game.getState();
        const W = state.tableW;
        const H = state.tableH;

        // Clear
        ctx.clearRect(0, 0, W, H);

        // Table felt (green)
        ctx.fillStyle = '#1a6b3a';
        ctx.fillRect(0, 0, W, H);

        // Felt texture lines
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        for (let i = 0; i < W; i += 12) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, H);
            ctx.stroke();
        }

        // Cushion rails (darker green border)
        const rail = 8;
        ctx.fillStyle = '#0d5228';
        ctx.fillRect(0, 0, W, rail);      // top
        ctx.fillRect(0, H - rail, W, rail); // bottom
        ctx.fillRect(0, 0, rail, H);       // left
        ctx.fillRect(W - rail, 0, rail, H); // right

        // Wood border
        ctx.strokeStyle = '#5a3a1e';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, W, H);
        ctx.strokeStyle = '#7d5835';
        ctx.lineWidth = 2;
        ctx.strokeRect(2, 2, W - 4, H - 4);

        // Head string line
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(W * 0.25, rail);
        ctx.lineTo(W * 0.25, H - rail);
        ctx.stroke();
        ctx.setLineDash([]);

        // Foot spot
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.arc(W * 0.72, H / 2, 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw pockets
        for (const pocket of state.pockets) {
            // Pocket shadow
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.beginPath();
            ctx.arc(pocket.x, pocket.y, BILLIARD_CONFIG.pocketRadius + 2, 0, Math.PI * 2);
            ctx.fill();
            // Pocket hole
            ctx.fillStyle = '#0a0a0a';
            ctx.beginPath();
            ctx.arc(pocket.x, pocket.y, BILLIARD_CONFIG.pocketRadius, 0, Math.PI * 2);
            ctx.fill();
            // Inner glow
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.arc(pocket.x, pocket.y, BILLIARD_CONFIG.pocketRadius - 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw balls
        for (const ball of state.balls) {
            this._drawBall(ctx, ball, state);
        }

        // Draw aiming arrow
        if (state.phase === 'aiming' && state.aimData) {
            this._drawAimArrow(ctx, state.aimData, state);
        }

        // Draw cue stick animation if shooting
        if (state.phase === 'shooting') {
            const cueBall = state.balls.find(b => b.type === 'cue');
            if (cueBall && (Math.abs(cueBall.vx) > 0.5 || Math.abs(cueBall.vy) > 0.5)) {
                // Draw motion trail
                ctx.globalAlpha = 0.15;
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(cueBall.x - cueBall.vx * 2, cueBall.y - cueBall.vy * 2, cueBall.radius - 1, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }

        // Winner overlay
        if (state.phase === 'finished' && state.winner) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, W, H);
            
            ctx.fillStyle = '#ffd93d';
            ctx.font = 'bold 24px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('🏆 WINNER!', W / 2, H / 2 - 15);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px "Press Start 2P", monospace';
            ctx.fillText(`${state.winner.emoji} ${state.winner.name}`, W / 2, H / 2 + 15);
            ctx.textAlign = 'left';
        }

        this._updateScoreboard();
    }

    _drawBall(ctx, ball, state) {
        const r = ball.radius;

        // Ball shadow
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.arc(ball.x + 1.5, ball.y + 1.5, r, 0, Math.PI * 2);
        ctx.fill();

        // Ball body
        ctx.fillStyle = ball.color;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2);
        ctx.fill();

        // Stripe band
        if (ball.stripe) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2);
            ctx.fill();
            // Color stripe across middle
            ctx.fillStyle = ball.color;
            ctx.beginPath();
            ctx.moveTo(ball.x - r, ball.y - r * 0.35);
            ctx.lineTo(ball.x + r, ball.y - r * 0.35);
            ctx.lineTo(ball.x + r, ball.y + r * 0.35);
            ctx.lineTo(ball.x - r, ball.y + r * 0.35);
            ctx.closePath();
            ctx.fill();
            // Round the stripe
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, r * 0.55, 0, Math.PI * 2);
            ctx.fill();
        }

        // Number circle (for numbered balls)
        if (ball.number > 0) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, r * 0.45, 0, Math.PI * 2);
            ctx.fill();

            // Number text
            ctx.fillStyle = '#000000';
            ctx.font = `bold ${r * 0.75}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(ball.number), ball.x, ball.y + 0.5);
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
        }

        // Highlight / shine
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.arc(ball.x - r * 0.25, ball.y - r * 0.25, r * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Current player indicator for cue ball
        if (ball.type === 'cue' && (state.phase === 'playing' || state.phase === 'aiming')) {
            const pulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.5;
            ctx.strokeStyle = `rgba(78, 205, 196, ${pulse})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, r + 4, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    _drawAimArrow(ctx, aimData, state) {
        const { angle, power, cueBallX, cueBallY, targetBall, targetPocket } = aimData;
        const arrowLen = Math.min(120, power * 12);

        // Calculate arrow end point
        const endX = cueBallX + Math.cos(angle) * arrowLen;
        const endY = cueBallY + Math.sin(angle) * arrowLen;

        // Pulsing opacity
        const pulse = Math.sin(Date.now() * 0.006) * 0.1 + 0.35;

        // Draw dashed aim line from cue ball
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(cueBallX, cueBallY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Arrowhead
        const headLen = 8;
        const headAngle = 0.45;
        ctx.globalAlpha = pulse + 0.15;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
            endX - headLen * Math.cos(angle - headAngle),
            endY - headLen * Math.sin(angle - headAngle)
        );
        ctx.lineTo(
            endX - headLen * Math.cos(angle + headAngle),
            endY - headLen * Math.sin(angle + headAngle)
        );
        ctx.closePath();
        ctx.fill();

        // Highlight target ball with a ring
        if (targetBall && !targetBall.pocketed) {
            ctx.globalAlpha = pulse + 0.1;
            ctx.strokeStyle = '#ffd93d';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(targetBall.x, targetBall.y, targetBall.radius + 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw dotted line from target ball to pocket (if available)
        if (targetBall && targetPocket && !targetBall.pocketed) {
            ctx.globalAlpha = pulse * 0.5;
            ctx.strokeStyle = '#ffd93d';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 5]);
            ctx.beginPath();
            ctx.moveTo(targetBall.x, targetBall.y);
            ctx.lineTo(targetPocket.x, targetPocket.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Power indicator (small bar near cue ball)
        const barW = 30;
        const barH = 3;
        const barX = cueBallX - barW / 2;
        const barY = cueBallY + 14;
        const fillRatio = power / BILLIARD_CONFIG.maxPower;

        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barW, barH);
        
        const powerColor = fillRatio > 0.7 ? '#e74c3c' : fillRatio > 0.4 ? '#f39c12' : '#27ae60';
        ctx.fillStyle = powerColor;
        ctx.fillRect(barX, barY, barW * fillRatio, barH);

        ctx.restore();
    }

    _updateScoreboard() {
        const state = this.game.getState();
        if (!state.players[0]) return;

        // Phase
        const phaseEl = document.getElementById('billiardPhase');
        if (phaseEl) {
            const labels = {
                waiting: '⏳ Chờ bắt đầu...',
                playing: `🎯 Lượt ${state.currentPlayer?.name || ''}`,
                aiming: `🎯 ${state.currentPlayer?.name || ''} đang ngắm...`,
                shooting: '🏌️ Đang đánh...',
                finished: `🏆 ${state.winner?.name || ''} THẮNG!`,
            };
            phaseEl.textContent = labels[state.phase] || state.phase;
            phaseEl.className = `billiard-phase ${state.phase}`;
        }

        // Turn
        const turnEl = document.getElementById('billiardTurn');
        if (turnEl) turnEl.textContent = `Lượt #${state.turnNumber}`;

        // Player scores
        const p1Score = this.container.querySelector('.billiard-player-score.p1');
        const p2Score = this.container.querySelector('.billiard-player-score.p2');
        if (p1Score) p1Score.classList.toggle('active', state.currentPlayerIndex === 0 && state.phase !== 'finished');
        if (p2Score) p2Score.classList.toggle('active', state.currentPlayerIndex === 1 && state.phase !== 'finished');

        // Winner badge
        if (state.phase === 'finished' && state.winner) {
            const winnerIdx = state.players.findIndex(p => p.id === state.winner.id);
            const winnerEl = winnerIdx === 0 ? p1Score : p2Score;
            if (winnerEl) winnerEl.classList.add('winner');
        }

        // Group labels
        const g1 = document.getElementById('bp1Group');
        const g2 = document.getElementById('bp2Group');
        if (g1 && state.players[0].group) g1.textContent = state.players[0].group === 'solids' ? '● Trơn (1-7)' : '◐ Sọc (9-15)';
        if (g2 && state.players[1].group) g2.textContent = state.players[1].group === 'solids' ? '● Trơn (1-7)' : '◐ Sọc (9-15)';

        // Pocketed balls display
        this._renderPocketedBalls('bp1Balls', state.players[0]);
        this._renderPocketedBalls('bp2Balls', state.players[1]);
    }

    _renderPocketedBalls(elId, player) {
        const el = document.getElementById(elId);
        if (!el) return;
        const balls = player.pocketed || [];
        el.innerHTML = balls.map(num => {
            const color = BILLIARD_COLORS[num] || '#888';
            const isStripe = num > 8;
            return `<span class="bp-ball ${isStripe ? 'stripe' : 'solid'}" style="background:${color}">${num}</span>`;
        }).join('');
    }

    _updateLog() {
        const logEl = document.getElementById('billiardLog');
        if (!logEl) return;
        logEl.innerHTML = this._logLines.slice(0, 8).map(msg =>
            `<div class="billiard-log-entry">${msg}</div>`
        ).join('');
    }
}

// ============ GLOBAL EXPORT ============
window.BilliardUI = BilliardUI;
