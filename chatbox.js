/**
 * Chatbox v1.0 — Drag-Drop Agent Chat System
 * Drag an agent card into the chatbox to start chatting
 * Supports role-based simulated AI responses
 */

class AgentChatbox {
    constructor(manager, engine) {
        this.manager = manager;
        this.engine = engine;
        this.activeAgentId = null;
        this.messages = new Map(); // agentId -> messages[]
        this.isOpen = false;
        this.isMinimized = false;
        this.typing = false;
        this.dragPos = { x: 0, y: 0 };
        this.isDragging = false;

        // Role-specific response templates
        this.roleResponses = {
            coder: {
                greeting: ['Chào bạn! Tôi đang code, có gì không? 💻', 'Hey! Cần tôi viết gì nào? ⌨️'],
                working: ['Đang code đây... {task} đang tiến triển tốt!', 'Hiện đang implement {task}, khá thú vị!', 'Code review xong rồi, đang refactor một chút...'],
                idle: ['Đang chờ task mới, muốn tôi code gì? ✨', 'Rảnh rỗi quá, cho tôi task đi!'],
                help: ['Bạn cần tôi code feature gì?', 'Tôi có thể viết code bằng JS, Python, Go...', 'Muốn tôi viết API hay Frontend?'],
                opinion: ['Theo tôi nên dùng TypeScript cho type safety 🔒', 'Clean code quan trọng hơn clever code!', 'SOLID principles là nền tảng tốt!'],
            },
            reviewer: {
                greeting: ['Xin chào! Tôi review code đây 🔍', 'Hey! Gửi PR nào, tôi review liền!'],
                working: ['Đang review {task}... phát hiện vài issues rồi', 'Code quality check cho {task} đang tiến triển'],
                idle: ['Sẵn sàng review! Gửi code cho tôi nhé 📝', 'Có PR nào cần review không?'],
                help: ['Tôi kiểm tra code quality, best practices', 'Gửi tôi xem code, tôi sẽ feedback!'],
                opinion: ['Code readable > Code clever! 📖', 'Test coverage rất quan trọng!', 'Nên viết comments cho phần phức tạp'],
            },
            tester: {
                greeting: ['Xin chào! QA tester đây 🧪', 'Hey! Tôi sẽ test mọi thứ!'],
                working: ['Testing {task}... đã phát hiện vài edge cases', 'Automation tests cho {task} đang chạy...'],
                idle: ['Cần test gì không? Tôi rảnh nè!', 'Mọi thứ đang pass tests ✅'],
                help: ['Tôi viết unit tests, integration tests, E2E', 'Gửi tôi feature, tôi sẽ viết test cases!'],
                opinion: ['100% coverage không thực tế, nhưng 80% là tối thiểu!', 'Test Driven Development rất hiệu quả!'],
            },
            designer: {
                greeting: ['Hi! Designer here 🎨', 'Chào bạn! Cần thiết kế gì nào?'],
                working: ['Đang thiết kế {task}... sắp xong wireframe!', 'UI cho {task} đang rất đẹp! ✨'],
                idle: ['Muốn tôi design gì? 🖌️', 'Rảnh rỗi, cho tôi design challenge đi!'],
                help: ['Tôi thiết kế UI/UX, icons, illustrations', 'Cần mockup hay prototype?'],
                opinion: ['Design system rất quan trọng! 🎯', 'Less is more — Minimalism là chìa khóa!', 'Dark mode luôn cool hơn! 🌙'],
            },
            devops: {
                greeting: ['DevOps here! Infra vẫn stable 🚀', 'Chào! Có gì cần deploy không?'],
                working: ['Đang {task}... CI/CD pipeline chạy ngon!', 'Kubernetes cluster cho {task} đang setup...'],
                idle: ['Infrastructure stable, CPU 42%, RAM 68% 📊', 'Monitoring dashboards xanh 🟢'],
                help: ['Tôi quản lý servers, CI/CD, Docker, K8s', 'Cần deploy hay scale gì?'],
                opinion: ['Infrastructure as Code là must-have!', 'GitOps > manual deployment! 🔄', 'Zero downtime deployment là tiêu chuẩn!'],
            },
            researcher: {
                greeting: ['Xin chào! Tôi đang nghiên cứu 📚', 'Hi! Có câu hỏi gì thú vị không?'],
                working: ['Nghiên cứu {task}... rất nhiều paper hay!', 'Đang phân tích data cho {task}...'],
                idle: ['Có topic nào cần research không? 🧠', 'Đang đọc paper mới trên arXiv...'],
                help: ['Tôi nghiên cứu AI/ML, algorithms', 'Muốn tôi survey topic gì?'],
                opinion: ['Transformer architecture đang thay đổi mọi thứ!', 'Data quality > Data quantity! 📊'],
            },
            analyst: {
                greeting: ['Hi! Data analyst đây 📊', 'Business insights ready! 📈'],
                working: ['Phân tích {task}... số liệu rất thú vị!', 'Dashboard cho {task} sắp xong!'],
                idle: ['Cần phân tích data gì không? 📉', 'Đang theo dõi metrics...'],
                help: ['Tôi phân tích data, tạo reports', 'Cần insights hay visualization?'],
                opinion: ['Data-driven decisions là key! 🔑', 'A/B testing trước khi scale!'],
            },
            security: {
                greeting: ['Security team here 🛡️', 'Hệ thống an toàn! Có gì cần audit?'],
                working: ['Đang audit {task}... tìm thấy vài concerns', 'Penetration testing {task} đang chạy...'],
                idle: ['Watching for threats... 👀', 'Mọi thứ secure, HTTPS everywhere ✅'],
                help: ['Tôi audit security, pen testing, compliance', 'Gửi code, tôi check vulnerabilities!'],
                opinion: ['Never trust user input! 🚫', 'Encryption at rest AND in transit!', 'Security by design, not afterthought!'],
            },
            backend: {
                greeting: ['Backend dev here! ⚙️ API đang chạy ngon', 'Hi! Cần API mới không?'],
                working: ['Đang develop {task}... database schema xong!', 'REST endpoints cho {task} đang test...'],
                idle: ['API Gateway chạy ổn, latency < 50ms ⚡', 'Cần endpoint mới không?'],
                help: ['Tôi build APIs, microservices, databases', 'REST hay GraphQL?'],
                opinion: ['Microservices khi đúng thời điểm!', 'Cache everything that makes sense! 🗃️'],
            },
            mobile: {
                greeting: ['Mobile dev đây! 📱 App đang stable', 'Hi! Cross-platform hay native?'],
                working: ['Build {task}... hot reload đang ngon! 🔥', 'UI component cho {task} rendering đẹp!'],
                idle: ['App Store rating 4.8 ⭐', 'Cần thêm feature mobile gì?'],
                help: ['React Native, Flutter, Swift, Kotlin', 'Cần mobile app hay responsive web?'],
                opinion: ['PWA ngày càng mạnh! 💪', 'Performance trên mobile cực kỳ quan trọng!'],
            },
            writer: {
                greeting: ['Technical writer đây! ✍️', 'Chào! Docs cần update gì?'],
                working: ['Đang viết docs cho {task}...', 'API documentation {task} sắp xong!'],
                idle: ['Tài liệu up-to-date! 📄', 'Wiki cần thêm gì không?'],
                help: ['Tôi viết docs, guides, tutorials', 'README hay API docs?'],
                opinion: ['Good docs = Good DX! 📖', 'Code without docs is technical debt!'],
            },
        };

        // Predefined quick asks
        this.quickAsks = [
            { text: 'Bạn đang làm gì?', key: 'working' },
            { text: 'Giúp tôi!', key: 'help' },
            { text: 'Ý kiến của bạn?', key: 'opinion' },
        ];

        this.createChatbox();
        this.bindDragDrop();
    }

    createChatbox() {
        const box = document.createElement('div');
        box.id = 'agentChatbox';
        box.className = 'chatbox';
        box.innerHTML = `
            <div class="chatbox-header" id="chatboxHeader">
                <div class="chatbox-header-left">
                    <div class="chatbox-avatar" id="chatboxAvatar">💬</div>
                    <div class="chatbox-title">
                        <span class="chatbox-name" id="chatboxName">Agent Chat</span>
                        <span class="chatbox-status" id="chatboxStatus">Kéo agent vào đây</span>
                    </div>
                </div>
                <div class="chatbox-header-right">
                    <button class="chatbox-btn" id="chatboxMinimize" title="Thu nhỏ">─</button>
                    <button class="chatbox-btn" id="chatboxClose" title="Đóng">✕</button>
                </div>
            </div>
            <div class="chatbox-body" id="chatboxBody">
                <div class="chatbox-dropzone" id="chatboxDropzone">
                    <div class="dropzone-icon">🤖</div>
                    <div class="dropzone-text">Kéo thả Agent vào đây<br>để bắt đầu trò chuyện</div>
                    <div class="dropzone-hint">hoặc click vào agent trên bản đồ</div>
                </div>
                <div class="chatbox-messages" id="chatboxMessages" style="display:none"></div>
            </div>
            <div class="chatbox-input-area" id="chatboxInputArea" style="display:none">
                <div class="chatbox-quick-asks" id="chatboxQuickAsks"></div>
                <div class="chatbox-input-row">
                    <input type="text" class="chatbox-input" id="chatboxInput" placeholder="Nhập tin nhắn..." autocomplete="off">
                    <button class="chatbox-send" id="chatboxSend">▶</button>
                </div>
            </div>
        `;
        document.body.appendChild(box);
        this.el = box;

        // Toggle button (floating)
        const toggle = document.createElement('button');
        toggle.id = 'chatboxToggle';
        toggle.className = 'chatbox-toggle';
        toggle.innerHTML = '💬';
        toggle.title = 'Mở Chatbox';
        document.body.appendChild(toggle);
        this.toggleBtn = toggle;

        // Event listeners
        toggle.addEventListener('click', () => this.toggle());
        document.getElementById('chatboxClose').addEventListener('click', () => this.close());
        document.getElementById('chatboxMinimize').addEventListener('click', () => this.minimize());
        document.getElementById('chatboxSend').addEventListener('click', () => this.sendMessage());
        document.getElementById('chatboxInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // Make chatbox draggable by header
        this.makeDraggable();

        // Render quick asks
        this.renderQuickAsks();
    }

    renderQuickAsks() {
        const container = document.getElementById('chatboxQuickAsks');
        container.innerHTML = this.quickAsks.map(q =>
            `<button class="quick-ask-btn" data-key="${q.key}">${q.text}</button>`
        ).join('');
        container.querySelectorAll('.quick-ask-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleUserInput(btn.textContent, btn.dataset.key);
            });
        });
    }

    makeDraggable() {
        const header = document.getElementById('chatboxHeader');
        let offsetX, offsetY;
        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.chatbox-btn')) return;
            this.isDragging = true;
            const rect = this.el.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            this.el.style.transition = 'none';
        });
        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            const x = Math.max(0, Math.min(window.innerWidth - 380, e.clientX - offsetX));
            const y = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - offsetY));
            this.el.style.left = x + 'px';
            this.el.style.top = y + 'px';
            this.el.style.right = 'auto';
            this.el.style.bottom = 'auto';
        });
        document.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.el.style.transition = '';
        });
    }

    bindDragDrop() {
        // Make agent cards draggable
        document.addEventListener('dragstart', (e) => {
            const card = e.target.closest('.agent-card');
            if (!card) return;
            const agentId = card.dataset.agentId;
            e.dataTransfer.setData('text/plain', agentId);
            e.dataTransfer.effectAllowed = 'copy';
            card.classList.add('dragging');
        });
        document.addEventListener('dragend', (e) => {
            const card = e.target.closest('.agent-card');
            if (card) card.classList.remove('dragging');
        });

        // Dropzone handlers
        const dropzone = document.getElementById('chatboxDropzone');
        const body = document.getElementById('chatboxBody');

        [dropzone, body].forEach(el => {
            el.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                dropzone.classList.add('dragover');
            });
            el.addEventListener('dragleave', () => {
                dropzone.classList.remove('dragover');
            });
            el.addEventListener('drop', (e) => {
                e.preventDefault();
                dropzone.classList.remove('dragover');
                const agentId = e.dataTransfer.getData('text/plain');
                if (agentId) this.openWithAgent(agentId);
            });
        });

        // Also from canvas click → open chat
        // Will be connected externally
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
    }

    close() {
        this.isOpen = false;
        this.el.classList.remove('open', 'minimized');
        this.toggleBtn.classList.remove('active');
    }

    minimize() {
        this.isMinimized = !this.isMinimized;
        this.el.classList.toggle('minimized', this.isMinimized);
    }

    openWithAgent(agentId) {
        const agent = this.manager.getAgent(agentId);
        if (!agent) return;

        this.activeAgentId = agentId;
        this.open();

        // Update header
        document.getElementById('chatboxName').textContent = agent.name;
        document.getElementById('chatboxStatus').textContent =
            agent.status === 'working' ? '💼 Đang làm việc' :
            agent.status === 'thinking' ? '🤔 Đang suy nghĩ' : '💤 Đang rảnh';
        document.getElementById('chatboxAvatar').textContent =
            this.manager.roleConfigs[agent.role]?.emoji || '🤖';

        // Show messages area, hide dropzone
        document.getElementById('chatboxDropzone').style.display = 'none';
        document.getElementById('chatboxMessages').style.display = 'flex';
        document.getElementById('chatboxInputArea').style.display = 'block';

        // Load chat history or send greeting
        if (!this.messages.has(agentId)) {
            this.messages.set(agentId, []);
            // Send greeting
            const role = agent.role || 'coder';
            const greetings = this.roleResponses[role]?.greeting || ['Xin chào! 👋'];
            const greeting = greetings[Math.floor(Math.random() * greetings.length)];
            this.addBotMessage(greeting);
        }

        this.renderMessages();
        this.scrollToBottom();

        // Make the agent respond on canvas too
        this.engine.showSpeechBubble(agentId, '💬 Đang chat...', 3000);

        // Focus agent in chat → move camera to agent
        const sp = this.engine.agentSprites.get(agentId);
        if (sp) {
            this.engine.selectedAgent = agentId;
        }
    }

    addUserMessage(text) {
        if (!this.activeAgentId) return;
        const msgs = this.messages.get(this.activeAgentId) || [];
        msgs.push({ from: 'user', text, time: new Date() });
        this.messages.set(this.activeAgentId, msgs);
    }

    addBotMessage(text) {
        if (!this.activeAgentId) return;
        const msgs = this.messages.get(this.activeAgentId) || [];
        msgs.push({ from: 'bot', text, time: new Date() });
        this.messages.set(this.activeAgentId, msgs);
    }

    sendMessage() {
        const input = document.getElementById('chatboxInput');
        const text = input.value.trim();
        if (!text || !this.activeAgentId) return;
        input.value = '';
        this.handleUserInput(text);
    }

    handleUserInput(text, key = null) {
        if (!this.activeAgentId) return;
        this.addUserMessage(text);
        this.renderMessages();
        this.scrollToBottom();

        // Show typing indicator
        this.showTyping();

        // Generate response after a delay
        const delay = 800 + Math.random() * 1500;
        setTimeout(() => {
            this.hideTyping();
            const response = this.generateResponse(this.activeAgentId, text, key);
            this.addBotMessage(response);
            this.renderMessages();
            this.scrollToBottom();

            // Also show on canvas
            const short = response.length > 20 ? response.substring(0, 20) + '...' : response;
            this.engine.showSpeechBubble(this.activeAgentId, short, 4000);
        }, delay);
    }

    generateResponse(agentId, userText, key = null) {
        const agent = this.manager.getAgent(agentId);
        if (!agent) return 'Agent không tồn tại...';

        const role = agent.role || 'coder';
        const templates = this.roleResponses[role] || this.roleResponses.coder;
        const taskTitle = agent.currentTask?.title || 'chưa có task';

        // Determine response category
        let category;
        if (key) {
            category = key;
        } else {
            const lower = userText.toLowerCase();
            if (lower.includes('đang làm') || lower.includes('doing') || lower.includes('status') || lower.includes('gì')) {
                category = agent.status === 'working' ? 'working' : 'idle';
            } else if (lower.includes('giúp') || lower.includes('help') || lower.includes('cần') || lower.includes('làm')) {
                category = 'help';
            } else if (lower.includes('ý kiến') || lower.includes('nghĩ') || lower.includes('opinion') || lower.includes('think')) {
                category = 'opinion';
            } else if (lower.includes('chào') || lower.includes('hello') || lower.includes('hi ')) {
                category = 'greeting';
            } else {
                // Random contextual response
                category = agent.status === 'working' ? 'working' : (Math.random() > 0.5 ? 'help' : 'opinion');
            }
        }

        const msgs = templates[category] || templates.idle;
        let response = msgs[Math.floor(Math.random() * msgs.length)];

        // Replace placeholders
        response = response.replace('{task}', `"${taskTitle}"`);

        // Add extra context sometimes
        if (Math.random() < 0.3 && agent.status === 'working') {
            response += ` (Progress: ${Math.floor(agent.progress)}%)`;
        }
        if (Math.random() < 0.2) {
            response += ` [Mood: ${agent.mood}% | Energy: ${agent.energy}%]`;
        }

        return response;
    }

    showTyping() {
        this.typing = true;
        const msgs = document.getElementById('chatboxMessages');
        const el = document.createElement('div');
        el.className = 'chat-msg bot typing-indicator';
        el.id = 'typingIndicator';
        el.innerHTML = '<div class="chat-bubble"><span class="typing-dots"><span>.</span><span>.</span><span>.</span></span></div>';
        msgs.appendChild(el);
        this.scrollToBottom();
    }

    hideTyping() {
        this.typing = false;
        const el = document.getElementById('typingIndicator');
        if (el) el.remove();
    }

    renderMessages() {
        const container = document.getElementById('chatboxMessages');
        const msgs = this.messages.get(this.activeAgentId) || [];
        container.innerHTML = msgs.map(m => {
            const time = m.time instanceof Date ? m.time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
            return `<div class="chat-msg ${m.from}">
                <div class="chat-bubble">${this.escapeHtml(m.text)}</div>
                <div class="chat-time">${time}</div>
            </div>`;
        }).join('');
    }

    scrollToBottom() {
        const msgs = document.getElementById('chatboxMessages');
        requestAnimationFrame(() => { msgs.scrollTop = msgs.scrollHeight; });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

window.AgentChatbox = AgentChatbox;
