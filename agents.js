/**
 * Agent Manager v2 - Enhanced behaviors, collaboration,
 * skill levels, mood system, and richer simulation.
 */

class AgentManager {
    constructor() {
        this.agents = new Map();
        this.tasks = [];
        this.logs = [];
        this.nextAgentId = 1;
        this.nextTaskId = 1;
        this.stats = {
            totalTasksCompleted: 0,
            totalLinesWritten: 0,
            totalFilesModified: 0,
            totalErrors: 0,
            totalCommits: 0,
            uptime: 0,
        };
        this.performanceHistory = [];
        this.behaviors = [
            { action:'writing', messages:['Đang viết code...','Implementing feature...','Refactoring module...','Creating component...','Adding API endpoint...'] },
            { action:'reading', messages:['Đang đọc file...','Analyzing codebase...','Reviewing PR...','Studying docs...','Reading config...'] },
            { action:'thinking', messages:['Đang suy nghĩ...','Planning architecture...','Debugging issue...','Designing solution...','Researching approach...'] },
            { action:'testing', messages:['Running tests...','Checking coverage...','Validating output...','E2E testing...','Load testing...'] },
            { action:'deploying', messages:['Building project...','Deploying to staging...','Updating configs...','Running CI/CD...','Docker build...'] },
            { action:'collaborating', messages:['Pair programming...','Code review with team...','Sharing knowledge...','Asking for help...','Mentoring...'] },
        ];
        this.simulationInterval = null;
    }

    createAgent(data) {
        const id = `agent-${this.nextAgentId++}`;
        const agent = {
            id, name: data.name || `PixelBot-${String(this.nextAgentId-1).padStart(3,'0')}`,
            role: data.role || 'coder',
            model: data.model || 'claude-opus',
            color: data.color || '#4ecdc4',
            workDir: data.workDir || '/projects/default',
            status: 'idle',
            currentTask: null,
            progress: 0,
            // Enhanced stats
            tasksCompleted: 0, linesWritten: 0, filesModified: 0, commits: 0,
            // Mood system: 0-100
            mood: 80 + Math.floor(Math.random()*20),
            energy: 90 + Math.floor(Math.random()*10),
            // Skill level 1-5
            skillLevel: Math.floor(Math.random()*3)+1,
            xp: 0,
            createdAt: new Date(), lastActive: new Date(),
        };
        this.agents.set(id, agent);
        return agent;
    }

    removeAgent(id) {
        const agent = this.agents.get(id);
        if (agent) {
            this.tasks.forEach(t => { if (t.assigneeId===id) { t.assigneeId=null; t.status='pending'; } });
            this.agents.delete(id);
            return agent;
        }
        return null;
    }

    getAgent(id) { return this.agents.get(id); }
    getAllAgents() { return Array.from(this.agents.values()); }

    updateStatus(id, status) {
        const a = this.agents.get(id);
        if (a) { a.status = status; a.lastActive = new Date(); }
    }

    createTask(data) {
        const task = {
            id: `task-${this.nextTaskId++}`,
            title: data.title || 'Untitled Task',
            description: data.description || '',
            priority: data.priority || 'medium',
            status: 'pending',
            assigneeId: data.assigneeId || null,
            progress: 0,
            createdAt: new Date(), completedAt: null,
        };
        this.tasks.push(task);
        if (task.assigneeId) this.assignTask(task.id, task.assigneeId);
        return task;
    }

    assignTask(taskId, agentId) {
        const task = this.tasks.find(t=>t.id===taskId);
        const agent = this.agents.get(agentId);
        if (task && agent) {
            task.assigneeId = agentId;
            task.status = 'in-progress';
            agent.currentTask = task;
            agent.status = 'working';
            agent.progress = 0;
        }
    }

    completeTask(taskId) {
        const task = this.tasks.find(t=>t.id===taskId);
        if (!task) return;
        task.status = 'completed';
        task.progress = 100;
        task.completedAt = new Date();
        if (task.assigneeId) {
            const agent = this.agents.get(task.assigneeId);
            if (agent) {
                agent.tasksCompleted++;
                agent.commits++;
                agent.xp += 10 + Math.floor(Math.random()*15);
                // Level up check
                if (agent.xp >= agent.skillLevel * 50) { agent.skillLevel = Math.min(5, agent.skillLevel+1); agent.xp = 0; }
                agent.mood = Math.min(100, agent.mood + 5);
                agent.currentTask = null;
                agent.status = 'idle';
                agent.progress = 0;
                this.stats.totalTasksCompleted++;
                this.stats.totalCommits++;
            }
        }
    }

    getAllTasks() { return this.tasks; }
    getTasksByStatus(s) { return this.tasks.filter(t=>t.status===s); }

    addLog(agentName, message, type='info') {
        const entry = { time: new Date(), agent: agentName, message, type };
        this.logs.unshift(entry);
        if (this.logs.length > 500) this.logs = this.logs.slice(0,500);
        return entry;
    }

    clearLogs() { this.logs = []; }
    getLogs(limit=100) { return this.logs.slice(0,limit); }

    simulateTick() {
        this.stats.uptime++;
        // Record performance history every 60 ticks
        if (this.stats.uptime % 60 === 0) {
            const working = this.getAllAgents().filter(a=>a.status==='working'||a.status==='thinking').length;
            const total = this.agents.size || 1;
            this.performanceHistory.push({ time: this.stats.uptime, productivity: (working/total)*100, tasks: this.stats.totalTasksCompleted });
            if (this.performanceHistory.length > 30) this.performanceHistory.shift();
        }

        this.agents.forEach(agent => {
            // Energy drain
            if (agent.status === 'working' || agent.status === 'thinking') {
                agent.energy = Math.max(10, agent.energy - 0.05);
            } else {
                agent.energy = Math.min(100, agent.energy + 0.1);
            }

            if (agent.status === 'working' && agent.currentTask) {
                // Speed based on skill, mood, energy
                const speedBase = 0.4 + agent.skillLevel * 0.2;
                const moodBonus = agent.mood / 100;
                const energyBonus = agent.energy / 100;
                const increment = speedBase * moodBonus * energyBonus + Math.random() * 1.5;
                agent.progress = Math.min(100, agent.progress + increment);
                agent.currentTask.progress = agent.progress;

                // Random activity logs
                if (Math.random() < 0.04) {
                    const beh = this.behaviors[Math.floor(Math.random()*this.behaviors.length)];
                    const msg = beh.messages[Math.floor(Math.random()*beh.messages.length)];
                    this.addLog(agent.name, msg, 'info');
                    if (beh.action==='writing') { const l=Math.floor(Math.random()*25)+1; agent.linesWritten+=l; this.stats.totalLinesWritten+=l; }
                    if (beh.action==='reading') { agent.filesModified++; this.stats.totalFilesModified++; }
                    if (beh.action==='testing' && Math.random()<0.1) { this.addLog(agent.name, '⚠️ Test failed! Fixing...', 'warning'); this.stats.totalErrors++; }
                }

                // Status fluctuation
                if (Math.random()<0.015) {
                    agent.status = ['working','thinking','working','working','working'][Math.floor(Math.random()*5)];
                }

                // Mood fluctuation
                if (Math.random()<0.02) {
                    agent.mood = Math.max(30, Math.min(100, agent.mood + (Math.random()>0.5?2:-1)));
                }

                // Task completion
                if (agent.progress >= 100) {
                    const taskTitle = agent.currentTask?.title || 'Task';
                    this.completeTask(agent.currentTask.id);
                    this.addLog(agent.name, `✅ Hoàn thành: ${taskTitle}`, 'success');
                    const next = this.tasks.find(t=>t.status==='pending'&&!t.assigneeId);
                    if (next) {
                        setTimeout(()=>{
                            this.assignTask(next.id, agent.id);
                            this.addLog(agent.name, `📋 Bắt đầu: ${next.title}`, 'info');
                        }, 1500);
                    }
                }
            } else if (agent.status==='idle') {
                if (Math.random()<0.008) {
                    const msgs = ['💤 Đang chờ việc...','☕ Uống cà phê...','🎵 Nghe nhạc...','📱 Xem tin tức...','🧘 Thiền...','💬 Chat với team...'];
                    this.addLog(agent.name, msgs[Math.floor(Math.random()*msgs.length)], 'info');
                }
            }
        });
    }

    startSimulation() {
        if (!this.simulationInterval) this.simulationInterval = setInterval(()=>this.simulateTick(), 500);
    }
    stopSimulation() {
        if (this.simulationInterval) { clearInterval(this.simulationInterval); this.simulationInterval=null; }
    }

    getStats() {
        return {
            ...this.stats,
            agentsOnline: this.agents.size,
            activeTasks: this.tasks.filter(t=>t.status==='in-progress').length,
            pendingTasks: this.tasks.filter(t=>t.status==='pending').length,
            completedTasks: this.tasks.filter(t=>t.status==='completed').length,
        };
    }
}

window.AgentManager = AgentManager;
