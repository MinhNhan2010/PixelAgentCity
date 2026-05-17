/**
 * Chatbox v3.0 - Pixel/Cyber operator panel
 * Supports drag-drop, map click, per-agent chat history, live stats,
 * role-aware quick asks, and richer typing feedback.
 */

class AgentChatbox {
    constructor(manager, engine) {
        this.manager = manager;
        this.engine = engine;
        this.activeAgentId = null;
        this.activeTab = 'chat';
        this.messages = new Map();
        this.recentAgentIds = [];
        this.isOpen = false;
        this.isMinimized = false;
        this.isDragging = false;
        this.typing = false;
        this.statusTimer = null;

        this.quickAskCatalog = {
            base: [
                { text: 'Tình hình?', key: 'working', icon: 'STAT' },
                { text: 'Thưởng bao nhiêu?', key: 'salary', icon: 'PAY' },
                { text: 'Cho lời khuyên', key: 'opinion', icon: 'TIP' },
            ],
            byRole: {
                coder: [{ text: 'Code đến đâu?', key: 'working', icon: 'CODE' }],
                tester: [{ text: 'Có bug nào?', key: 'help', icon: 'QA' }],
                reviewer: [{ text: 'Review gấp được không?', key: 'help', icon: 'PR' }],
                designer: [{ text: 'UI nên đổi gì?', key: 'opinion', icon: 'UI' }],
                devops: [{ text: 'Deploy ổn không?', key: 'working', icon: 'OPS' }],
                researcher: [{ text: 'Hướng nào ngon?', key: 'opinion', icon: 'RND' }],
                analyst: [{ text: 'Số liệu nói gì?', key: 'opinion', icon: 'DATA' }],
                security: [{ text: 'Rủi ro ở đâu?', key: 'help', icon: 'SEC' }],
                backend: [{ text: 'API ổn chưa?', key: 'working', icon: 'API' }],
                mobile: [{ text: 'Bản mobile sao rồi?', key: 'working', icon: 'APP' }],
                writer: [{ text: 'Content đã ổn?', key: 'working', icon: 'DOC' }],
            },
        };

        this.roleBadgeMap = {
            coder: 'CD',
            tester: 'QA',
            reviewer: 'RV',
            designer: 'UX',
            devops: 'OP',
            researcher: 'RD',
            analyst: 'AN',
            security: 'SC',
            backend: 'BE',
            mobile: 'MB',
            writer: 'WR',
            default: 'AI',
        };

        this.roleResponses = {
            coder: {
                greeting: ['Chào sếp, tôi sẵn sàng code.', 'Có feature nào cần xử lý không?'],
                working: ['Tôi đang xử lý "{task}".', 'Đang code đây, sắp xong rồi.'],
                idle: ['Tôi đang rảnh, nhận thêm contract đi.', 'Chờ việc mới để kiếm thêm coin.'],
                help: ['Tôi có thể làm feature, bugfix và prototype.', 'Cần tôi support phần code nào?'],
                opinion: ['Nên ưu tiên việc có reward cao và deadline an toàn.', 'Clean code giúp team về đích ổn định hơn.'],
                salary: ['Lương coder vẫn chưa thật sự wow đâu sếp.', 'Thêm bonus nhỏ là tốc độ code tăng ngay.'],
            },
            tester: {
                greeting: ['QA đã có mặt.', 'Gửi task cho tôi, tôi sẽ test kỹ.'],
                working: ['Đang test "{task}".', 'Tôi đang bắt bug cho task này.'],
                idle: ['Hệ thống đang êm, có thể nhận thêm việc.', 'Chưa có bug mới, tạm ổn.'],
                help: ['Tôi rất hợp với bugfix và review output.', 'Cần test nhanh hay test kỹ?'],
                opinion: ['Đừng để fail contract vì thiếu test.', 'Test sớm sẽ rẻ hơn fix muộn.'],
                salary: ['Lương tester hơi mỏng manh nha.', 'Bug tìm được nhiều mà thưởng thì ít.'],
            },
            reviewer: {
                greeting: ['Reviewer đã online.', 'Cho tôi xem PR nào.'],
                working: ['Đang review "{task}".', 'Tôi đang kiểm tra chất lượng đầu ra.'],
                idle: ['Tôi đang rảnh, có thể review ngay.', 'Chờ việc cần feedback.'],
                help: ['Tôi giúp review, chốt chất lượng và giảm rủi ro.', 'Cần feedback nhanh hay feedback kỹ?'],
                opinion: ['Code rõ ràng giúp contract xong nhanh hơn.', 'Tốt nhất là đừng để task sang review quá muộn.'],
                salary: ['Soi bug cả ngày mà lương vẫn thế này.', 'Reviewer cũng xứng đáng bonus đó sếp.'],
            },
            designer: {
                greeting: ['Designer vào vị trí.', 'Cần UI hay visual mới không?'],
                working: ['Đang polish "{task}".', 'Tôi đang chỉnh giao diện cho task này.'],
                idle: ['Văn phòng đẹp lên một chút là mood team tốt hơn.', 'Cần mockup mới không?'],
                help: ['Tôi hợp với UI, UX và visual polish.', 'Muốn đẹp, rõ, hay nhanh?'],
                opinion: ['Layout đẹp sẽ làm sản phẩm thuyết phục hơn.', 'Đừng bỏ qua trải nghiệm người dùng.'],
                salary: ['Design đẹp thì thưởng cũng nên đẹp.', 'Cho thêm budget visual nha sếp.'],
            },
            devops: {
                greeting: ['DevOps đã vào kênh.', 'Cần tôi giữ hệ thống ổn định không?'],
                working: ['Đang xử lý "{task}".', 'Tôi đang lo infra và deploy flow.'],
                idle: ['Server đang yên, tạm thời ổn.', 'Rảnh một chút, có thể support task gấp.'],
                help: ['Tôi mạnh về deploy, pipeline và vận hành.', 'Cần scale, fix hay tối ưu?'],
                opinion: ['Hạ tầng ổn định giúp team về đích đều hơn.', 'Đừng tiết tiền nhầm cho incident.'],
                salary: ['Infra chạy được là nhờ tôi đấy.', 'Lương DevOps cần có chút ưu ái.'],
            },
            researcher: {
                greeting: ['Research mode bắt đầu.', 'Có chủ đề nào cần tôi đào sâu không?'],
                working: ['Đang nghiên cứu "{task}".', 'Tôi đang phân tích hướng tiếp cận.'],
                idle: ['Tôi có thể nghiên cứu để mở khóa task khó.', 'Đang chờ đề tài thú vị hơn.'],
                help: ['Tôi hợp với task cần tìm hướng và tổng hợp thông tin.', 'Cần survey nhanh hay đào sâu?'],
                opinion: ['Dữ liệu tốt quan trọng hơn dữ liệu nhiều.', 'Nên đầu tư đúng lúc cho task khó.'],
                salary: ['R&D mà được đầu tư thêm thì ngon.', 'Cho tôi chút budget để mở rộng ý tưởng.'],
            },
            default: {
                greeting: ['Chào sếp, tôi đã sẵn sàng.', 'Tôi online rồi đây.'],
                working: ['Đang xử lý "{task}".', 'Tôi đang tập trung vào task hiện tại.'],
                idle: ['Tôi đang rảnh.', 'Chờ task tiếp theo.'],
                help: ['Tôi sẽ hỗ trợ trong khả năng của mình.', 'Cần tôi làm phần nào?'],
                opinion: ['Nên giữ mood và energy ổn định cho team.', 'Chọn contract phù hợp sẽ an toàn hơn.'],
                salary: ['Lương hiện tại vẫn ổn, nhưng bonus thì tốt hơn.', 'Có thưởng thêm thì tinh thần tăng ngay.'],
            },
        };

        this.createChatbox();
        this.bindDragDrop();
        this.setupMapClick();
        this.startStatusRefresh();
        this.resetPanelState();
    }

    createChatbox() {
        const box = document.createElement('div');
        box.id = 'agentChatbox';
        box.className = 'chatbox';
        box.setAttribute('data-role', 'default');
        box.innerHTML = `
            <div class="chatbox-header" id="chatboxHeader">
                <div class="chatbox-header-left">
                    <div class="chatbox-avatar-wrap">
                        <div class="chatbox-avatar role-default" id="chatboxAvatar">AI</div>
                        <span class="chatbox-presence idle" id="chatboxPresence"></span>
                    </div>
                    <div class="chatbox-title">
                        <div class="chatbox-title-row">
                            <span class="chatbox-name" id="chatboxName">Agent Channel</span>
                            <span class="chatbox-chip" id="chatboxRole">standby</span>
                        </div>
                        <span class="chatbox-status" id="chatboxStatus">Kéo agent vào đây để mở kênh liên lạc</span>
                    </div>
                </div>
                <div class="chatbox-header-right">
                    <button class="chatbox-btn" id="chatboxMinimize" title="Thu nho">&minus;</button>
                    <button class="chatbox-btn" id="chatboxClose" title="Dong">&times;</button>
                </div>
            </div>

            <div class="chatbox-agent-strip" id="chatboxAgentStrip">
                <div class="chatbox-agent-stat">
                    <span class="chatbox-agent-stat-label">Mood</span>
                    <span class="chatbox-agent-stat-value" id="chatboxMood">--</span>
                </div>
                <div class="chatbox-agent-stat">
                    <span class="chatbox-agent-stat-label">Energy</span>
                    <span class="chatbox-agent-stat-value" id="chatboxEnergy">--</span>
                </div>
                <div class="chatbox-agent-stat chatbox-agent-stat-wide">
                    <span class="chatbox-agent-stat-label">Task</span>
                    <span class="chatbox-agent-stat-value chatbox-agent-task" id="chatboxTask">Standby</span>
                </div>
            </div>

            <div class="chatbox-body">
                <div class="chatbox-tabs" id="chatboxTabs">
                    <button class="chatbox-tab active" data-tab="chat">CHAT</button>
                    <button class="chatbox-tab" data-tab="history">HISTORY</button>
                </div>

                <div class="chatbox-content">
                    <div class="chatbox-view is-active" id="chatboxViewChat">
                        <div class="chatbox-dropzone" id="chatboxDropzone">
                            <div class="dropzone-grid"></div>
                            <div class="dropzone-inner">
                                <div class="dropzone-orb">
                                    <div class="dropzone-icon">AI</div>
                                </div>
                                <div class="dropzone-text">Kéo thả agent vào đây<br>để bắt đầu trò chuyện</div>
                                <div class="dropzone-hint">Hoặc click trực tiếp vào agent trên bản đồ</div>
                                <div class="dropzone-actions">
                                    <span class="dropzone-tag">PIXEL LINK</span>
                                    <span class="dropzone-tag">QUICK ASK</span>
                                    <span class="dropzone-tag">LIVE STATUS</span>
                                </div>
                            </div>
                        </div>
                        <div class="chatbox-messages" id="chatboxMessages" style="display:none"></div>
                    </div>

                    <div class="chatbox-view chatbox-history-view" id="chatboxViewHistory" style="display:none">
                        <div class="chatbox-history-summary">
                            <div class="chatbox-history-panel">
                                <span class="chatbox-history-kicker">Recent Links</span>
                                <strong id="chatboxHistoryCount">0 agent</strong>
                            </div>
                            <div class="chatbox-history-panel">
                                <span class="chatbox-history-kicker">Messages</span>
                                <strong id="chatboxMessageCount">0 msg</strong>
                            </div>
                        </div>
                        <div class="chatbox-history-list" id="chatboxHistoryList"></div>
                    </div>
                </div>
            </div>

            <div class="chatbox-input-area" id="chatboxInputArea" style="display:none">
                <div class="chatbox-quick-asks" id="chatboxQuickAsks"></div>
                <div class="chatbox-input-row">
                    <div class="chatbox-input-shell">
                        <span class="chatbox-input-icon">TX</span>
                        <input type="text" class="chatbox-input" id="chatboxInput" placeholder="Gửi tin nhắn..." autocomplete="off">
                    </div>
                    <button class="chatbox-send" id="chatboxSend" title="Gui">&#9654;</button>
                </div>
            </div>
        `;
        document.body.appendChild(box);
        this.el = box;

        const toggle = document.createElement('button');
        toggle.id = 'chatboxToggle';
        toggle.className = 'chatbox-toggle';
        toggle.title = 'Mo Agent Chat';
        toggle.innerHTML = `
            <span class="chatbox-toggle-icon">AI</span>
            <span class="chatbox-toggle-ping"></span>
        `;
        document.body.appendChild(toggle);
        this.toggleBtn = toggle;

        this.cacheElements();
        this.bindStaticEvents();
        this.makeDraggable();
        this.renderQuickAsks();
        this.renderHistory();
    }

    cacheElements() {
        this.ui = {
            header: document.getElementById('chatboxHeader'),
            avatar: document.getElementById('chatboxAvatar'),
            presence: document.getElementById('chatboxPresence'),
            name: document.getElementById('chatboxName'),
            role: document.getElementById('chatboxRole'),
            status: document.getElementById('chatboxStatus'),
            mood: document.getElementById('chatboxMood'),
            energy: document.getElementById('chatboxEnergy'),
            task: document.getElementById('chatboxTask'),
            dropzone: document.getElementById('chatboxDropzone'),
            messages: document.getElementById('chatboxMessages'),
            inputArea: document.getElementById('chatboxInputArea'),
            input: document.getElementById('chatboxInput'),
            quickAsks: document.getElementById('chatboxQuickAsks'),
            tabs: document.getElementById('chatboxTabs'),
            viewChat: document.getElementById('chatboxViewChat'),
            viewHistory: document.getElementById('chatboxViewHistory'),
            historyList: document.getElementById('chatboxHistoryList'),
            historyCount: document.getElementById('chatboxHistoryCount'),
            messageCount: document.getElementById('chatboxMessageCount'),
        };
    }

    bindStaticEvents() {
        this.toggleBtn.addEventListener('click', () => this.toggle());
        document.getElementById('chatboxClose').addEventListener('click', () => this.close());
        document.getElementById('chatboxMinimize').addEventListener('click', () => this.minimize());
        document.getElementById('chatboxSend').addEventListener('click', () => this.sendMessage());
        this.ui.input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') this.sendMessage();
        });
        this.ui.tabs.addEventListener('click', (event) => {
            const button = event.target.closest('.chatbox-tab');
            if (!button) return;
            this.setActiveTab(button.dataset.tab);
        });
        window.addEventListener('resize', () => this.clampPosition());
    }

    makeDraggable() {
        let offsetX = 0;
        let offsetY = 0;
        this.ui.header.addEventListener('mousedown', (event) => {
            if (event.target.closest('.chatbox-btn')) return;
            this.isDragging = true;
            const rect = this.el.getBoundingClientRect();
            offsetX = event.clientX - rect.left;
            offsetY = event.clientY - rect.top;
            this.el.style.transition = 'none';
        });

        document.addEventListener('mousemove', (event) => {
            if (!this.isDragging) return;
            const rect = this.el.getBoundingClientRect();
            const maxX = Math.max(0, window.innerWidth - rect.width);
            const maxY = Math.max(0, window.innerHeight - Math.max(rect.height, 120));
            const x = Math.max(0, Math.min(maxX, event.clientX - offsetX));
            const y = Math.max(0, Math.min(maxY, event.clientY - offsetY));
            this.el.style.left = `${x}px`;
            this.el.style.top = `${y}px`;
            this.el.style.right = 'auto';
            this.el.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', () => {
            if (!this.isDragging) return;
            this.isDragging = false;
            this.el.style.transition = '';
        });
    }

    clampPosition() {
        if (!this.isOpen) return;
        const rect = this.el.getBoundingClientRect();
        const maxX = Math.max(0, window.innerWidth - rect.width);
        const maxY = Math.max(0, window.innerHeight - rect.height);
        const x = Math.max(0, Math.min(maxX, rect.left));
        const y = Math.max(0, Math.min(maxY, rect.top));
        if (Math.abs(x - rect.left) > 1 || Math.abs(y - rect.top) > 1) {
            this.el.style.left = `${x}px`;
            this.el.style.top = `${y}px`;
            this.el.style.right = 'auto';
            this.el.style.bottom = 'auto';
        }
    }

    bindDragDrop() {
        document.addEventListener('dragstart', (event) => {
            const card = event.target.closest('.agent-card');
            if (!card) return;
            event.dataTransfer.setData('text/plain', card.dataset.agentId);
            event.dataTransfer.effectAllowed = 'copy';
            card.classList.add('dragging');
        });

        document.addEventListener('dragend', (event) => {
            const card = event.target.closest('.agent-card');
            if (card) card.classList.remove('dragging');
        });

        [this.ui?.dropzone, this.ui?.viewChat].forEach((element) => {
            if (!element) return;
            element.addEventListener('dragover', (event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'copy';
                this.ui.dropzone.classList.add('dragover');
            });
            element.addEventListener('dragleave', () => {
                this.ui.dropzone.classList.remove('dragover');
            });
            element.addEventListener('drop', (event) => {
                event.preventDefault();
                this.ui.dropzone.classList.remove('dragover');
                const agentId = event.dataTransfer.getData('text/plain');
                if (agentId) this.openWithAgent(agentId);
            });
        });
    }

    setupMapClick() {
        if (this.engine) {
            this.engine.onAgentClick = (agentId) => this.openWithAgent(agentId);
        }
    }

    setupDragListeners() {
        return;
    }

    startStatusRefresh() {
        this.statusTimer = window.setInterval(() => {
            if (!this.isOpen) return;
            if (this.activeAgentId) {
                const agent = this.manager.getAgent(this.activeAgentId);
                if (!agent) {
                    this.resetPanelState();
                    return;
                }
                this.updatePanelChrome(agent);
            }
            this.renderHistory();
        }, 1200);
    }

    getQuickAsksForAgent(agent) {
        const roleKey = agent?.role || 'default';
        return [
            ...this.quickAskCatalog.base,
            ...(this.quickAskCatalog.byRole[roleKey] || []),
        ].slice(0, 4);
    }

    renderQuickAsks() {
        const agent = this.manager.getAgent(this.activeAgentId);
        const asks = this.getQuickAsksForAgent(agent);
        this.ui.quickAsks.innerHTML = asks.map((item) => `
            <button class="quick-ask-btn" data-key="${item.key}" title="${item.text}">
                <span class="quick-ask-icon">${item.icon}</span>
                <span>${item.text}</span>
            </button>
        `).join('');

        this.ui.quickAsks.querySelectorAll('.quick-ask-btn').forEach((button) => {
            button.addEventListener('click', () => {
                const text = button.textContent.trim();
                this.handleUserInput(text, button.dataset.key);
            });
        });
    }

    getRoleLabel(role) {
        return this.manager.roleConfigs?.[role]?.name || role || 'Agent';
    }

    getRoleAvatar(role) {
        return this.roleBadgeMap[role] || this.roleBadgeMap.default;
    }

    getRoleClass(role) {
        return `role-${role || 'default'}`;
    }

    getPresence(agent) {
        if (!agent) return 'idle';
        if (agent.status === 'working') return 'working';
        if (agent.status === 'thinking' || agent.status === 'review') return 'thinking';
        return 'idle';
    }

    getAgentMeta(agent) {
        if (!agent) {
            return {
                name: 'Agent Channel',
                status: 'Kéo agent vào đây để mở kênh liên lạc',
                role: 'standby',
                avatar: 'AI',
                roleClass: this.getRoleClass('default'),
                presence: 'idle',
                mood: '--',
                energy: '--',
                task: 'Standby',
            };
        }

        const status =
            agent.status === 'working' ? 'Đang làm việc' :
            agent.status === 'thinking' ? 'Đang suy nghĩ' :
            agent.status === 'review' ? 'Đang review' :
            'Đang rảnh';

        return {
            name: agent.name,
            status,
            role: `${this.getRoleLabel(agent.role)} · Lv${agent.level || 1}`,
            avatar: this.getRoleAvatar(agent.role),
            roleClass: this.getRoleClass(agent.role),
            presence: this.getPresence(agent),
            mood: `${Math.floor(agent.mood || 0)}%`,
            energy: `${Math.floor(agent.energy || 0)}%`,
            task: agent.currentTask?.title || 'Standby',
        };
    }

    updatePanelChrome(agent) {
        const meta = this.getAgentMeta(agent);
        this.ui.name.textContent = meta.name;
        this.ui.status.textContent = meta.status;
        this.ui.role.textContent = meta.role;
        this.ui.avatar.textContent = meta.avatar;
        this.ui.avatar.className = `chatbox-avatar ${meta.roleClass}`;
        this.ui.mood.textContent = meta.mood;
        this.ui.energy.textContent = meta.energy;
        this.ui.task.textContent = meta.task;
        this.ui.presence.className = `chatbox-presence ${meta.presence}`;
        this.el.setAttribute('data-role', (agent?.role || 'default'));
        this.ui.input.placeholder = agent ? `Nhắn ${agent.name}...` : 'Gửi tin nhắn...';
    }

    setActiveTab(tab) {
        this.activeTab = tab === 'history' ? 'history' : 'chat';
        this.ui.tabs.querySelectorAll('.chatbox-tab').forEach((button) => {
            button.classList.toggle('active', button.dataset.tab === this.activeTab);
        });
        const showChat = this.activeTab === 'chat';
        this.ui.viewChat.style.display = showChat ? 'flex' : 'none';
        this.ui.viewHistory.style.display = showChat ? 'none' : 'flex';
        this.ui.viewChat.classList.toggle('is-active', showChat);
        this.ui.viewHistory.classList.toggle('is-active', !showChat);
        this.syncInputState();
        if (!showChat) {
            this.renderHistory();
        } else if (this.activeAgentId) {
            this.renderMessages();
        }
    }

    syncInputState() {
        const shouldShowInput = this.activeTab === 'chat' && !!this.activeAgentId;
        this.ui.inputArea.style.display = shouldShowInput ? 'block' : 'none';
        this.ui.dropzone.style.display = this.activeTab === 'chat' && !this.activeAgentId ? 'flex' : 'none';
        this.ui.messages.style.display = this.activeTab === 'chat' && this.activeAgentId ? 'flex' : 'none';
    }

    resetPanelState() {
        this.activeAgentId = null;
        this.setActiveTab('chat');
        this.updatePanelChrome(null);
        this.ui.messages.innerHTML = '';
        this.syncInputState();
        this.renderQuickAsks();
        this.renderHistory();
    }

    toggle() {
        if (this.isOpen) this.close();
        else this.open();
    }

    open() {
        this.isOpen = true;
        this.isMinimized = false;
        this.el.classList.add('open');
        this.el.classList.remove('minimized');
        this.toggleBtn.classList.add('active');
        if (!this.activeAgentId) this.resetPanelState();
    }

    close() {
        this.isOpen = false;
        this.el.classList.remove('open', 'minimized');
        this.toggleBtn.classList.remove('active');
        this.hideTyping();
        this.resetPanelState();
    }

    minimize() {
        this.isMinimized = !this.isMinimized;
        this.el.classList.toggle('minimized', this.isMinimized);
    }

    touchRecentAgent(agentId) {
        this.recentAgentIds = [agentId, ...this.recentAgentIds.filter((id) => id !== agentId)].slice(0, 10);
    }

    getMessageCount() {
        let total = 0;
        this.messages.forEach((items) => {
            total += items.length;
        });
        return total;
    }

    formatTime(value) {
        if (!(value instanceof Date)) return '';
        return value.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }

    renderHistory() {
        const totalAgents = this.recentAgentIds.length;
        this.ui.historyCount.textContent = `${totalAgents} agent`;
        this.ui.messageCount.textContent = `${this.getMessageCount()} msg`;

        if (!totalAgents) {
            this.ui.historyList.innerHTML = `
                <div class="chatbox-history-empty">
                    <div class="chatbox-history-empty-core">LOG</div>
                    <div class="chatbox-history-empty-title">Chưa có phiên chat nào</div>
                    <div class="chatbox-history-empty-text">Kết nối với agent đầu tiên để bắt đầu lịch sử liên lạc.</div>
                </div>
            `;
            return;
        }

        this.ui.historyList.innerHTML = this.recentAgentIds.map((agentId) => {
            const agent = this.manager.getAgent(agentId);
            if (!agent) return '';
            const messages = this.messages.get(agentId) || [];
            const last = messages[messages.length - 1];
            const preview = last?.text || 'Chưa có tin nhắn';
            return `
                <button class="chatbox-history-card ${agentId === this.activeAgentId ? 'active' : ''}" data-agent-id="${agentId}">
                    <span class="chatbox-history-avatar ${this.getRoleClass(agent.role)}">${this.escapeHtml(this.getRoleAvatar(agent.role))}</span>
                    <span class="chatbox-history-main">
                        <span class="chatbox-history-row">
                            <span class="chatbox-history-name">${this.escapeHtml(agent.name)}</span>
                            <span class="chatbox-history-time">${this.formatTime(last?.time)}</span>
                        </span>
                        <span class="chatbox-history-sub">${this.escapeHtml(this.getRoleLabel(agent.role))} · ${this.escapeHtml(agent.status || 'idle')}</span>
                        <span class="chatbox-history-preview">${this.escapeHtml(preview)}</span>
                    </span>
                </button>
            `;
        }).join('');

        this.ui.historyList.querySelectorAll('.chatbox-history-card').forEach((button) => {
            button.addEventListener('click', () => {
                this.openWithAgent(button.dataset.agentId);
                this.setActiveTab('chat');
            });
        });
    }

    async openWithAgent(agentId) {
        const agent = this.manager.getAgent(agentId);
        if (!agent) return;

        this.activeAgentId = agentId;
        this.touchRecentAgent(agentId);
        this.open();
        this.setActiveTab('chat');
        this.updatePanelChrome(agent);
        this.renderQuickAsks();
        this.syncInputState();

        if (window.__pixelAgentUsePythonCore && window.PythonBridge?.isServerMode?.()) {
            try {
                const result = await window.PythonBridge.openChat(agentId);
                if (result && result.success && result.messages) {
                    this.messages.set(agentId, result.messages.map(m => ({
                        from: m.from || m.from_,
                        text: m.text,
                        time: m.time ? new Date(m.time) : new Date()
                    })));
                }
            } catch (e) {
                console.warn('PythonBridge openChat error:', e);
            }
        } else {
            if (!this.messages.has(agentId)) {
                this.messages.set(agentId, []);
                const templates = this.roleResponses[agent.role] || this.roleResponses.default;
                const greeting = templates.greeting[Math.floor(Math.random() * templates.greeting.length)];
                this.addBotMessage(greeting);
            }
        }

        this.renderMessages();
        this.renderHistory();
        this.scrollToBottom();
        this.engine?.showSpeechBubble?.(agentId, 'Dang chat...', 3000);
        if (this.engine) this.engine.selectedAgent = agentId;
        this.ui.input.focus();
    }

    addMessage(agentId, message) {
        const items = this.messages.get(agentId) || [];
        items.push(message);
        this.messages.set(agentId, items);
        this.touchRecentAgent(agentId);
    }

    addUserMessage(text) {
        if (!this.activeAgentId) return;
        this.addMessage(this.activeAgentId, { from: 'user', text, time: new Date() });
    }

    addBotMessage(text) {
        if (!this.activeAgentId) return;
        this.addMessage(this.activeAgentId, { from: 'bot', text, time: new Date() });
    }

    sendMessage() {
        const text = this.ui.input.value.trim();
        if (!text || !this.activeAgentId) return;
        this.ui.input.value = '';
        this.handleUserInput(text);
    }

    async handleUserInput(text, key = null) {
        if (!this.activeAgentId) return;
        this.addUserMessage(text);
        this.renderMessages();
        this.renderHistory();
        this.scrollToBottom();
        this.showTyping();

        if (window.__pixelAgentUsePythonCore && window.PythonBridge?.isServerMode?.()) {
            const agentId = this.activeAgentId;
            try {
                const result = await window.PythonBridge.sendChat(agentId, text, key);
                this.hideTyping();
                if (result && result.success && result.response) {
                    if (result.messages) {
                        this.messages.set(agentId, result.messages.map(m => ({
                            from: m.from || m.from_,
                            text: m.text,
                            time: m.time ? new Date(m.time) : new Date()
                        })));
                    } else {
                        this.addBotMessage(result.response);
                    }
                    this.renderMessages();
                    this.renderHistory();
                    this.scrollToBottom();

                    const short = result.response.length > 28 ? `${result.response.substring(0, 28)}...` : result.response;
                    this.engine?.showSpeechBubble?.(agentId, short, 4000);
                }
            } catch (e) {
                console.warn('PythonBridge sendChat error:', e);
                this.hideTyping();
            }
        } else {
            const delay = 700 + Math.random() * 1100;
            window.setTimeout(() => {
                this.hideTyping();
                const response = this.generateResponse(this.activeAgentId, text, key);
                this.addBotMessage(response);
                this.renderMessages();
                this.renderHistory();
                this.scrollToBottom();

                const short = response.length > 28 ? `${response.substring(0, 28)}...` : response;
                this.engine?.showSpeechBubble?.(this.activeAgentId, short, 4000);
            }, delay);
        }
    }

    generateResponse(agentId, userText, key = null) {
        const agent = this.manager.getAgent(agentId);
        if (!agent) return 'Agent khong ton tai.';

        const templates = this.roleResponses[agent.role] || this.roleResponses.default;
        const taskTitle = agent.currentTask?.title || 'chua co task';
        const lower = userText.toLowerCase();
        let category = key;

        if (!category) {
            if (lower.includes('lam') || lower.includes('doing') || lower.includes('status') || lower.includes('tinh hinh')) {
                category = agent.status === 'working' ? 'working' : 'idle';
            } else if (lower.includes('luong') || lower.includes('salary') || lower.includes('thuong') || lower.includes('tien')) {
                category = 'salary';
            } else if (lower.includes('khuyen') || lower.includes('opinion') || lower.includes('nghi') || lower.includes('idea')) {
                category = 'opinion';
            } else if (lower.includes('giup') || lower.includes('help') || lower.includes('can')) {
                category = 'help';
            } else if (lower.includes('chao') || lower.includes('hello') || lower.includes('hi')) {
                category = 'greeting';
            } else {
                category = agent.status === 'working' ? 'working' : 'help';
            }
        }

        const pool = templates[category] || templates.idle || this.roleResponses.default.idle;
        let response = pool[Math.floor(Math.random() * pool.length)];
        response = response.replace('{task}', taskTitle);

        if (Math.random() < 0.35 && agent.status === 'working') {
            response += ` (Progress ${Math.floor(agent.progress || 0)}%)`;
        }
        if (Math.random() < 0.22) {
            response += ` [Mood ${Math.floor(agent.mood || 0)} | Energy ${Math.floor(agent.energy || 0)}]`;
        }
        return response;
    }

    showTyping() {
        if (this.typing || !this.activeAgentId) return;
        this.typing = true;
        const agent = this.manager.getAgent(this.activeAgentId);
        const name = agent?.name || 'Agent';
        const el = document.createElement('div');
        el.className = 'chat-msg bot typing-indicator';
        el.id = 'typingIndicator';
        el.innerHTML = `
            <div class="chat-author">${this.escapeHtml(name)}</div>
            <div class="chat-bubble chat-bubble-typing">
                <span class="typing-label">drafting response</span>
                <span class="typing-bars">
                    <span></span><span></span><span></span><span></span>
                </span>
            </div>
        `;
        this.ui.messages.appendChild(el);
        this.scrollToBottom();
    }

    hideTyping() {
        this.typing = false;
        document.getElementById('typingIndicator')?.remove();
    }

    renderMessages() {
        if (!this.activeAgentId) return;
        const agent = this.manager.getAgent(this.activeAgentId);
        this.updatePanelChrome(agent);
        const items = this.messages.get(this.activeAgentId) || [];
        this.ui.messages.innerHTML = items.map((item) => {
            const author = item.from === 'user' ? 'You' : (agent?.name || 'Agent');
            return `
                <div class="chat-msg ${item.from}">
                    <div class="chat-author">${this.escapeHtml(author)}</div>
                    <div class="chat-bubble">${this.escapeHtml(item.text)}</div>
                    <div class="chat-time">${this.formatTime(item.time)}</div>
                </div>
            `;
        }).join('');
    }

    scrollToBottom() {
        requestAnimationFrame(() => {
            this.ui.messages.scrollTop = this.ui.messages.scrollHeight;
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = String(text || '');
        return div.innerHTML;
    }
}

window.AgentChatbox = AgentChatbox;
