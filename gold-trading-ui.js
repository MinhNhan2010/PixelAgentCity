/**
 * Gold Trading UI — PixelAgent City
 * Bloomberg-style terminal with candlestick chart, order book, portfolio
 */
class GoldTradingUI {
    constructor(overlayEl, goldSystem) {
        this.overlay = overlayEl;
        this.gold = goldSystem;
        this.players = [];
        this.onClose = null;
        this._chartCanvas = null;
        this._chartCtx = null;
        this._refreshTimer = null;
        this._tickTimer = null;
    }

    show() {
        this.overlay.innerHTML = '';
        this.overlay.classList.add('show');
        this._build();
        this._startTicking();
    }

    hide() {
        this.overlay.classList.remove('show');
        this._stopTicking();
        setTimeout(() => { this.overlay.innerHTML = ''; }, 300);
        if (this.onClose) this.onClose();
    }

    _startTicking() {
        // Price tick every 2 seconds
        this._tickTimer = setInterval(() => {
            this.gold.tick(1);
            this._updateAll();
        }, 2000);
        // Chart redraw every 1s
        this._refreshTimer = setInterval(() => {
            this._drawChart();
        }, 1000);
    }

    _stopTicking() {
        if (this._tickTimer) { clearInterval(this._tickTimer); this._tickTimer = null; }
        if (this._refreshTimer) { clearInterval(this._refreshTimer); this._refreshTimer = null; }
    }

    _build() {
        const state = this.gold.getState();
        const html = `
        <div class="gold-terminal">
            <div class="gold-header">
                <div class="gold-header-left">
                    <span class="gold-ticker-symbol">XAU/USD</span>
                    <span class="gold-ticker-name">Gold Spot</span>
                </div>
                <div class="gold-header-center">
                    <span class="gold-price-big" id="goldPriceBig">$${state.price.toFixed(2)}</span>
                    <span class="gold-price-change ${state.change >= 0 ? 'up' : 'down'}" id="goldPriceChange">
                        ${state.change >= 0 ? '▲' : '▼'} ${Math.abs(state.change).toFixed(2)} (${state.pct >= 0 ? '+' : ''}${state.pct.toFixed(2)}%)
                    </span>
                </div>
                <div class="gold-header-right">
                    <span class="gold-market-status" id="goldMarketStatus">🟢 MARKET OPEN</span>
                    <button class="gold-close-btn" id="goldCloseBtn">✕</button>
                </div>
            </div>

            <div class="gold-body">
                <!-- Chart Area -->
                <div class="gold-chart-area">
                    <div class="gold-chart-header">
                        <span class="gold-chart-label">📊 Candlestick Chart — XAU/USD</span>
                        <div class="gold-ohlc" id="goldOHLC">
                            <span>O: <b>${state.openPrice.toFixed(2)}</b></span>
                            <span>H: <b>${state.dayHigh.toFixed(2)}</b></span>
                            <span>L: <b>${state.dayLow.toFixed(2)}</b></span>
                            <span>C: <b>${state.price.toFixed(2)}</b></span>
                        </div>
                    </div>
                    <div class="gold-chart-container">
                        <canvas id="goldChart" width="600" height="250"></canvas>
                    </div>
                </div>

                <!-- Trading Panel  -->
                <div class="gold-trade-panel">
                    <!-- Portfolio -->
                    <div class="gold-portfolio">
                        <div class="gold-panel-title">💰 Danh Mục</div>
                        <div class="gold-portfolio-grid">
                            <div class="gold-port-item">
                                <span class="gold-port-label">Vàng nắm giữ</span>
                                <span class="gold-port-value" id="goldHeld">${state.goldHeld.toFixed(4)} oz</span>
                            </div>
                            <div class="gold-port-item">
                                <span class="gold-port-label">Giá TB mua</span>
                                <span class="gold-port-value" id="goldAvgPrice">$${state.avgBuyPrice.toFixed(2)}</span>
                            </div>
                            <div class="gold-port-item">
                                <span class="gold-port-label">Giá trị</span>
                                <span class="gold-port-value" id="goldPortValue">${state.portfolioValue}Ⓒ</span>
                            </div>
                            <div class="gold-port-item">
                                <span class="gold-port-label">Unrealized P&L</span>
                                <span class="gold-port-value ${state.unrealizedPnL >= 0 ? 'profit' : 'loss'}" id="goldUnrealPnl">
                                    ${state.unrealizedPnL >= 0 ? '+' : ''}${state.unrealizedPnL}Ⓒ
                                </span>
                            </div>
                            <div class="gold-port-item">
                                <span class="gold-port-label">Realized P&L</span>
                                <span class="gold-port-value ${state.realizedPnL >= 0 ? 'profit' : 'loss'}" id="goldRealPnl">
                                    ${state.realizedPnL >= 0 ? '+' : ''}${state.realizedPnL}Ⓒ
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Order Form -->
                    <div class="gold-order-form">
                        <div class="gold-panel-title">📝 Đặt Lệnh</div>
                        <div class="gold-order-amount">
                            <label>Số lượng (oz):</label>
                            <div class="gold-amount-presets">
                                <button class="gold-amt-btn active" data-oz="0.01">0.01</button>
                                <button class="gold-amt-btn" data-oz="0.05">0.05</button>
                                <button class="gold-amt-btn" data-oz="0.1">0.1</button>
                                <button class="gold-amt-btn" data-oz="0.5">0.5</button>
                                <button class="gold-amt-btn" data-oz="1">1.0</button>
                            </div>
                            <div class="gold-order-cost">
                                <span>Chi phí: </span>
                                <span id="goldOrderCost">~${this.gold.getCostForOunces(0.01)}Ⓒ</span>
                            </div>
                        </div>
                        <div class="gold-order-btns">
                            <button class="gold-buy-btn" id="goldBuyBtn">
                                <span class="gold-btn-icon">📈</span>
                                <span>MUA (BUY)</span>
                            </button>
                            <button class="gold-sell-btn" id="goldSellBtn">
                                <span class="gold-btn-icon">📉</span>
                                <span>BÁN (SELL)</span>
                            </button>
                        </div>
                        <button class="gold-sell-all-btn" id="goldSellAllBtn">🏧 Bán Toàn Bộ</button>
                    </div>

                    <!-- Balance -->
                    <div class="gold-balance-bar">
                        <span>💰 Coins:</span>
                        <span class="gold-balance-value" id="goldBalance">0Ⓒ</span>
                    </div>
                </div>
            </div>

            <!-- News Ticker -->
            <div class="gold-news-ticker" id="goldNewsTicker">
                <span class="gold-news-label">📰 NEWS:</span>
                <span class="gold-news-text" id="goldNewsText">Thị trường vàng đang hoạt động...</span>
            </div>

            <!-- Players -->
            <div class="gold-players" id="goldPlayers"></div>
        </div>`;

        this.overlay.innerHTML = html;

        // Cache elements
        this._chartCanvas = document.getElementById('goldChart');
        this._chartCtx = this._chartCanvas.getContext('2d');

        // Events
        document.getElementById('goldCloseBtn').onclick = () => this.hide();

        // Amount preset buttons
        this._selectedOz = 0.01;
        document.querySelectorAll('.gold-amt-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.gold-amt-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this._selectedOz = parseFloat(btn.dataset.oz);
                this._updateOrderCost();
            };
        });

        // Buy/Sell buttons
        document.getElementById('goldBuyBtn').onclick = () => this._doBuy();
        document.getElementById('goldSellBtn').onclick = () => this._doSell();
        document.getElementById('goldSellAllBtn').onclick = () => this._doSellAll();

        // Gold system callbacks
        this.gold.onMarketEvent = (evt) => {
            const newsText = document.getElementById('goldNewsText');
            if (newsText) newsText.textContent = evt.text;
        };

        this._renderPlayers();
        this._drawChart();
        this._updateAll();
    }

    setBalance(coins) {
        const el = document.getElementById('goldBalance');
        if (el) el.textContent = coins + 'Ⓒ';
    }

    _updateOrderCost() {
        const el = document.getElementById('goldOrderCost');
        if (el) el.textContent = `~${this.gold.getCostForOunces(this._selectedOz)}Ⓒ`;
    }

    _doBuy() {
        if (this.onBuyRequest) {
            this.onBuyRequest(this._selectedOz);
        }
    }

    _doSell() {
        if (this.onSellRequest) {
            this.onSellRequest(this._selectedOz);
        }
    }

    _doSellAll() {
        if (this.onSellAllRequest) {
            this.onSellAllRequest();
        }
    }

    _updateAll() {
        const state = this.gold.getState();

        // Price
        const priceEl = document.getElementById('goldPriceBig');
        if (priceEl) priceEl.textContent = `$${state.price.toFixed(2)}`;

        const changeEl = document.getElementById('goldPriceChange');
        if (changeEl) {
            const up = state.change >= 0;
            changeEl.textContent = `${up ? '▲' : '▼'} ${Math.abs(state.change).toFixed(2)} (${state.pct >= 0 ? '+' : ''}${state.pct.toFixed(2)}%)`;
            changeEl.className = `gold-price-change ${up ? 'up' : 'down'}`;
        }

        // OHLC
        const ohlc = document.getElementById('goldOHLC');
        if (ohlc) {
            ohlc.innerHTML = `
                <span>O: <b>${state.openPrice.toFixed(2)}</b></span>
                <span>H: <b>${state.dayHigh.toFixed(2)}</b></span>
                <span>L: <b>${state.dayLow.toFixed(2)}</b></span>
                <span>C: <b>${state.price.toFixed(2)}</b></span>`;
        }

        // Portfolio
        const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
        set('goldHeld', state.goldHeld.toFixed(4) + ' oz');
        set('goldAvgPrice', '$' + state.avgBuyPrice.toFixed(2));
        set('goldPortValue', state.portfolioValue + 'Ⓒ');

        const unrealEl = document.getElementById('goldUnrealPnl');
        if (unrealEl) {
            unrealEl.textContent = (state.unrealizedPnL >= 0 ? '+' : '') + state.unrealizedPnL + 'Ⓒ';
            unrealEl.className = `gold-port-value ${state.unrealizedPnL >= 0 ? 'profit' : 'loss'}`;
        }
        const realEl = document.getElementById('goldRealPnl');
        if (realEl) {
            realEl.textContent = (state.realizedPnL >= 0 ? '+' : '') + state.realizedPnL + 'Ⓒ';
            realEl.className = `gold-port-value ${state.realizedPnL >= 0 ? 'profit' : 'loss'}`;
        }

        this._updateOrderCost();

        // News
        if (state.marketEvent) {
            const newsText = document.getElementById('goldNewsText');
            if (newsText) newsText.textContent = state.marketEvent.text;
        }
    }

    // === CANDLESTICK CHART ===
    _drawChart() {
        const canvas = this._chartCanvas;
        if (!canvas) return;
        const ctx = this._chartCtx;
        const W = canvas.width;
        const H = canvas.height;
        const history = this.gold.priceHistory;

        if (history.length < 2) return;

        ctx.clearRect(0, 0, W, H);

        // Background
        const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
        bgGrad.addColorStop(0, '#0a1628');
        bgGrad.addColorStop(1, '#0d1f33');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // Price range
        let minP = Infinity, maxP = -Infinity;
        history.forEach(c => { minP = Math.min(minP, c.low); maxP = Math.max(maxP, c.high); });
        const padding = (maxP - minP) * 0.1 || 5;
        minP -= padding;
        maxP += padding;
        const range = maxP - minP || 1;

        const PAD_L = 55, PAD_R = 10, PAD_T = 10, PAD_B = 25;
        const chartW = W - PAD_L - PAD_R;
        const chartH = H - PAD_T - PAD_B;

        const priceToY = (p) => PAD_T + chartH - ((p - minP) / range) * chartH;

        // Grid lines
        ctx.strokeStyle = 'rgba(78, 205, 196, 0.08)';
        ctx.lineWidth = 1;
        const gridLines = 5;
        for (let i = 0; i <= gridLines; i++) {
            const y = PAD_T + (chartH / gridLines) * i;
            ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(W - PAD_R, y); ctx.stroke();
            // Price label
            const price = maxP - (range / gridLines) * i;
            ctx.fillStyle = 'rgba(78, 205, 196, 0.5)';
            ctx.font = '9px "Press Start 2P", monospace';
            ctx.textAlign = 'right';
            ctx.fillText(price.toFixed(1), PAD_L - 5, y + 3);
        }

        // Candles
        const candleCount = history.length;
        const candleW = Math.max(3, Math.floor(chartW / candleCount) - 2);
        const gap = Math.max(1, Math.floor((chartW - candleW * candleCount) / candleCount));

        history.forEach((candle, i) => {
            const x = PAD_L + i * (candleW + gap);
            const isUp = candle.close >= candle.open;
            const color = isUp ? '#00d4aa' : '#ff4757';
            const bodyColor = isUp ? '#00d4aa' : '#ff4757';

            // Wick (high-low line)
            const wickX = x + candleW / 2;
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(wickX, priceToY(candle.high));
            ctx.lineTo(wickX, priceToY(candle.low));
            ctx.stroke();

            // Body (open-close rectangle)
            const bodyTop = priceToY(Math.max(candle.open, candle.close));
            const bodyBot = priceToY(Math.min(candle.open, candle.close));
            const bodyH = Math.max(1, bodyBot - bodyTop);

            if (isUp) {
                ctx.fillStyle = bodyColor;
                ctx.fillRect(x, bodyTop, candleW, bodyH);
            } else {
                ctx.fillStyle = bodyColor;
                ctx.fillRect(x, bodyTop, candleW, bodyH);
            }

            // Highlight last candle
            if (i === candleCount - 1) {
                ctx.strokeStyle = '#ffd93d';
                ctx.lineWidth = 1;
                ctx.strokeRect(x - 1, bodyTop - 1, candleW + 2, bodyH + 2);
            }
        });

        // Current price line
        const currentY = priceToY(this.gold.currentPrice);
        ctx.strokeStyle = '#ffd93d';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(PAD_L, currentY);
        ctx.lineTo(W - PAD_R, currentY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Current price label
        ctx.fillStyle = '#ffd93d';
        ctx.font = 'bold 10px "Press Start 2P", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(this.gold.currentPrice.toFixed(2), W - PAD_R - 60, currentY - 5);

        // Average buy price line (if holding)
        if (this.gold.goldHeld > 0 && this.gold.avgBuyPrice > 0) {
            const avgY = priceToY(this.gold.avgBuyPrice);
            if (avgY > PAD_T && avgY < H - PAD_B) {
                ctx.strokeStyle = '#6c5ce7';
                ctx.lineWidth = 1;
                ctx.setLineDash([2, 6]);
                ctx.beginPath();
                ctx.moveTo(PAD_L, avgY);
                ctx.lineTo(W - PAD_R, avgY);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = '#6c5ce7';
                ctx.font = '8px monospace';
                ctx.fillText('AVG ' + this.gold.avgBuyPrice.toFixed(1), PAD_L + 5, avgY - 3);
            }
        }

        // Volume bars at bottom
        const maxVol = Math.max(...history.map(c => c.volume || 1));
        const volH = 20;
        history.forEach((candle, i) => {
            const x = PAD_L + i * (candleW + gap);
            const h = ((candle.volume || 0) / maxVol) * volH;
            const isUp = candle.close >= candle.open;
            ctx.fillStyle = isUp ? 'rgba(0, 212, 170, 0.25)' : 'rgba(255, 71, 87, 0.25)';
            ctx.fillRect(x, H - PAD_B - h, candleW, h);
        });

        // Trend indicator
        const trend = this.gold.trend;
        const trendText = trend > 0.3 ? '📈 BULLISH' : trend < -0.3 ? '📉 BEARISH' : '➡️ NEUTRAL';
        ctx.fillStyle = trend > 0.3 ? '#00d4aa' : trend < -0.3 ? '#ff4757' : '#ffd93d';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(trendText, PAD_L + 5, PAD_T + 12);
    }

    _renderPlayers() {
        const el = document.getElementById('goldPlayers');
        if (!el || !this.players.length) return;
        el.innerHTML = '<div class="gold-players-label">📊 Traders:</div>' +
            this.players.map(p =>
                `<span class="gold-player-tag" style="border-color:${p.color || '#4ecdc4'}">${p.name}</span>`
            ).join('');
    }
}

window.GoldTradingUI = GoldTradingUI;
