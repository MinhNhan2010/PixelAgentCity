// ═══════════════════════════════════════════════════════
//  item-shop.js — PixelMart Core Shop Manager
//  Handles buy/sell/use/equip logic and inventory
// ═══════════════════════════════════════════════════════

class ItemShopManager {
    constructor(game, catalog) {
        this.game = game;
        this.catalog = catalog;

        // Player inventory: { itemId: quantity }
        this.inventory = {};

        // Equipped items per agent: { agentId: { slot: itemId } }
        this.equippedItems = {};

        // Active buffs: [{ itemId, stat, value, expiresAt, agentId? }]
        this.activeBuffs = [];

        // Global decoration bonuses (from decorations owned)
        this.globalBonuses = {};

        // Daily specials management
        this.dailySpecials = [];
        this.lastRefreshDay = -1;

        // Agent free-buy tracker: { agentId: { count, lastDay } }
        this.agentBuyTracker = {};
        this.AGENT_FREE_BUYS_PER_DAY = 3;

        // Stats tracking
        this.stats = {
            totalPurchases: 0,
            totalSpent: 0,
            totalSold: 0,
            totalEarned: 0,
            itemsUsed: 0,
        };
    }

    // ═══ BUY ITEM ═══
    buyItem(itemId, qty = 1) {
        const item = this.catalog.getById(itemId);
        if (!item) return { success: false, msg: 'Vật phẩm không tồn tại!' };

        const totalCost = item.price * qty;
        if (this.game.coins < totalCost) {
            return { success: false, msg: `Không đủ tiền! Cần ${totalCost}Ⓒ` };
        }

        const currentQty = this.inventory[itemId] || 0;
        if (item.maxStack && currentQty + qty > item.maxStack) {
            return { success: false, msg: `Kho đã đầy! Max: ${item.maxStack}` };
        }

        // Deduct coins
        this.game.spend(totalCost, `Mua ${item.name} x${qty}`);

        // Add to inventory
        this.inventory[itemId] = currentQty + qty;

        // Track stats
        this.stats.totalPurchases += qty;
        this.stats.totalSpent += totalCost;

        // Auto-apply decoration bonuses
        if (item.category === 'decoration') {
            this._applyDecorationBonus(item);
        }

        return {
            success: true,
            msg: `Đã mua ${item.icon} ${item.name} x${qty}!`,
            item, qty, cost: totalCost,
        };
    }

    // ═══ SELL ITEM ═══
    sellItem(itemId, qty = 1) {
        const item = this.catalog.getById(itemId);
        if (!item) return { success: false, msg: 'Vật phẩm không tồn tại!' };

        const currentQty = this.inventory[itemId] || 0;
        if (currentQty < qty) {
            return { success: false, msg: `Không đủ số lượng! Còn: ${currentQty}` };
        }

        const totalValue = item.sellPrice * qty;

        // Remove from inventory
        this.inventory[itemId] = currentQty - qty;
        if (this.inventory[itemId] <= 0) delete this.inventory[itemId];

        // Add coins
        this.game.earn(totalValue, `Bán ${item.name} x${qty}`);

        // Track stats
        this.stats.totalSold += qty;
        this.stats.totalEarned += totalValue;

        // Remove decoration bonus if sold
        if (item.category === 'decoration' && !this.inventory[itemId]) {
            this._removeDecorationBonus(item);
        }

        return {
            success: true,
            msg: `Đã bán ${item.icon} ${item.name} x${qty} lấy ${totalValue}Ⓒ!`,
            item, qty, earned: totalValue,
        };
    }

    // ═══ USE ITEM (Consumable) ═══
    useItem(itemId, agentId, agentManager) {
        const item = this.catalog.getById(itemId);
        if (!item) return { success: false, msg: 'Vật phẩm không tồn tại!' };

        const currentQty = this.inventory[itemId] || 0;
        if (currentQty <= 0) {
            return { success: false, msg: 'Hết vật phẩm này rồi!' };
        }

        if (item.category !== 'consumable' && item.category !== 'booster') {
            return { success: false, msg: 'Vật phẩm này không thể sử dụng!' };
        }

        // Apply effect
        const result = this._applyItemEffect(item, agentId, agentManager);
        if (!result.success) return result;

        // Consume item
        this.inventory[itemId]--;
        if (this.inventory[itemId] <= 0) delete this.inventory[itemId];

        this.stats.itemsUsed++;

        return {
            success: true,
            msg: `${item.icon} Đã dùng ${item.name}! ${result.detail}`,
            item,
        };
    }

    // ═══ APPLY ITEM EFFECT ═══
    _applyItemEffect(item, agentId, agentManager) {
        const eff = item.effect;
        if (!eff) return { success: false, msg: 'Không có hiệu ứng!' };

        switch (eff.type) {
            case 'instant': {
                // Direct stat change
                if (!agentManager) return { success: false, msg: 'Cần agent manager!' };
                if (agentId) {
                    const agent = agentManager.agents.get(agentId);
                    if (!agent) return { success: false, msg: 'Agent không tồn tại!' };
                    if (eff.stat === 'energy') agent.energy = Math.min(100, agent.energy + eff.value);
                    else if (eff.stat === 'mood') agent.mood = Math.min(100, agent.mood + eff.value);
                    else if (eff.stat === 'both') {
                        agent.mood = Math.min(100, agent.mood + (eff.mood || 0));
                        agent.energy = Math.min(100, agent.energy + (eff.energy || 0));
                    }
                    return { success: true, detail: `${agent.name}: stats restored!` };
                } else {
                    // Apply to lowest stat agent
                    const agents = Array.from(agentManager.agents.values());
                    if (!agents.length) return { success: false, msg: 'Chưa có agent nào!' };
                    const target = agents.reduce((a, b) =>
                        (a.energy + a.mood) < (b.energy + b.mood) ? a : b
                    );
                    if (eff.stat === 'energy') target.energy = Math.min(100, target.energy + eff.value);
                    else if (eff.stat === 'mood') target.mood = Math.min(100, target.mood + eff.value);
                    else if (eff.stat === 'both') {
                        target.mood = Math.min(100, target.mood + (eff.mood || 0));
                        target.energy = Math.min(100, target.energy + (eff.energy || 0));
                    }
                    return { success: true, detail: `${target.name}: stats restored!` };
                }
            }

            case 'buff': {
                // Timed buff
                this.activeBuffs.push({
                    itemId: item.id,
                    stat: eff.stat,
                    value: eff.value,
                    expiresAt: Date.now() + (eff.duration || 60) * 1000,
                    agentId: agentId || null,
                });
                return { success: true, detail: `Buff ${eff.stat} +${eff.value}% cho ${eff.duration}s` };
            }

            case 'team': {
                // Apply to all agents
                if (!agentManager) return { success: false, msg: 'Cần agent manager!' };
                const agents = Array.from(agentManager.agents.values());
                agents.forEach(a => {
                    a.mood = Math.min(100, a.mood + (eff.mood || 0));
                    a.energy = Math.min(100, a.energy + (eff.energy || 0));
                });
                return { success: true, detail: `${agents.length} agents: Mood+${eff.mood}, Energy+${eff.energy}` };
            }

            case 'random': {
                // Random stat buff
                const stat = eff.stats[Math.floor(Math.random() * eff.stats.length)];
                const val = eff.range[0] + Math.floor(Math.random() * (eff.range[1] - eff.range[0]));
                if (agentId && agentManager) {
                    const agent = agentManager.agents.get(agentId);
                    if (agent) {
                        if (stat === 'energy') agent.energy = Math.min(100, agent.energy + val);
                        else if (stat === 'mood') agent.mood = Math.min(100, agent.mood + val);
                    }
                }
                return { success: true, detail: `Random: ${stat} +${val}!` };
            }

            case 'reputation': {
                this.game.reputation = Math.min(5, this.game.reputation + eff.value);
                return { success: true, detail: `Reputation +${eff.value}!` };
            }

            case 'refresh': {
                // Trigger contract refresh
                return { success: true, detail: 'Contract board refreshed!', action: 'refreshContracts' };
            }

            case 'contract': {
                return { success: true, detail: 'Contract booster activated!', action: 'contractBoost', data: eff };
            }

            case 'mystery': {
                // Give a random non-daily item
                const pool = this.catalog.getNonDailyItems();
                const weights = pool.map(i => i.rarity === 'common' ? 5 : i.rarity === 'uncommon' ? 3 : i.rarity === 'rare' ? 1.5 : 0.5);
                const totalW = weights.reduce((a, b) => a + b, 0);
                let r = Math.random() * totalW;
                let picked = pool[0];
                for (let i = 0; i < pool.length; i++) {
                    r -= weights[i];
                    if (r <= 0) { picked = pool[i]; break; }
                }
                // Add picked item to inventory
                this.inventory[picked.id] = (this.inventory[picked.id] || 0) + 1;
                const rarityInfo = this.catalog.getRarityInfo(picked.rarity);
                return { success: true, detail: `🎁 Nhận được: ${picked.icon} ${picked.name} (${rarityInfo.label})!` };
            }

            default:
                return { success: true, detail: 'Hiệu ứng đã áp dụng!' };
        }
    }

    // ═══ DECORATION BONUSES ═══
    _applyDecorationBonus(item) {
        if (item.effect && item.effect.type === 'global') {
            this.globalBonuses[item.id] = {
                stat: item.effect.stat,
                value: item.effect.value,
            };
        }
    }

    _removeDecorationBonus(item) {
        delete this.globalBonuses[item.id];
    }

    getGlobalBonus(stat) {
        let total = 0;
        Object.values(this.globalBonuses).forEach(b => {
            if (b.stat === stat) total += b.value;
        });
        return total;
    }

    // ═══ AGENT AUTO-BUY (Free, limited) ═══
    agentAutoBuy(agent, agentManager) {
        const currentDay = this.game.day;
        const tracker = this.agentBuyTracker[agent.id] || { count: 0, lastDay: -1 };

        // Reset counter each day
        if (tracker.lastDay !== currentDay) {
            tracker.count = 0;
            tracker.lastDay = currentDay;
        }

        if (tracker.count >= this.AGENT_FREE_BUYS_PER_DAY) return null;

        let itemId = null;
        let reason = '';

        // Decide what to buy based on agent stats
        if (agent.energy < 40) {
            itemId = 'coffee_black';
            reason = '☕ Cần cà phê!';
        } else if (agent.mood < 45) {
            itemId = 'golden_boba';
            reason = '🧋 Uống trà sữa!';
        } else if (agent.energy < 60 && Math.random() < 0.3) {
            itemId = 'pixel_pizza';
            reason = '🍕 Ăn pizza!';
        } else if (Math.random() < 0.1) {
            itemId = 'lucky_cookie';
            reason = '🥠 Lucky cookie!';
        }

        if (!itemId) return null;

        const item = this.catalog.getById(itemId);
        if (!item) return null;

        // Apply effect directly (free buy)
        if (item.effect.type === 'instant') {
            if (item.effect.stat === 'energy') {
                agent.energy = Math.min(100, agent.energy + (item.effect.value || 0));
            } else if (item.effect.stat === 'mood') {
                agent.mood = Math.min(100, agent.mood + (item.effect.value || 0));
            } else if (item.effect.stat === 'both') {
                agent.mood = Math.min(100, agent.mood + (item.effect.mood || 0));
                agent.energy = Math.min(100, agent.energy + (item.effect.energy || 0));
            }
        } else if (item.effect.type === 'random') {
            const stat = item.effect.stats[Math.floor(Math.random() * item.effect.stats.length)];
            const val = item.effect.range[0] + Math.floor(Math.random() * (item.effect.range[1] - item.effect.range[0]));
            if (stat === 'energy') agent.energy = Math.min(100, agent.energy + val);
            else if (stat === 'mood') agent.mood = Math.min(100, agent.mood + val);
        }

        tracker.count++;
        this.agentBuyTracker[agent.id] = tracker;

        return { agent, item, reason };
    }

    // ═══ DAILY SPECIALS ═══
    refreshDailySpecials() {
        const currentDay = this.game.day;
        if (this.lastRefreshDay === currentDay) return;

        const pool = this.catalog.getDailyPool();
        // Pick 3 random specials
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        this.dailySpecials = shuffled.slice(0, 3);
        this.lastRefreshDay = currentDay;
    }

    // ═══ ACTIVE BUFF MANAGEMENT ═══
    updateBuffs() {
        const now = Date.now();
        this.activeBuffs = this.activeBuffs.filter(b => b.expiresAt > now);
    }

    getActiveBuff(stat, agentId) {
        const now = Date.now();
        let total = 0;
        this.activeBuffs.forEach(b => {
            if (b.stat === stat && b.expiresAt > now) {
                if (!b.agentId || b.agentId === agentId) {
                    total += b.value;
                }
            }
        });
        return total;
    }

    // ═══ UTILITY ═══
    getItemCount(itemId) {
        return this.inventory[itemId] || 0;
    }

    getInventoryItems() {
        const items = [];
        Object.entries(this.inventory).forEach(([id, qty]) => {
            if (qty > 0) {
                const item = this.catalog.getById(id);
                if (item) items.push({ ...item, owned: qty });
            }
        });
        return items;
    }

    getAffordableItems() {
        return this.catalog.items.filter(i => i.price <= this.game.coins);
    }

    // ═══ SAVE/LOAD ═══
    saveData() {
        return {
            inventory: { ...this.inventory },
            equippedItems: JSON.parse(JSON.stringify(this.equippedItems)),
            globalBonuses: JSON.parse(JSON.stringify(this.globalBonuses)),
            dailySpecials: this.dailySpecials.map(i => i.id),
            lastRefreshDay: this.lastRefreshDay,
            agentBuyTracker: JSON.parse(JSON.stringify(this.agentBuyTracker)),
            stats: { ...this.stats },
        };
    }

    loadData(data) {
        if (!data) return;
        this.inventory = data.inventory || {};
        this.equippedItems = data.equippedItems || {};
        this.globalBonuses = data.globalBonuses || {};
        this.lastRefreshDay = data.lastRefreshDay || -1;
        this.agentBuyTracker = data.agentBuyTracker || {};
        this.stats = data.stats || this.stats;

        // Restore daily specials by ID
        if (data.dailySpecials) {
            this.dailySpecials = data.dailySpecials
                .map(id => this.catalog.getById(id))
                .filter(Boolean);
        }
    }
}
