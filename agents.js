/**
 * Agent Manager v3 - Smart Simulation System
 * Features: Role-specific behaviors, collaboration, events, task dependencies
 */

class AgentManager {
    constructor(engine) {
        this.engine = engine;
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
        this.simulationInterval = null;
        this.eventCooldown = 0;
        this.officeBonuses = this.getDefaultOfficeBonuses();

        // Role-specific configurations
        this.roleConfigs = {
            coder:      { speedMul: 1.2, moodDecay: 0.08, energyDrain: 0.06, xpMul: 1.0, emoji: '💻', name: 'Coder',     behaviors: ['writing','thinking','reading'] },
            reviewer:   { speedMul: 0.9, moodDecay: 0.04, energyDrain: 0.04, xpMul: 0.8, emoji: '🔍', name: 'Reviewer',  behaviors: ['reading','thinking','collaborating'] },
            tester:     { speedMul: 1.0, moodDecay: 0.05, energyDrain: 0.05, xpMul: 0.9, emoji: '🧪', name: 'Tester',    behaviors: ['testing','reading','writing'] },
            designer:   { speedMul: 0.8, moodDecay: 0.06, energyDrain: 0.05, xpMul: 1.1, emoji: '🎨', name: 'Designer',  behaviors: ['thinking','writing','collaborating'] },
            devops:     { speedMul: 1.1, moodDecay: 0.05, energyDrain: 0.07, xpMul: 1.0, emoji: '🚀', name: 'DevOps',    behaviors: ['deploying','writing','reading'] },
            researcher: { speedMul: 0.7, moodDecay: 0.03, energyDrain: 0.04, xpMul: 1.3, emoji: '📚', name: 'Researcher',behaviors: ['reading','thinking','writing'] },
            analyst:    { speedMul: 0.85,moodDecay: 0.04, energyDrain: 0.04, xpMul: 1.1, emoji: '📊', name: 'Analyst',   behaviors: ['reading','thinking','collaborating'] },
            security:   { speedMul: 0.9, moodDecay: 0.06, energyDrain: 0.06, xpMul: 1.2, emoji: '🛡️', name: 'Security',  behaviors: ['testing','reading','thinking'] },
            backend:    { speedMul: 1.1, moodDecay: 0.07, energyDrain: 0.06, xpMul: 1.0, emoji: '⚙️', name: 'Backend',   behaviors: ['writing','deploying','testing'] },
            mobile:     { speedMul: 1.0, moodDecay: 0.06, energyDrain: 0.05, xpMul: 1.0, emoji: '📱', name: 'Mobile',    behaviors: ['writing','testing','thinking'] },
            writer:     { speedMul: 0.8, moodDecay: 0.03, energyDrain: 0.03, xpMul: 0.7, emoji: '✍️', name: 'Writer',    behaviors: ['writing','reading','thinking'] },
        };

        // Behavior message pools
        this.behaviorMessages = {
            writing:       ['Đang viết code...','Implementing feature...','Refactoring module...','Creating component...','Adding API endpoint...','Building new service...'],
            reading:       ['Đang đọc file...','Analyzing codebase...','Reviewing PR...','Studying docs...','Reading config...','Researching library...'],
            thinking:      ['Đang suy nghĩ...','Planning architecture...','Debugging issue...','Designing solution...','Researching approach...','Brainstorming ideas...'],
            testing:       ['Running tests...','Checking coverage...','Validating output...','E2E testing...','Load testing...','Integration testing...'],
            deploying:     ['Building project...','Deploying to staging...','Updating configs...','Running CI/CD...','Docker build...','K8s rollout...'],
            collaborating: ['Pair programming...','Code review with team...','Sharing knowledge...','Asking for help...','Mentoring junior...','Team standup...'],
        };

        // Random events pool
        this.eventPool = [
            { id: 'bug',        weight: 25, emoji: '🐛', title: 'Bug phát hiện!',           message: 'Phát hiện bug nghiêm trọng trong production!', effect: 'create_hotfix' },
            { id: 'coffee',     weight: 20, emoji: '☕', title: 'Coffee Break!',             message: 'Mọi người nghỉ uống cà phê!', effect: 'energy_boost' },
            { id: 'incident',   weight: 8,  emoji: '🔥', title: 'Production Incident!',      message: 'Server production gặp sự cố!', effect: 'all_hands' },
            { id: 'milestone',  weight: 12, emoji: '🎉', title: 'Milestone đạt được!',       message: 'Team hoàn thành milestone quan trọng!', effect: 'mood_boost' },
            { id: 'idea',       weight: 15, emoji: '💡', title: 'Ý tưởng mới!',             message: 'Có ý tưởng tuyệt vời cho feature mới!', effect: 'create_task' },
            { id: 'review',     weight: 20, emoji: '📝', title: 'Code Review Request',       message: 'Cần review code trước khi merge.', effect: 'review_flow' },
        ];
    }

    getDefaultOfficeBonuses() {
        return {
            idleEnergyRegen: 0,
            workEnergyDrainMul: 1,
            interactionEnergyMul: 1,
            xpGainMul: 1,
            negativeMoodMul: 1,
            interactionMoodMul: 1,
            pairChanceAdd: 0,
            mentorChanceAdd: 0,
            deadlineHintDays: 0,
            summary: [],
            compact: 'NONE',
        };
    }

    setOfficeBonuses(bonuses) {
        this.officeBonuses = { ...this.getDefaultOfficeBonuses(), ...(bonuses || {}) };
    }

    createAgent(data) {
        const id = `agent-${this.nextAgentId++}`;
        const config = this.roleConfigs[data.role || 'coder'];
        const agent = {
            id, name: data.name || `PixelBot-${String(this.nextAgentId-1).padStart(3,'0')}`,
            role: data.role || 'coder',
            model: data.model || 'claude-opus',
            color: data.color || '#4ecdc4',
            charIndex: data.charIndex !== undefined ? data.charIndex : Math.floor(Math.random() * 6),
            workDir: data.workDir || '/projects/default',
            status: 'idle',
            currentTask: null,
            progress: 0,
            tasksCompleted: 0, linesWritten: 0, filesModified: 0, commits: 0,
            mood: 80 + Math.floor(Math.random()*20),
            energy: 90 + Math.floor(Math.random()*10),
            skillLevel: Math.floor(Math.random()*3)+1,
            level: 1,
            xp: 0,
            // Collaboration
            pairedWith: null,    // agent id for pair programming
            mentoring: null,     // agent id being mentored
            reviewQueue: [],     // task ids waiting for review
            createdAt: new Date(), lastActive: new Date(),
        };
        this.agents.set(id, agent);
        // Add sprite to engine if available
        if (this.engine) this.engine.addAgentSprite(agent);
        return agent;
    }

    removeAgent(id) {
        const agent = this.agents.get(id);
        if (agent) {
            // Unlink pair/mentor relationships
            if (agent.pairedWith) {
                const partner = this.agents.get(agent.pairedWith);
                if (partner) partner.pairedWith = null;
            }
            if (agent.mentoring) {
                const mentee = this.agents.get(agent.mentoring);
                if (mentee) mentee.mentoring = null;
            }
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

    gainXP(agentId, amount) {
        const agent = this.agents.get(agentId);
        if (!agent) return;
        agent.xp += amount;
        
        while (agent.xp >= agent.level * 50) {
            agent.xp -= agent.level * 50;
            agent.level++;
            if (agent.level % 2 === 0) agent.skillLevel = Math.min(10, agent.skillLevel + 1);
            
            this.addLog(agent.name, `🎖️ Level Up! Đạt cấp ${agent.level} (Skill: ${agent.skillLevel})`, 'success');
            
            if (this.engine) {
                const sp = this.engine.agentSprites.get(agentId);
                if (sp) {
                    this.engine.spawnInteractionFx(Math.floor(sp.x / this.engine.T), Math.floor(sp.y / this.engine.T), '✨');
                }
            }
        }
    }

    createTask(data) {
        const task = {
            id: `task-${this.nextTaskId++}`,
            title: data.title || 'Untitled Task',
            description: data.description || '',
            type: data.type || 'feature',
            priority: data.priority || 'medium',
            status: 'pending',
            assigneeId: data.assigneeId || null,
            assignee: data.assigneeId || null,
            progress: 0,
            // Dependencies & review
            dependsOn: data.dependsOn || [],  // task ids that must complete first
            needsReview: data.needsReview || false,
            reviewedBy: null,
            reviewStatus: null,  // null, 'pending', 'approved', 'rejected'
            createdAt: new Date(), completedAt: null,
        };
        this.tasks.push(task);

        // Check if blocked by dependencies
        if (task.dependsOn.length > 0) {
            const allDone = task.dependsOn.every(depId => {
                const dep = this.tasks.find(t => t.id === depId);
                return dep && dep.status === 'completed';
            });
            if (!allDone) {
                task.status = 'blocked';
            } else if (task.assigneeId) {
                this.assignTask(task.id, task.assigneeId);
            }
        } else if (task.assigneeId) {
            this.assignTask(task.id, task.assigneeId);
        }
        this.autoAssignPendingTasks();
        return task.id;
    }

    assignTask(taskId, agentId) {
        const task = this.tasks.find(t=>t.id===taskId);
        const agent = this.agents.get(agentId);
        if (task && agent) {
            // Check if blocked
            if (task.status === 'blocked') return;
            task.assigneeId = agentId;
            task.assignee = agentId;
            task.status = 'in-progress';
            agent.currentTask = task;
            agent.status = 'working';
            agent.progress = 0;
        }
    }

    autoAssignPendingTasks() {
        const idleAgents = this.getAllAgents().filter(agent =>
            agent.status === 'idle' && !agent.currentTask && !agent._isRoaming
        );
        const pendingTasks = this.tasks.filter(task => task.status === 'pending' && !task.assigneeId);

        idleAgents.forEach(agent => {
            const nextTask = pendingTasks.shift();
            if (!nextTask) return;
            this.assignTask(nextTask.id, agent.id);
            this.addLog(agent.name, `📋 Bắt đầu: ${nextTask.title}`, 'info');
        });
    }

    completeTask(taskId) {
        const task = this.tasks.find(t=>t.id===taskId);
        const office = this.officeBonuses || this.getDefaultOfficeBonuses();
        if (!task) return;

        // Check if needs code review
        if (task.needsReview && task.reviewStatus !== 'approved') {
            task.status = 'review';
            task.reviewStatus = 'pending';
            // Find a reviewer agent
            const reviewer = this.getAllAgents().find(a => 
                a.role === 'reviewer' && a.id !== task.assigneeId && a.status === 'idle'
            );
            if (reviewer) {
                reviewer.reviewQueue.push(taskId);
                this.addLog(reviewer.name, `📝 Nhận review: ${task.title}`, 'info');
            }
            if (task.assigneeId) {
                const agent = this.agents.get(task.assigneeId);
                if (agent) {
                    agent.status = 'idle';
                    agent.currentTask = null;
                    agent.progress = 0;
                }
            }
            return;
        }

        task.status = 'completed';
        task.progress = 100;
        task.completedAt = new Date();
        if (task.assigneeId) {
            const agent = this.agents.get(task.assigneeId);
            if (agent) {
                agent.tasksCompleted++;
                agent.commits++;
                const config = this.roleConfigs[agent.role];
                const gained = Math.floor((10 + Math.random()*15) * (config?.xpMul || 1) * office.xpGainMul);
                
                this.gainXP(agent.id, gained);
                
                agent.mood = Math.min(100, agent.mood + 5);
                agent.currentTask = null;
                agent.status = 'idle';
                agent.progress = 0;
                this.stats.totalTasksCompleted++;
                this.stats.totalCommits++;
            }
        }

        // Unblock dependent tasks
        this.tasks.forEach(t => {
            if (t.status === 'blocked' && t.dependsOn.includes(taskId)) {
                const allDone = t.dependsOn.every(depId => {
                    const dep = this.tasks.find(d => d.id === depId);
                    return dep && dep.status === 'completed';
                });
                if (allDone) {
                    t.status = 'pending';
                    this.addLog('System', `🔓 Task "${t.title}" đã được mở khóa!`, 'success');
                }
            }
        });

        this.autoAssignPendingTasks();
    }

    getAllTasks() { return this.tasks; }
    getTasksByStatus(s) { return this.tasks.filter(t=>t.status===s); }

    addLog(agentName, message, type='info') {
        const now = new Date();
        const ts = now.toLocaleTimeString('vi-VN', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
        const entry = { time: ts, agent: agentName, message, type };
        this.logs.unshift(entry);
        if (this.logs.length > 500) this.logs = this.logs.slice(0,500);
        return entry;
    }

    clearLogs() { this.logs = []; }
    getLogs(limit=100) { return this.logs.slice(0,limit); }

    // === SMART SIMULATION ===
    simulateTick() {
        this.stats.uptime++;
        const office = this.officeBonuses || this.getDefaultOfficeBonuses();

        // Performance history every 60 ticks
        if (this.stats.uptime % 60 === 0) {
            const working = this.getAllAgents().filter(a=>a.status==='working'||a.status==='thinking').length;
            const total = this.agents.size || 1;
            this.performanceHistory.push({ time: this.stats.uptime, productivity: (working/total)*100, tasks: this.stats.totalTasksCompleted });
            if (this.performanceHistory.length > 30) this.performanceHistory.shift();
        }

        // Auto-save every 10 ticks (~5 seconds)
        if (this.stats.uptime % 10 === 0) {
            this.saveToStorage();
        }

        // Random events
        if (this.eventCooldown > 0) {
            this.eventCooldown--;
        } else if (Math.random() < 0.005 && this.agents.size > 0) {
            this.triggerRandomEvent();
        }

        // Process each agent
        this.agents.forEach(agent => {
            const config = this.roleConfigs[agent.role] || this.roleConfigs.coder;

            // Energy management
            if (agent.status === 'working' || agent.status === 'thinking') {
                agent.energy = Math.max(10, agent.energy - config.energyDrain * office.workEnergyDrainMul);
            } else {
                agent.energy = Math.min(100, agent.energy + 0.1 + office.idleEnergyRegen);
            }

            // Process review queue (for reviewers)
            if (agent.role === 'reviewer' && agent.status === 'idle' && agent.reviewQueue.length > 0) {
                const taskId = agent.reviewQueue[0];
                const task = this.tasks.find(t => t.id === taskId);
                if (task && task.status === 'review') {
                    // Simulate review (random approve/reject)
                    agent.reviewQueue.shift();
                    const approved = Math.random() > 0.2; // 80% approval
                    if (approved) {
                        task.reviewStatus = 'approved';
                        task.reviewedBy = agent.id;
                        this.addLog(agent.name, `✅ Approved: ${task.title}`, 'success');
                        this.completeTask(task.id);
                    } else {
                        task.reviewStatus = 'rejected';
                        task.status = 'in-progress';
                        task.progress = 70 + Math.random() * 20; // don't restart from 0
                        this.addLog(agent.name, `❌ Rejected: ${task.title} — cần sửa lại!`, 'warning');
                        // Re-assign to original coder
                        if (task.assigneeId) {
                            const coder = this.agents.get(task.assigneeId);
                            if (coder) {
                                coder.currentTask = task;
                                coder.status = 'working';
                                coder.progress = task.progress;
                                coder.mood = Math.max(30, coder.mood - 10);
                            }
                        }
                    }
                } else {
                    agent.reviewQueue.shift(); // remove stale entry
                }
            }

            // Working agent simulation
            if (agent.status === 'working' && agent.currentTask) {
                // Speed calculation with role multiplier, pair bonus, and mentor bonus
                let speedBase = (0.4 + agent.skillLevel * 0.2) * config.speedMul;
                
                // Pair programming bonus
                if (agent.pairedWith) {
                    const partner = this.agents.get(agent.pairedWith);
                    if (partner && partner.status === 'working') {
                        speedBase *= 1.3; // +30% when pair programming
                    }
                }

                const moodBonus = agent.mood / 100;
                const energyBonus = agent.energy / 100;
                const increment = speedBase * moodBonus * energyBonus + Math.random() * 1.5;
                agent.progress = Math.min(100, agent.progress + increment);
                agent.currentTask.progress = agent.progress;

                // Role-specific random activity logs
                if (Math.random() < 0.04) {
                    const behaviorType = config.behaviors[Math.floor(Math.random() * config.behaviors.length)];
                    const messages = this.behaviorMessages[behaviorType];
                    const msg = messages[Math.floor(Math.random() * messages.length)];
                    this.addLog(agent.name, msg, 'info');

                    if (behaviorType === 'writing') {
                        const l = Math.floor(Math.random() * 25) + 1;
                        agent.linesWritten += l;
                        this.stats.totalLinesWritten += l;
                    }
                    if (behaviorType === 'reading') {
                        agent.filesModified++;
                        this.stats.totalFilesModified++;
                    }
                    // Testers have higher bug detection chance
                    if (behaviorType === 'testing' && Math.random() < (agent.role === 'tester' ? 0.2 : 0.08)) {
                        this.addLog(agent.name, '⚠️ Test failed! Fixing...', 'warning');
                        this.stats.totalErrors++;
                        agent.mood = Math.max(30, agent.mood - Math.max(1, Math.round(3 * office.negativeMoodMul)));
                    }
                    // Security finds vulnerabilities
                    if (agent.role === 'security' && behaviorType === 'testing' && Math.random() < 0.15) {
                        this.addLog(agent.name, '🔒 Phát hiện lỗ hổng bảo mật!', 'warning');
                    }
                    // DevOps deployment success boosts team
                    if (agent.role === 'devops' && behaviorType === 'deploying' && Math.random() < 0.1) {
                        this.addLog(agent.name, '🚀 Deploy thành công! Team +energy', 'success');
                        this.agents.forEach(a => { a.energy = Math.min(100, a.energy + 5); });
                    }
                }

                // Status fluctuation
                if (Math.random() < 0.015) {
                    agent.status = ['working','thinking','working','working','working'][Math.floor(Math.random()*5)];
                }

                // Mood fluctuation (designers more mood-sensitive)
                if (Math.random() < 0.02) {
                    let moodDelta = agent.role === 'designer' ? (Math.random()>0.5?3:-2) : (Math.random()>0.5?2:-1);
                    if (moodDelta < 0) {
                        moodDelta = -Math.max(1, Math.round(Math.abs(moodDelta) * office.negativeMoodMul));
                    }
                    agent.mood = Math.max(30, Math.min(100, agent.mood + moodDelta));
                }

                // Task completion
                if (agent.progress >= 100) {
                    const taskTitle = agent.currentTask?.title || 'Task';
                    // Coder tasks can require review
                    if (agent.role === 'coder' && !agent.currentTask.needsReview && Math.random() < 0.3) {
                        agent.currentTask.needsReview = true;
                    }
                    this.completeTask(agent.currentTask.id);
                    this.addLog(agent.name, `✅ Hoàn thành: ${taskTitle}`, 'success');
                    
                }
            } else if (agent.status === 'idle') {
                // Idle agent behaviors — random chatter
                if (Math.random() < 0.008) {
                    const msgs = ['💤 Đang chờ việc...','☕ Uống cà phê...','🎵 Nghe nhạc...','📱 Xem tin tức...','🧘 Thiền...','💬 Chat với team...'];
                    this.addLog(agent.name, msgs[Math.floor(Math.random()*msgs.length)], 'info');
                }

                
                // === POKER: Random chance for agents to start a poker game ===
                if (!agent._isRoaming && !agent._isPlayingPoker && Math.random() < 0.002) {
                    const idleForPoker = this.getAllAgents().filter(a =>
                        a.status === 'idle' && !a._isRoaming && !a._isPlayingPoker && a.id !== agent.id
                    );
                    if (idleForPoker.length >= 1 && this.onPokerRequest) {
                        const joinCount = Math.min(idleForPoker.length, 1 + Math.floor(Math.random() * 3));
                        const shuffled = idleForPoker.sort(() => Math.random() - 0.5);
                        const pokerPlayers = [agent, ...shuffled.slice(0, joinCount)];
                        pokerPlayers.forEach(p => { p._isPlayingPoker = true; });
                        this.addLog(agent.name, `🃏 Rủ ${pokerPlayers.length - 1} đồng nghiệp chơi poker!`, 'info');
                        if (this.engine) {
                            this.engine.sendAgentTo(agent.id, 25, 15, () => {
                                this.engine.showSpeechBubble(agent.id, '🃏 Chơi poker nào!', 3000);
                                this.engine.spawnInteractionFx(25, 15, '🃏');
                                this.onPokerRequest(pokerPlayers);
                            });
                            pokerPlayers.slice(1).forEach((p, idx) => {
                                const offsets = [[24, 14], [26, 14], [24, 16]];
                                const [tx, ty] = offsets[idx % offsets.length];
                                this.engine.sendAgentTo(p.id, tx, ty, () => {
                                    this.engine.showSpeechBubble(p.id, '🃏 Chơi thôi!', 3000);
                                });
                            });
                        }
                    }
                }

                // === FREE ROAMING: Visit furniture/interaction points ===
                if (this.engine && !agent._isRoaming && Math.random() < 0.006) {
                    const point = this.engine.getRandomInteraction();
                    if (point) {
                        agent._isRoaming = true;
                        agent._roamTarget = point;

                        // Determine roam speech
                        const roamSpeech = {
                            coffee: '☕ Đi pha cà phê!',
                            vending: '🥤 Mua nước uống!',
                            bookshelf: '📖 Đọc sách một chút!',
                            sofa: '😴 Nghỉ ngơi một lát...',
                            plant: '🌿 Ngắm cây xanh...',
                            painting: '🎨 Ngắm tranh...',
                            fridge: '🍽️ Lấy đồ ăn!',
                            counter: '🍳 Pha đồ ăn!',
                        };
                        const speechText = roamSpeech[point.type] || `${point.emoji} ${point.label}`;

                        this.engine.sendAgentTo(agent.id, point.tx, point.ty, (sp) => {
                            // Agent arrived at interaction point!
                            this.engine.showSpeechBubble(agent.id, speechText, 4000);
                            this.engine.spawnInteractionFx(point.tx, point.ty, point.emoji);
                            this.addLog(agent.name, `${point.emoji} ${point.label}`, 'info');

                            // Apply effect
                            switch (point.effect) {
                                case 'energy':
                                    agent.energy = Math.min(100, agent.energy + Math.max(1, Math.round((10 + Math.floor(Math.random() * 8)) * office.interactionEnergyMul)));
                                    break;
                                case 'mood':
                                    agent.mood = Math.min(100, agent.mood + Math.max(1, Math.round((5 + Math.floor(Math.random() * 5)) * office.interactionMoodMul)));
                                    break;
                                case 'xp':
                                    this.gainXP(agent.id, Math.max(1, Math.round((2 + Math.floor(Math.random() * 3)) * office.xpGainMul)));
                                    break;
                                case 'rest':
                                    agent.energy = Math.min(100, agent.energy + Math.max(1, Math.round(15 * office.interactionEnergyMul)));
                                    agent.mood = Math.min(100, agent.mood + Math.max(1, Math.round(8 * office.interactionMoodMul)));
                                    break;
                            }

                            // Trigger callback (for chatbox to show activity)
                            if (this.onInteraction) {
                                this.onInteraction(agent, point);
                            }

                            // Stay at the point for a few seconds, then walk back
                            setTimeout(() => {
                                agent._isRoaming = false;
                                agent._roamTarget = null;
                                if (this.engine) {
                                    this.engine.sendAgentToDesk(agent.id);
                                }
                            }, 3000 + Math.random() * 4000);
                        });
                    }
                }

                // Try to mentor nearby idle agents
                if (agent.skillLevel >= 3 && !agent.mentoring && Math.random() < (0.003 + office.mentorChanceAdd)) {
                    const mentee = this.getAllAgents().find(a => 
                        a.id !== agent.id && a.skillLevel < agent.skillLevel && !a.mentoring && a.status === 'idle'
                    );
                    if (mentee) {
                        agent.mentoring = mentee.id;
                        this.gainXP(mentee.id, 5);
                        this.addLog(agent.name, `📖 Đang hướng dẫn ${mentee.name}`, 'info');
                        setTimeout(() => { agent.mentoring = null; }, 10000);
                    }
                }

                // Auto-pair programming
                if (!agent.pairedWith && Math.random() < (0.002 + office.pairChanceAdd)) {
                    const partner = this.getAllAgents().find(a =>
                        a.id !== agent.id && a.role === agent.role && !a.pairedWith && a.status === 'working'
                    );
                    if (partner) {
                        agent.pairedWith = partner.id;
                        partner.pairedWith = agent.id;
                        this.addLog(agent.name, `👥 Pair programming với ${partner.name}!`, 'info');
                        setTimeout(() => {
                            agent.pairedWith = null;
                            partner.pairedWith = null;
                        }, 30000);
                    }
                }
            }
        });
    }

    // === RANDOM EVENT SYSTEM ===
    triggerRandomEvent() {
        const totalWeight = this.eventPool.reduce((s, e) => s + e.weight, 0);
        let r = Math.random() * totalWeight;
        let event = this.eventPool[0];
        for (const e of this.eventPool) {
            r -= e.weight;
            if (r <= 0) { event = e; break; }
        }

        this.eventCooldown = 60 + Math.floor(Math.random() * 120); // 30-90 seconds cooldown
        this.addLog('System', `${event.emoji} ${event.title}: ${event.message}`, 'warning');

        switch (event.effect) {
            case 'energy_boost':
                this.agents.forEach(a => {
                    a.energy = Math.min(100, a.energy + 15);
                    a.mood = Math.min(100, a.mood + 5);
                });
                break;

            case 'mood_boost':
                this.agents.forEach(a => {
                    a.mood = Math.min(100, a.mood + 10);
                    this.gainXP(a.id, 3);
                });
                break;

            case 'create_hotfix': {
                const tester = this.getAllAgents().find(a => a.role === 'tester' && a.status === 'idle');
                const assignee = tester || this.getAllAgents().find(a => a.status === 'idle');
                this.createTask({
                    title: '🐛 Hotfix: Critical Bug',
                    description: 'Sửa lỗi nghiêm trọng vừa phát hiện',
                    priority: 'critical',
                    assigneeId: assignee?.id || null,
                });
                break;
            }

            case 'create_task':
                this.createTask({
                    title: '💡 Feature: ' + ['Dark Mode','Notifications','Search','Analytics','Export'][Math.floor(Math.random()*5)],
                    description: 'Feature mới từ brainstorm session',
                    priority: 'medium',
                });
                break;

            case 'all_hands':
                this.agents.forEach(a => {
                    a.mood = Math.max(30, a.mood - 15);
                    a.energy = Math.max(20, a.energy - 10);
                });
                this.createTask({
                    title: '🔥 Fix Production Incident',
                    description: 'Khẩn cấp: Server production gặp sự cố!',
                    priority: 'critical',
                    assigneeId: this.getAllAgents().find(a => a.role === 'devops')?.id || null,
                });
                break;

            case 'review_flow': {
                const inProgress = this.tasks.filter(t => t.status === 'in-progress' && t.progress > 80);
                if (inProgress.length > 0) {
                    const task = inProgress[Math.floor(Math.random() * inProgress.length)];
                    task.needsReview = true;
                    this.addLog('System', `📝 Task "${task.title}" cần review trước khi merge`, 'info');
                }
                break;
            }
        }
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
            blockedTasks: this.tasks.filter(t=>t.status==='blocked').length,
            reviewTasks: this.tasks.filter(t=>t.status==='review').length,
        };
    }

    // === PERSISTENCE ===
    saveToStorage() {
        try {
            const data = {
                agents: Array.from(this.agents.entries()).map(([id, a]) => {
                    const clone = { ...a };
                    if (clone.createdAt instanceof Date) clone.createdAt = clone.createdAt.toISOString();
                    if (clone.lastActive instanceof Date) clone.lastActive = clone.lastActive.toISOString();
                    clone.currentTaskId = clone.currentTask?.id || null;
                    delete clone.currentTask;
                    return [id, clone];
                }),
                tasks: this.tasks.map(t => {
                    const clone = { ...t };
                    if (clone.createdAt instanceof Date) clone.createdAt = clone.createdAt.toISOString();
                    if (clone.completedAt instanceof Date) clone.completedAt = clone.completedAt.toISOString();
                    return clone;
                }),
                stats: { ...this.stats },
                logs: this.logs.slice(0, 200).map(l => {
                    const clone = { ...l };
                    if (clone.time instanceof Date) clone.time = clone.time.toISOString();
                    return clone;
                }),
                nextAgentId: this.nextAgentId,
                nextTaskId: this.nextTaskId,
                performanceHistory: this.performanceHistory,
                savedAt: new Date().toISOString(),
            };
            localStorage.setItem('pixelAgentData', JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save agent data:', e);
        }
    }

    loadFromStorage() {
        try {
            const raw = localStorage.getItem('pixelAgentData');
            if (!raw) return false;
            const data = JSON.parse(raw);

            if (data.savedAt) {
                const age = Date.now() - new Date(data.savedAt).getTime();
                if (age > 7 * 24 * 60 * 60 * 1000) {
                    localStorage.removeItem('pixelAgentData');
                    return false;
                }
            }

            if (data.agents) {
                this.agents.clear();
                data.agents.forEach(([id, a]) => {
                    a.createdAt = new Date(a.createdAt);
                    a.lastActive = new Date(a.lastActive);
                    a.currentTask = null;
                    // Ensure new fields exist
                    if (!a.pairedWith) a.pairedWith = null;
                    if (!a.mentoring) a.mentoring = null;
                    if (!a.reviewQueue) a.reviewQueue = [];
                    if (!a.level) a.level = 1;
                    if (a.charIndex === undefined) a.charIndex = Math.floor(Math.random() * 6);
                    this.agents.set(id, a);
                    // Re-add sprite to engine
                    if (this.engine) this.engine.addAgentSprite(a);
                });
            }

            if (data.tasks) {
                this.tasks = data.tasks.map(t => {
                    t.createdAt = new Date(t.createdAt);
                    if (t.completedAt) t.completedAt = new Date(t.completedAt);
                    // Ensure new fields
                    if (!t.dependsOn) t.dependsOn = [];
                    if (t.needsReview === undefined) t.needsReview = false;
                    if (!t.reviewStatus) t.reviewStatus = null;
                    if (!t.reviewedBy) t.reviewedBy = null;
                    return t;
                });
            }

            // Re-link currentTask references
            this.agents.forEach(agent => {
                const taskId = agent.currentTaskId;
                delete agent.currentTaskId;
                if (taskId) {
                    const task = this.tasks.find(t => t.id === taskId);
                    if (task) agent.currentTask = task;
                }
            });

            if (data.stats) this.stats = { ...this.stats, ...data.stats };
            if (data.nextAgentId) this.nextAgentId = data.nextAgentId;
            if (data.nextTaskId) this.nextTaskId = data.nextTaskId;
            if (data.performanceHistory) this.performanceHistory = data.performanceHistory;
            if (data.logs) {
                this.logs = data.logs.map(l => {
                    l.time = new Date(l.time);
                    return l;
                });
            }

            return true;
        } catch (e) {
            console.warn('Failed to load agent data:', e);
            return false;
        }
    }

    clearStorage() {
        localStorage.removeItem('pixelAgentData');
    }
}

window.AgentManager = AgentManager;
