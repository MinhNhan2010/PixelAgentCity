/**
 * Gold Trading System — PixelAgent City
 * Uses real gold price from free API, then simulates realistic tick-by-tick movement.
 * Candlestick chart, buy/sell, P&L tracking, market news.
 */
class GoldTrading {
    constructor(opts = {}) {
        // Price in USD per ounce
        this.currentPrice = 2380;
        this.openPrice = 2380;
        this.previousClose = 2380;
        this.dayHigh = 2380;
        this.dayLow = 2380;

        // Transaction fee (spread) — prevents risk-free arbitrage
        this.spreadPct = opts.spreadPct || 0.02; // 2% spread

        // Price history for charting (each entry = 1 candle)
        this.priceHistory = [];  // { open, high, low, close, time, volume }
        this.maxHistory = 60;
        this.tickCount = 0;
        this.candleInterval = opts.candleInterval || 5; // ticks per candle

        // Current candle being built
        this._candleOpen = this.currentPrice;
        this._candleHigh = this.currentPrice;
        this._candleLow = this.currentPrice;
        this._candleTicks = 0;

        // Portfolio
        this.goldHeld = 0;           // ounces (can be fractional)
        this.avgBuyPrice = 0;        // average buy price
        this.totalBuyVolume = 0;     // total ounces ever bought
        this.totalSellVolume = 0;    // total ounces ever sold
        this.realizedPnL = 0;        // realized profit/loss in coins
        this.totalInvested = 0;      // total coins spent buying

        // Market state
        this.volatility = 0.15;      // base volatility %
        this.trend = 0;              // -1 to 1 (bear to bull)
        this.trendMomentum = 0;      // how strong the trend is
        this.marketEvent = null;     // current news event
        this.marketEvents = [];      // historical events

        // Conversion: 1 USD gold = how many game coins
        this.usdToCoinRate = 0.1;    // $2380/oz = 238 coins

        // Real data fetching
        this._realDataLoaded = false;
        this._fetchRealPrice();

        // Seed some initial history
        this._seedHistory();

        // News templates
        this.newsTemplates = [
            { text: '📈 Fed giữ nguyên lãi suất — Vàng tăng mạnh!', effect: 'bull', strength: 2.5 },
            { text: '📉 USD mạnh lên — Áp lực bán vàng!', effect: 'bear', strength: 2.0 },
            { text: '🌍 Căng thẳng địa chính trị — Vàng là nơi trú ẩn!', effect: 'bull', strength: 3.0 },
            { text: '📊 Lạm phát thấp hơn dự kiến — Vàng giảm!', effect: 'bear', strength: 1.5 },
            { text: '💹 Nhu cầu vàng từ Trung Quốc tăng vọt!', effect: 'bull', strength: 2.0 },
            { text: '🏦 Ngân hàng trung ương bán vàng dự trữ!', effect: 'bear', strength: 2.5 },
            { text: '⚡ Bitcoin sụt giảm — Dòng tiền chảy vào vàng!', effect: 'bull', strength: 1.8 },
            { text: '📰 Kinh tế Mỹ phục hồi mạnh — Bán vàng chốt lời!', effect: 'bear', strength: 1.2 },
            { text: '🔥 Khủng hoảng ngân hàng — Vàng tăng phi mã!', effect: 'bull', strength: 4.0 },
            { text: '📋 Số liệu việc làm Mỹ tốt — USD tăng, vàng giảm!', effect: 'bear', strength: 1.8 },
            { text: '🏆 Ấn Độ tăng nhập khẩu vàng mùa cưới!', effect: 'bull', strength: 1.5 },
            { text: '💎 Phát hiện mỏ vàng lớn — Nguồn cung tăng!', effect: 'bear', strength: 3.0 },
            { text: '📊 Thị trường đi ngang — Nhà đầu tư chờ đợi.', effect: 'neutral', strength: 0.5 },
            { text: '🌐 Chiến tranh thương mại leo thang — Vàng hưởng lợi!', effect: 'bull', strength: 2.5 },
        ];

        // Callbacks
        this.onPriceUpdate = null;
        this.onTradeComplete = null;
        this.onMarketEvent = null;
    }

    // Fetch real gold price from free API
    async _fetchRealPrice() {
        try {
            // Try multiple free APIs
            const apis = [
                'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.min.json',
            ];
            
            for (const url of apis) {
                try {
                    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
                    if (!resp.ok) continue;
                    const data = await resp.json();
                    
                    if (data.xau && data.xau.usd) {
                        // fawazahmed0 format: xau.usd = price of 1 XAU in USD
                        const realPrice = 1 / data.xau.usd;  // API gives how many XAU per 1 USD
                        if (realPrice > 1000 && realPrice < 10000) {
                            this._applyRealPrice(realPrice);
                            return;
                        }
                    }
                    
                    if (data.rates && data.rates.USD) {
                        const realPrice = data.rates.USD;
                        if (realPrice > 1000 && realPrice < 10000) {
                            this._applyRealPrice(realPrice);
                            return;
                        }
                    }
                } catch (e) { continue; }
            }

            // Fallback: use realistic recent price
            this._applyRealPrice(2385 + Math.random() * 30);
        } catch (e) {
            this._applyRealPrice(2385 + Math.random() * 30);
        }
    }

    _applyRealPrice(realPrice) {
        this.currentPrice = Math.round(realPrice * 100) / 100;
        this.openPrice = this.currentPrice;
        this.previousClose = this.currentPrice - (Math.random() - 0.5) * 10;
        this.dayHigh = this.currentPrice + Math.random() * 5;
        this.dayLow = this.currentPrice - Math.random() * 5;
        this._candleOpen = this.currentPrice;
        this._candleHigh = this.currentPrice;
        this._candleLow = this.currentPrice;
        this._realDataLoaded = true;

        // Re-seed history around real price
        this._seedHistory();
    }

    _seedHistory() {
        this.priceHistory = [];
        let p = this.currentPrice - 20 + Math.random() * 10;

        for (let i = 0; i < 30; i++) {
            const vol = 0.1 + Math.random() * 0.3;
            const direction = Math.random() - 0.48; // slight upward bias
            const change = p * (vol / 100) * direction;
            const open = p;
            p += change;
            const close = p;
            const high = Math.max(open, close) + Math.random() * Math.abs(change) * 0.5;
            const low = Math.min(open, close) - Math.random() * Math.abs(change) * 0.5;

            this.priceHistory.push({
                open: Math.round(open * 100) / 100,
                high: Math.round(high * 100) / 100,
                low: Math.round(low * 100) / 100,
                close: Math.round(close * 100) / 100,
                time: Date.now() - (30 - i) * 10000,
                volume: Math.floor(50 + Math.random() * 200),
            });
        }

        // Ensure last candle matches current price
        if (this.priceHistory.length > 0) {
            const last = this.priceHistory[this.priceHistory.length - 1];
            last.close = this.currentPrice;
        }
    }

    // Game tick — called every ~2 seconds
    tick(gameSpeed = 1) {
        for (let s = 0; s < gameSpeed; s++) {
            this._tickOnce();
        }
    }

    _tickOnce() {
        this.tickCount++;

        // Random market events (~2% chance per tick)
        if (!this.marketEvent && Math.random() < 0.02) {
            this._triggerMarketEvent();
        }

        // Market event fading
        if (this.marketEvent) {
            this.marketEvent.duration--;
            if (this.marketEvent.duration <= 0) {
                this.marketEvent = null;
            }
        }

        // Price movement using Geometric Brownian Motion (simplified)
        const baseVol = this.volatility / 100;
        let drift = this.trend * 0.0003;

        // Market event influence
        if (this.marketEvent) {
            if (this.marketEvent.effect === 'bull') {
                drift += this.marketEvent.strength * 0.0005;
            } else if (this.marketEvent.effect === 'bear') {
                drift -= this.marketEvent.strength * 0.0005;
            }
        }

        // Mean reversion towards $2400 range
        const meanPrice = 2400;
        const reversion = (meanPrice - this.currentPrice) * 0.00005;
        drift += reversion;

        // Random walk
        const noise = (Math.random() - 0.5) * 2 * baseVol * this.currentPrice;
        const momentum = this.trendMomentum * 0.3;

        const priceChange = this.currentPrice * drift + noise + momentum;
        this.trendMomentum = priceChange * 0.1;

        // Trend slow shift
        if (Math.random() < 0.05) {
            this.trend += (Math.random() - 0.5) * 0.3;
            this.trend = Math.max(-1, Math.min(1, this.trend));
        }

        this.currentPrice = Math.max(1500, Math.min(5000,
            Math.round((this.currentPrice + priceChange) * 100) / 100
        ));

        this.dayHigh = Math.max(this.dayHigh, this.currentPrice);
        this.dayLow = Math.min(this.dayLow, this.currentPrice);

        // Build candle
        this._candleHigh = Math.max(this._candleHigh, this.currentPrice);
        this._candleLow = Math.min(this._candleLow, this.currentPrice);
        this._candleTicks++;

        if (this._candleTicks >= this.candleInterval) {
            this.priceHistory.push({
                open: Math.round(this._candleOpen * 100) / 100,
                high: Math.round(this._candleHigh * 100) / 100,
                low: Math.round(this._candleLow * 100) / 100,
                close: Math.round(this.currentPrice * 100) / 100,
                time: Date.now(),
                volume: Math.floor(30 + Math.random() * 150),
            });
            if (this.priceHistory.length > this.maxHistory) this.priceHistory.shift();

            // Reset candle
            this._candleOpen = this.currentPrice;
            this._candleHigh = this.currentPrice;
            this._candleLow = this.currentPrice;
            this._candleTicks = 0;
        }

        if (this.onPriceUpdate) this.onPriceUpdate(this.currentPrice);
    }

    _triggerMarketEvent() {
        const tmpl = this.newsTemplates[Math.floor(Math.random() * this.newsTemplates.length)];
        this.marketEvent = {
            text: tmpl.text,
            effect: tmpl.effect,
            strength: tmpl.strength,
            duration: 10 + Math.floor(Math.random() * 15),
        };
        this.marketEvents.unshift({ ...this.marketEvent, time: Date.now() });
        if (this.marketEvents.length > 10) this.marketEvents.pop();

        if (this.onMarketEvent) this.onMarketEvent(this.marketEvent);
    }

    // Trading functions
    priceToCoins(usdPrice) {
        return Math.floor(usdPrice * this.usdToCoinRate);
    }

    coinsToPrice(coins) {
        return coins / this.usdToCoinRate;
    }

    getCostForOunces(ounces) {
        // Include spread in displayed cost
        return this.priceToCoins(this.currentPrice * ounces * (1 + this.spreadPct));
    }

    buy(ounces, availableCoins) {
        // Buy at ask price (current + spread)
        const askPrice = this.currentPrice * (1 + this.spreadPct);
        const cost = this.priceToCoins(askPrice * ounces);
        if (cost > availableCoins || cost <= 0) return null;

        // Update average buy price
        const totalCost = this.avgBuyPrice * this.goldHeld + this.currentPrice * ounces;
        this.goldHeld += ounces;
        this.avgBuyPrice = totalCost / this.goldHeld;
        this.totalBuyVolume += ounces;
        this.totalInvested += cost;

        const trade = {
            type: 'buy',
            ounces,
            price: this.currentPrice,
            costCoins: cost,
            time: Date.now(),
        };

        if (this.onTradeComplete) this.onTradeComplete(trade);
        return trade;
    }

    sell(ounces, maxOunces = this.goldHeld) {
        const actualOunces = Math.min(ounces, maxOunces, this.goldHeld);
        if (actualOunces <= 0) return null;

        // Sell at bid price (current - spread)
        const bidPrice = this.currentPrice * (1 - this.spreadPct);
        const revenue = this.priceToCoins(bidPrice * actualOunces);
        const costBasis = this.priceToCoins(this.avgBuyPrice * actualOunces);
        const profit = revenue - costBasis;

        this.goldHeld -= actualOunces;
        this.realizedPnL += profit;
        this.totalSellVolume += actualOunces;

        if (this.goldHeld < 0.0001) {
            this.goldHeld = 0;
            this.avgBuyPrice = 0;
        }

        const trade = {
            type: 'sell',
            ounces: actualOunces,
            price: this.currentPrice,
            revenueCoins: revenue,
            profit,
            time: Date.now(),
        };

        if (this.onTradeComplete) this.onTradeComplete(trade);
        return trade;
    }

    sellAll() {
        return this.sell(this.goldHeld);
    }

    getUnrealizedPnL() {
        if (this.goldHeld <= 0) return 0;
        const currentValue = this.priceToCoins(this.currentPrice * this.goldHeld);
        const costBasis = this.priceToCoins(this.avgBuyPrice * this.goldHeld);
        return currentValue - costBasis;
    }

    getPortfolioValue() {
        return this.priceToCoins(this.currentPrice * this.goldHeld);
    }

    getPriceChange() {
        const change = this.currentPrice - this.previousClose;
        const pct = (change / this.previousClose) * 100;
        return { change: Math.round(change * 100) / 100, pct: Math.round(pct * 100) / 100 };
    }

    getState() {
        const { change, pct } = this.getPriceChange();
        return {
            price: this.currentPrice,
            openPrice: this.openPrice,
            previousClose: this.previousClose,
            dayHigh: this.dayHigh,
            dayLow: this.dayLow,
            change, pct,
            goldHeld: this.goldHeld,
            avgBuyPrice: this.avgBuyPrice,
            portfolioValue: this.getPortfolioValue(),
            unrealizedPnL: this.getUnrealizedPnL(),
            realizedPnL: this.realizedPnL,
            trend: this.trend,
            marketEvent: this.marketEvent,
            priceHistory: this.priceHistory,
        };
    }
}

window.GoldTrading = GoldTrading;
