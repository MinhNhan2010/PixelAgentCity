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

        // Role-specific response templates with Game Context
        this.roleResponses = {
            coder: {
                greeting: ['Chào bạn! Tôi đang code, có gì không? 💻', 'Hey! Cần tôi viết gì nào? Boss trả lương tôi rồi chứ? ⌨️'],
                working: ['Đang code đây... {task} sắp xong rồi, hy vọng được thưởng! 💸', 'Hiện đang implement {task}, khá thú vị!'],
                idle: ['Đang chờ contract mới, tiền lương vẫn tính nhé! ✨', 'Rảnh rỗi quá, sếp nhận contract đi!'],
                help: ['Bạn cần tôi code feature gì cho contract?', 'Tôi có thể viết code bằng JS, Python, Go...'],
                opinion: ['Code lỗi có bị trừ lương không sếp? 😅', 'Clean code quan trọng hơn clever code!'],
                salary: ['Lương tôi 15Ⓒ/ngày là hơi bèo đó nha sếp! 😂', 'Tiền nong sòng phẳng, code rốp rẻng! 💸'],
            },
            reviewer: {
                greeting: ['Xin chào! Cứ đưa code lỗi đây, tôi lấy lương xứng đáng 🔍', 'Hey! Gửi PR nào, tôi review liền!'],
                working: ['Đang review {task}... hi vọng sếp không phạt ai viết code này', 'Code quality check cho {task} đang tiến triển'],
                idle: ['Sẵn sàng review! Nhận contract đi boss 📝', 'Có PR nào cần review không? Ngồi không ngại quá'],
                help: ['Tôi kiểm tra code quality, best practices, kiếm tiền cho công ty!', 'Gửi tôi xem code, tôi sẽ feedback!'],
                opinion: ['Code readable giúp team hoàn thành contract sớm! 📖', 'Test coverage cao thì đỡ tốn tiền đền bù!'],
                salary: ['Review dạo kiếm sống, sếp nhớ trả lương đúng hạn! 💸', 'Công sức soi bug cũng đáng giá ngàn vàng!'],
            },
            tester: {
                greeting: ['Xin chào! QA tester đây, bug là tiền 🧪', 'Hey! Tôi sẽ test mọi thứ!'],
                working: ['Testing {task}... bắt được bug là có xp!', 'Automation tests cho {task} đang chạy...'],
                idle: ['Cần test gì không? Rảnh rỗi dễ sinh nông nổi!', 'Mọi thứ đang pass tests ✅ Contract thành công!'],
                help: ['Tôi viết unit tests để bảo vệ uy tín công ty (Reputation)', 'Gửi tôi feature, tôi sẽ viết test cases!'],
                opinion: ['100% coverage không thực tế, nhưng đừng để Rep tụt thê thảm!', 'Test Driven Development rất hiệu quả!'],
                salary: ['Lương tester bọt bèo quá sếp ơi! 📉', 'Test cẩn thận để không rớt Reputation!'],
            },
            designer: {
                greeting: ['Hi! Designer here 🎨 Tiền nào của nấy nha sếp!', 'Chào bạn! Cần thiết kế giao diện ngàn đô không?'],
                working: ['Đang thiết kế {task}... sắp xong wireframe rồi!', 'UI cho {task} đang rất đẹp, khách sẽ thích! ✨'],
                idle: ['Muốn tôi design gì? 🖌️ Chờ hoài chán quá', 'Sếp hết tiền nhận contract mới rồi à?'],
                help: ['Tôi thiết kế UI/UX để công ty nhanh lên level', 'Cần mockup hay prototype?'],
                opinion: ['Design system xịn thì bán app mới được giá! 🎯', 'Less is more — Minimalism là chìa khóa!'],
                salary: ['Thiết kế là nghệ thuật, mà nghệ thuật thì đắt tiền! 💸🎨', 'Tăng lương đi sếp, mắt tôi tăng độ rồi!'],
            },
            devops: {
                greeting: ['DevOps here! Infra tốn tiền lắm đấy 🚀', 'Chào! Có gì cần deploy không?'],
                working: ['Đang {task}... Server tính phí theo giờ đấy nhé!', 'Kubernetes cluster cho {task} đang setup...'],
                idle: ['Infrastructure stable, rảnh là tốt! 🟢', 'Monitoring dashboards xanh rờn, yên tâm trả lương!'],
                help: ['Tôi quản lý servers, giảm thiểu chi phí mây cho sếp', 'Cần deploy hay scale gì?'],
                opinion: ['Sập server là sếp đền ốm tiền contract! 🔄', 'Zero downtime deployment là tiêu chuẩn!'],
                salary: ['Lương DevOps lúc nào cũng phải top tier nhé! 🤑', 'Server chạy tốt, lương phải đều!'],
            },
            researcher: {
                greeting: ['Xin chào! Tôi đang nghiên cứu 📚 Đầu tư R&D tốn kém đấy', 'Hi! Có câu hỏi gì thú vị không?'],
                working: ['Nghiên cứu {task}... tốn nhiều XP quá!', 'Đang phân tích data cho {task}...'],
                idle: ['Có topic nào cần dùng não không sếp? 🧠', 'Đang đọc paper... vẫn xin tính lương!'],
                help: ['Tôi nghiên cứu AI/ML để công ty mau thăng cấp', 'Muốn tôi survey topic gì?'],
                opinion: ['Công ty Level cao mới có dự án ngon! 📈', 'Data quality > Data quantity! 📊'],
                salary: ['Nghiên cứu khoa học cần tiền tài trợ! 💸', 'Trả lương đi sếp để mua sách mới!'],
            },
            analyst: {
                greeting: ['Hi! Data analyst đây 📊 Doanh thu nay sao?', 'Business insights ready! 📈'],
                working: ['Phân tích {task}... công ty đang lãi hay lỗ?', 'Dashboard cho {task} sắp xong!'],
                idle: ['Cần phân tích tài chính công ty không? 📉', 'Đang tính xem công ty đủ tiền trả lương đến bao giờ...'],
                help: ['Tôi tối ưu lợi nhuận cho sếp', 'Cần insights hay visualization?'],
                opinion: ['Reputation thấp khó nhận hợp đồng béo lắm sếp! 🔑', 'A/B testing trước khi release!'],
                salary: ['Phân tích thấy lương tôi bèo nhất phòng! 😭', 'KPI tốt thì sếp phải thưởng chứ!'],
            },
            security: {
                greeting: ['Security team here 🛡️ Hệ thống an toàn!', 'Hacker xâm nhập là công ty đền hợp đồng vỡ mặt nha!'],
                working: ['Đang audit {task}... tìm thấy lỗ hổng tốn tiền rồi', 'Penetration testing {task} đang chạy...'],
                idle: ['Watching for threats... 👀', 'Mọi thứ secure, Rep an toàn! ✅'],
                help: ['Tôi audit hệ thống để giữ chân khách hàng', 'Gửi code, tôi check vulnerability!'],
                opinion: ['Rò rỉ dữ liệu = Phá sản! 🚫', 'Security by design, not afterthought!'],
                salary: ['Lương bảo mật phải cao, không tôi hack sập công ty! (Đùa thôi 😂)', 'Bảo vệ tài sản công ty thì phải trả cho xứng đáng!'],
            },
            backend: {
                greeting: ['Backend dev here! ⚙️ Database tốn bao nhiêu GB rồi?', 'Hi! Cần API mới không?'],
                working: ['Đang develop {task}... sắp xong phase này của contract!', 'REST endpoints cho {task} đang test...'],
                idle: ['Server rảnh rang thế này, sếp nhận dự án đi ⚡', 'Cần endpoint mới không?'],
                help: ['Tôi build backend gánh vác cả công ty', 'REST hay GraphQL?'],
                opinion: ['Cache tốt giảm chi phí server sếp ạ! 🗃️', 'Microservices khi đúng thời điểm!'],
                salary: ['Lương tôi 💸 mua được ly cà phê mỗi ngày thôi à sếp?', 'Backend phức tạp, lương cũng phải tỉ lệ thuận chứ!'],
            },
            mobile: {
                greeting: ['Mobile dev đây! 📱 Rating app cao có thưởng không sếp?', 'Hi! Cross-platform hay native?'],
                working: ['Build {task}... sắp bàn giao app lấy tiền rồi!', 'UI component cho {task} rendering đẹp!'],
                idle: ['Khách nào cần làm app mobile gọi tôi nhé ⭐', 'Sếp nhận hợp đồng mobile app đi!'],
                help: ['Làm app iOS, Android lấy tiền tỷ!', 'Cần mobile app hay responsive web?'],
                opinion: ['App xịn khách hàng tip thêm xèng! 💪', 'Performance trên mobile cực kỳ quan trọng!'],
                salary: ['Sếp trả tôi theo giờ đi, code mobile căng mắt quá! 💸📱', 'Làm app khó, lương cao hợp lý!'],
            },
            writer: {
                greeting: ['Technical writer đây! ✍️ Viết lách kiếm cơm', 'Chào! Docs dự án cần update gì?'],
                working: ['Đang viết tài liệu cho hợp đồng {task}...', 'API documentation {task} sắp hoàn tất!'],
                idle: ['Không có dự án thì không có docs để viết! 📄', 'Chờ việc...'],
                help: ['Tôi viết tài liệu bàn giao để lấy nghiệm thu', 'README hay API docs?'],
                opinion: ['Tài liệu ngon nghẻ giúp khách hàng ưng ý (Tăng Rep) 📖', 'Không có tài liệu, bảo trì mệt nghỉ!'],
                salary: ['Múa phím ra chữ, chữ thành tiền! Lương tôi đâu? 💰', 'Viết docs cực lắm sếp, thưởng thêm đi!'],
            },
        };

        // Predefined quick asks
        this.quickAsks = [
            { text: 'Đang làm gì?', key: 'working' },
            { text: 'Lương bổng?', key: 'salary' },
            { text: 'Lời khuyên?', key: 'opinion' },
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
            } else if (lower.includes('lương') || lower.includes('tiền') || lower.includes('trả') || lower.includes('salary')) {
                category = 'salary';
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
