/**
 * PixelAgent City — Achievement System
 * Tracks milestones and rewards players with badges
 */

class AchievementManager {
    constructor() {
        this.achievements = this._buildAchievements();
        this.unlocked = new Set();
        this.listeners = [];
        this.load();
    }

    _buildAchievements() {
        return [
            // === Economy ===
            { id: 'first_coin',      cat: 'economy',  icon: '💰', title: 'Đồng Xu Đầu Tiên',    desc: 'Kiếm được 100Ⓒ đầu tiên',          check: (g) => g.totalEarned >= 100 },
            { id: 'rich_1k',         cat: 'economy',  icon: '💎', title: 'Nhà Đầu Tư',            desc: 'Sở hữu 1,000Ⓒ cùng lúc',            check: (g) => g.coins >= 1000 },
            { id: 'rich_10k',        cat: 'economy',  icon: '🏦', title: 'Tỷ Phú Pixel',          desc: 'Sở hữu 10,000Ⓒ cùng lúc',           check: (g) => g.coins >= 10000 },
            { id: 'earned_50k',      cat: 'economy',  icon: '📈', title: 'Dòng Tiền Mạnh',        desc: 'Tổng thu nhập đạt 50,000Ⓒ',          check: (g) => g.totalEarned >= 50000 },

            // === Contracts ===
            { id: 'first_contract',  cat: 'contract', icon: '📋', title: 'Hợp Đồng Đầu Tiên',    desc: 'Hoàn thành hợp đồng đầu tiên',       check: (g) => g.completedContracts >= 1 },
            { id: 'contracts_5',     cat: 'contract', icon: '📑', title: 'Đối Tác Tin Cậy',        desc: 'Hoàn thành 5 hợp đồng',              check: (g) => g.completedContracts >= 5 },
            { id: 'contracts_15',    cat: 'contract', icon: '🏅', title: 'Nhà Thầu Chuyên Nghiệp', desc: 'Hoàn thành 15 hợp đồng',             check: (g) => g.completedContracts >= 15 },
            { id: 'contracts_30',    cat: 'contract', icon: '👑', title: 'Huyền Thoại Contracts',  desc: 'Hoàn thành 30 hợp đồng',             check: (g) => g.completedContracts >= 30 },
            { id: 'no_fail',         cat: 'contract', icon: '✨', title: 'Hoàn Hảo',               desc: 'Hoàn thành 10 contract, 0 thất bại', check: (g) => g.completedContracts >= 10 && g.failedContracts === 0 },

            // === Agents ===
            { id: 'hire_first',      cat: 'agent',    icon: '🤖', title: 'Tuyển Dụng Đầu Tiên',   desc: 'Thuê agent đầu tiên',                 check: (g, m) => m && m.agents.size >= 3 },
            { id: 'team_5',          cat: 'agent',    icon: '👥', title: 'Đội Ngũ Nhỏ',            desc: 'Có 5 agent trong team',               check: (g, m) => m && m.agents.size >= 5 },
            { id: 'team_10',         cat: 'agent',    icon: '🏢', title: 'Công Ty Lớn',             desc: 'Có 10 agent trong team',              check: (g, m) => m && m.agents.size >= 10 },
            { id: 'agent_lvl5',      cat: 'agent',    icon: '🎖️', title: 'Agent Kỳ Cựu',           desc: 'Có agent đạt level 5',                check: (g, m) => m && Array.from(m.agents.values()).some(a => a.level >= 5) },
            { id: 'all_roles',       cat: 'agent',    icon: '🌈', title: 'Đa Dạng Nhân Sự',        desc: 'Có ít nhất 5 role khác nhau',         check: (g, m) => { if(!m) return false; const r = new Set(); m.agents.forEach(a => r.add(a.role)); return r.size >= 5; } },

            // === Company ===
            { id: 'level_3',         cat: 'company',  icon: '⭐', title: 'Startup Thành Công',     desc: 'Đạt Company Level 3',                 check: (g) => g.companyLevel >= 3 },
            { id: 'level_5',         cat: 'company',  icon: '🌟', title: 'Scale-Up',               desc: 'Đạt Company Level 5',                 check: (g) => g.companyLevel >= 5 },
            { id: 'level_8',         cat: 'company',  icon: '💫', title: 'Unicorn',                desc: 'Đạt Company Level 8',                 check: (g) => g.companyLevel >= 8 },
            { id: 'level_10',        cat: 'company',  icon: '🏆', title: 'IPO Thành Công!',        desc: 'Đạt Company Level 10 — Chiến thắng!', check: (g) => g.companyLevel >= 10 },
            { id: 'rep_5',           cat: 'company',  icon: '⭐', title: '5 Sao Danh Tiếng',       desc: 'Đạt reputation 5.0',                  check: (g) => g.reputation >= 5.0 },
            { id: 'day_30',          cat: 'company',  icon: '📅', title: 'Tháng Đầu Tiên',         desc: 'Sống sót qua 30 ngày',                check: (g) => g.day >= 30 },

            // === Minigames ===
            { id: 'poker_play',      cat: 'minigame', icon: '🃏', title: 'Tay Chơi Poker',         desc: 'Chơi poker lần đầu',                  check: (g) => g._pokerPlayed },
            { id: 'billiard_play',   cat: 'minigame', icon: '🎱', title: 'Cơ Thủ',                 desc: 'Chơi billiards lần đầu',              check: (g) => g._billiardPlayed },
            { id: 'slot_win',        cat: 'minigame', icon: '🎰', title: 'Lucky Spin',             desc: 'Thắng slot machine',                  check: (g) => g._slotWon },
            { id: 'gold_trade',      cat: 'minigame', icon: '📈', title: 'Trader Vàng',             desc: 'Mua bán vàng lần đầu',               check: (g) => g._goldTraded },
        ];
    }

    /**
     * Check all achievements against current game state
     * @param {GameState} game
     * @param {AgentManager} manager
     * @returns {Array} newly unlocked achievements
     */
    check(game, manager) {
        const newlyUnlocked = [];
        for (const ach of this.achievements) {
            if (this.unlocked.has(ach.id)) continue;
            try {
                if (ach.check(game, manager)) {
                    this.unlocked.add(ach.id);
                    newlyUnlocked.push(ach);
                }
            } catch (e) { /* skip broken checks */ }
        }
        if (newlyUnlocked.length > 0) {
            this.save();
            newlyUnlocked.forEach(ach => {
                this.listeners.forEach(fn => fn(ach));
            });
        }
        return newlyUnlocked;
    }

    onUnlock(fn) {
        this.listeners.push(fn);
    }

    getAll() {
        return this.achievements.map(a => ({
            ...a,
            unlocked: this.unlocked.has(a.id),
        }));
    }

    getUnlockedCount() {
        return this.unlocked.size;
    }

    getTotalCount() {
        return this.achievements.length;
    }

    getProgress() {
        return Math.round((this.unlocked.size / this.achievements.length) * 100);
    }

    getByCategory(cat) {
        return this.getAll().filter(a => a.cat === cat);
    }

    // === Persistence ===
    save() {
        try {
            localStorage.setItem('pixelAgentAchievements', JSON.stringify([...this.unlocked]));
        } catch (e) { /* ignore */ }
    }

    load() {
        try {
            const raw = localStorage.getItem('pixelAgentAchievements');
            if (raw) {
                const arr = JSON.parse(raw);
                arr.forEach(id => this.unlocked.add(id));
            }
        } catch (e) { /* ignore */ }
    }

    reset() {
        this.unlocked.clear();
        localStorage.removeItem('pixelAgentAchievements');
    }
}

window.AchievementManager = AchievementManager;
