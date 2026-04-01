/**
 * Layout Editor v1.0 — Interactive office furniture & layout editor
 * Inspired by KayKit Furniture Bits asset pack
 * Allows placing, moving, deleting furniture + painting floors/walls
 */
class LayoutEditor {
    constructor(engine) {
        this.engine = engine;
        this.active = false;
        this.currentTool = null; // 'floor','wall','erase','furniture','select'
        this.selectedFurnitureType = null;
        this.selectedPlaced = null; // index in engine.furniture
        this.ghostPos = null;
        this.floorType = 'wood';
        this.undoStack = [];
        this.redoStack = [];
        this.panel = null;
        this.furnitureCatalog = this.buildCatalog();
        this.createPanel();
        this.bindEvents();
    }

    buildCatalog() {
        // KayKit-inspired furniture items grouped by category
        return {
            'Bàn Ghế': [
                { id: 'desk', name: 'Bàn làm việc', icon: '🖥️', w: 2, h: 1.2, hasSlot: true },
                { id: 'mtable', name: 'Bàn họp', icon: '📋', w: 4, h: 3 },
                { id: 'table_small', name: 'Bàn nhỏ', icon: '🪑', w: 1.5, h: 1.2 },
                { id: 'table_low', name: 'Bàn trà', icon: '☕', w: 2, h: 1.2 },
                { id: 'mchair', name: 'Ghế họp', icon: '💺', w: 0.8, h: 0.8 },
                { id: 'chair', name: 'Ghế gỗ', icon: '🪑', w: 0.8, h: 0.8 },
            ],
            'Sofa & Giường': [
                { id: 'sofa', name: 'Sofa', icon: '🛋️', w: 3, h: 1.5 },
                { id: 'armchair', name: 'Ghế bành', icon: '🪑', w: 1.5, h: 1.5 },
                { id: 'bed_single', name: 'Giường đơn', icon: '🛏️', w: 2, h: 3 },
                { id: 'bed_double', name: 'Giường đôi', icon: '🛏️', w: 3, h: 3 },
                { id: 'rug', name: 'Thảm', icon: '🟦', w: 3, h: 2 },
                { id: 'pillow', name: 'Gối', icon: '💤', w: 0.5, h: 0.5 },
            ],
            'Tủ & Kệ': [
                { id: 'bookshelf', name: 'Kệ sách', icon: '📚', w: 2.5, h: 1.8 },
                { id: 'cabinet', name: 'Tủ', icon: '🗄️', w: 2, h: 1.8 },
                { id: 'shelf', name: 'Kệ treo', icon: '📦', w: 2, h: 0.8 },
                { id: 'boxes', name: 'Thùng hàng', icon: '📦', w: 1, h: 1 },
            ],
            'Thiết Bị': [
                { id: 'vending', name: 'Máy bán hàng', icon: '🥤', w: 1, h: 2 },
                { id: 'coffee', name: 'Máy cà phê', icon: '☕', w: 1, h: 1.6 },
                { id: 'fridge', name: 'Tủ lạnh', icon: '🧊', w: 1, h: 2 },
                { id: 'counter', name: 'Quầy bếp', icon: '🍳', w: 3, h: 1.5 },
            ],
            'Trang Trí': [
                { id: 'plant', name: 'Cây cảnh', icon: '🌿', w: 1, h: 1.2 },
                { id: 'cactus', name: 'Xương rồng', icon: '🌵', w: 0.6, h: 0.8 },
                { id: 'painting', name: 'Tranh treo', icon: '🖼️', w: 1.5, h: 1 },
                { id: 'lamp', name: 'Đèn đứng', icon: '💡', w: 0.8, h: 2 },
                { id: 'clock', name: 'Đồng hồ', icon: '🕐', w: 0.8, h: 0.8 },
                { id: 'pictureframe', name: 'Khung ảnh', icon: '📷', w: 0.5, h: 0.7 },
            ],
        };
    }

    createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'layoutEditorPanel';
        this.panel.className = 'layout-editor-panel';
        this.panel.innerHTML = `
            <div class="le-header">
                <h3>🏗️ Layout Editor</h3>
                <button class="le-close" id="leClose">✕</button>
            </div>
            <div class="le-tools">
                <div class="le-tool-group">
                    <label class="le-label">Công cụ</label>
                    <div class="le-tool-row">
                        <button class="le-tool-btn" data-letool="select" title="Chọn & Di chuyển">🔲 Chọn</button>
                        <button class="le-tool-btn" data-letool="furniture" title="Đặt nội thất">🪑 Đặt</button>
                        <button class="le-tool-btn" data-letool="erase" title="Xóa đồ vật">🗑️ Xóa</button>
                    </div>
                </div>
                <div class="le-tool-group">
                    <label class="le-label">Sàn nhà</label>
                    <div class="le-tool-row">
                        <button class="le-floor-btn" data-floor="wood" title="Sàn gỗ"><span class="floor-swatch" style="background:#a0794a"></span> Gỗ</button>
                        <button class="le-floor-btn" data-floor="tile" title="Gạch men"><span class="floor-swatch" style="background:#e8e0d0"></span> Gạch</button>
                        <button class="le-floor-btn" data-floor="carpet" title="Thảm"><span class="floor-swatch" style="background:#4a6a8a"></span> Thảm</button>
                        <button class="le-floor-btn" data-floor="erase" title="Xóa sàn"><span class="floor-swatch" style="background:#12151e"></span> Xóa</button>
                    </div>
                </div>
            </div>
            <div class="le-catalog" id="leCatalog"></div>
            <div class="le-actions">
                <button class="le-action-btn" id="leUndo" title="Hoàn tác">↩ Undo</button>
                <button class="le-action-btn" id="leRedo" title="Làm lại">↪ Redo</button>
                <button class="le-action-btn le-save" id="leSave" title="Lưu layout">💾 Lưu</button>
                <button class="le-action-btn le-load" id="leLoad" title="Tải layout">📂 Tải</button>
            </div>
            <div class="le-status" id="leStatus">Sẵn sàng</div>
        `;
        document.body.appendChild(this.panel);
        this.renderCatalog();
    }

    renderCatalog() {
        const container = document.getElementById('leCatalog');
        let html = '';
        for (const [category, items] of Object.entries(this.furnitureCatalog)) {
            html += `<div class="le-cat-group">
                <div class="le-cat-title">${category}</div>
                <div class="le-cat-items">`;
            items.forEach(item => {
                html += `<button class="le-item-btn" data-furn-id="${item.id}" title="${item.name}">
                    <span class="le-item-icon">${item.icon}</span>
                    <span class="le-item-name">${item.name}</span>
                </button>`;
            });
            html += `</div></div>`;
        }
        container.innerHTML = html;
    }

    bindEvents() {
        // Close button
        document.getElementById('leClose').addEventListener('click', () => this.toggle(false));

        // Tool buttons
        this.panel.querySelectorAll('.le-tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.panel.querySelectorAll('.le-tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTool = btn.dataset.letool;
                this.selectedFurnitureType = null;
                this.setStatus(`Công cụ: ${btn.textContent.trim()}`);
            });
        });

        // Floor buttons
        this.panel.querySelectorAll('.le-floor-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.panel.querySelectorAll('.le-floor-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTool = 'floor';
                this.floorType = btn.dataset.floor;
                this.setStatus(`Sàn: ${btn.textContent.trim()}`);
            });
        });

        // Furniture catalog items
        this.panel.querySelectorAll('.le-item-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.panel.querySelectorAll('.le-item-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTool = 'furniture';
                this.selectedFurnitureType = btn.dataset.furnId;
                // Also highlight the "place" tool
                this.panel.querySelectorAll('.le-tool-btn').forEach(b => b.classList.remove('active'));
                this.panel.querySelector('[data-letool="furniture"]').classList.add('active');
                this.setStatus(`Đặt: ${btn.title}`);
            });
        });

        // Undo/Redo
        document.getElementById('leUndo').addEventListener('click', () => this.undo());
        document.getElementById('leRedo').addEventListener('click', () => this.redo());

        // Save/Load
        document.getElementById('leSave').addEventListener('click', () => this.saveLayout());
        document.getElementById('leLoad').addEventListener('click', () => this.loadLayout());

        // Canvas interaction for editor
        const vp = document.getElementById('officeViewport');
        vp.addEventListener('click', (e) => {
            if (!this.active || !this.currentTool) return;
            const T = this.engine.T;
            const wx = (e.offsetX - this.engine.camera.x) / this.engine.scale;
            const wy = (e.offsetY - this.engine.camera.y) / this.engine.scale;
            const tx = Math.floor(wx / T);
            const ty = Math.floor(wy / T);

            if (this.currentTool === 'floor') {
                this.paintFloor(tx, ty);
            } else if (this.currentTool === 'furniture' && this.selectedFurnitureType) {
                this.placeFurniture(this.selectedFurnitureType, tx, ty);
            } else if (this.currentTool === 'erase') {
                this.eraseFurnitureAt(wx, wy);
            } else if (this.currentTool === 'select') {
                this.selectFurnitureAt(wx, wy);
            }
        });

        // Mouse move for ghost preview
        vp.addEventListener('mousemove', (e) => {
            if (!this.active) return;
            const wx = (e.offsetX - this.engine.camera.x) / this.engine.scale;
            const wy = (e.offsetY - this.engine.camera.y) / this.engine.scale;
            this.ghostPos = { x: wx, y: wy };
        });
    }

    toggle(show) {
        this.active = show !== undefined ? show : !this.active;
        this.panel.classList.toggle('open', this.active);
        if (!this.active) {
            this.currentTool = null;
            this.selectedFurnitureType = null;
            this.engine.editMode = null;
        }
    }

    setStatus(msg) {
        document.getElementById('leStatus').textContent = msg;
    }

    // === FLOOR PAINTING ===
    paintFloor(tx, ty) {
        if (tx < 0 || ty < 0 || tx >= this.engine.MW || ty >= this.engine.MH) return;
        const old = this.engine.map[ty][tx];
        if (this.floorType === 'erase') {
            this.engine.map[ty][tx] = null;
        } else {
            this.engine.map[ty][tx] = this.floorType;
        }
        this.pushUndo({ type: 'floor', tx, ty, old, new: this.engine.map[ty][tx] });
        this.setStatus(`Sàn tại (${tx}, ${ty})`);
    }

    // === FURNITURE PLACEMENT ===
    placeFurniture(type, tx, ty) {
        const T = this.engine.T;
        const item = this.findCatalogItem(type);
        const furn = { t: type, x: tx * T, y: ty * T };
        if (item?.w) furn.w = item.w;

        // If it's a desk, create a slot
        if (type === 'desk') {
            furn.slotIdx = this.engine.deskSlots.length;
            this.engine.deskSlots.push({
                tx, ty, x: (tx + 0.5) * T, y: (ty + 0.5) * T,
                occupied: false, agentId: null
            });
        }

        this.engine.furniture.push(furn);
        this.pushUndo({ type: 'place', index: this.engine.furniture.length - 1, furn });
        this.setStatus(`Đã đặt ${item?.name || type} tại (${tx}, ${ty})`);
    }

    // === ERASE ===
    eraseFurnitureAt(wx, wy) {
        const T = this.engine.T;
        for (let i = this.engine.furniture.length - 1; i >= 0; i--) {
            const f = this.engine.furniture[i];
            const item = this.findCatalogItem(f.t);
            const fw = (item?.w || 1) * T, fh = (item?.h || 1) * T;
            if (wx >= f.x && wx <= f.x + fw && wy >= f.y && wy <= f.y + fh) {
                const removed = this.engine.furniture.splice(i, 1)[0];
                this.pushUndo({ type: 'remove', index: i, furn: removed });
                this.setStatus(`Đã xóa ${item?.name || f.t}`);
                return;
            }
        }
        this.setStatus('Không tìm thấy đồ vật');
    }

    // === SELECT / MOVE ===
    selectFurnitureAt(wx, wy) {
        const T = this.engine.T;
        for (let i = this.engine.furniture.length - 1; i >= 0; i--) {
            const f = this.engine.furniture[i];
            const item = this.findCatalogItem(f.t);
            const fw = (item?.w || 1) * T, fh = (item?.h || 1) * T;
            if (wx >= f.x && wx <= f.x + fw && wy >= f.y && wy <= f.y + fh) {
                this.selectedPlaced = i;
                this.setStatus(`Đã chọn: ${item?.name || f.t} — Click vị trí mới để di chuyển`);
                // Switch to move mode temporarily
                this._moveMode = true;
                const vp = document.getElementById('officeViewport');
                const moveHandler = (e2) => {
                    if (!this._moveMode) return;
                    const mx = (e2.offsetX - this.engine.camera.x) / this.engine.scale;
                    const my = (e2.offsetY - this.engine.camera.y) / this.engine.scale;
                    const ntx = Math.floor(mx / T);
                    const nty = Math.floor(my / T);
                    const oldX = f.x, oldY = f.y;
                    f.x = ntx * T;
                    f.y = nty * T;
                    this.pushUndo({ type: 'move', index: i, oldX, oldY, newX: f.x, newY: f.y });
                    this.setStatus(`Di chuyển đến (${ntx}, ${nty})`);
                    this._moveMode = false;
                    vp.removeEventListener('click', moveHandler);
                };
                setTimeout(() => vp.addEventListener('click', moveHandler, { once: true }), 100);
                return;
            }
        }
    }

    findCatalogItem(id) {
        for (const items of Object.values(this.furnitureCatalog)) {
            const found = items.find(i => i.id === id);
            if (found) return found;
        }
        return null;
    }

    // === UNDO / REDO ===
    pushUndo(action) {
        this.undoStack.push(action);
        this.redoStack = [];
    }

    undo() {
        if (!this.undoStack.length) return;
        const action = this.undoStack.pop();
        this.redoStack.push(action);
        if (action.type === 'floor') {
            this.engine.map[action.ty][action.tx] = action.old;
        } else if (action.type === 'place') {
            this.engine.furniture.splice(action.index, 1);
        } else if (action.type === 'remove') {
            this.engine.furniture.splice(action.index, 0, action.furn);
        } else if (action.type === 'move') {
            this.engine.furniture[action.index].x = action.oldX;
            this.engine.furniture[action.index].y = action.oldY;
        }
        this.setStatus('↩ Đã hoàn tác');
    }

    redo() {
        if (!this.redoStack.length) return;
        const action = this.redoStack.pop();
        this.undoStack.push(action);
        if (action.type === 'floor') {
            this.engine.map[action.ty][action.tx] = action.new;
        } else if (action.type === 'place') {
            this.engine.furniture.push(action.furn);
        } else if (action.type === 'remove') {
            this.engine.furniture.splice(action.index, 1);
        } else if (action.type === 'move') {
            this.engine.furniture[action.index].x = action.newX;
            this.engine.furniture[action.index].y = action.newY;
        }
        this.setStatus('↪ Đã làm lại');
    }

    // === SAVE / LOAD ===
    saveLayout() {
        const data = {
            map: this.engine.map,
            furniture: this.engine.furniture.map(f => ({ ...f })),
            deskSlots: this.engine.deskSlots.map(s => ({ ...s })),
        };
        const json = JSON.stringify(data);
        localStorage.setItem('pixelAgentLayout', json);
        // Also download as file
        const blob = new Blob([json], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `pixel-agent-layout-${Date.now()}.json`;
        a.click();
        this.setStatus('💾 Đã lưu layout!');
    }

    loadLayout() {
        // Try localStorage first
        const saved = localStorage.getItem('pixelAgentLayout');
        if (saved) {
            this._applyLayout(JSON.parse(saved));
            this.setStatus('📂 Đã tải layout từ bộ nhớ!');
            return;
        }
        // File input fallback
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                this._applyLayout(JSON.parse(ev.target.result));
                this.setStatus('📂 Đã tải layout từ file!');
            };
            reader.readAsText(file);
        });
        input.click();
    }

    _applyLayout(data) {
        if (data.map) this.engine.map = data.map;
        if (data.furniture) this.engine.furniture = data.furniture;
        if (data.deskSlots) this.engine.deskSlots = data.deskSlots;
    }

    // === GHOST RENDER (called from engine render loop) ===
    drawGhost(ctx, scale, camera) {
        if (!this.active || !this.ghostPos || !this.selectedFurnitureType) return;
        const T = this.engine.T;
        const tx = Math.floor(this.ghostPos.x / T);
        const ty = Math.floor(this.ghostPos.y / T);
        const item = this.findCatalogItem(this.selectedFurnitureType);
        if (!item) return;
        const pw = (item.w || 1) * T, ph = (item.h || 1) * T;
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#4ecdc4';
        ctx.fillRect(
            tx * T * scale + camera.x,
            ty * T * scale + camera.y,
            pw * scale,
            ph * scale
        );
        ctx.strokeStyle = '#4ecdc4';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            tx * T * scale + camera.x,
            ty * T * scale + camera.y,
            pw * scale,
            ph * scale
        );
        ctx.globalAlpha = 1;
        // Item name
        ctx.fillStyle = '#e8eaf6';
        ctx.font = '8px "Press Start 2P"';
        ctx.fillText(item.name, tx * T * scale + camera.x + 4, ty * T * scale + camera.y - 4);
    }
}

window.LayoutEditor = LayoutEditor;
