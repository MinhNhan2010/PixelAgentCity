/**
 * FarmManager — Hệ thống Nông Trại cho PixelAgent City
 * Quản lý: trồng cây, tưới nước, thu hoạch, nấu ăn, bán sản phẩm, thời tiết
 */
class FarmManager {
    constructor(game) {
        this.game = game;

        // === 12 LOẠI CÂY TRỒNG ===
        this.seedCatalog = [
            // Rau củ (nhanh, giá rẻ)
            { id: 'tomato',     name: 'Cà Chua',         icon: '🍅', cost: 10,  growDays: 2, yield: [2,4], sellPrice: 15, color: '#e74c3c', category: 'vegetable' },
            { id: 'carrot',     name: 'Cà Rốt',          icon: '🥕', cost: 8,   growDays: 2, yield: [3,5], sellPrice: 12, color: '#e67e22', category: 'vegetable' },
            { id: 'corn',       name: 'Ngô',             icon: '🌽', cost: 12,  growDays: 3, yield: [2,4], sellPrice: 18, color: '#f1c40f', category: 'vegetable' },
            { id: 'potato',     name: 'Khoai Tây',       icon: '🥔', cost: 8,   growDays: 3, yield: [3,6], sellPrice: 10, color: '#d4a76a', category: 'vegetable' },
            // Trái cây (trung bình)
            { id: 'strawberry', name: 'Dâu Tây',         icon: '🍓', cost: 20,  growDays: 3, yield: [2,3], sellPrice: 30, color: '#e84393', category: 'fruit' },
            { id: 'watermelon', name: 'Dưa Hấu',         icon: '🍉', cost: 25,  growDays: 4, yield: [1,2], sellPrice: 45, color: '#27ae60', category: 'fruit' },
            { id: 'grape',      name: 'Nho',             icon: '🍇', cost: 22,  growDays: 3, yield: [2,4], sellPrice: 28, color: '#8e44ad', category: 'fruit' },
            { id: 'pumpkin',    name: 'Bí Ngô',          icon: '🎃', cost: 18,  growDays: 4, yield: [1,3], sellPrice: 40, color: '#d35400', category: 'fruit' },
            // Hoa & thảo dược (chậm, giá cao)
            { id: 'sunflower',  name: 'Hoa Hướng Dương', icon: '🌻', cost: 15,  growDays: 3, yield: [2,3], sellPrice: 22, color: '#f9ca24', category: 'flower' },
            { id: 'rose',       name: 'Hoa Hồng',        icon: '🌹', cost: 30,  growDays: 4, yield: [1,2], sellPrice: 55, color: '#c0392b', category: 'flower' },
            { id: 'herb',       name: 'Thảo Dược',       icon: '🌿', cost: 25,  growDays: 3, yield: [1,3], sellPrice: 50, color: '#2ecc71', category: 'herb' },
            { id: 'tea',        name: 'Trà Xanh',        icon: '🍵', cost: 28,  growDays: 4, yield: [1,2], sellPrice: 58, color: '#16a085', category: 'herb' },
        ];

        // === CÔNG THỨC NẤU ĂN ===
        this.recipes = [
            { id: 'salad',       name: 'Salad Tươi',     icon: '🥗', ingredients: { tomato: 1, carrot: 1 },               effect: 'energy', value: 25, sellPrice: 40 },
            { id: 'soup',        name: 'Súp Rau Củ',     icon: '🍲', ingredients: { potato: 2, carrot: 1, corn: 1 },      effect: 'energy', value: 35, sellPrice: 55 },
            { id: 'fruit_juice', name: 'Nước Ép Trái',   icon: '🧃', ingredients: { strawberry: 1, grape: 1 },            effect: 'energy', value: 30, sellPrice: 50 },
            { id: 'pie',         name: 'Bánh Bí Ngô',    icon: '🥧', ingredients: { pumpkin: 1, strawberry: 1 },           effect: 'mood',   value: 30, sellPrice: 65 },
            { id: 'herbal_tea',  name: 'Trà Thảo Dược',  icon: '🍵', ingredients: { herb: 1, tea: 1 },                    effect: 'mood',   value: 40, sellPrice: 80 },
            { id: 'flower_boost',name: 'Tinh Dầu Hoa',   icon: '💐', ingredients: { rose: 1, sunflower: 1 },              effect: 'xp',     value: 20, sellPrice: 70 },
            { id: 'feast',       name: 'Bữa Tiệc Lớn',  icon: '🍽️', ingredients: { tomato: 2, corn: 1, potato: 2, watermelon: 1 }, effect: 'all', value: 15, sellPrice: 120 },
            { id: 'smoothie',    name: 'Sinh Tố Dâu',    icon: '🥤', ingredients: { strawberry: 2, grape: 1 },            effect: 'energy', value: 28, sellPrice: 55 },
        ];

        // === 12 Ô ĐẤT ===
        this.plots = [];
        for (let i = 0; i < 12; i++) {
            this.plots.push({
                id: i,
                state: 'empty',       // empty, planted, growing, ready
                seedId: null,
                plantedDay: 0,
                growthStage: 0,        // 0=seed, 1=sprout, 2=growing, 3=ready
                watered: false,
                wateredByAgent: null,
                daysGrown: 0,
            });
        }

        // === KHO SẢN PHẨM ===
        this.inventory = {};           // { seedId: quantity }
        this.cookedItems = {};         // { recipeId: quantity }

        // === THỜI TIẾT ===
        this.weather = 'sunny';        // sunny, rainy, cloudy, stormy, hot
        this.weatherDuration = 0;      // ngày còn lại
        this.weatherEffects = {
            sunny:  { growBonus: 0,    waterNeeded: true,  desc: '☀️ Nắng đẹp', color: '#f9ca24' },
            rainy:  { growBonus: 1,    waterNeeded: false, desc: '🌧️ Mưa',      color: '#3498db' },
            cloudy: { growBonus: 0,    waterNeeded: true,  desc: '☁️ Mây',      color: '#95a5a6' },
            stormy: { growBonus: -1,   waterNeeded: false, desc: '⛈️ Bão',      color: '#7f8c8d', damageChance: 0.15 },
            hot:    { growBonus: -0.5, waterNeeded: true,  desc: '🔥 Nóng',     color: '#e74c3c', droughtChance: 0.2 },
        };

        // === THỐNG KÊ ===
        this.stats = {
            totalPlanted: 0,
            totalHarvested: 0,
            totalSold: 0,
            totalEarnings: 0,
            totalCooked: 0,
            totalFed: 0,
        };
    }

    // ===================== TRỒNG CÂY =====================
    plant(plotId, seedId) {
        const plot = this.plots[plotId];
        if (!plot || plot.state !== 'empty') return { ok: false, msg: 'Ô đất không trống!' };

        const seed = this.seedCatalog.find(s => s.id === seedId);
        if (!seed) return { ok: false, msg: 'Không tìm thấy hạt giống!' };

        if (!this.game.canAfford(seed.cost)) return { ok: false, msg: `Không đủ tiền! Cần ${seed.cost}Ⓒ` };

        this.game.spend(seed.cost, `Mua hạt ${seed.name}`);
        plot.state = 'planted';
        plot.seedId = seedId;
        plot.plantedDay = this.game.day;
        plot.growthStage = 0;
        plot.watered = false;
        plot.wateredByAgent = null;
        plot.daysGrown = 0;
        this.stats.totalPlanted++;

        return { ok: true, msg: `🌱 Đã trồng ${seed.name}!`, seed };
    }

    // ===================== TƯỚI NƯỚC =====================
    water(plotId, agentId = null) {
        const plot = this.plots[plotId];
        if (!plot || plot.state === 'empty' || plot.state === 'ready') return { ok: false, msg: 'Không cần tưới!' };
        if (plot.watered) return { ok: false, msg: 'Đã tưới rồi!' };

        plot.watered = true;
        plot.wateredByAgent = agentId;
        return { ok: true, msg: '💧 Đã tưới nước!' };
    }

    // ===================== THU HOẠCH =====================
    harvest(plotId) {
        const plot = this.plots[plotId];
        if (!plot || plot.state !== 'ready') return { ok: false, msg: 'Chưa sẵn sàng thu hoạch!' };

        const seed = this.seedCatalog.find(s => s.id === plot.seedId);
        if (!seed) return { ok: false, msg: 'Lỗi dữ liệu cây!' };

        const [minY, maxY] = seed.yield;
        let quantity = minY + Math.floor(Math.random() * (maxY - minY + 1));

        // Weather bonus
        if (this.weather === 'rainy') quantity += 1;
        if (this.weather === 'sunny') quantity = Math.max(1, quantity);

        // Add to inventory
        this.inventory[seed.id] = (this.inventory[seed.id] || 0) + quantity;

        // Reset plot
        plot.state = 'empty';
        plot.seedId = null;
        plot.growthStage = 0;
        plot.watered = false;
        plot.wateredByAgent = null;
        plot.daysGrown = 0;

        this.stats.totalHarvested += quantity;

        return { ok: true, msg: `🌾 Thu hoạch ${quantity}x ${seed.icon} ${seed.name}!`, seed, quantity };
    }

    // ===================== BÁN SẢN PHẨM =====================
    sellProduce(seedId, quantity = 1) {
        if (!this.inventory[seedId] || this.inventory[seedId] < quantity) {
            return { ok: false, msg: 'Không đủ sản phẩm!' };
        }

        const seed = this.seedCatalog.find(s => s.id === seedId);
        if (!seed) return { ok: false, msg: 'Lỗi!' };

        const total = seed.sellPrice * quantity;
        this.inventory[seedId] -= quantity;
        if (this.inventory[seedId] <= 0) delete this.inventory[seedId];

        this.game.coins += total;
        this.game.totalEarned += total;
        this.stats.totalSold += quantity;
        this.stats.totalEarnings += total;

        if (this.game.onCoinsChange) this.game.onCoinsChange(total);

        return { ok: true, msg: `💰 Bán ${quantity}x ${seed.icon} ${seed.name}: +${total}Ⓒ`, total };
    }

    sellCooked(recipeId, quantity = 1) {
        if (!this.cookedItems[recipeId] || this.cookedItems[recipeId] < quantity) {
            return { ok: false, msg: 'Không đủ món ăn!' };
        }

        const recipe = this.recipes.find(r => r.id === recipeId);
        if (!recipe) return { ok: false, msg: 'Lỗi!' };

        const total = recipe.sellPrice * quantity;
        this.cookedItems[recipeId] -= quantity;
        if (this.cookedItems[recipeId] <= 0) delete this.cookedItems[recipeId];

        this.game.coins += total;
        this.game.totalEarned += total;
        this.stats.totalSold += quantity;
        this.stats.totalEarnings += total;

        if (this.game.onCoinsChange) this.game.onCoinsChange(total);

        return { ok: true, msg: `💰 Bán ${quantity}x ${recipe.icon} ${recipe.name}: +${total}Ⓒ`, total };
    }

    // ===================== NẤU ĂN =====================
    canCook(recipeId) {
        const recipe = this.recipes.find(r => r.id === recipeId);
        if (!recipe) return false;
        for (const [itemId, needed] of Object.entries(recipe.ingredients)) {
            if ((this.inventory[itemId] || 0) < needed) return false;
        }
        return true;
    }

    cook(recipeId) {
        const recipe = this.recipes.find(r => r.id === recipeId);
        if (!recipe) return { ok: false, msg: 'Không tìm thấy công thức!' };

        // Check ingredients
        for (const [itemId, needed] of Object.entries(recipe.ingredients)) {
            if ((this.inventory[itemId] || 0) < needed) {
                const seed = this.seedCatalog.find(s => s.id === itemId);
                return { ok: false, msg: `Thiếu ${seed?.name || itemId}!` };
            }
        }

        // Consume ingredients
        for (const [itemId, needed] of Object.entries(recipe.ingredients)) {
            this.inventory[itemId] -= needed;
            if (this.inventory[itemId] <= 0) delete this.inventory[itemId];
        }

        // Add cooked item
        this.cookedItems[recipe.id] = (this.cookedItems[recipe.id] || 0) + 1;
        this.stats.totalCooked++;

        return { ok: true, msg: `🍳 Nấu thành công ${recipe.icon} ${recipe.name}!`, recipe };
    }

    // ===================== CHO AGENT ĂN (BOOST) =====================
    feedAgent(recipeId, agent) {
        if (!this.cookedItems[recipeId] || this.cookedItems[recipeId] < 1) {
            return { ok: false, msg: 'Không có món ăn!' };
        }

        const recipe = this.recipes.find(r => r.id === recipeId);
        if (!recipe) return { ok: false, msg: 'Lỗi!' };

        this.cookedItems[recipeId]--;
        if (this.cookedItems[recipeId] <= 0) delete this.cookedItems[recipeId];

        // Apply effects
        switch (recipe.effect) {
            case 'energy':
                agent.energy = Math.min(100, agent.energy + recipe.value);
                break;
            case 'mood':
                agent.mood = Math.min(100, agent.mood + recipe.value);
                break;
            case 'xp':
                // XP will be handled by caller (AgentManager.gainXP)
                break;
            case 'all':
                agent.energy = Math.min(100, agent.energy + recipe.value);
                agent.mood = Math.min(100, agent.mood + recipe.value);
                break;
        }

        this.stats.totalFed++;
        return { ok: true, msg: `${recipe.icon} ${agent.name} ăn ${recipe.name}! +${recipe.value} ${recipe.effect}`, recipe };
    }

    // ===================== THỜI TIẾT =====================
    rollWeather() {
        const weathers = [
            { id: 'sunny',  weight: 35 },
            { id: 'rainy',  weight: 25 },
            { id: 'cloudy', weight: 20 },
            { id: 'stormy', weight: 10 },
            { id: 'hot',    weight: 10 },
        ];
        const totalWeight = weathers.reduce((s, w) => s + w.weight, 0);
        let r = Math.random() * totalWeight;
        for (const w of weathers) {
            r -= w.weight;
            if (r <= 0) {
                this.weather = w.id;
                this.weatherDuration = 1 + Math.floor(Math.random() * 2); // 1-2 days
                return;
            }
        }
        this.weather = 'sunny';
        this.weatherDuration = 1;
    }

    getWeatherInfo() {
        const eff = this.weatherEffects[this.weather];
        return {
            id: this.weather,
            desc: eff.desc,
            color: eff.color,
            growBonus: eff.growBonus,
            waterNeeded: eff.waterNeeded,
            duration: this.weatherDuration,
        };
    }

    // ===================== TICK NGÀY =====================
    tickDay() {
        // 1. Weather tick
        this.weatherDuration--;
        if (this.weatherDuration <= 0) {
            this.rollWeather();
        }

        const weatherEff = this.weatherEffects[this.weather];

        // 2. Process each plot
        this.plots.forEach(plot => {
            if (plot.state === 'empty' || plot.state === 'ready') return;

            const seed = this.seedCatalog.find(s => s.id === plot.seedId);
            if (!seed) return;

            // Storm damage
            if (weatherEff.damageChance && Math.random() < weatherEff.damageChance) {
                plot.state = 'empty';
                plot.seedId = null;
                plot.growthStage = 0;
                plot.daysGrown = 0;
                plot.watered = false;
                if (this.onFarmEvent) this.onFarmEvent('storm_damage', plot, seed);
                return;
            }

            // Drought (hot weather, not watered)
            if (weatherEff.droughtChance && !plot.watered && Math.random() < weatherEff.droughtChance) {
                plot.growthStage = Math.max(0, plot.growthStage - 1);
                plot.daysGrown = Math.max(0, plot.daysGrown - 1);
                if (this.onFarmEvent) this.onFarmEvent('drought', plot, seed);
            }

            // Growth
            let growthIncrement = 1;

            // Watered bonus
            if (plot.watered) {
                growthIncrement += 0.5;
            } else if (weatherEff.waterNeeded) {
                growthIncrement -= 0.5; // Didn't water when needed
            }

            // Rainy = auto-water
            if (this.weather === 'rainy') {
                plot.watered = true;
                growthIncrement += 0.5;
            }

            // Weather grow bonus
            growthIncrement += weatherEff.growBonus;
            growthIncrement = Math.max(0, growthIncrement);

            plot.daysGrown += growthIncrement;

            // Update growth stage
            const progress = plot.daysGrown / seed.growDays;
            if (progress >= 1) {
                plot.state = 'ready';
                plot.growthStage = 3;
            } else if (progress >= 0.66) {
                plot.state = 'growing';
                plot.growthStage = 2;
            } else if (progress >= 0.33) {
                plot.state = 'growing';
                plot.growthStage = 1;
            } else {
                plot.state = 'planted';
                plot.growthStage = 0;
            }

            // Reset watered for next day (unless rainy)
            if (this.weather !== 'rainy') {
                plot.watered = false;
                plot.wateredByAgent = null;
            }
        });

        // 3. Notify
        if (this.onDayTick) this.onDayTick();

        // Return report
        return {
            weather: this.weatherEffects[this.weather]?.desc || this.weather,
            readyCount: this.plots.filter(p => p.state === 'ready').length,
        };
    }

    // ===================== HELPERS =====================
    getUnwateredPlot() {
        return this.plots.find(p =>
            (p.state === 'planted' || p.state === 'growing') && !p.watered
        );
    }

    getReadyPlot() {
        return this.plots.find(p => p.state === 'ready');
    }

    getEmptyPlot() {
        return this.plots.find(p => p.state === 'empty');
    }

    getPlantedCount() {
        return this.plots.filter(p => p.state !== 'empty').length;
    }

    getReadyCount() {
        return this.plots.filter(p => p.state === 'ready').length;
    }

    getTotalInventory() {
        return Object.values(this.inventory).reduce((s, v) => s + v, 0);
    }

    getTotalCooked() {
        return Object.values(this.cookedItems).reduce((s, v) => s + v, 0);
    }

    getInventoryList() {
        return Object.entries(this.inventory).map(([id, qty]) => {
            const seed = this.seedCatalog.find(s => s.id === id);
            return { id, qty, seed };
        }).filter(item => item.seed);
    }

    getCookedList() {
        return Object.entries(this.cookedItems).map(([id, qty]) => {
            const recipe = this.recipes.find(r => r.id === id);
            return { id, qty, recipe };
        }).filter(item => item.recipe);
    }

    getPlotGrowthPercent(plotId) {
        const plot = this.plots[plotId];
        if (!plot || plot.state === 'empty') return 0;
        if (plot.state === 'ready') return 100;
        const seed = this.seedCatalog.find(s => s.id === plot.seedId);
        if (!seed) return 0;
        return Math.min(100, Math.round((plot.daysGrown / seed.growDays) * 100));
    }

    // ===================== ADAPTER METHODS (for app.js UI) =====================
    /** Alias: plant a seed on a plot (does NOT spend coins — app.js handles that) */
    plantSeed(plotId, seedId) {
        const plot = this.plots[plotId];
        if (!plot || plot.state !== 'empty') return false;
        const seed = this.seedCatalog.find(s => s.id === seedId);
        if (!seed) return false;
        plot.state = 'planted';
        plot.seedId = seedId;
        plot.plantedDay = this.game?.day || 0;
        plot.growthStage = 0;
        plot.watered = false;
        plot.wateredByAgent = null;
        plot.daysGrown = 0;
        this.stats.totalPlanted++;
        return true;
    }

    /** Alias: water a plot */
    waterPlot(plotId) {
        return this.water(plotId);
    }

    /** Alias: harvest a plot, returns { name, qty } or null */
    harvestPlot(plotId) {
        const result = this.harvest(plotId);
        if (!result.ok) return null;
        return { name: result.seed.name, qty: result.quantity };
    }

    /** Sell all inventory produce, returns total earnings */
    sellAllProduce() {
        let total = 0;
        for (const [seedId, qty] of Object.entries(this.inventory)) {
            if (qty <= 0) continue;
            const seed = this.seedCatalog.find(s => s.id === seedId);
            if (!seed) continue;
            total += seed.sellPrice * qty;
        }
        // Sell cooked items too
        for (const [recipeId, qty] of Object.entries(this.cookedItems)) {
            if (qty <= 0) continue;
            const recipe = this.recipes.find(r => r.id === recipeId);
            if (recipe) total += recipe.sellPrice * qty;
        }
        // Clear inventory
        this.inventory = {};
        this.cookedItems = {};
        this.stats.totalEarnings += total;
        return total;
    }

    /** Get seed catalog with `emoji` alias for `icon` */
    get seedCatalogUI() {
        return this.seedCatalog.map(s => ({ ...s, emoji: s.icon }));
    }

    /** Get recipes with `emoji` alias and ingredients as array [{id, qty}] */
    get recipesUI() {
        return this.recipes.map(r => ({
            ...r,
            emoji: r.icon,
            energyBoost: r.effect === 'energy' || r.effect === 'all' ? r.value : 0,
            moodBoost: r.effect === 'mood' || r.effect === 'all' ? r.value : 0,
            ingredients: Object.entries(r.ingredients).map(([id, qty]) => ({ id, qty })),
        }));
    }

    // ===================== SAVE / LOAD =====================
    saveData() {
        return {
            plots: this.plots.map(p => ({ ...p })),
            inventory: { ...this.inventory },
            cookedItems: { ...this.cookedItems },
            weather: this.weather,
            weatherDuration: this.weatherDuration,
            stats: { ...this.stats },
        };
    }

    loadData(data) {
        if (!data) return;
        if (data.plots) {
            data.plots.forEach((saved, i) => {
                if (this.plots[i]) Object.assign(this.plots[i], saved);
            });
        }
        if (data.inventory) this.inventory = { ...data.inventory };
        if (data.cookedItems) this.cookedItems = { ...data.cookedItems };
        if (data.weather) this.weather = data.weather;
        if (data.weatherDuration !== undefined) this.weatherDuration = data.weatherDuration;
        if (data.stats) Object.assign(this.stats, data.stats);
    }
}
