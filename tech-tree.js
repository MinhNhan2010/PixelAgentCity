/**
 * Tech Tree — Research system with 3 branches and 12 technologies
 * Provides permanent bonuses to gameplay
 */
class TechTree {
    constructor(gameState) {
        this.game = gameState;
        this.unlocked = [];          // Array of tech_id strings
        this.currentResearch = null;  // tech_id being researched
        this.researchProgress = 0;    // 0-100
        this.researchSpeed = 1.0;     // multiplier based on researchers

        // Callbacks
        this.onTechUnlocked = null;
        this.onResearchUpdate = null;

        this.techs = [
            // ═══ ENGINEERING BRANCH ═══
            {
                id: 'fast_compile', branch: 'engineering', tier: 1,
                name: 'Fast Compile', icon: '⚡',
                desc: 'Tối ưu build pipeline — Task hoàn thành nhanh hơn 15%',
                cost: 200, researchDays: 1,
                requires: [],
                effect: 'task_speed', value: 0.15,
            },
            {
                id: 'code_review_bot', branch: 'engineering', tier: 2,
                name: 'Code Review Bot', icon: '🤖',
                desc: 'Bot tự review — 50% chance tự approve task',
                cost: 400, researchDays: 2,
                requires: ['fast_compile'],
                effect: 'auto_review', value: 0.5,
            },
            {
                id: 'cicd_mastery', branch: 'engineering', tier: 3,
                name: 'CI/CD Mastery', icon: '🔄',
                desc: 'Pipeline tự động — Deploy tasks nhanh hơn 30%',
                cost: 700, researchDays: 2.5,
                requires: ['code_review_bot'],
                effect: 'deploy_speed', value: 0.3,
            },
            {
                id: 'quantum_computing', branch: 'engineering', tier: 4,
                name: 'Quantum Computing', icon: '⚛️',
                desc: 'Sức mạnh tính toán vượt trội — +50% tốc độ mọi task',
                cost: 1500, researchDays: 3,
                requires: ['cicd_mastery'],
                effect: 'task_speed', value: 0.5,
            },

            // ═══ AI RESEARCH BRANCH ═══
            {
                id: 'smart_assign', branch: 'ai_research', tier: 1,
                name: 'Smart Assign', icon: '🧠',
                desc: 'AI tự match role → task — +10% quality bonus',
                cost: 250, researchDays: 1.5,
                requires: [],
                effect: 'quality_bonus', value: 0.1,
            },
            {
                id: 'mood_prediction', branch: 'ai_research', tier: 2,
                name: 'Mood Prediction', icon: '🔮',
                desc: 'Dự đoán mood agent — Giảm 25% mood decay',
                cost: 450, researchDays: 2,
                requires: ['smart_assign'],
                effect: 'mood_decay_reduction', value: 0.25,
            },
            {
                id: 'neural_optimizer', branch: 'ai_research', tier: 3,
                name: 'Neural Optimizer', icon: '🕸️',
                desc: 'Mạng neural tối ưu workflow — +25% XP toàn team',
                cost: 800, researchDays: 2.5,
                requires: ['mood_prediction'],
                effect: 'xp_bonus', value: 0.25,
            },
            {
                id: 'agi_prototype', branch: 'ai_research', tier: 4,
                name: 'AGI Prototype', icon: '🌟',
                desc: 'Đột phá AI! Agent hiệu suất tăng vọt +40% toàn diện',
                cost: 2000, researchDays: 3,
                requires: ['neural_optimizer'],
                effect: 'agi_boost', value: 0.4,
            },

            // ═══ MANAGEMENT BRANCH ═══
            {
                id: 'overtime_policy', branch: 'management', tier: 1,
                name: 'Overtime Policy', icon: '⏰',
                desc: 'Cho phép tăng ca — +20% speed nhưng mood giảm nhanh hơn',
                cost: 150, researchDays: 1,
                requires: [],
                effect: 'overtime', value: 0.2,
            },
            {
                id: 'remote_work', branch: 'management', tier: 2,
                name: 'Remote Work', icon: '🏠',
                desc: 'Làm việc từ xa — Giảm 30% mood decay khi idle',
                cost: 350, researchDays: 1.5,
                requires: ['overtime_policy'],
                effect: 'remote_work', value: 0.3,
            },
            {
                id: 'team_building', branch: 'management', tier: 3,
                name: 'Team Building', icon: '🤝',
                desc: 'Tăng cường team — +50% pair programming & mentoring chance',
                cost: 600, researchDays: 2,
                requires: ['remote_work'],
                effect: 'teamwork', value: 0.5,
            },
            {
                id: 'ipo_express', branch: 'management', tier: 4,
                name: 'IPO Express', icon: '📈',
                desc: 'Tăng tốc IPO — Giảm 40% XP cần để level up',
                cost: 1200, researchDays: 3,
                requires: ['team_building'],
                effect: 'xp_requirement_reduction', value: 0.4,
            },
        ];
    }

    // ============ CORE METHODS ============

    isUnlocked(techId) {
        return this.unlocked.includes(techId);
    }

    canResearch(techId) {
        const tech = this.getTech(techId);
        if (!tech) return false;
        if (this.isUnlocked(techId)) return false;
        if (this.currentResearch) return false;
        // Check prerequisites
        for (const req of tech.requires) {
            if (!this.isUnlocked(req)) return false;
        }
        // Check cost
        if (!this.game.canAfford(tech.cost)) return false;
        return true;
    }

    startResearch(techId) {
        if (!this.canResearch(techId)) return false;
        const tech = this.getTech(techId);
        if (!this.game.spend(tech.cost, `Research: ${tech.name}`)) return false;
        this.currentResearch = techId;
        this.researchProgress = 0;
        this._updateResearchSpeed();
        this.game.sfx.click();
        return true;
    }

    cancelResearch() {
        if (!this.currentResearch) return;
        const tech = this.getTech(this.currentResearch);
        // Refund 50%
        const refund = Math.floor(tech.cost * 0.5);
        this.game.earn(refund, `Refund: ${tech.name}`);
        this.currentResearch = null;
        this.researchProgress = 0;
    }

    /** Called at end of each day to progress research */
    tickResearch() {
        if (!this.currentResearch) return;
        this._updateResearchSpeed();
        const tech = this.getTech(this.currentResearch);
        if (!tech) { this.currentResearch = null; return; }

        // Progress per day tick
        const increment = (100.0 / tech.researchDays) * this.researchSpeed;
        this.researchProgress = Math.min(100, this.researchProgress + increment);

        if (this.onResearchUpdate) this.onResearchUpdate(this.currentResearch, this.researchProgress);

        if (this.researchProgress >= 100) {
            this._completeResearch();
        }
    }

    _completeResearch() {
        const techId = this.currentResearch;
        const tech = this.getTech(techId);
        this.unlocked.push(techId);
        this.currentResearch = null;
        this.researchProgress = 0;
        this.game.sfx.levelUp();
        if (this.onTechUnlocked) this.onTechUnlocked(tech);
    }

    _updateResearchSpeed() {
        // Each researcher agent boosts research speed by 25%
        let researcherCount = 0;
        if (window._agentManager) {
            window._agentManager.getAllAgents().forEach(a => {
                if (a.role === 'researcher') researcherCount++;
            });
        }
        this.researchSpeed = 1.0 + researcherCount * 0.25;
    }

    // ============ BONUS GETTERS ============

    /** Cumulative task speed bonus (e.g., 0.65 = +65%) */
    getTaskSpeedBonus() {
        let bonus = 0;
        for (const techId of this.unlocked) {
            const tech = this.getTech(techId);
            if (tech.effect === 'task_speed') bonus += tech.value;
            if (tech.effect === 'overtime') bonus += tech.value;
            if (tech.effect === 'agi_boost') bonus += tech.value;
        }
        return bonus;
    }

    /** XP gain multiplier */
    getXPMultiplier() {
        let mul = 1.0;
        for (const techId of this.unlocked) {
            const tech = this.getTech(techId);
            if (tech.effect === 'xp_bonus') mul += tech.value;
            if (tech.effect === 'agi_boost') mul += tech.value * 0.5;
        }
        return mul;
    }

    /** Mood decay reduction (0.25 = 25% less decay) */
    getMoodDecayReduction() {
        let reduction = 0;
        for (const techId of this.unlocked) {
            const tech = this.getTech(techId);
            if (tech.effect === 'mood_decay_reduction') reduction += tech.value;
            if (tech.effect === 'remote_work') reduction += tech.value;
        }
        return Math.min(0.6, reduction);
    }

    /** Auto review chance (0-1) */
    getAutoReviewChance() {
        for (const techId of this.unlocked) {
            const tech = this.getTech(techId);
            if (tech.effect === 'auto_review') return tech.value;
        }
        return 0;
    }

    /** Teamwork bonus (pair/mentor chance multiplier) */
    getTeamworkBonus() {
        let bonus = 0;
        for (const techId of this.unlocked) {
            const tech = this.getTech(techId);
            if (tech.effect === 'teamwork') bonus += tech.value;
        }
        return bonus;
    }

    /** XP requirement reduction for level up */
    getXPReqReduction() {
        for (const techId of this.unlocked) {
            const tech = this.getTech(techId);
            if (tech.effect === 'xp_requirement_reduction') return tech.value;
        }
        return 0;
    }

    // ============ DATA ACCESS ============

    getTech(techId) {
        return this.techs.find(t => t.id === techId) || null;
    }

    getBranch(branchName) {
        return this.techs.filter(t => t.branch === branchName).sort((a, b) => a.tier - b.tier);
    }

    getProgressText() {
        if (!this.currentResearch) return 'Không có';
        const tech = this.getTech(this.currentResearch);
        return `${tech.icon} ${tech.name}: ${Math.floor(this.researchProgress)}%`;
    }

    // ============ PERSISTENCE ============

    saveData() {
        return {
            unlocked: [...this.unlocked],
            currentResearch: this.currentResearch,
            researchProgress: this.researchProgress,
        };
    }

    loadData(data) {
        if (!data) return;
        this.unlocked = data.unlocked || [];
        this.currentResearch = data.currentResearch || null;
        this.researchProgress = data.researchProgress || 0;
    }
}
