/**
 * Pixel AI Agent Manager v3 - Enhanced UI Controller
 */

document.addEventListener('DOMContentLoaded', () => {
    const engine = new PixelEngine('officeCanvas', 'minimapCanvas');
    const manager = new AgentManager();
    const layoutEditor = new LayoutEditor(engine);
    const chatbox = new AgentChatbox(manager, engine);

    // Connect engine reference for free roaming
    manager.engine = engine;

    // Hook ghost preview into engine render
    const origRender = engine.render.bind(engine);
    engine.render = function() {
        origRender();
    };
    // Add ghost drawing after main render via post-render hook
    engine._postRender = () => {
        layoutEditor.drawGhost(engine.ctx, engine.scale, engine.camera);
    };

    const DOM = {
        agentsOnline: document.getElementById('agentsOnline'),
        activeTasks: document.getElementById('activeTasks'),
        cpuUsage: document.getElementById('cpuUsage'),
        agentList: document.getElementById('agentList'),
        taskList: document.getElementById('taskList'),
        logConsole: document.getElementById('logConsole'),
        statsGrid: document.getElementById('statsGrid'),
        pixelClock: document.getElementById('pixelClock'),
        memoryUsage: document.getElementById('memoryUsage'),
        uptime: document.getElementById('uptime'),
        toastContainer: document.getElementById('toastContainer'),
    };

    drawLogo();

    // Canvas click -> select agent in sidebar
    engine.onAgentClick = (agentId) => {
        // Open chatbox with clicked agent
        chatbox.openWithAgent(agentId);

        // Also switch sidebar to agents tab
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        document.querySelector('[data-tab="agents"]').classList.add('active');
        document.getElementById('tab-agents').classList.add('active');
        refreshAgentList();
        setTimeout(() => {
            const card = document.querySelector(`[data-agent-id="${agentId}"]`);
            if (card) { card.scrollIntoView({behavior:'smooth',block:'center'}); card.classList.add('selected'); }
        }, 100);
    };

    // ======= TABS =======
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
        });
    });

    // ======= MODALS =======
    const modalAgent = document.getElementById('modalAddAgent');
    const modalTask = document.getElementById('modalAddTask');

    document.getElementById('btnAddAgent').addEventListener('click', ()=>modalAgent.classList.add('active'));
    document.getElementById('closeAddAgent').addEventListener('click', ()=>modalAgent.classList.remove('active'));
    document.getElementById('cancelAddAgent').addEventListener('click', ()=>modalAgent.classList.remove('active'));

    document.querySelectorAll('.color-option').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('.color-option').forEach(o=>o.classList.remove('selected'));
            opt.classList.add('selected');
        });
    });

    document.getElementById('confirmAddAgent').addEventListener('click', () => {
        const name = document.getElementById('agentName').value.trim();
        if (!name) { showToast('⚠️ Vui lòng nhập tên agent!','warning'); return; }
        const agent = manager.createAgent({
            name,
            role: document.getElementById('agentRole').value,
            model: document.getElementById('agentModel').value,
            color: document.querySelector('.color-option.selected')?.dataset.color||'#4ecdc4',
            workDir: document.getElementById('agentWorkDir').value.trim(),
        });
        engine.addAgentSprite(agent);
        manager.addLog(agent.name,'🎉 Đã tham gia văn phòng!','success');
        showToast(`✨ ${agent.name} đã được tạo!`,'success');
        setTimeout(()=>engine.showSpeechBubble(agent.id,'Xin chào! 👋',4000),2000);
        document.getElementById('agentName').value='';
        document.getElementById('agentWorkDir').value='';
        modalAgent.classList.remove('active');
        refreshUI();
    });

    document.getElementById('btnAddTask').addEventListener('click', ()=>{refreshTaskAssigneeSelect();modalTask.classList.add('active');});
    document.getElementById('closeAddTask').addEventListener('click', ()=>modalTask.classList.remove('active'));
    document.getElementById('cancelAddTask').addEventListener('click', ()=>modalTask.classList.remove('active'));

    document.getElementById('confirmAddTask').addEventListener('click', () => {
        const title = document.getElementById('taskTitle').value.trim();
        if (!title) { showToast('⚠️ Vui lòng nhập tiêu đề!','warning'); return; }
        const assigneeId = document.getElementById('taskAssignee').value;
        manager.createTask({title, description:document.getElementById('taskDesc').value.trim(), priority:document.getElementById('taskPriority').value, assigneeId:assigneeId||null});
        if (assigneeId) {
            const a = manager.getAgent(assigneeId);
            manager.addLog(a.name,`📋 Nhận task: ${title}`,'info');
            engine.updateAgentStatus(assigneeId,'working');
            engine.showSpeechBubble(assigneeId,'Bắt đầu làm! 💪',3000);
        }
        showToast(`📋 Task "${title}" đã được tạo!`,'success');
        document.getElementById('taskTitle').value='';
        document.getElementById('taskDesc').value='';
        modalTask.classList.remove('active');
        refreshUI();
    });

    document.querySelectorAll('.modal-overlay').forEach(ov=>{
        ov.addEventListener('click',e=>{if(e.target===ov)ov.classList.remove('active');});
    });

    document.getElementById('btnClearLogs').addEventListener('click', ()=>{manager.clearLogs();refreshLogs();showToast('🗑️ Đã xóa logs!','info');});

    // ======= UI RENDERING =======
    function refreshUI() { refreshAgentList(); refreshTaskList(); refreshLogs(); refreshStats(); refreshHeader(); }

    function refreshHeader() {
        const s = manager.getStats();
        DOM.agentsOnline.textContent = s.agentsOnline;
        DOM.activeTasks.textContent = s.activeTasks + s.pendingTasks;
        DOM.cpuUsage.textContent = Math.floor(15+s.agentsOnline*10+Math.random()*5)+'%';
    }

    function refreshAgentList() {
        const agents = manager.getAllAgents();
        if (!agents.length) {
            DOM.agentList.innerHTML = `<div style="text-align:center;padding:40px 20px"><div style="font-size:48px;margin-bottom:16px">🤖</div><div style="font-family:'Press Start 2P';font-size:9px;color:var(--text-muted);margin-bottom:12px">Chưa có Agent nào</div><div style="font-size:12px;color:var(--text-muted);line-height:1.8">Nhấn <span style="color:var(--accent-primary)">+ AGENT</span> để thêm</div></div>`;
            return;
        }
        const roleEmojis = {coder:'💻',reviewer:'🔍',tester:'🧪',designer:'🎨',devops:'🚀',researcher:'📚',analyst:'📊',security:'🛡️',backend:'⚙️',mobile:'📱',writer:'✍️'};
        const roleNames = {coder:'Coder',reviewer:'Reviewer',tester:'Tester',designer:'Designer',devops:'DevOps',researcher:'Researcher',analyst:'Analyst',security:'Security',backend:'Backend',mobile:'Mobile',writer:'Writer'};
        const stars = n => '⭐'.repeat(n);
        const moodIcon = m => m>=80?'😊':m>=60?'😐':m>=40?'😟':'😡';
        const energyBar = e => {
            const filled = Math.round(e/10);
            return `<span style="color:${e>60?'var(--accent-success)':e>30?'var(--accent-warning)':'var(--accent-tertiary)'}">${'█'.repeat(filled)}${'░'.repeat(10-filled)}</span>`;
        };

        DOM.agentList.innerHTML = agents.map(a => `
            <div class="agent-card ${engine.selectedAgent===a.id?'selected':''}" style="--agent-color:${a.color}" data-agent-id="${a.id}">
                <div class="agent-card-header">
                    <canvas class="agent-avatar" width="40" height="40" data-agent-color="${a.color}" data-agent-role="${a.role}"></canvas>
                    <div class="agent-info">
                        <div class="agent-name">${a.name}</div>
                        <div class="agent-role">${roleEmojis[a.role]} ${roleNames[a.role]} · ${a.model}</div>
                    </div>
                    <span class="agent-status-badge ${a.status}">${a.status}</span>
                </div>
                <div class="agent-card-body">
                    <div class="agent-meta-row">
                        <span class="meta-item" title="Cấp độ">${stars(a.skillLevel)} Lv.${a.skillLevel}</span>
                        <span class="meta-item" title="Tâm trạng">${moodIcon(a.mood)} ${a.mood}%</span>
                    </div>
                    <div class="agent-meta-row">
                        <span class="meta-item" title="Năng lượng" style="font-family:monospace;font-size:10px">⚡ ${energyBar(a.energy)}</span>
                    </div>
                    ${a.currentTask ? `
                        <div class="agent-task"><span class="task-emoji">📋</span>${a.currentTask.title}</div>
                        <div class="agent-progress">
                            <div class="progress-bar"><div class="progress-fill" style="width:${a.progress}%"></div></div>
                            <div class="progress-text">${Math.floor(a.progress)}%</div>
                        </div>
                    ` : `<div class="agent-task"><span class="task-emoji">💤</span>Đang chờ công việc...</div>`}
                </div>
                <div class="agent-card-footer">
                    <button class="agent-action-btn" onclick="app.pauseAgent('${a.id}')" title="Tạm dừng">⏸</button>
                    <button class="agent-action-btn" onclick="app.messageAgent('${a.id}')" title="Nhắn tin">💬</button>
                    <button class="agent-action-btn" onclick="app.focusAgent('${a.id}')" title="Focus">🎯</button>
                    <button class="agent-action-btn danger" onclick="app.removeAgent('${a.id}')" title="Xóa">🗑️</button>
                </div>
            </div>
        `).join('');

        // Make agent cards draggable
        requestAnimationFrame(()=>{
            document.querySelectorAll('.agent-card').forEach(card => {
                card.setAttribute('draggable', 'true');
            });
            document.querySelectorAll('.agent-avatar').forEach(c=>drawAgentAvatar(c,c.dataset.agentColor,c.dataset.agentRole));
        });
    }

    function refreshTaskList() {
        const tasks = manager.getAllTasks();
        if (!tasks.length) {
            DOM.taskList.innerHTML = `<div style="text-align:center;padding:40px 20px"><div style="font-size:48px;margin-bottom:16px">📋</div><div style="font-family:'Press Start 2P';font-size:9px;color:var(--text-muted)">Chưa có Task nào</div></div>`;
            return;
        }
        const pEmoji = {low:'🟢',medium:'🟡',high:'🟠',critical:'🔴'};
        const statusLabels = {pending:'pending','in-progress':'in-progress',completed:'completed',blocked:'🔒 blocked',review:'📝 review'};
        DOM.taskList.innerHTML = tasks.map(t=>{
            const assignee = t.assigneeId ? manager.getAgent(t.assigneeId) : null;
            const statusClass = t.status === 'blocked' ? 'pending' : t.status === 'review' ? 'in-progress' : t.status;
            const depInfo = t.dependsOn?.length ? `<div style="font-size:9px;color:var(--text-muted);margin-top:4px">🔗 Phụ thuộc: ${t.dependsOn.length} task</div>` : '';
            const reviewInfo = t.reviewStatus === 'rejected' ? '<div style="font-size:9px;color:var(--accent-tertiary);margin-top:4px">❌ Bị reject — đang sửa lại</div>' : 
                              t.reviewStatus === 'pending' ? '<div style="font-size:9px;color:var(--accent-info);margin-top:4px">📝 Đang chờ review</div>' : '';
            return `<div class="task-item">
                <div class="task-item-header"><span class="task-title">${t.title}</span><span class="task-priority">${pEmoji[t.priority]}</span></div>
                ${t.description?`<div class="task-description">${t.description}</div>`:''}
                <div class="task-meta">
                    <span class="task-assignee">${assignee?`👾 ${assignee.name}`:'— Chưa giao'}</span>
                    <span class="task-status-tag ${statusClass}">${statusLabels[t.status] || t.status}</span>
                </div>
                ${depInfo}${reviewInfo}
                ${t.status==='in-progress'?`<div class="agent-progress" style="margin-top:8px"><div class="progress-bar"><div class="progress-fill" style="width:${t.progress}%"></div></div><div class="progress-text">${Math.floor(t.progress)}%</div></div>`:''}
            </div>`;
        }).join('');
    }

    function refreshLogs() {
        const logs = manager.getLogs(100);
        DOM.logConsole.innerHTML = logs.map(l=>`<div class="log-entry ${l.type}"><span class="log-time">${fmtTime(l.time)}</span><span class="log-agent">[${l.agent}]</span><span class="log-message">${l.message}</span></div>`).join('');
    }

    function refreshStats() {
        const s = manager.getStats();
        DOM.statsGrid.innerHTML = `
            <div class="stat-card"><div class="stat-value">${s.totalTasksCompleted}</div><div class="stat-label">Tasks Done</div></div>
            <div class="stat-card"><div class="stat-value">${fmtNum(s.totalLinesWritten)}</div><div class="stat-label">Lines Written</div></div>
            <div class="stat-card"><div class="stat-value">${s.totalCommits}</div><div class="stat-label">Commits</div></div>
            <div class="stat-card"><div class="stat-value">${s.totalErrors}</div><div class="stat-label">Errors</div></div>
            <div class="stat-card"><div class="stat-value">${s.blockedTasks || 0}</div><div class="stat-label">🔒 Blocked</div></div>
            <div class="stat-card"><div class="stat-value">${s.reviewTasks || 0}</div><div class="stat-label">📝 Review</div></div>
        `;
        drawPerformanceChart();
    }

    function refreshTaskAssigneeSelect() {
        const sel = document.getElementById('taskAssignee');
        sel.innerHTML = '<option value="">-- Chọn Agent --</option>' + manager.getAllAgents().map(a=>`<option value="${a.id}">${a.name} (${a.role})</option>`).join('');
    }

    // ======= AGENT ACTIONS =======
    window.app = {
        pauseAgent(id) {
            const a = manager.getAgent(id); if(!a) return;
            if (a.status==='idle'&&a.currentTask) { a.status='working'; engine.updateAgentStatus(id,'working'); showToast(`▶️ ${a.name} tiếp tục`,'info'); }
            else { a.status='idle'; engine.updateAgentStatus(id,'idle'); showToast(`⏸️ ${a.name} tạm dừng`,'warning'); }
            manager.addLog(a.name, a.status==='idle'?'⏸ Tạm dừng':'▶️ Tiếp tục');
            refreshUI();
        },
        messageAgent(id) {
            chatbox.openWithAgent(id);
        },
        focusAgent(id) {
            const sp = engine.agentSprites.get(id);
            if (sp) {
                engine.selectedAgent = id;
                engine.camera.x = -sp.x * engine.scale + engine.canvas.width/2;
                engine.camera.y = -sp.y * engine.scale + engine.canvas.height/2;
                showToast(`🎯 Focus: ${sp.name}`,'info');
            }
        },
        removeAgent(id) {
            const a = manager.getAgent(id); if(!a) return;
            if (confirm(`Xóa ${a.name}?`)) {
                engine.removeAgentSprite(id); manager.removeAgent(id);
                manager.addLog(a.name,'👋 Đã rời văn phòng','warning');
                showToast(`🗑️ ${a.name} đã bị xóa`,'warning');
                refreshUI();
            }
        }
    };

    // ======= UTILITIES =======
    function fmtTime(d) { return d.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',second:'2-digit'}); }
    function fmtNum(n) { return n>=1000?(n/1000).toFixed(1)+'K':n.toString(); }

    function showToast(msg,type='info') {
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        const icons = {info:'ℹ️',success:'✅',warning:'⚠️',error:'❌'};
        t.innerHTML = `<span class="toast-icon">${icons[type]||'ℹ️'}</span><span class="toast-message">${msg}</span>`;
        DOM.toastContainer.appendChild(t);
        setTimeout(()=>{t.style.animation='toastSlideIn 0.3s ease reverse';setTimeout(()=>t.remove(),300);},3000);
    }

    function drawLogo() {
        const c = document.getElementById('logoCanvas'), ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        const px = [
            [0,0,'#4ecdc4'],[1,0,'#4ecdc4'],[2,0,'#4ecdc4'],[3,0,'#4ecdc4'],[4,0,'#4ecdc4'],[5,0,'#4ecdc4'],[6,0,'#4ecdc4'],[7,0,'#4ecdc4'],
            [3,-3,'#6c5ce7'],[4,-3,'#6c5ce7'],[3,-2,'#6c5ce7'],[4,-2,'#6c5ce7'],[3,-1,'#4ecdc4'],[4,-1,'#4ecdc4'],
            [0,1,'#4ecdc4'],[7,1,'#4ecdc4'],[0,2,'#4ecdc4'],[7,2,'#4ecdc4'],[0,3,'#4ecdc4'],[7,3,'#4ecdc4'],[0,4,'#4ecdc4'],[7,4,'#4ecdc4'],
            [0,5,'#4ecdc4'],[1,5,'#4ecdc4'],[2,5,'#4ecdc4'],[3,5,'#4ecdc4'],[4,5,'#4ecdc4'],[5,5,'#4ecdc4'],[6,5,'#4ecdc4'],[7,5,'#4ecdc4'],
            [1,1,'#1a2236'],[2,1,'#1a2236'],[3,1,'#1a2236'],[4,1,'#1a2236'],[5,1,'#1a2236'],[6,1,'#1a2236'],
            [1,2,'#1a2236'],[6,2,'#1a2236'],[1,3,'#1a2236'],[6,3,'#1a2236'],
            [1,4,'#1a2236'],[2,4,'#1a2236'],[3,4,'#1a2236'],[4,4,'#1a2236'],[5,4,'#1a2236'],[6,4,'#1a2236'],
            [2,2,'#fff'],[3,2,'#fff'],[5,2,'#fff'],[4,2,'#1a2236'],[2,3,'#4ecdc4'],[5,3,'#4ecdc4'],[3,3,'#ff6b6b'],[4,3,'#ff6b6b'],
        ];
        px.forEach(([x,y,c])=>{ctx.fillStyle=c;ctx.fillRect((x+4)*3,(y+12)*3,3,3);});
    }

    function drawAgentAvatar(canvas, color, role) {
        const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled=false; ctx.clearRect(0,0,40,40);
        const s=3, ox=5, oy=4;
        const p = (x,y,c)=>{ctx.fillStyle=c;ctx.fillRect(ox+x*s,oy+y*s,s,s);};
        const lh = (h,a)=>{const n=parseInt(h.replace('#',''),16);return `#${(1<<24|Math.min(255,(n>>16)+a)<<16|Math.min(255,((n>>8)&0xff)+a)<<8|Math.min(255,(n&0xff)+a)).toString(16).slice(1)}`;};
        for(let x=1;x<=6;x++) for(let y=0;y<=4;y++) p(x,y,lh(color,20));
        for(let x=0;x<=7;x++) for(let y=5;y<=8;y++) p(x,y,color);
        p(2,2,'#fff');p(3,2,'#fff');p(5,2,'#fff');p(4,2,lh(color,20));p(2,3,'#111');p(5,3,'#111');
        const rc={coder:'#4ecdc4',reviewer:'#6c5ce7',tester:'#78e08f',designer:'#ff6b6b',devops:'#ffd93d',researcher:'#74b9ff'};
        for(let x=0;x<=7;x++) p(x,-1,rc[role]||'#fff');
        p(2,9,'#2d3748');p(3,9,'#2d3748');p(5,9,'#2d3748');p(4,9,'#2d3748');
    }

    function drawPerformanceChart() {
        const canvas = document.getElementById('performanceChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width = canvas.parentElement.clientWidth-32, h = canvas.height = 200;
        ctx.clearRect(0,0,w,h);

        const history = manager.performanceHistory;
        const data = history.length >= 2 ? history : Array.from({length:20},(_,i)=>({productivity:40+Math.sin(i*0.4)*15+Math.random()*10, tasks:i}));

        // Grid
        ctx.strokeStyle = 'rgba(78,205,196,0.06)'; ctx.lineWidth=1;
        for(let i=0;i<5;i++){const y=(h/5)*i+20;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}

        // Line
        const step = w/(data.length-1||1);
        ctx.strokeStyle='#4ecdc4';ctx.lineWidth=2;ctx.lineJoin='round';ctx.beginPath();
        data.forEach((p,i)=>{const x=i*step,y=h-(p.productivity/100)*(h-40)-20;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
        ctx.stroke();

        // Fill
        const grad = ctx.createLinearGradient(0,0,0,h);
        grad.addColorStop(0,'rgba(78,205,196,0.15)');grad.addColorStop(1,'rgba(78,205,196,0)');
        ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.closePath();ctx.fillStyle=grad;ctx.fill();

        // Points
        data.forEach((p,i)=>{ctx.fillStyle='#4ecdc4';ctx.fillRect(i*step-2,h-(p.productivity/100)*(h-40)-22,4,4);});
    }

    // ======= INIT =======
    function restoreFromStorage() {
        const loaded = manager.loadFromStorage();
        if (!loaded) return false;

        // Re-create engine sprites for all loaded agents
        const agents = manager.getAllAgents();
        if (agents.length === 0) return false;

        agents.forEach((a, i) => {
            setTimeout(() => {
                engine.addAgentSprite(a);
                engine.updateAgentStatus(a.id, a.status);
                refreshUI();
            }, i * 200);
        });

        manager.addLog('System', '📂 Đã khôi phục dữ liệu!', 'success');
        return true;
    }

    function createDefaults() {
        const defs = [
            {name:'ClaudeBot-001',role:'coder',model:'claude-opus',color:'#4ecdc4',workDir:'/projects/frontend'},
            {name:'GeminiDev-002',role:'reviewer',model:'gemini-pro',color:'#6c5ce7',workDir:'/projects/backend'},
            {name:'TestRunner-003',role:'tester',model:'claude-sonnet',color:'#78e08f',workDir:'/projects/tests'},
            {name:'DesignPix-004',role:'designer',model:'gpt-4',color:'#ff6b6b',workDir:'/projects/ui'},
            {name:'DevOps-005',role:'devops',model:'claude-haiku',color:'#ffa502',workDir:'/infra/pipelines'},
            {name:'DataWiz-006',role:'analyst',model:'gemini-ultra',color:'#a29bfe',workDir:'/data/analytics'},
            {name:'SecGuard-007',role:'security',model:'gpt-4-turbo',color:'#fd79a8',workDir:'/security/audit'},
            {name:'APIForge-008',role:'backend',model:'claude-opus',color:'#00cec9',workDir:'/api/services'},
            {name:'MobileX-009',role:'mobile',model:'gemini-pro',color:'#e17055',workDir:'/mobile/app'},
            {name:'DocBot-010',role:'writer',model:'claude-sonnet',color:'#81ecec',workDir:'/docs/wiki'},
        ];
        defs.forEach((d,i)=>{
            setTimeout(()=>{
                const a = manager.createAgent(d);
                engine.addAgentSprite(a);
                manager.addLog(a.name,'🎉 Đã tham gia văn phòng!','success');
                setTimeout(()=>engine.showSpeechBubble(a.id,'Sẵn sàng! 🚀',3000),2500+i*400);
                refreshUI();
            },i*800);
        });
        setTimeout(()=>{
            const tasks = [
                {title:'Setup CI/CD Pipeline',description:'Cấu hình GitHub Actions',priority:'high',assigneeId:'agent-1'},
                {title:'Review Auth Module',description:'Kiểm tra security',priority:'medium',assigneeId:'agent-2'},
                {title:'Write Unit Tests',description:'Test API endpoints',priority:'medium',assigneeId:'agent-3'},
                {title:'Design Dashboard UI',description:'Thiết kế giao diện dashboard',priority:'high',assigneeId:'agent-4'},
                {title:'Deploy K8s Cluster',description:'Thiết lập Kubernetes production',priority:'critical',assigneeId:'agent-5'},
                {title:'Build ML Pipeline',description:'Xây dựng data pipeline ETL',priority:'high',assigneeId:'agent-6'},
                {title:'Penetration Testing',description:'Kiểm tra lỗ hổng bảo mật',priority:'critical',assigneeId:'agent-7'},
                {title:'REST API v2',description:'Phát triển API endpoints mới',priority:'high',assigneeId:'agent-8'},
                {title:'React Native App',description:'Xây dựng ứng dụng mobile',priority:'medium',assigneeId:'agent-9'},
                {title:'API Documentation',description:'Viết tài liệu kỹ thuật API',priority:'low',assigneeId:'agent-10'},
                {title:'Optimize Queries',description:'Cải thiện DB performance',priority:'high'},
                {title:'Update API Docs',description:'Cập nhật swagger docs',priority:'low'},
                {title:'Security Audit',description:'Kiểm tra bảo mật toàn hệ thống',priority:'critical'},
                {title:'Load Testing',description:'Kiểm tra hiệu năng hệ thống',priority:'medium'},
                {title:'Docker Compose Setup',description:'Cấu hình môi trường dev',priority:'medium'},
            ];
            tasks.forEach((t,i)=>setTimeout(()=>{
                manager.createTask(t);
                if(t.assigneeId)engine.updateAgentStatus(t.assigneeId,'working');
                refreshUI();
            },i*200));
        },9000);
    }

    // Background particles
    for(let i=0;i<12;i++){
        const p=document.createElement('div');p.className='particle';
        p.style.left=Math.random()*100+'%';p.style.animationDuration=(8+Math.random()*12)+'s';
        p.style.animationDelay=Math.random()*8+'s';p.style.width=(1+Math.random()*2)+'px';p.style.height=p.style.width;
        p.style.background=['#4ecdc4','#6c5ce7','#ffd93d','#ff6b6b'][Math.floor(Math.random()*4)];
        document.body.appendChild(p);
    }

    // Zoom controls
    document.getElementById('btnZoomIn').addEventListener('click',()=>{engine.scale=Math.min(5,engine.scale+0.5);});
    document.getElementById('btnZoomOut').addEventListener('click',()=>{engine.scale=Math.max(1,engine.scale-0.5);});
    document.getElementById('btnFullscreen').addEventListener('click',()=>{document.getElementById('officeViewport').requestFullscreen?.();});

    // Toolbar buttons — connect to Layout Editor
    document.querySelectorAll('.toolbar-btn[data-tool]').forEach(btn => {
        btn.addEventListener('click', () => {
            const tool = btn.dataset.tool;
            const wasActive = btn.classList.contains('active');
            document.querySelectorAll('.toolbar-btn[data-tool]').forEach(b => b.classList.remove('active'));

            if (tool === 'layout' || tool === 'floor' || tool === 'wall' || tool === 'erase' || tool === 'furniture') {
                // Open layout editor
                if (!wasActive) {
                    btn.classList.add('active');
                    layoutEditor.toggle(true);
                    if (tool === 'floor') {
                        layoutEditor.currentTool = 'floor';
                        layoutEditor.panel.querySelector('[data-floor="wood"]')?.click();
                    } else if (tool === 'erase') {
                        layoutEditor.currentTool = 'erase';
                        layoutEditor.panel.querySelector('[data-letool="erase"]')?.click();
                    } else if (tool === 'furniture') {
                        layoutEditor.currentTool = 'furniture';
                        layoutEditor.panel.querySelector('[data-letool="furniture"]')?.click();
                    } else if (tool === 'layout') {
                        layoutEditor.currentTool = 'select';
                        layoutEditor.panel.querySelector('[data-letool="select"]')?.click();
                    }
                    showToast(`🏗️ Layout Editor mở`, 'info');
                } else {
                    layoutEditor.toggle(false);
                }
            } else if (tool === 'settings') {
                if (!wasActive) {
                    btn.classList.add('active');
                    showToast('⚙️ Cài đặt (sắp ra mắt)', 'info');
                }
            }
        });
    });
    // Toolbar + Agent button
    const toolbarAddBtn = document.getElementById('btnAddAgentToolbar');
    if (toolbarAddBtn) toolbarAddBtn.addEventListener('click', () => { document.getElementById('modalAddAgent').classList.add('active'); });

    // Settings button — reset data
    document.getElementById('btnSettings').addEventListener('click', () => {
        if (confirm('🗑️ Xóa toàn bộ dữ liệu đã lưu và reset về mặc định?')) {
            manager.clearStorage();
            localStorage.removeItem('pixelAgentLayout');
            showToast('🔄 Đã xóa dữ liệu! Đang reload...', 'warning');
            setTimeout(() => location.reload(), 1000);
        }
    });

    // Try to restore saved data; if none, create defaults
    const restored = restoreFromStorage();
    if (restored) {
        showToast('📂 Đã khôi phục dữ liệu từ phiên trước!', 'success');
    } else {
        createDefaults();
    }
    manager.startSimulation();

    // Save on page unload
    window.addEventListener('beforeunload', () => {
        manager.saveToStorage();
    });

    setInterval(()=>{DOM.pixelClock.textContent=new Date().toLocaleTimeString('vi-VN');},1000);
    setInterval(()=>{
        const s=manager.getStats(),sec=s.uptime;
        DOM.uptime.textContent=`${String(Math.floor(sec/7200)).padStart(2,'0')}:${String(Math.floor((sec%7200)/120)).padStart(2,'0')}:${String(Math.floor((sec%120)/2)).padStart(2,'0')}`;
        DOM.memoryUsage.textContent=`Memory: ${(128+manager.getAllAgents().length*42+Math.random()*8).toFixed(0)} MB`;
        refreshHeader();
        manager.getAllAgents().forEach(a=>engine.updateAgentStatus(a.id,a.status));
    },1000);
    setInterval(()=>{refreshAgentList();refreshTaskList();refreshLogs();},2000);
    setInterval(refreshStats,5000);

    DOM.pixelClock.textContent=new Date().toLocaleTimeString('vi-VN');
    refreshUI();
    setTimeout(()=>{showToast('🎮 Pixel AI Agent Manager v3.0!','success');manager.addLog('System','🚀 Hệ thống đã khởi động','success');},500);
});
