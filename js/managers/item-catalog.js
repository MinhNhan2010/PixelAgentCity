// ═══════════════════════════════════════════════════════
//  item-catalog.js — PixelMart Item Database
//  All item definitions for the shop system
// ═══════════════════════════════════════════════════════

class ItemCatalog {
    constructor() {
        this.items = this._buildCatalog();
    }

    _buildCatalog() {
        return [
            // ═══ CONSUMABLES — Temporary buffs ═══
            { id: 'coffee_black', name: 'Cà Phê Đen', icon: '☕', category: 'consumable',
              price: 8, sellPrice: 3, rarity: 'common', maxStack: 20,
              effect: { type: 'instant', stat: 'energy', value: 20 },
              description: 'Tăng Energy +20 ngay lập tức' },

            { id: 'energy_drink', name: 'Energy Drink', icon: '⚡', category: 'consumable',
              price: 15, sellPrice: 6, rarity: 'common', maxStack: 15,
              effect: { type: 'buff', stat: 'energy', value: 40, speed: 10, duration: 60 },
              description: 'Energy +40, Speed +10% (60s)' },

            { id: 'pixel_pizza', name: 'Pixel Pizza', icon: '🍕', category: 'consumable',
              price: 12, sellPrice: 5, rarity: 'common', maxStack: 20,
              effect: { type: 'instant', stat: 'both', mood: 15, energy: 10 },
              description: 'Mood +15, Energy +10 tức thì' },

            { id: 'golden_boba', name: 'Golden Boba', icon: '🧋', category: 'consumable',
              price: 20, sellPrice: 8, rarity: 'uncommon', maxStack: 10,
              effect: { type: 'instant', stat: 'mood', value: 25 },
              description: 'Mood +25 tức thì' },

            { id: 'brain_boost', name: 'Brain Boost Pill', icon: '💊', category: 'consumable',
              price: 30, sellPrice: 12, rarity: 'uncommon', maxStack: 10,
              effect: { type: 'buff', stat: 'xp', value: 30, duration: 120 },
              description: 'XP gain +30% trong 120s' },

            { id: 'mega_protein', name: 'Mega Protein', icon: '💪', category: 'consumable',
              price: 25, sellPrice: 10, rarity: 'uncommon', maxStack: 10,
              effect: { type: 'buff', stat: 'taskSpeed', value: 20, duration: 90 },
              description: 'Task speed +20% trong 90s' },

            { id: 'lucky_cookie', name: 'Lucky Cookie', icon: '🥠', category: 'consumable',
              price: 18, sellPrice: 7, rarity: 'common', maxStack: 15,
              effect: { type: 'random', stats: ['mood', 'energy', 'xp'], range: [10, 30] },
              description: 'Random buff (mood/energy/xp)' },

            { id: 'team_snack', name: 'Team Snack Box', icon: '🎁', category: 'consumable',
              price: 50, sellPrice: 20, rarity: 'uncommon', maxStack: 5,
              effect: { type: 'team', mood: 10, energy: 5 },
              description: 'Tất cả agents: Mood +10, Energy +5' },

            // ═══ TOOLS & EQUIPMENT — Permanent buffs per agent ═══
            { id: 'mech_keyboard', name: 'Mechanical Keyboard', icon: '⌨️', category: 'tool',
              price: 80, sellPrice: 30, rarity: 'uncommon', maxStack: 1,
              effect: { type: 'equip', stat: 'codingSpeed', value: 10 },
              description: 'Coding speed +10% (vĩnh viễn)' },

            { id: 'dual_monitor', name: 'Dual Monitor', icon: '🖥️', category: 'tool',
              price: 120, sellPrice: 45, rarity: 'rare', maxStack: 1,
              effect: { type: 'equip', stat: 'taskSpeed', value: 15 },
              description: 'Task speed +15% (vĩnh viễn)' },

            { id: 'standing_desk', name: 'Standing Desk', icon: '🪑', category: 'tool',
              price: 100, sellPrice: 40, rarity: 'uncommon', maxStack: 1,
              effect: { type: 'equip', stat: 'energyDrain', value: -10 },
              description: 'Energy drain giảm 10% (vĩnh viễn)' },

            { id: 'headphones', name: 'NC Headphones', icon: '🎧', category: 'tool',
              price: 90, sellPrice: 35, rarity: 'uncommon', maxStack: 1,
              effect: { type: 'equip', stat: 'moodDecay', value: -15 },
              description: 'Mood decay giảm 15% (vĩnh viễn)' },

            { id: 'ai_copilot', name: 'AI Copilot License', icon: '🤖', category: 'tool',
              price: 200, sellPrice: 80, rarity: 'rare', maxStack: 1,
              effect: { type: 'equip', stat: 'xpGain', value: 20 },
              description: 'XP gain +20% (vĩnh viễn)' },

            { id: 'vpn_premium', name: 'VPN Premium', icon: '🔐', category: 'tool',
              price: 60, sellPrice: 22, rarity: 'common', maxStack: 1,
              effect: { type: 'equip', stat: 'security', value: 25 },
              description: 'Security agent +25% effectiveness' },

            { id: 'test_framework', name: 'Testing Framework', icon: '🧪', category: 'tool',
              price: 150, sellPrice: 60, rarity: 'rare', maxStack: 1,
              effect: { type: 'equip', stat: 'bugFind', value: 30 },
              description: 'Tester bug-find rate +30%' },

            { id: 'design_toolkit', name: 'Design Toolkit', icon: '🎨', category: 'tool',
              price: 140, sellPrice: 55, rarity: 'rare', maxStack: 1,
              effect: { type: 'equip', stat: 'designSpeed', value: 20 },
              description: 'Designer mood decay giảm 20%' },

            // ═══ DECORATIONS — Global office bonus ═══
            { id: 'neon_sign', name: 'Neon Sign "OPEN"', icon: '🔆', category: 'decoration',
              price: 40, sellPrice: 15, rarity: 'common', maxStack: 1,
              effect: { type: 'global', stat: 'mood', value: 5 },
              description: 'Mood +5% toàn team' },

            { id: 'arcade_mini', name: 'Mini Arcade Cabinet', icon: '🕹️', category: 'decoration',
              price: 70, sellPrice: 28, rarity: 'uncommon', maxStack: 1,
              effect: { type: 'global', stat: 'idleMoodRegen', value: 8 },
              description: 'Idle mood regen +8%' },

            { id: 'fish_tank', name: 'Fish Tank', icon: '🐠', category: 'decoration',
              price: 55, sellPrice: 22, rarity: 'common', maxStack: 1,
              effect: { type: 'global', stat: 'stress', value: -10 },
              description: 'Stress reduction -10%' },

            { id: 'trophy_case', name: 'Trophy Case', icon: '🏆', category: 'decoration',
              price: 65, sellPrice: 26, rarity: 'uncommon', maxStack: 1,
              effect: { type: 'global', stat: 'contractXp', value: 5 },
              description: 'XP bonus +5% sau mỗi contract' },

            { id: 'wall_clock_gold', name: 'Wall Clock (Gold)', icon: '⏰', category: 'decoration',
              price: 45, sellPrice: 18, rarity: 'common', maxStack: 1,
              effect: { type: 'global', stat: 'deadline', value: 1 },
              description: 'Deadline awareness +1 day' },

            { id: 'team_photo', name: 'Team Photo Frame', icon: '📸', category: 'decoration',
              price: 30, sellPrice: 12, rarity: 'common', maxStack: 1,
              effect: { type: 'global', stat: 'collaboration', value: 10 },
              description: 'Collaboration chance +10%' },

            { id: 'motivational', name: 'Motivational Poster', icon: '📜', category: 'decoration',
              price: 20, sellPrice: 8, rarity: 'common', maxStack: 1,
              effect: { type: 'global', stat: 'moodFloor', value: 5 },
              description: 'Mood floor +5 (tối thiểu 35)' },

            // ═══ CONTRACTS & BOOSTERS ═══
            { id: 'premium_client', name: 'Premium Client Contact', icon: '📱', category: 'booster',
              price: 100, sellPrice: 40, rarity: 'rare', maxStack: 3,
              effect: { type: 'contract', bonus: 50 },
              description: 'Unlock 1 contract thưởng cao hơn 50%' },

            { id: 'deadline_ext', name: 'Deadline Extension', icon: '⏳', category: 'booster',
              price: 40, sellPrice: 15, rarity: 'common', maxStack: 5,
              effect: { type: 'contract', extraDays: 2 },
              description: '+2 ngày cho 1 active contract' },

            { id: 'rep_booster', name: 'Reputation Booster', icon: '⭐', category: 'booster',
              price: 80, sellPrice: 32, rarity: 'uncommon', maxStack: 3,
              effect: { type: 'reputation', value: 0.3 },
              description: '+0.3 Reputation' },

            { id: 'contract_refresh', name: 'Contract Refresh', icon: '🔄', category: 'booster',
              price: 30, sellPrice: 12, rarity: 'common', maxStack: 5,
              effect: { type: 'refresh' },
              description: 'Refresh bảng contract available' },

            { id: 'difficulty_reducer', name: 'Difficulty Reducer', icon: '📉', category: 'booster',
              price: 60, sellPrice: 24, rarity: 'uncommon', maxStack: 3,
              effect: { type: 'contract', taskReduction: 25 },
              description: 'Giảm task count -25% cho 1 contract' },

            // ═══ FARM UPGRADES ═══
            { id: 'sprinkler', name: 'Sprinkler System', icon: '💦', category: 'farm',
              price: 120, sellPrice: 48, rarity: 'rare', maxStack: 1,
              effect: { type: 'farm', autoWater: 4 },
              description: 'Auto-water 4 plots/ngày' },

            { id: 'greenhouse', name: 'Greenhouse', icon: '🏡', category: 'farm',
              price: 200, sellPrice: 80, rarity: 'rare', maxStack: 1,
              effect: { type: 'farm', weatherProtect: 4 },
              description: 'Weather protection cho 4 plots' },

            { id: 'fertilizer', name: 'Fertilizer Pack (x5)', icon: '🧪', category: 'farm',
              price: 35, sellPrice: 14, rarity: 'common', maxStack: 10,
              effect: { type: 'farm', growthSpeed: 50, uses: 5 },
              description: 'Growth speed +50% (5 lần dùng)' },

            { id: 'golden_seeds', name: 'Golden Seeds Box', icon: '✨', category: 'farm',
              price: 80, sellPrice: 32, rarity: 'uncommon', maxStack: 5,
              effect: { type: 'farm', rareSeed: true, yieldMultiplier: 2 },
              description: 'Random rare seed (yield 2x)' },

            { id: 'scarecrow_item', name: 'Scarecrow', icon: '🧣', category: 'farm',
              price: 50, sellPrice: 20, rarity: 'common', maxStack: 1,
              effect: { type: 'farm', pestReduction: 50 },
              description: 'Giảm 50% pest damage' },

            { id: 'farm_expansion', name: 'Farm Expansion', icon: '🗺️', category: 'farm',
              price: 300, sellPrice: 120, rarity: 'epic', maxStack: 1,
              effect: { type: 'farm', extraPlots: 4 },
              description: '+4 plots (max 16)' },

            // ═══ SPECIAL & RARE — Rotating daily ═══
            { id: 'golden_skin', name: 'Golden Agent Skin', icon: '👑', category: 'special',
              price: 500, sellPrice: 200, rarity: 'rare', maxStack: 1,
              effect: { type: 'cosmetic', mood: 10 },
              description: 'Cosmetic + Mood +10 khi equipped', daily: true },

            { id: 'time_machine', name: 'Time Machine Chip', icon: '⏰', category: 'special',
              price: 300, sellPrice: 120, rarity: 'epic', maxStack: 1,
              effect: { type: 'skipDay' },
              description: 'Skip 1 ngày (giữ contracts)', daily: true },

            { id: 'double_coin', name: 'Double Coin Token', icon: '💎', category: 'special',
              price: 250, sellPrice: 100, rarity: 'rare', maxStack: 2,
              effect: { type: 'doubleReward' },
              description: 'Nhân đôi reward contract tiếp theo', daily: true },

            { id: 'clone_voucher', name: 'Agent Clone Voucher', icon: '🧬', category: 'special',
              price: 400, sellPrice: 160, rarity: 'epic', maxStack: 1,
              effect: { type: 'cloneAgent' },
              description: 'Clone 1 agent (giữ level + stats)', daily: true },

            { id: 'mystery_box', name: 'Mystery Box', icon: '🎁', category: 'special',
              price: 100, sellPrice: 40, rarity: 'common', maxStack: 5,
              effect: { type: 'mystery' },
              description: 'Random item bất kỳ (có chance Rare)', daily: true },

            { id: 'respec_token', name: 'Respec Token', icon: '🔄', category: 'special',
              price: 150, sellPrice: 60, rarity: 'rare', maxStack: 2,
              effect: { type: 'respec' },
              description: 'Đổi role 1 agent (giữ level)', daily: true },
        ];
    }

    getById(id) {
        return this.items.find(i => i.id === id) || null;
    }

    getByCategory(category) {
        return this.items.filter(i => i.category === category);
    }

    getAllCategories() {
        return [
            { id: 'consumable', name: 'Tiêu Hao', icon: '☕', color: '#e74c3c' },
            { id: 'tool',       name: 'Công Cụ', icon: '🛠️', color: '#3498db' },
            { id: 'decoration', name: 'Trang Trí', icon: '🏠', color: '#2ecc71' },
            { id: 'booster',    name: 'Booster', icon: '📜', color: '#f39c12' },
            { id: 'farm',       name: 'Nông Trại', icon: '🌱', color: '#27ae60' },
            { id: 'special',    name: 'Đồ Hiếm', icon: '🎰', color: '#9b59b6' },
        ];
    }

    getDailyPool() {
        return this.items.filter(i => i.daily);
    }

    getRarityInfo(rarity) {
        const map = {
            common:   { label: 'Common',   color: '#8892b0', glow: 'none' },
            uncommon: { label: 'Uncommon', color: '#4ecdc4', glow: '0 0 8px rgba(78,205,196,0.4)' },
            rare:     { label: 'Rare',     color: '#9b59b6', glow: '0 0 10px rgba(155,89,182,0.5)' },
            epic:     { label: 'Epic',     color: '#e67e22', glow: '0 0 12px rgba(230,126,34,0.6)' },
        };
        return map[rarity] || map.common;
    }

    getNonDailyItems() {
        return this.items.filter(i => !i.daily);
    }
}
