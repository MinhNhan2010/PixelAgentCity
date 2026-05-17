/**
 * PixelAgent City — Statistics Dashboard
 * Tracks and displays game economy, agent performance, and mini-game stats.
 */

class StatsDashboard {
    constructor() {
        this.history = {
            dailyIncome: [],    // { day, income, expense, net }
            agentPerformance: [], // { day, tasks, avgMood, avgEnergy }
            contractHistory: [], // { day, completed, failed }
        };
        this.maxHistory = 30;
    }

    // Record daily data (call on each day end)
    recordDay(game, manager) {
        try {
            const agents = manager ? Array.from(manager.agents.values()) : [];
            const day = game.day;

            // Economy
            this.history.dailyIncome.push({
                day,
                income: game.totalEarned,
                expense: game.totalSpent,
                net: game.totalEarned - game.totalSpent,
                coins: game.coins,
            });

            // Agent performance
            const avgMood = agents.length > 0
                ? agents.reduce((s, a) => s + (a.mood || 70), 0) / agents.length
                : 0;
            const avgEnergy = agents.length > 0
                ? agents.reduce((s, a) => s + (a.energy || 80), 0) / agents.length
                : 0;
            this.history.agentPerformance.push({
                day,
                count: agents.length,
                tasks: manager?.stats?.totalTasksCompleted || 0,
                avgMood: Math.round(avgMood),
                avgEnergy: Math.round(avgEnergy),
            });

            // Contracts
            this.history.contractHistory.push({
                day,
                completed: game.completedContracts,
                failed: game.failedContracts,
            });

            // Trim history
            if (this.history.dailyIncome.length > this.maxHistory) this.history.dailyIncome.shift();
            if (this.history.agentPerformance.length > this.maxHistory) this.history.agentPerformance.shift();
            if (this.history.contractHistory.length > this.maxHistory) this.history.contractHistory.shift();
        } catch (e) {
            if (window.PAC) PAC.ErrorHandler.log('stats', `recordDay failed: ${e.message}`);
        }
    }

    // Get summary stats
    getSummary(game, manager) {
        const agents = manager ? Array.from(manager.agents.values()) : [];
        const stats = manager?.stats || {};

        return {
            // Economy
            coins: game.coins,
            totalEarned: game.totalEarned,
            totalSpent: game.totalSpent,
            netProfit: game.totalEarned - game.totalSpent,
            dailyBurn: this._calcDailyBurn(game, agents),

            // Company
            day: game.day,
            level: game.companyLevel,
            reputation: game.reputation,
            completedContracts: game.completedContracts,
            failedContracts: game.failedContracts,
            successRate: game.completedContracts > 0
                ? ((game.completedContracts / (game.completedContracts + game.failedContracts)) * 100).toFixed(0)
                : '0',

            // Agents
            agentCount: agents.length,
            totalTasks: stats.totalTasksCompleted || 0,
            totalLines: stats.totalLinesWritten || 0,
            totalCommits: stats.totalCommits || 0,
            avgMood: agents.length > 0
                ? Math.round(agents.reduce((s, a) => s + (a.mood || 70), 0) / agents.length)
                : 0,
            avgEnergy: agents.length > 0
                ? Math.round(agents.reduce((s, a) => s + (a.energy || 80), 0) / agents.length)
                : 0,

            // Role distribution
            roleDistribution: this._getRoleDistribution(agents),

            // Performance trend
            trend: this._calcTrend(),
        };
    }

    _calcDailyBurn(game, agents) {
        let salary = 0;
        agents.forEach(a => {
            salary += game.salaries[a.role] || 15;
        });
        return salary;
    }

    _getRoleDistribution(agents) {
        const dist = {};
        agents.forEach(a => {
            dist[a.role] = (dist[a.role] || 0) + 1;
        });
        return dist;
    }

    _calcTrend() {
        const inc = this.history.dailyIncome;
        if (inc.length < 3) return 'neutral';
        const recent = inc.slice(-3);
        const avgRecent = recent.reduce((s, d) => s + d.net, 0) / recent.length;
        const older = inc.slice(-6, -3);
        if (older.length === 0) return 'neutral';
        const avgOlder = older.reduce((s, d) => s + d.net, 0) / older.length;
        if (avgRecent > avgOlder * 1.1) return 'up';
        if (avgRecent < avgOlder * 0.9) return 'down';
        return 'neutral';
    }

    // Render to a canvas (mini chart)
    drawMiniChart(canvas, type = 'coins') {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        // Background
        ctx.fillStyle = 'rgba(10, 14, 26, 0.6)';
        ctx.fillRect(0, 0, W, H);

        const data = this.history.dailyIncome;
        if (data.length < 2) {
            ctx.fillStyle = 'rgba(78, 205, 196, 0.5)';
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Chưa đủ dữ liệu', W / 2, H / 2);
            return;
        }

        const values = data.map(d => type === 'coins' ? d.coins : d.net);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;
        const PAD = 5;

        // Draw line
        ctx.strokeStyle = type === 'coins' ? '#4ecdc4' : (values[values.length - 1] >= 0 ? '#00d4aa' : '#ff4757');
        ctx.lineWidth = 2;
        ctx.beginPath();
        values.forEach((v, i) => {
            const x = PAD + (i / (values.length - 1)) * (W - PAD * 2);
            const y = PAD + (1 - (v - min) / range) * (H - PAD * 2);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Fill gradient under line
        const lastX = PAD + ((values.length - 1) / (values.length - 1)) * (W - PAD * 2);
        ctx.lineTo(lastX, H - PAD);
        ctx.lineTo(PAD, H - PAD);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, type === 'coins' ? 'rgba(78, 205, 196, 0.3)' : 'rgba(0, 212, 170, 0.3)');
        grad.addColorStop(1, 'rgba(10, 14, 26, 0)');
        ctx.fillStyle = grad;
        ctx.fill();
    }

    // Save/load
    saveData() {
        return { ...this.history };
    }

    loadData(data) {
        if (data) {
            this.history = {
                dailyIncome: data.dailyIncome || [],
                agentPerformance: data.agentPerformance || [],
                contractHistory: data.contractHistory || [],
            };
        }
    }
}

window.StatsDashboard = StatsDashboard;
