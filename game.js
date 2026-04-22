/**
 * PixelAgent City — Game Engine
 * Economy, Contracts, Day/Night, Progression, Sound FX
 */

// ============ SOUND FX (Web Audio API Chiptune) ============
class SoundFX {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.volume = 0.3;
    }
    init() {
        try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.enabled = false; }
    }
    _beep(freq, dur, type = 'square', vol = this.volume) {
        if (!this.enabled || !this.ctx) return;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type;
        o.frequency.value = freq;
        g.gain.setValueAtTime(vol, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
        o.connect(g); g.connect(this.ctx.destination);
        o.start(); o.stop(this.ctx.currentTime + dur);
    }
    coin() {
        this._beep(880, 0.08); setTimeout(() => this._beep(1174, 0.12), 60);
    }
    spend() {
        this._beep(330, 0.1, 'sawtooth'); setTimeout(() => this._beep(220, 0.15, 'sawtooth'), 80);
    }
    levelUp() {
        [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this._beep(f, 0.15, 'square', 0.25), i * 100));
    }
    taskComplete() {
        this._beep(660, 0.08); setTimeout(() => this._beep(880, 0.1), 70); setTimeout(() => this._beep(1100, 0.15), 140);
    }
    contractNew() {
        this._beep(440, 0.05); setTimeout(() => this._beep(660, 0.08), 100);
    }
    contractFail() {
        this._beep(300, 0.15, 'sawtooth'); setTimeout(() => this._beep(200, 0.3, 'sawtooth'), 150);
    }
    gameOver() {
        [400, 350, 300, 200].forEach((f, i) => setTimeout(() => this._beep(f, 0.3, 'sawtooth', 0.2), i * 250));
    }
    click() {
        this._beep(800, 0.03, 'square', 0.15);
    }
    dayStart() {
        [440, 554, 659].forEach((f, i) => setTimeout(() => this._beep(f, 0.1, 'triangle', 0.2), i * 80));
    }
    hire() {
        this._beep(523, 0.06); setTimeout(() => this._beep(659, 0.06), 60); setTimeout(() => this._beep(784, 0.12), 120);
    }
}

// ============ GAME STATE ============
class GameState {
    constructor() {
        // Economy
        this.coins = 9999999999;
        this.totalEarned = 0;
        this.totalSpent = 0;

        // Time
        this.day = 1;
        this.dayTimer = 0;        // 0 → DAY_LENGTH
        this.DAY_LENGTH = 120;    // seconds per day (2 minutes)
        this.timeOfDay = 'morning'; // morning, afternoon, evening, night
        this.gameSpeed = 1;       // 1x, 2x, 3x
        this.isPaused = false;

        // Reputation (1-5 stars, stored 0.0-5.0)
        this.reputation = 3.0;

        // Company
        this.companyLevel = 1;
        this.companyXP = 0;
        this.companyName = 'PixelAgent Studio';

        // Contracts
        this.availableContracts = [];
        this.activeContracts = [];
        this.completedContracts = 0;
        this.failedContracts = 0;
        this.nextContractId = 1;

        // Flags
        this.started = false;
        this.isGameOver = false;
        this.showingDayTransition = false;

        // Coin animations queue
        this.coinPopups = []; // { amount, x, y, life }

        // === ROOM UNLOCK SYSTEM ===
        this.unlockedRooms = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]; // All rooms unlocked

        // Room catalog — positions auto-calculated by pixel-engine
        this.roomCatalog = [
            { id: 0, name: 'Phòng Họp',        icon: '📋', cost: 0,    level: 1, w: 10, h: 7,  floor: 'wood',   desc: 'Họp nhóm, brainstorm',             bonus: 'Meeting boost' },
            { id: 1, name: 'Văn Phòng Chính',   icon: '🖥️', cost: 0,    level: 1, w: 16, h: 14, floor: 'wood',   desc: '9 bàn làm việc + máy tính',        bonus: '9 desks' },
            { id: 2, name: 'Nhà Bếp',           icon: '🍳', cost: 200,  level: 1, w: 15, h: 10, floor: 'tile',   desc: 'Máy cà phê, máy bán hàng, tủ lạnh', bonus: 'Energy regen' },
            { id: 3, name: 'Phòng Game',         icon: '🎱', cost: 500,  level: 2, w: 18, h: 12, floor: 'carpet', desc: 'Poker, Billiard, Slot Machine, Gold Trading', bonus: 'Games & Trading' },
            { id: 4, name: 'Lounge',             icon: '🛋️', cost: 400,  level: 2, w: 15, h: 7,  floor: 'carpet', desc: 'Sofa, nghỉ ngơi, thư giãn',        bonus: 'Rest + Mood' },
            { id: 5, name: 'Server Room',        icon: '🖧', cost: 800,  level: 3, w: 12, h: 8,  floor: 'tile',   desc: 'Tăng tốc hoàn thành task',         bonus: '+20% productivity' },
            { id: 6, name: 'Phòng Gym',          icon: '💪', cost: 600,  level: 3, w: 12, h: 8,  floor: 'wood',   desc: 'Gym tập thể dục cho agent',        bonus: 'Energy boost' },
            { id: 7, name: 'Thư Viện',           icon: '📚', cost: 700,  level: 4, w: 14, h: 8,  floor: 'wood',   desc: 'Kệ sách lớn, học tập nâng cấp',   bonus: '+XP bonus' },
            { id: 8, name: 'Vườn Cây',           icon: '🌿', cost: 500,  level: 4, w: 12, h: 8,  floor: 'carpet', desc: 'Khu vườn xanh thoáng đãng',        bonus: 'Mood boost' },
            { id: 9, name: 'VIP Lounge',         icon: '👑', cost: 1200, level: 5, w: 14, h: 8,  floor: 'carpet', desc: 'Phòng nghỉ cao cấp, spa',          bonus: 'Premium rest' },
            { id: 10, name: 'R&D Lab',           icon: '🔬', cost: 1500, level: 6, w: 15, h: 10, floor: 'tile',   desc: 'Phòng nghiên cứu công nghệ mới',  bonus: 'Research boost' },
            { id: 11, name: 'Sân Ngoài Trời',    icon: '🏞️', cost: 800,  level: 3, w: 18, h: 12, floor: 'grass',  desc: 'Không gian xanh, BBQ, hồ cá',     bonus: 'Mood + Energy boost' },
            { id: 12, name: 'Thang Máy',          icon: '🛗', cost: 300,  level: 2, w: 6,  h: 6,  floor: 'metal',  desc: 'Kết nối các tầng, di chuyển nhanh', bonus: 'Travel speed' },
            { id: 13, name: 'Tầng Thượng',        icon: '🌆', cost: 1500, level: 6, w: 18, h: 10, floor: 'concrete', desc: 'Sân thượng ngắm cảnh, kính thiên văn', bonus: 'Premium mood + XP' },
        ];

        // Sound
        this.sfx = new SoundFX();

        // Callbacks
        this.onCoinsChange = null;
        this.onDayEnd = null;
        this.onContractComplete = null;
        this.onContractFail = null;
        this.onLevelUp = null;
        this.onGameOver = null;
        this.onNewContracts = null;
        this.onRoomUnlocked = null;

        // === CONFIG ===
        this.hiringCosts = {
            coder: 100, reviewer: 150, tester: 120, designer: 160,
            devops: 200, researcher: 220, analyst: 180, security: 250,
            backend: 200, mobile: 200, writer: 130,
        };

        this.salaries = {
            coder: 15, reviewer: 18, tester: 14, designer: 20,
            devops: 25, researcher: 28, analyst: 22, security: 30,
            backend: 25, mobile: 22, writer: 12,
        };

        this.roleUnlockLevel = {
            coder: 1, tester: 1,
            reviewer: 2, designer: 2,
            devops: 3, researcher: 3,
            analyst: 4, security: 4,
            backend: 5, mobile: 5, writer: 5,
        };

        this.levelMilestones = [
            { level: 2, xp: 100,  title: 'Small Studio',     unlock: 'Reviewer, Designer' },
            { level: 3, xp: 300,  title: 'Growing Team',     unlock: 'DevOps, Researcher' },
            { level: 4, xp: 600,  title: 'Established Firm', unlock: 'Analyst, Security' },
            { level: 5, xp: 1000, title: 'Pro Agency',       unlock: 'Backend, Mobile, Writer' },
            { level: 6, xp: 1500, title: 'Tech Company',     unlock: 'Hard contracts' },
            { level: 7, xp: 2200, title: 'Scale-up',         unlock: 'Epic contracts' },
            { level: 8, xp: 3000, title: 'Enterprise',       unlock: 'Premium furniture' },
            { level: 9, xp: 4000, title: 'Corp Giant',       unlock: 'Unlimited agents' },
            { level: 10, xp: 5500, title: '🏆 AI Empire',    unlock: '🎉 You Win!' },
        ];

        // Contract templates
        this.contractTemplates = [
            // Easy
            { title: 'Landing Page', desc: 'Thiết kế landing page cho startup', reward: [90, 140], deadline: [2, 3], diff: 'easy', roles: ['coder'], tasks: 2 },
            { title: 'Bug Fixes', desc: 'Sửa 5 bug trong production', reward: [80, 120], deadline: [2, 3], diff: 'easy', roles: ['coder', 'tester'], tasks: 2 },
            { title: 'Logo Design', desc: 'Thiết kế logo cho thương hiệu', reward: [100, 150], deadline: [2, 4], diff: 'easy', roles: ['designer'], tasks: 2 },
            { title: 'Unit Tests', desc: 'Viết unit tests cho API', reward: [85, 130], deadline: [2, 3], diff: 'easy', roles: ['tester'], tasks: 2 },
            { title: 'Docs Update', desc: 'Cập nhật technical documentation', reward: [60, 100], deadline: [1, 2], diff: 'easy', roles: ['writer'], tasks: 2 },
            // Medium
            { title: 'REST API v2', desc: 'Phát triển REST API mới', reward: [180, 280], deadline: [3, 5], diff: 'medium', roles: ['coder', 'backend'], tasks: 4 },
            { title: 'Mobile App MVP', desc: 'Xây dựng app mobile MVP', reward: [220, 340], deadline: [4, 6], diff: 'medium', roles: ['mobile', 'designer'], tasks: 4 },
            { title: 'Dashboard UI', desc: 'Thiết kế dashboard analytics', reward: [200, 300], deadline: [3, 5], diff: 'medium', roles: ['designer', 'coder'], tasks: 4 },
            { title: 'CI/CD Pipeline', desc: 'Setup CI/CD hoàn chỉnh', reward: [210, 310], deadline: [3, 4], diff: 'medium', roles: ['devops'], tasks: 4 },
            { title: 'Security Audit', desc: 'Kiểm tra bảo mật toàn hệ thống', reward: [240, 350], deadline: [3, 5], diff: 'medium', roles: ['security', 'tester'], tasks: 4 },
            { title: 'Data Pipeline', desc: 'Xây dựng ETL data pipeline', reward: [210, 320], deadline: [3, 5], diff: 'medium', roles: ['analyst', 'backend'], tasks: 4 },
            // Hard (unlock level 6)
            { title: 'E-Commerce Platform', desc: 'Xây hệ thống e-commerce full-stack', reward: [450, 680], deadline: [5, 8], diff: 'hard', roles: ['coder', 'backend', 'designer'], tasks: 8 },
            { title: 'AI Chatbot', desc: 'Phát triển chatbot AI tích hợp NLP', reward: [520, 750], deadline: [5, 7], diff: 'hard', roles: ['researcher', 'coder', 'backend'], tasks: 8 },
            { title: 'Cross-Platform App', desc: 'App chạy trên cả iOS và Android', reward: [480, 720], deadline: [6, 9], diff: 'hard', roles: ['mobile', 'designer', 'tester'], tasks: 8 },
            // Epic (unlock level 7)
            { title: 'Enterprise SaaS', desc: 'Hệ thống SaaS Enterprise đầy đủ', reward: [900, 1400], deadline: [8, 12], diff: 'epic', roles: ['coder', 'backend', 'devops', 'security', 'designer'], tasks: 12 },
            { title: 'AI Research Project', desc: 'Dự án nghiên cứu AI quy mô lớn', reward: [1000, 1500], deadline: [8, 12], diff: 'epic', roles: ['researcher', 'analyst', 'coder', 'writer'], tasks: 12 },
        ];

        // Furniture costs for shop
        this.furnitureCosts = {
            desk: 50, mtable: 120, table_small: 30, table_low: 25,
            mchair: 15, chair: 10, sofa: 80, armchair: 60,
            bookshelf: 40, cabinet: 35, shelf: 20, boxes: 5,
            vending: 60, coffee: 45, fridge: 55, counter: 70,
            plant: 15, cactus: 10, painting: 25, lamp: 20,
            clock: 15, pictureframe: 8, bed_single: 90, bed_double: 130,
            rug: 35, pillow: 8,
            // New areas furniture
            parasol: 45, bbq_grill: 65, pond: 80, bench_outdoor: 30,
            elevator_door: 100, elevator_panel: 40,
            telescope: 120, antenna: 90, helipad: 150,
        };

        this.officeBonuses = this.getOfficeBonuses([]);
    }

    // ============ ECONOMY ============
    canAfford(amount) { return this.coins >= amount; }

    earn(amount, reason = '') {
        this.coins += amount;
        this.totalEarned += amount;
        if (this.onCoinsChange) this.onCoinsChange(amount, reason);
        this.sfx.coin();
    }

    spend(amount, reason = '') {
        if (!this.canAfford(amount)) return false;
        this.coins -= amount;
        this.totalSpent += amount;
        if (this.onCoinsChange) this.onCoinsChange(-amount, reason);
        this.sfx.spend();
        return true;
    }

    // ============ ROOM UNLOCK ============
    isRoomUnlocked(roomId) {
        return this.unlockedRooms.includes(roomId);
    }

    canUnlockRoom(roomId) {
        const room = this.roomCatalog.find(r => r.id === roomId);
        if (!room) return false;
        if (this.isRoomUnlocked(roomId)) return false;
        // Level check removed — all rooms available
        if (this.coins < room.cost) return false;
        return true;
    }

    unlockRoom(roomId) {
        const room = this.roomCatalog.find(r => r.id === roomId);
        if (!room || !this.canUnlockRoom(roomId)) return false;
        if (room.cost > 0) {
            this.spend(room.cost, `Mở khóa phòng: ${room.name}`);
        }
        this.unlockedRooms.push(roomId);
        this.sfx.levelUp();
        if (this.onRoomUnlocked) this.onRoomUnlocked(room);
        return true;
    }

    getAvailableRooms() {
        return this.roomCatalog.filter(r => !this.isRoomUnlocked(r.id));
    }

    getUnlockedRoomData() {
        return this.roomCatalog.filter(r => this.isRoomUnlocked(r.id));
    }

    getDailySalary(agents) {
        let total = 0;
        agents.forEach(a => { total += (this.salaries[a.role] || 15); });
        return total;
    }

    // ============ DAY CYCLE ============
    tickDay(realDeltaSec) {
        if (this.isPaused || this.isGameOver || !this.started) return;

        const dt = realDeltaSec * this.gameSpeed;
        this.dayTimer += dt;

        // Time of day phases
        const pct = this.dayTimer / this.DAY_LENGTH;
        if (pct < 0.25) this.timeOfDay = 'morning';
        else if (pct < 0.5) this.timeOfDay = 'afternoon';
        else if (pct < 0.75) this.timeOfDay = 'evening';
        else this.timeOfDay = 'night';

        // Update contract deadlines (count in real-time within a day)
        // Contracts count down at end of day

        // Day ends
        if (this.dayTimer >= this.DAY_LENGTH) {
            this.dayTimer = 0;
            this.endDay();
        }
    }

    endDay() {
        this.day++;

        // 1. Pay salaries
        const salaryTotal = this._currentSalary;
        if (salaryTotal > 0) {
            this.coins -= salaryTotal;
            this.totalSpent += salaryTotal;
        }

        // 2. Contract deadline countdown
        this.activeContracts.forEach(c => {
            c.daysRemaining--;
            if (c.daysRemaining <= 0 && c.status === 'active') {
                c.status = 'failed';
                this.failedContracts++;
                this.reputation = Math.max(0.5, this.reputation - 0.4);
                this.sfx.contractFail();
                if (this.onContractFail) this.onContractFail(c);
                // Penalty
                const penalty = Math.floor(c.reward * 0.2);
                this.coins -= penalty;
                this.totalSpent += penalty;
            }
        });
        // Remove failed/completed from active
        this.activeContracts = this.activeContracts.filter(c => c.status === 'active');

        // 3. Generate new contracts
        if (this.availableContracts.length < 4) {
            this.generateContracts(2 + Math.floor(Math.random() * 2));
        }

        // 4. Check game over
        if (this.coins < 0) {
            this.isGameOver = true;
            this.sfx.gameOver();
            if (this.onGameOver) this.onGameOver();
            return;
        }

        // 5. Day start sound
        this.sfx.dayStart();
        this.showingDayTransition = true;
        setTimeout(() => { this.showingDayTransition = false; }, 2500);

        if (this.onDayEnd) this.onDayEnd(this.day, salaryTotal);
    }

    _currentSalary = 0;
    updateSalaryCache(agents) {
        this._currentSalary = this.getDailySalary(agents);
    }

    getOfficeBonuses(furniture = []) {
        const counts = {};
        furniture.forEach(item => {
            const key = item?.t;
            if (!key) return;
            counts[key] = (counts[key] || 0) + 1;
        });

        const foodCount = (counts.coffee || 0) + (counts.vending || 0) + (counts.fridge || 0) + (counts.counter || 0) + (counts.bbq_grill || 0);
        const shelfCount = (counts.bookshelf || 0) + (counts.shelf || 0);
        const greeneryCount = (counts.plant || 0) + (counts.cactus || 0) + (counts.pond || 0);
        const decorCount = (counts.painting || 0) + (counts.lamp || 0) + (counts.pictureframe || 0);
        const loungeCount = (counts.sofa || 0) + (counts.armchair || 0) + (counts.bed_single || 0) + (counts.bed_double || 0) + (counts.rug || 0) + (counts.pillow || 0) + (counts.parasol || 0);
        const meetingCount = counts.mtable || 0;
        const outdoorCount = (counts.parasol || 0) + (counts.bench_outdoor || 0) + (counts.bbq_grill || 0) + (counts.pond || 0);
        const rooftopCount = (counts.telescope || 0) + (counts.antenna || 0) + (counts.helipad || 0);

        const bonuses = {
            counts,
            idleEnergyRegen: Math.min(0.25, foodCount * 0.03 + outdoorCount * 0.02),
            workEnergyDrainMul: Math.max(0.78, 1 - foodCount * 0.025 - outdoorCount * 0.01),
            interactionEnergyMul: 1 + Math.min(0.55, foodCount * 0.05 + loungeCount * 0.08 + outdoorCount * 0.04),
            xpGainMul: 1 + Math.min(0.32, shelfCount * 0.06 + rooftopCount * 0.04),
            negativeMoodMul: Math.max(0.65, 1 - greeneryCount * 0.05 - decorCount * 0.025 - outdoorCount * 0.03),
            interactionMoodMul: 1 + Math.min(0.45, greeneryCount * 0.06 + decorCount * 0.04 + loungeCount * 0.03 + outdoorCount * 0.05 + rooftopCount * 0.03),
            pairChanceAdd: Math.min(0.004, meetingCount * 0.0015),
            mentorChanceAdd: Math.min(0.004, meetingCount * 0.001 + shelfCount * 0.0007),
            deadlineHintDays: counts.clock ? 1 : 0,
            summary: [],
            compact: 'NONE',
        };

        if (bonuses.idleEnergyRegen > 0 || bonuses.workEnergyDrainMul < 1) {
            bonuses.summary.push(`Energy +${Math.round((bonuses.interactionEnergyMul - 1) * 100)}%`);
        }
        if (bonuses.xpGainMul > 1) {
            bonuses.summary.push(`XP +${Math.round((bonuses.xpGainMul - 1) * 100)}%`);
        }
        if (bonuses.negativeMoodMul < 1) {
            bonuses.summary.push(`Stress -${Math.round((1 - bonuses.negativeMoodMul) * 100)}%`);
        }
        if (bonuses.pairChanceAdd > 0 || bonuses.mentorChanceAdd > 0) {
            bonuses.summary.push(`Teamwork +${Math.round((bonuses.pairChanceAdd + bonuses.mentorChanceAdd) * 10000)}%`);
        }
        if (bonuses.deadlineHintDays > 0) {
            bonuses.summary.push(`Clock +${bonuses.deadlineHintDays}d`);
        }

        bonuses.compact = bonuses.summary.slice(0, 3).join(' · ') || 'NONE';
        this.officeBonuses = bonuses;
        return bonuses;
    }

    // ============ CONTRACTS ============
    generateContracts(count = 3) {
        const eligible = this.contractTemplates.filter(t => {
            if (t.diff === 'hard' && this.companyLevel < 6) return false;
            if (t.diff === 'epic' && this.companyLevel < 7) return false;
            return true;
        });

        for (let i = 0; i < count && eligible.length > 0; i++) {
            const template = eligible[Math.floor(Math.random() * eligible.length)];
            const reward = this._randRange(template.reward[0], template.reward[1]);
            // Reputation bonus
            const repBonus = Math.floor(reward * (this.reputation - 3) * 0.1);

            const contract = {
                id: `contract-${this.nextContractId++}`,
                title: template.title,
                description: template.desc,
                reward: reward + Math.max(0, repBonus),
                deadline: this._randRange(template.deadline[0], template.deadline[1]),
                daysRemaining: 0,
                difficulty: template.diff,
                requiredRoles: [...template.roles],
                tasksNeeded: template.tasks,
                tasksCompleted: 0,
                generatedTasks: [],
                status: 'available', // available, active, completed, failed
                acceptedDay: 0,
            };
            contract.daysRemaining = contract.deadline;
            this.availableContracts.push(contract);
        }

        this.sfx.contractNew();
        if (this.onNewContracts) this.onNewContracts();
    }

    acceptContract(contractId) {
        const idx = this.availableContracts.findIndex(c => c.id === contractId);
        if (idx === -1) return null;
        const contract = this.availableContracts.splice(idx, 1)[0];
        contract.status = 'active';
        contract.acceptedDay = this.day;
        this.activeContracts.push(contract);
        this.sfx.click();
        return contract;
    }

    rejectContract(contractId) {
        this.availableContracts = this.availableContracts.filter(c => c.id !== contractId);
    }

    onTaskCompleted(taskId) {
        // Check if any active contract owns this task
        for (const contract of this.activeContracts) {
            if (contract.generatedTasks.includes(taskId)) {
                contract.tasksCompleted++;
                if (contract.tasksCompleted >= contract.tasksNeeded) {
                    this.completeContract(contract.id);
                }
                return contract;
            }
        }
        // Even uncontracted tasks earn a bonus
        this.earn(25, 'Task bonus');
        this.addCompanyXP(8);
        return null;
    }

    completeContract(contractId) {
        const contract = this.activeContracts.find(c => c.id === contractId);
        if (!contract) return;
        contract.status = 'completed';
        this.completedContracts++;

        // Reward
        const bonus = contract.daysRemaining > 0 ? Math.floor(contract.reward * 0.15) : 0;
        const total = contract.reward + bonus;
        this.earn(total, `Contract: ${contract.title}`);

        // Rep boost
        const repGain = contract.daysRemaining > 0 ? 0.3 : 0.15;
        this.reputation = Math.min(5, this.reputation + repGain);

        // XP
        const xpMap = { easy: 30, medium: 60, hard: 120, epic: 250 };
        this.addCompanyXP(xpMap[contract.difficulty] || 30);

        this.sfx.taskComplete();
        if (this.onContractComplete) this.onContractComplete(contract, bonus);

        // Remove from active
        this.activeContracts = this.activeContracts.filter(c => c.id !== contractId);
    }

    // ============ COMPANY PROGRESSION ============
    addCompanyXP(amount) {
        this.companyXP += amount;
        const milestone = this.levelMilestones.find(m => m.level === this.companyLevel + 1);
        if (milestone && this.companyXP >= milestone.xp) {
            this.companyLevel++;
            this.sfx.levelUp();
            if (this.onLevelUp) this.onLevelUp(this.companyLevel, milestone);
            // Check win condition
            if (this.companyLevel >= 10) {
                // Game won!
            }
        }
    }

    getXPProgress() {
        const current = this.levelMilestones.find(m => m.level === this.companyLevel);
        const next = this.levelMilestones.find(m => m.level === this.companyLevel + 1);
        if (!next) return 100;
        const prev = current ? (this.levelMilestones.find(m => m.level === this.companyLevel - 1)?.xp || 0) : 0;
        return Math.min(100, ((this.companyXP - prev) / (next.xp - prev)) * 100);
    }

    isRoleUnlocked(role) {
        return this.companyLevel >= (this.roleUnlockLevel[role] || 1);
    }

    getUnlockedRoles() {
        return Object.entries(this.roleUnlockLevel)
            .filter(([_, lvl]) => this.companyLevel >= lvl)
            .map(([role]) => role);
    }

    // ============ GAME FLOW ============
    startNewGame() {
        this.coins = 500;
        this.day = 1;
        this.dayTimer = 0;
        this.reputation = 3.0;
        this.companyLevel = 1;
        this.companyXP = 0;
        this.totalEarned = 0;
        this.totalSpent = 0;
        this.availableContracts = [];
        this.activeContracts = [];
        this.completedContracts = 0;
        this.failedContracts = 0;
        this.nextContractId = 1;
        this.isGameOver = false;
        this.isPaused = false;
        this.gameSpeed = 1;
        this.started = true;
        this.generateContracts(3);
        this.sfx.init();
        this.sfx.dayStart();
    }

    continueGame() {
        this.started = true;
        this.isPaused = false;
        this.isGameOver = false;
        this.sfx.init();
    }

    // ============ PERSISTENCE ============
    saveGame(agentManager) {
        try {
            const data = {
                coins: this.coins, day: this.day, dayTimer: this.dayTimer,
                reputation: this.reputation, companyLevel: this.companyLevel,
                companyXP: this.companyXP, companyName: this.companyName,
                totalEarned: this.totalEarned, totalSpent: this.totalSpent,
                completedContracts: this.completedContracts, failedContracts: this.failedContracts,
                nextContractId: this.nextContractId, gameSpeed: this.gameSpeed,
                availableContracts: this.availableContracts,
                activeContracts: this.activeContracts,
                unlockedRooms: this.unlockedRooms,
                savedAt: new Date().toISOString(),
            };
            localStorage.setItem('pixelAgentGameState', JSON.stringify(data));
        } catch (e) { console.warn('Failed to save game:', e); }
    }

    loadGame() {
        try {
            const raw = localStorage.getItem('pixelAgentGameState');
            if (!raw) return false;
            const d = JSON.parse(raw);
            if (d.savedAt) {
                const age = Date.now() - new Date(d.savedAt).getTime();
                if (age > 30 * 24 * 60 * 60 * 1000) { localStorage.removeItem('pixelAgentGameState'); return false; }
            }
            Object.assign(this, {
                coins: d.coins ?? 9999999999, day: d.day ?? 1, dayTimer: d.dayTimer ?? 0,
                reputation: d.reputation ?? 3, companyLevel: d.companyLevel ?? 1,
                companyXP: d.companyXP ?? 0, companyName: d.companyName ?? 'PixelAgent Studio',
                totalEarned: d.totalEarned ?? 0, totalSpent: d.totalSpent ?? 0,
                completedContracts: d.completedContracts ?? 0, failedContracts: d.failedContracts ?? 0,
                nextContractId: d.nextContractId ?? 1, gameSpeed: d.gameSpeed ?? 1,
                availableContracts: d.availableContracts ?? [],
                activeContracts: d.activeContracts ?? [],
                unlockedRooms: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
            });
            return true;
        } catch (e) { console.warn('Failed to load game:', e); return false; }
    }

    clearGameSave() {
        localStorage.removeItem('pixelAgentGameState');
    }

    // ============ HELPERS ============
    _randRange(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); }

    getRepStars() {
        const full = Math.floor(this.reputation);
        const half = this.reputation % 1 >= 0.5 ? 1 : 0;
        return '⭐'.repeat(full) + (half ? '✨' : '') + '☆'.repeat(Math.max(0, 5 - full - half));
    }

    getDifficultyBadge(diff) {
        const m = { easy: ['🟢', 'Easy'], medium: ['🟡', 'Medium'], hard: ['🟠', 'Hard'], epic: ['🔴', 'Epic'] };
        return m[diff] || m.easy;
    }

    formatCoins(n) {
        if (n >= 10000) return (n / 1000).toFixed(1) + 'K';
        return n.toLocaleString();
    }

    getDayProgress() {
        return Math.min(100, (this.dayTimer / this.DAY_LENGTH) * 100);
    }

    getTimeIcon() {
        const m = { morning: '🌅', afternoon: '☀️', evening: '🌇', night: '🌙' };
        return m[this.timeOfDay] || '☀️';
    }

    getNightOverlayAlpha() {
        const pct = this.dayTimer / this.DAY_LENGTH;
        if (pct < 0.5) return 0;
        if (pct < 0.75) return (pct - 0.5) * 0.6;
        return 0.15 + (pct - 0.75) * 0.8;
    }
}

window.SoundFX = SoundFX;
window.GameState = GameState;
