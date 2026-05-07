// ═══════════════════════════════════════════════════════
//  item-shop-ui.js — PixelMart UI Overlay
//  Renders shop interface, handles user interaction
// ═══════════════════════════════════════════════════════

class ItemShopUI {
    constructor(shopManager, overlayEl) {
        this.shop = shopManager;
        this.overlay = overlayEl;
        this.activeTab = 'consumable';
        this.selectedAgent = null; // For use-on-agent
        this._built = false;
    }

    // ═══ SHOW / HIDE ═══
    show() {
        if (!this._built) this._buildHTML();
        this.shop.refreshDailySpecials();
        this.render();
        this.overlay.classList.add('show');
        this.overlay.style.display = 'flex';
    }

    hide() {
        this.overlay.classList.remove('show');
        setTimeout(() => { this.overlay.style.display = 'none'; }, 300);
    }

    isVisible() {
        return this.overlay.classList.contains('show');
    }

    // ═══ BUILD HTML STRUCTURE ═══
    _buildHTML() {
        this.overlay.innerHTML = `
        <div class="pixelmart-panel">
            <div class="pixelmart-header">
                <div class="pixelmart-title">
                    <span class="pixelmart-logo">🏪</span>
                    <span class="pixelmart-name">PIXELMART</span>
                    <span class="pixelmart-sub">Agent City Store</span>
                </div>
                <div class="pixelmart-coins">
                    <span class="pixelmart-coin-icon">💰</span>
                    <span class="pixelmart-coin-val" id="pmCoins">0</span>
                    <span class="pixelmart-coin-label">Ⓒ</span>
                </div>
                <button class="pixelmart-close" id="pmClose">✕</button>
            </div>

            <div class="pixelmart-tabs" id="pmTabs"></div>

            <div class="pixelmart-body">
                <div class="pixelmart-items" id="pmItems"></div>
                <div class="pixelmart-sidebar">
                    <div class="pixelmart-inventory-header">
                        <span>📦 KHO ĐỒ</span>
                        <span class="pixelmart-inv-count" id="pmInvCount">0</span>
                    </div>
                    <div class="pixelmart-inventory" id="pmInventory"></div>
                    <div class="pixelmart-daily-header" id="pmDailyHeader">
                        <span>✨ ĐỒ HIẾM HÔM NAY</span>
                    </div>
                    <div class="pixelmart-daily" id="pmDaily"></div>
                    <div class="pixelmart-stats" id="pmStats"></div>
                </div>
            </div>
        </div>`;

        // Wire events
        this.overlay.querySelector('#pmClose').onclick = () => this.hide();
        this.overlay.onclick = (e) => { if (e.target === this.overlay) this.hide(); };
        this._built = true;
    }

    // ═══ RENDER ═══
    render() {
        if (!this._built) return;

        // Update coins
        const coinsEl = this.overlay.querySelector('#pmCoins');
        if (coinsEl) coinsEl.textContent = Math.floor(this.shop.game.coins);

        this._renderTabs();
        this._renderItems();
        this._renderInventory();
        this._renderDaily();
        this._renderStats();
    }

    // ═══ TABS ═══
    _renderTabs() {
        const container = this.overlay.querySelector('#pmTabs');
        if (!container) return;

        const cats = this.shop.catalog.getAllCategories();
        container.innerHTML = cats.map(c => `
            <button class="pm-tab ${c.id === this.activeTab ? 'active' : ''}"
                    data-cat="${c.id}"
                    style="--tab-color: ${c.color}">
                <span class="pm-tab-icon">${c.icon}</span>
                <span class="pm-tab-name">${c.name}</span>
                <span class="pm-tab-count">${this.shop.catalog.getByCategory(c.id).length}</span>
            </button>
        `).join('');

        container.querySelectorAll('.pm-tab').forEach(btn => {
            btn.onclick = () => {
                this.activeTab = btn.dataset.cat;
                this.render();
            };
        });
    }

    // ═══ ITEM GRID ═══
    _renderItems() {
        const container = this.overlay.querySelector('#pmItems');
        if (!container) return;

        const items = this.shop.catalog.getByCategory(this.activeTab);
        const coins = this.shop.game.coins;

        container.innerHTML = items.map(item => {
            const owned = this.shop.getItemCount(item.id);
            const canBuy = coins >= item.price && (!item.maxStack || owned < item.maxStack);
            const rarityInfo = this.shop.catalog.getRarityInfo(item.rarity);
            const maxed = item.maxStack && owned >= item.maxStack;

            return `
            <div class="pm-item ${canBuy ? '' : 'pm-item-disabled'} pm-rarity-${item.rarity}"
                 style="--rarity-color: ${rarityInfo.color}; --rarity-glow: ${rarityInfo.glow}">
                <div class="pm-item-header">
                    <span class="pm-item-icon">${item.icon}</span>
                    <span class="pm-item-rarity" style="color:${rarityInfo.color}">${rarityInfo.label}</span>
                </div>
                <div class="pm-item-name">${item.name}</div>
                <div class="pm-item-desc">${item.description}</div>
                <div class="pm-item-footer">
                    <span class="pm-item-price ${coins < item.price ? 'pm-price-red' : ''}">
                        💰 ${item.price}Ⓒ
                    </span>
                    <span class="pm-item-owned">${owned > 0 ? `📦 ${owned}` : ''}</span>
                    <button class="pm-buy-btn ${canBuy ? '' : 'disabled'}"
                            data-id="${item.id}"
                            ${canBuy ? '' : 'disabled'}>
                        ${maxed ? '✅ MAX' : '🛒 Mua'}
                    </button>
                </div>
            </div>`;
        }).join('');

        // Wire buy buttons
        container.querySelectorAll('.pm-buy-btn:not(.disabled)').forEach(btn => {
            btn.onclick = () => this._onBuy(btn.dataset.id);
        });
    }

    // ═══ INVENTORY SIDEBAR ═══
    _renderInventory() {
        const container = this.overlay.querySelector('#pmInventory');
        const countEl = this.overlay.querySelector('#pmInvCount');
        if (!container) return;

        const items = this.shop.getInventoryItems();
        if (countEl) countEl.textContent = items.reduce((s, i) => s + i.owned, 0);

        if (items.length === 0) {
            container.innerHTML = '<div class="pm-inv-empty">Chưa có vật phẩm nào</div>';
            return;
        }

        container.innerHTML = items.map(item => {
            const isUsable = item.category === 'consumable' || item.category === 'booster';
            const rarityInfo = this.shop.catalog.getRarityInfo(item.rarity);
            return `
            <div class="pm-inv-item">
                <span class="pm-inv-icon">${item.icon}</span>
                <span class="pm-inv-name">${item.name}</span>
                <span class="pm-inv-qty">x${item.owned}</span>
                <div class="pm-inv-actions">
                    ${isUsable ? `<button class="pm-inv-btn pm-use-btn" data-id="${item.id}" title="Sử dụng">⚡</button>` : ''}
                    <button class="pm-inv-btn pm-sell-btn" data-id="${item.id}" title="Bán ${item.sellPrice}Ⓒ"
                            style="color:${rarityInfo.color}">💰</button>
                </div>
            </div>`;
        }).join('');

        // Wire use/sell buttons
        container.querySelectorAll('.pm-use-btn').forEach(btn => {
            btn.onclick = () => this._onUse(btn.dataset.id);
        });
        container.querySelectorAll('.pm-sell-btn').forEach(btn => {
            btn.onclick = () => this._onSell(btn.dataset.id);
        });
    }

    // ═══ DAILY SPECIALS ═══
    _renderDaily() {
        const container = this.overlay.querySelector('#pmDaily');
        if (!container) return;

        const specials = this.shop.dailySpecials;
        if (!specials.length) {
            container.innerHTML = '<div class="pm-daily-empty">Đang cập nhật...</div>';
            return;
        }

        container.innerHTML = specials.map(item => {
            const owned = this.shop.getItemCount(item.id);
            const canBuy = this.shop.game.coins >= item.price && (!item.maxStack || owned < item.maxStack);
            const rarityInfo = this.shop.catalog.getRarityInfo(item.rarity);

            return `
            <div class="pm-daily-item pm-rarity-${item.rarity}" style="--rarity-color: ${rarityInfo.color}">
                <span class="pm-daily-icon">${item.icon}</span>
                <div class="pm-daily-info">
                    <span class="pm-daily-name">${item.name}</span>
                    <span class="pm-daily-price">💰 ${item.price}Ⓒ</span>
                </div>
                <button class="pm-daily-buy ${canBuy ? '' : 'disabled'}"
                        data-id="${item.id}" ${canBuy ? '' : 'disabled'}>
                    ${canBuy ? '🛒' : '🔒'}
                </button>
            </div>`;
        }).join('');

        container.querySelectorAll('.pm-daily-buy:not(.disabled)').forEach(btn => {
            btn.onclick = () => this._onBuy(btn.dataset.id);
        });
    }

    // ═══ STATS ═══
    _renderStats() {
        const container = this.overlay.querySelector('#pmStats');
        if (!container) return;

        const s = this.shop.stats;
        container.innerHTML = `
        <div class="pm-stat-row">
            <span>🛒 Đã mua:</span><span>${s.totalPurchases}</span>
        </div>
        <div class="pm-stat-row">
            <span>💸 Tổng chi:</span><span>${s.totalSpent}Ⓒ</span>
        </div>
        <div class="pm-stat-row">
            <span>💰 Tổng bán:</span><span>${s.totalEarned}Ⓒ</span>
        </div>
        <div class="pm-stat-row">
            <span>⚡ Đã dùng:</span><span>${s.itemsUsed}</span>
        </div>`;
    }

    // ═══ ACTION HANDLERS ═══
    _onBuy(itemId) {
        const result = this.shop.buyItem(itemId);
        if (result.success) {
            this._showFeedback(result.msg, 'success');
            if (this.onBuy) this.onBuy(result);
        } else {
            this._showFeedback(result.msg, 'error');
        }
        this.render();
    }

    _onSell(itemId) {
        const result = this.shop.sellItem(itemId);
        if (result.success) {
            this._showFeedback(result.msg, 'success');
            if (this.onSell) this.onSell(result);
        } else {
            this._showFeedback(result.msg, 'error');
        }
        this.render();
    }

    _onUse(itemId) {
        if (this.onUseItem) {
            this.onUseItem(itemId);
        }
        this.render();
    }

    // ═══ FEEDBACK TOAST ═══
    _showFeedback(msg, type) {
        const existing = this.overlay.querySelector('.pm-feedback');
        if (existing) existing.remove();

        const el = document.createElement('div');
        el.className = `pm-feedback pm-feedback-${type}`;
        el.textContent = msg;
        this.overlay.querySelector('.pixelmart-panel').appendChild(el);

        setTimeout(() => el.classList.add('pm-feedback-show'), 10);
        setTimeout(() => {
            el.classList.remove('pm-feedback-show');
            setTimeout(() => el.remove(), 300);
        }, 2500);
    }
}
