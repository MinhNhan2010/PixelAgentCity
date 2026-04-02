/**
 * Pixel Engine v3 — Room-based office inspired by Pixel Agents extension.
 * Multi-room layout, distinct floor types, detailed sprites, grid overlay.
 */
class PixelEngine {
    constructor(canvasId, minimapId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.mmCanvas = document.getElementById(minimapId);
        this.mmCtx = this.mmCanvas.getContext('2d');
        this.T = 16; // tile size in world pixels
        this.scale = 2.5;
        this.MW = 32; this.MH = 24; // map tiles
        this.camera = { x: 0, y: 0 };
        this.drag = null;
        // DeltaTime system
        this.lastTime = 0;
        this.deltaTime = 1;
        this.elapsed = 0;
        this.map = [];
        this.furniture = [];
        this.deskSlots = [];
        this.agentSprites = new Map();
        this.hoveredAgent = null;
        this.selectedAgent = null;
        this.onAgentClick = null;
        this._clickPos = null;
        this.editMode = null; // for toolbar
        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        const vp = document.getElementById('officeViewport');
        // Mouse events
        vp.addEventListener('mousedown', e => { this.drag = { sx: e.clientX - this.camera.x, sy: e.clientY - this.camera.y }; this._clickPos = { x: e.clientX, y: e.clientY }; });
        vp.addEventListener('mousemove', e => {
            if (this.drag) { this.camera.x = e.clientX - this.drag.sx; this.camera.y = e.clientY - this.drag.sy; }
            const wx = (e.offsetX - this.camera.x) / this.scale, wy = (e.offsetY - this.camera.y) / this.scale;
            this.hoveredAgent = null;
            this.agentSprites.forEach(sp => { if (wx > sp.x - 4 && wx < sp.x + 16 && wy > sp.y - 8 && wy < sp.y + 20) this.hoveredAgent = sp.id; });
            this.canvas.style.cursor = this.hoveredAgent ? 'pointer' : this.drag ? 'grabbing' : 'grab';
        });
        vp.addEventListener('mouseup', e => {
            this.drag = null;
            if (this._clickPos && Math.abs(e.clientX - this._clickPos.x) < 4 && Math.abs(e.clientY - this._clickPos.y) < 4) {
                if (this.hoveredAgent) { this.selectedAgent = this.hoveredAgent; if (this.onAgentClick) this.onAgentClick(this.hoveredAgent); }
                else this.selectedAgent = null;
            }
        });
        vp.addEventListener('mouseleave', () => { this.drag = null; });
        vp.addEventListener('wheel', e => { e.preventDefault(); this.scale = Math.max(1, Math.min(5, this.scale + (e.deltaY > 0 ? -0.25 : 0.25))); });

        // Touch events for mobile
        this._touches = {};
        this._lastPinchDist = 0;
        vp.addEventListener('touchstart', e => {
            e.preventDefault();
            if (e.touches.length === 1) {
                const t = e.touches[0];
                const rect = vp.getBoundingClientRect();
                this.drag = { sx: t.clientX - this.camera.x, sy: t.clientY - this.camera.y };
                this._clickPos = { x: t.clientX, y: t.clientY };
            } else if (e.touches.length === 2) {
                this.drag = null;
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                this._lastPinchDist = Math.sqrt(dx*dx + dy*dy);
            }
        }, { passive: false });
        vp.addEventListener('touchmove', e => {
            e.preventDefault();
            if (e.touches.length === 1 && this.drag) {
                const t = e.touches[0];
                this.camera.x = t.clientX - this.drag.sx;
                this.camera.y = t.clientY - this.drag.sy;
            } else if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (this._lastPinchDist > 0) {
                    const delta = (dist - this._lastPinchDist) * 0.01;
                    this.scale = Math.max(1, Math.min(5, this.scale + delta));
                }
                this._lastPinchDist = dist;
            }
        }, { passive: false });
        vp.addEventListener('touchend', e => {
            if (e.changedTouches.length === 1 && this._clickPos) {
                const t = e.changedTouches[0];
                if (Math.abs(t.clientX - this._clickPos.x) < 10 && Math.abs(t.clientY - this._clickPos.y) < 10) {
                    const rect = vp.getBoundingClientRect();
                    const ox = t.clientX - rect.left;
                    const oy = t.clientY - rect.top;
                    const wx = (ox - this.camera.x) / this.scale;
                    const wy = (oy - this.camera.y) / this.scale;
                    this.hoveredAgent = null;
                    this.agentSprites.forEach(sp => {
                        if (wx > sp.x - 4 && wx < sp.x + 16 && wy > sp.y - 8 && wy < sp.y + 20) this.hoveredAgent = sp.id;
                    });
                    if (this.hoveredAgent) {
                        this.selectedAgent = this.hoveredAgent;
                        if (this.onAgentClick) this.onAgentClick(this.hoveredAgent);
                    } else {
                        this.selectedAgent = null;
                    }
                }
            }
            this.drag = null;
            this._lastPinchDist = 0;
        });

        this.buildMap();
        this.render(performance.now());
    }

    resize() { const vp = document.getElementById('officeViewport'); this.canvas.width = vp.clientWidth; this.canvas.height = vp.clientHeight; this.ctx.imageSmoothingEnabled = false; }

    // === MAP BUILDING ===
    buildMap() {
        const T = this.T;
        for (let y = 0; y < this.MH; y++) { this.map[y] = []; for (let x = 0; x < this.MW; x++) this.map[y][x] = null; }
        const rooms = [
            { x: 6, y: 1, w: 8, h: 6, f: 'wood' },     // meeting
            { x: 9, y: 7, w: 2, h: 3, f: 'wood' },      // corridor
            { x: 1, y: 10, w: 14, h: 12, f: 'wood' },   // office
            { x: 17, y: 1, w: 13, h: 10, f: 'tile' },   // kitchen
            { x: 17, y: 13, w: 13, h: 9, f: 'carpet' }, // lounge
            { x: 15, y: 4, w: 2, h: 2, f: 'wood' },     // corridor to kitchen
            { x: 15, y: 15, w: 2, h: 2, f: 'wood' },    // corridor to lounge
            { x: 17, y: 11, w: 3, h: 2, f: 'tile' },    // corridor kitchen-lounge
        ];
        rooms.forEach(r => { for (let dy = 0; dy < r.h; dy++) for (let dx = 0; dx < r.w; dx++) if (this.map[r.y + dy]) this.map[r.y + dy][r.x + dx] = r.f; });
        this.placeFurniture();
    }

    placeFurniture() {
        const T = this.T, f = this.furniture;
        // Meeting room: table + chairs + painting + plants
        f.push({ t: 'mtable', x: 8 * T, y: 2 * T, w: 4, h: 3 });
        f.push({ t: 'mchair', x: 8 * T, y: 1.5 * T, dir: 'down' }, { t: 'mchair', x: 10 * T, y: 1.5 * T, dir: 'down' });
        f.push({ t: 'mchair', x: 8 * T, y: 5 * T, dir: 'up' }, { t: 'mchair', x: 10 * T, y: 5 * T, dir: 'up' });
        f.push({ t: 'mchair', x: 7 * T, y: 3 * T, dir: 'right' }, { t: 'mchair', x: 12 * T, y: 3 * T, dir: 'left' });
        f.push({ t: 'painting', x: 9.5 * T, y: 1.1 * T });
        f.push({ t: 'plant', x: 6.3 * T, y: 1.3 * T }, { t: 'plant', x: 13 * T, y: 1.3 * T });
        // Office: desks (2 rows of 3), bookshelves, plants
        const deskPositions = [[2, 18], [6, 18], [10, 18], [2, 14], [6, 14], [10, 14]];
        deskPositions.forEach(([dx, dy]) => {
            f.push({ t: 'desk', x: dx * T, y: dy * T, slotIdx: this.deskSlots.length });
            this.deskSlots.push({ tx: dx, ty: dy, x: (dx + 0.5) * T, y: (dy + 0.5) * T, occupied: false, agentId: null });
        });
        f.push({ t: 'bookshelf', x: 2 * T, y: 10.3 * T }, { t: 'bookshelf', x: 5 * T, y: 10.3 * T }, { t: 'bookshelf', x: 8 * T, y: 10.3 * T });
        f.push({ t: 'plant', x: 1.3 * T, y: 12.5 * T }, { t: 'plant', x: 14 * T, y: 18 * T }, { t: 'plant', x: 1.3 * T, y: 20 * T });
        f.push({ t: 'boxes', x: 11.5 * T, y: 10.5 * T });
        // Kitchen: vending, coffee, clock, counter, fridge
        f.push({ t: 'vending', x: 18 * T, y: 1.3 * T }, { t: 'vending', x: 20 * T, y: 1.3 * T });
        f.push({ t: 'coffee', x: 22 * T, y: 1.3 * T });
        f.push({ t: 'clock', x: 24 * T, y: 1.5 * T });
        f.push({ t: 'counter', x: 25 * T, y: 1.3 * T, w: 4 });
        f.push({ t: 'fridge', x: 28 * T, y: 1.3 * T });
        f.push({ t: 'plant', x: 17.3 * T, y: 5 * T }, { t: 'plant', x: 29 * T, y: 9 * T });
        // Lounge: sofa, bookshelf, painting, desks, rug
        f.push({ t: 'sofa', x: 24 * T, y: 17 * T });
        f.push({ t: 'bookshelf', x: 28 * T, y: 13.3 * T });
        f.push({ t: 'painting', x: 20 * T, y: 13.2 * T });
        f.push({ t: 'plant', x: 17.3 * T, y: 20 * T }, { t: 'plant', x: 29 * T, y: 20 * T });
        // Lounge desks (3)
        const loungeDesks = [[18, 18], [22, 18], [18, 15]];
        loungeDesks.forEach(([dx, dy]) => {
            f.push({ t: 'desk', x: dx * T, y: dy * T, slotIdx: this.deskSlots.length });
            this.deskSlots.push({ tx: dx, ty: dy, x: (dx + 0.5) * T, y: (dy + 0.5) * T, occupied: false, agentId: null });
        });
        // Kitchen desks (2)
        const kitchenDesks = [[24, 6], [27, 6]];
        kitchenDesks.forEach(([dx, dy]) => {
            f.push({ t: 'desk', x: dx * T, y: dy * T, slotIdx: this.deskSlots.length });
            this.deskSlots.push({ tx: dx, ty: dy, x: (dx + 0.5) * T, y: (dy + 0.5) * T, occupied: false, agentId: null });
        });

        // === INTERACTION POINTS ===
        this.interactionPoints = [
            { id: 'coffee1', type: 'coffee', tx: 22, ty: 2, emoji: '☕', label: 'Máy cà phê', effect: 'energy' },
            { id: 'vending1', type: 'vending', tx: 18, ty: 2, emoji: '🥤', label: 'Máy bán nước', effect: 'energy' },
            { id: 'vending2', type: 'vending', tx: 20, ty: 2, emoji: '🍫', label: 'Máy bán đồ ăn', effect: 'mood' },
            { id: 'fridge1', type: 'fridge', tx: 28, ty: 2, emoji: '🍽️', label: 'Tủ lạnh', effect: 'energy' },
            { id: 'sofa1', type: 'sofa', tx: 24, ty: 18, emoji: '😴', label: 'Sofa', effect: 'rest' },
            { id: 'bookshelf1', type: 'bookshelf', tx: 2, ty: 11, emoji: '📖', label: 'Kệ sách', effect: 'xp' },
            { id: 'bookshelf2', type: 'bookshelf', tx: 5, ty: 11, emoji: '📚', label: 'Kệ sách', effect: 'xp' },
            { id: 'bookshelf3', type: 'bookshelf', tx: 8, ty: 11, emoji: '🧠', label: 'Kệ sách', effect: 'xp' },
            { id: 'bookshelfL', type: 'bookshelf', tx: 28, ty: 14, emoji: '📖', label: 'Kệ sách lounge', effect: 'xp' },
            { id: 'plant1', type: 'plant', tx: 6, ty: 2, emoji: '🌿', label: 'Cây xanh', effect: 'mood' },
            { id: 'plant2', type: 'plant', tx: 13, ty: 2, emoji: '🌱', label: 'Cây xanh', effect: 'mood' },
            { id: 'painting1', type: 'painting', tx: 9, ty: 2, emoji: '🎨', label: 'Tranh', effect: 'mood' },
            { id: 'paintingL', type: 'painting', tx: 20, ty: 14, emoji: '🖼️', label: 'Tranh lounge', effect: 'mood' },
            { id: 'counter1', type: 'counter', tx: 26, ty: 2, emoji: '🍳', label: 'Quầy bếp', effect: 'energy' },
        ];

        // Active interaction animations
        this.interactionFx = []; // { x, y, emoji, life, maxLife }
    }

    // === DRAWING HELPERS ===
    px(x, y, w, h, c) { this.ctx.fillStyle = c; this.ctx.fillRect(Math.floor(x * this.scale + this.camera.x), Math.floor(y * this.scale + this.camera.y), Math.ceil(w * this.scale), Math.ceil(h * this.scale)); }
    li(hex, a) { const n = parseInt(hex.replace('#', ''), 16); return '#' + (1 << 24 | Math.min(255, (n >> 16) + a) << 16 | Math.min(255, ((n >> 8) & 0xff) + a) << 8 | Math.min(255, (n & 0xff) + a)).toString(16).slice(1); }
    dk(hex, a) { return this.li(hex, -a); }

    // === FLOORS ===
    drawFloors() {
        const T = this.T;
        for (let y = 0; y < this.MH; y++) for (let x = 0; x < this.MW; x++) {
            const fl = this.map[y][x];
            const px = x * T, py = y * T;
            if (fl === 'wood') {
                this.px(px, py, T, T, (x + y) % 2 === 0 ? '#a0794a' : '#8c6838');
                for (let i = 0; i < 3; i++) this.px(px, py + i * 5 + 3, T, 1, 'rgba(0,0,0,0.06)');
                this.px(px + (x * 7 + y * 3) % 11, py + (x * 3 + y * 5) % 9, 2, 1, 'rgba(0,0,0,0.04)');
            } else if (fl === 'tile') {
                this.px(px, py, T, T, (x + y) % 2 === 0 ? '#e8e0d0' : '#ddd5c5');
                this.px(px, py, T, 1, 'rgba(0,0,0,0.04)');
                this.px(px, py, 1, T, 'rgba(0,0,0,0.04)');
            } else if (fl === 'carpet') {
                this.px(px, py, T, T, (x + y) % 2 === 0 ? '#4a6a8a' : '#456585');
                if ((x + y * 3) % 7 === 0) this.px(px + 4, py + 4, 2, 2, 'rgba(255,255,255,0.02)');
            }
        }
    }

    drawGrid() {
        const T = this.T;
        for (let y = 0; y < this.MH; y++) for (let x = 0; x < this.MW; x++) {
            if (!this.map[y][x]) {
                this.px(x * T, y * T, T, T, '#12151e');
                this.px(x * T, y * T, T, 1, 'rgba(78,205,196,0.04)');
                this.px(x * T, y * T, 1, T, 'rgba(78,205,196,0.04)');
            }
        }
    }

    drawWalls() {
        const T = this.T, map = this.map;
        for (let y = 0; y < this.MH; y++) for (let x = 0; x < this.MW; x++) {
            if (!map[y][x]) continue;
            const hasFloor = (tx, ty) => tx >= 0 && ty >= 0 && tx < this.MW && ty < this.MH && map[ty][tx];
            if (!hasFloor(x, y - 1)) { this.px(x * T, y * T - 3, T, 6, '#1e2638'); this.px(x * T, y * T + 2, T, 1, '#2a3550'); }
            if (!hasFloor(x, y + 1)) { this.px(x * T, (y + 1) * T - 2, T, 5, '#1e2638'); this.px(x * T, (y + 1) * T - 2, T, 1, '#2a3550'); }
            if (!hasFloor(x - 1, y)) { this.px(x * T - 2, y * T, 5, T, '#1e2638'); this.px(x * T + 2, y * T, 1, T, '#2a3550'); }
            if (!hasFloor(x + 1, y)) { this.px((x + 1) * T - 2, y * T, 5, T, '#1e2638'); this.px((x + 1) * T - 2, y * T, 1, T, '#2a3550'); }
        }
    }

    // === FURNITURE ===
    drawFurn(f) {
        const T = this.T, x = f.x, y = f.y;
        switch (f.t) {
            case 'desk': this.drawDesk(f); break;
            case 'bookshelf': this.drawBookshelf(x, y); break;
            case 'plant': this.drawPlant(x, y); break;
            case 'mtable': this.drawMtable(x, y); break;
            case 'mchair': case 'chair': this.drawMchair(x, y, f.dir); break;
            case 'painting': this.drawPainting(x, y); break;
            case 'sofa': this.drawSofa(x, y); break;
            case 'vending': this.drawVending(x, y); break;
            case 'coffee': this.drawCoffee(x, y); break;
            case 'clock': this.drawClock(x, y); break;
            case 'table_small': this.drawTableSmall(x, y); break;
            case 'table_low': this.drawTableLow(x, y); break;
            case 'armchair': this.drawArmchair(x, y); break;
            case 'bed_single': this.drawBedSingle(x, y); break;
            case 'bed_double': this.drawBedDouble(x, y); break;
            case 'rug': this.drawRug(x, y); break;
            case 'pillow': this.drawPillow(x, y); break;
            case 'cabinet': this.drawCabinet(x, y); break;
            case 'shelf': this.drawShelf(x, y); break;
            case 'boxes': this.drawBoxes(x, y); break;
            case 'fridge': this.drawFridge(x, y); break;
            case 'counter': this.drawCounter(x, y, f.w || 3); break;
            case 'cactus': this.drawCactus(x, y); break;
            case 'lamp': this.drawLamp(x, y); break;
            case 'pictureframe': this.drawPictureFrame(x, y); break;
        }
    }

    drawDesk(f) {
        const x = f.x, y = f.y, T = this.T;
        // Legs
        this.px(x + 1, y + T + 4, 2, 8, '#5d3a1a');
        this.px(x + T * 2 - 3, y + T + 4, 2, 8, '#5d3a1a');
        // Surface
        this.px(x, y + T * 0.4, T * 2, T * 0.7, '#8B6914');
        this.px(x + 1, y + T * 0.45, T * 2 - 2, T * 0.6, '#a07828');
        this.px(x, y + T * 0.4, T * 2, 1, '#c4a035');
        // Monitor
        this.px(x + T * 0.55, y + T * 0.1, T * 0.9, T * 0.35, '#1a1a2e');
        this.px(x + T * 0.6, y + T * 0.12, T * 0.8, T * 0.28, '#0a2a25');
        this.px(x + T * 0.7, y + T * 0.35, T * 0.16, T * 0.08, '#333');
        this.px(x + T * 0.45, y + T * 0.4, T * 0.65, 1, '#333');
        // Screen code
        const slot = this.deskSlots[f.slotIdx];
        if (slot?.occupied) {
            const sp = this.agentSprites.get(slot.agentId);
            if (sp?.status === 'working' || sp?.status === 'thinking') {
                for (let i = 0; i < 3; i++) {
                    const lw = 3 + Math.sin(this.elapsed * 0.04 + i) * 3;
                    this.px(x + T * 0.65, y + T * 0.16 + i * 2.5, Math.max(2, lw), 1, ['#4ecdc4', '#78e08f', '#ffd93d'][i]);
                }
            }
        }
        // Keyboard + mouse
        this.px(x + T * 0.2, y + T * 0.7, T * 0.55, 2, '#2a2a3a');
        this.px(x + T * 0.25, y + T * 0.72, T * 0.45, 1, '#3a3a4a');
        this.px(x + T * 0.85, y + T * 0.72, 3, 3, '#3a3a4a');
    }

    drawBookshelf(x, y) {
        const T = this.T;
        this.px(x, y, T * 2.5, T * 1.8, '#5c3d2e');
        this.px(x + 1, y + 1, T * 2.5 - 2, T * 0.4, '#4a3020');
        const bookColors = ['#e74c3c', '#3498db', '#f39c12', '#27ae60', '#9b59b6', '#e67e22', '#1abc9c', '#e84393'];
        for (let row = 0; row < 3; row++) {
            const ry = y + 2 + row * T * 0.55;
            this.px(x + 1, ry + T * 0.4, T * 2.5 - 2, 1, '#4a3020');
            for (let b = 0; b < 6; b++) {
                const bx = x + 2 + b * (T * 0.4);
                const bh = T * 0.3 + Math.sin(b + row) * 2;
                this.px(bx, ry + T * 0.4 - bh, T * 0.35, bh, bookColors[(b + row * 3) % 8]);
            }
        }
    }

    drawPlant(x, y) {
        const T = this.T, sw = Math.sin(this.elapsed * 0.015 + x) * 0.7;
        this.px(x + 3, y + T - 6, 9, 6, '#8B5E3C');
        this.px(x + 4, y + T - 6, 7, 1, '#a0714a');
        this.px(x + 6, y + T * 0.3, 2, T * 0.35, '#1a5e1a');
        this.px(x + 2 + sw, y + T * 0.05, 10, 7, '#228B22');
        this.px(x + 4 + sw, y - 2, 6, 4, '#2ecc71');
        this.px(x + sw, y + T * 0.15, 4, 4, '#27ae60');
        this.px(x + 10 + sw, y + T * 0.1, 4, 4, '#20a34a');
    }

    drawMtable(x, y) {
        const T = this.T;
        this.px(x + 2, y + T * 2.5, 3, T * 0.5, '#5c3d2e');
        this.px(x + T * 4 - 5, y + T * 2.5, 3, T * 0.5, '#5c3d2e');
        this.px(x, y, T * 4, T * 2.5, '#6b4f3a');
        this.px(x + 1, y + 1, T * 4 - 2, T * 2.5 - 2, '#7d5e47');
        this.px(x, y, T * 4, 2, '#9b7a56');
        this.px(x + T * 1.5, y + T * 0.8, T, T * 0.8, '#555');
        this.px(x + T * 1.55, y + T * 0.85, T - 2, T * 0.7, '#444');
    }

    drawMchair(x, y, dir) {
        const c = '#2e7d32', s = '#1b5e20';
        if (dir === 'down') { this.px(x + 1, y, 12, 10, c); this.px(x + 2, y + 1, 10, 8, '#388e3c'); this.px(x + 1, y, 12, 2, s); }
        else if (dir === 'up') { this.px(x + 1, y, 12, 10, c); this.px(x + 2, y + 1, 10, 8, '#388e3c'); this.px(x + 1, y + 8, 12, 2, s); }
        else if (dir === 'right') { this.px(x, y + 1, 10, 12, c); this.px(x + 1, y + 2, 8, 10, '#388e3c'); this.px(x, y + 1, 2, 12, s); }
        else { this.px(x, y + 1, 10, 12, c); this.px(x + 1, y + 2, 8, 10, '#388e3c'); this.px(x + 8, y + 1, 2, 12, s); }
    }

    drawPainting(x, y) {
        this.px(x, y, 24, 16, '#5c3d2e');
        this.px(x + 2, y + 2, 20, 12, '#87CEEB');
        this.px(x + 2, y + 10, 20, 4, '#228B22');
        this.px(x + 6, y + 4, 4, 3, '#f1c40f');
        this.px(x + 14, y + 5, 6, 9, '#1a5e1a');
    }

    drawSofa(x, y) {
        const T = this.T;
        this.px(x, y, T * 3, T * 1.5, '#c0576f');
        this.px(x + 2, y + 2, T * 3 - 4, T * 1, '#d4748a');
        this.px(x, y, 4, T * 1.5, '#a84860');
        this.px(x + T * 3 - 4, y, 4, T * 1.5, '#a84860');
        this.px(x, y, T * 3, 3, '#8c3a52');
        this.px(x + T * 0.4, y + T * 0.3, T * 0.8, T * 0.6, '#d98098');
        this.px(x + T * 1.3, y + T * 0.3, T * 0.8, T * 0.6, '#d98098');
    }

    drawVending(x, y) {
        const T = this.T;
        this.px(x, y, T, T * 2, '#2c3e50');
        this.px(x + 1, y + 1, T - 2, T - 2, '#34495e');
        this.px(x + 2, y + 2, T - 4, T * 0.5, '#1abc9c');
        this.px(x + 2, y + T * 0.7, T - 4, 2, '#e74c3c');
        this.px(x + 2, y + T * 0.9, T - 4, 2, '#f39c12');
        this.px(x + 2, y + T * 1.1, T - 4, 2, '#3498db');
        this.px(x + T * 0.5, y + T * 1.5, 4, 3, '#111');
    }

    drawCoffee(x, y) {
        const T = this.T;
        this.px(x, y, T, T * 1.6, '#4a4a5a');
        this.px(x + 1, y + 1, T - 2, T * 0.6, '#333');
        this.px(x + 3, y + T * 0.5, T * 0.4, 3, '#e74c3c');
        if (Math.sin(this.elapsed * 0.06) > 0) this.px(x + 4, y - 2, 1, 3, 'rgba(200,200,200,0.3)');
        this.px(x + T * 0.5, y + T, 5, 5, '#f0f0f0');
        this.px(x + T * 0.35, y + T, 3, 1, '#8b6914');
    }

    drawTableSmall(x, y) {
        const T = this.T;
        this.px(x+2, y+T*1.2, 2, T*0.3, '#5c3d2e');
        this.px(x+T*1.5-4, y+T*1.2, 2, T*0.3, '#5c3d2e');
        this.px(x, y, T*1.5, T*1.2, '#6b4f3a');
        this.px(x+1, y+1, T*1.5-2, T*1.2-2, '#7d5e47');
        this.px(x, y, T*1.5, 2, '#9b7a56');
    }

    drawTableLow(x, y) {
        const T = this.T;
        this.px(x, y+T*1.2, 2, 2, '#5c3d2e');
        this.px(x+T*2-2, y+T*1.2, 2, 2, '#5c3d2e');
        this.px(x, y, T*2, T*1.2, '#cc8e60');
        this.px(x+1, y+1, T*2-2, T*1.2-2, '#de9b6b');
        this.px(x, y, T*2, 2, '#e8ab7d');
    }

    drawArmchair(x, y) {
        const T = this.T;
        this.px(x, y, T*1.5, T*1.5, '#f3a647');
        this.px(x+2, y+2, T*1.5-4, T*1, '#fbc371');
        this.px(x, y, 3, T*1.5, '#df8f32');
        this.px(x+T*1.5-3, y, 3, T*1.5, '#df8f32');
        this.px(x, y, T*1.5, 3, '#c97d26');
        this.px(x+T*0.5, y+T*0.3, T*0.5, T*0.5, '#85c1e9');
    }

    drawBedSingle(x, y) {
        const T = this.T;
        this.px(x, y, T*2, 4, '#8c6838');
        this.px(x, y+T*3-2, T*2, 2, '#8c6838');
        this.px(x+2, y+4, T*2-4, T*0.8, '#fff');
        this.px(x+2, y+T*1.1, T*2-4, T*1.8, '#85c1e9');
    }

    drawBedDouble(x, y) {
        const T = this.T;
        this.px(x, y, T*3, 4, '#8c6838');
        this.px(x, y+T*3-2, T*3, 2, '#8c6838');
        this.px(x+2, y+4, T*1.2, T*0.8, '#fff');
        this.px(x+T*1.6, y+4, T*1.2, T*0.8, '#fff');
        this.px(x+2, y+T*1.1, T*3-4, T*1.8, '#85c1e9');
    }

    drawRug(x, y) {
        const T = this.T;
        this.px(x, y, T*3, T*2, '#85c1e9');
        this.px(x+2, y+2, T*3-4, T*2-4, '#aed6f1');
    }

    drawPillow(x, y) {
        this.px(x, y, this.T*0.5, this.T*0.5, '#85c1e9');
    }

    drawCabinet(x, y) {
        const T = this.T;
        this.px(x, y, T*2, T*1.8, '#c38755');
        this.px(x+1, y+1, T-2, T*1.8-2, '#d69762');
        this.px(x+T+1, y+1, T-2, T*1.8-2, '#d69762');
        this.px(x+T-4, y+T*0.8, 2, T*0.4, '#a36d40');
        this.px(x+T+2, y+T*0.8, 2, T*0.4, '#a36d40');
    }

    drawShelf(x, y) {
        this.px(x, y, this.T*2, this.T*0.8, '#a36d40');
        this.px(x, y, this.T*2, 2, '#8c5931');
    }

    // drawBoxes, drawFridge, drawCounter — defined below (improved versions)

    drawCactus(x, y) {
        const T = this.T;
        this.px(x+3, y+T-4, 6, 4, '#e67e22');
        this.px(x+4, y+2, 4, T-4, '#27ae60');
        this.px(x+2, y+6, 2, 4, '#2ecc71');
        this.px(x+8, y+8, 2, 6, '#2ecc71');
    }

    drawLamp(x, y) {
        const T = this.T;
        this.px(x+T*0.4, y+T-2, 4, T+2, '#7f8c8d');
        this.px(x+T*0.3, y+T*2-2, 8, 2, '#95a5a6');
        this.px(x+2, y, T-4, T, '#f1c40f');
        if (Math.sin(this.elapsed*0.05)>0) {
            this.ctx.globalAlpha = 0.2;
            this.px(x-T, y+T, T*3, T*3, '#f1c40f');
            this.ctx.globalAlpha = 1;
        }
    }

    drawPictureFrame(x, y) {
        this.px(x, y, 8, 12, '#a36d40');
        this.px(x+1, y+1, 6, 10, '#ecf0f1');
        this.px(x+2, y+2, 4, 3, '#3498db');
        this.px(x+2, y+5, 4, 6, '#2ecc71');
    }

    drawClock(x, y) {
        this.px(x + 2, y + 2, 10, 10, '#2c3e50');
        this.px(x + 3, y + 3, 8, 8, '#ecf0f1');
        const a = (this.elapsed * 0.015) % (Math.PI * 2);
        this.px(x + 7 + Math.cos(a) * 2.5, y + 7 + Math.sin(a) * 2.5, 1, 1, '#e74c3c');
        this.px(x + 7, y + 5, 1, 2, '#2c3e50');
        this.px(x + 7, y + 7, 1, 1, '#2c3e50');
    }

    drawCounter(x, y, w) {
        const T = this.T;
        this.px(x, y, T * w, T * 1.5, '#bdc3c7');
        this.px(x + 1, y + 1, T * w - 2, T * 0.4, '#ecf0f1');
        this.px(x, y, T * w, 2, '#95a5a6');
    }

    drawFridge(x, y) {
        const T = this.T;
        this.px(x, y, T, T * 2, '#d5d5d5');
        this.px(x + 1, y + 1, T - 2, T - 2, '#e8e8e8');
        this.px(x + 1, y + T + 1, T - 2, T - 3, '#e0e0e0');
        this.px(x + T - 3, y + 3, 1, T * 0.5, '#999');
        this.px(x + T - 3, y + T + 2, 1, T * 0.4, '#999');
        this.px(x, y + T - 1, T, 2, '#bbb');
    }

    drawBoxes(x, y) {
        this.px(x, y + 4, 14, 10, '#c0813e');
        this.px(x + 1, y + 5, 12, 8, '#d4954e');
        this.px(x + 3, y, 12, 12, '#a06828');
        this.px(x + 4, y + 1, 10, 10, '#b87a38');
        this.px(x + 8, y + 1, 1, 10, '#8b5a1a');
        this.px(x + 3, y + 5, 12, 1, '#8b5a1a');
    }

    // === CHARACTERS ===
    drawCharSitting(sp, deskX, deskY) {
        const T = this.T, x = deskX + T * 0.3, y = deskY - T * 0.6;
        const col = sp.color, skin = '#e8bc8a';
        // Chair back
        this.px(x - 1, y + 2, T * 0.75 + 2, T * 0.6, '#2a2a3e');
        // Hair
        this.px(x + 1, y - 2, T * 0.5, 4, sp.hairColor);
        this.px(x, y, T * 0.6, 3, sp.hairColor);
        // Head
        this.px(x + 1, y + 2, T * 0.5, 5, skin);
        // Eyes
        if (!sp.blink) { this.px(x + 2, y + 3, 2, 2, '#fff'); this.px(x + T * 0.35, y + 3, 2, 2, '#fff'); this.px(x + 2.5, y + 4, 1, 1, '#111'); this.px(x + T * 0.4, y + 4, 1, 1, '#111'); }
        else { this.px(x + 2, y + 4.5, 2, 1, '#333'); this.px(x + T * 0.35, y + 4.5, 2, 1, '#333'); }
        // Body
        this.px(x, y + 7, T * 0.6, 6, col);
        this.px(x + T * 0.25, y + 7.5, 1, 4, this.dk(col, 20));
        // Arms typing
        const armUp = (Math.floor(this.elapsed) % 10 < 5) && (sp.status === 'working');
        this.px(x - 2, y + 8 + (armUp ? -0.5 : 0.5), 2, 4, this.dk(col, 15));
        this.px(x + T * 0.6, y + 8 + (armUp ? 0.5 : -0.5), 2, 4, this.dk(col, 15));
    }

    drawCharWalking(sp) {
        const T = this.T, x = sp.x, y = sp.y;
        const col = sp.color, skin = '#e8bc8a';
        const bob = sp.isWalking ? Math.abs(Math.sin(this.elapsed * 0.2)) * 1.5 : 0;
        const yy = y - bob;
        // Shadow
        this.ctx.globalAlpha = 0.2; this.px(x - 1, y + 16, 14, 3, '#000'); this.ctx.globalAlpha = 1;
        // Legs
        if (sp.isWalking) {
            const ls = Math.sin(this.elapsed * 0.2) * 3;
            this.px(x + 2, yy + 13 + ls * 0.3, 3, 5 - ls * 0.2, '#2d3748');
            this.px(x + 7, yy + 13 - ls * 0.3, 3, 5 + ls * 0.2, '#2d3748');
        } else { this.px(x + 2, yy + 13, 3, 5, '#2d3748'); this.px(x + 7, yy + 13, 3, 5, '#2d3748'); }
        // Body
        this.px(x + 1, yy + 7, 10, 7, col);
        this.px(x + 5, yy + 7.5, 1, 5, this.dk(col, 15));
        // Arms
        if (sp.isWalking) {
            const as = Math.sin(this.elapsed * 0.2) * 2;
            this.px(x - 1, yy + 8 + as, 2, 5, this.dk(col, 15));
            this.px(x + 11, yy + 8 - as, 2, 5, this.dk(col, 15));
        } else { this.px(x - 1, yy + 9, 2, 5, this.dk(col, 15)); this.px(x + 11, yy + 9, 2, 5, this.dk(col, 15)); }
        // Head
        this.px(x + 1, yy + 2, 10, 6, skin);
        // Hair
        this.px(x, yy - 1, 12, 4, sp.hairColor);
        this.px(x + 1, yy - 2, 10, 3, sp.hairColor);
        // Eyes
        sp.blinkT -= this.deltaTime; if (sp.blinkT <= 0) { sp.blink = true; if (sp.blinkT <= -3) { sp.blink = false; sp.blinkT = 60 + Math.random() * 120; } }
        if (!sp.blink) { this.px(x + 3, yy + 3, 2, 2, '#fff'); this.px(x + 7, yy + 3, 2, 2, '#fff'); this.px(x + 3.5, yy + 4, 1, 1, '#111'); this.px(x + 7.5, yy + 4, 1, 1, '#111'); }
        else { this.px(x + 3, yy + 4.5, 2, 1, '#333'); this.px(x + 7, yy + 4.5, 2, 1, '#333'); }
    }

    drawOverlays(sp) {
        const x = sp.isWalking || !sp.desk ? sp.x : (sp.desk.tx + 0.3) * this.T;
        const y = sp.isWalking || !sp.desk ? sp.y : (sp.desk.ty - 0.6) * this.T;
        // Status dot
        const cols = { idle: '#ffd93d', working: '#78e08f', thinking: '#6c5ce7', error: '#ff6b6b' };
        const sc = cols[sp.status] || '#ffd93d';
        const fy = y - 7 + Math.sin(this.elapsed * 0.06) * 1.5;
        this.px(x + 3, fy, 5, 5, sc);
        if (sp.status === 'working') { this.ctx.globalAlpha = 0.25 + Math.sin(this.elapsed * 0.1) * 0.15; this.px(x + 1, fy - 2, 9, 9, sc); this.ctx.globalAlpha = 1; }
        // Selection ring
        if (sp.id === this.selectedAgent || sp.id === this.hoveredAgent) {
            this.ctx.globalAlpha = sp.id === this.selectedAgent ? 0.4 : 0.2;
            this.px(x - 3, y + 16, 18, 2, sp.color);
            this.ctx.globalAlpha = 1;
        }
        // Name on hover
        if (sp.id === this.hoveredAgent || sp.id === this.selectedAgent) {
            const nx = x * this.scale + this.camera.x - 6, ny = (y + 20) * this.scale + this.camera.y;
            this.ctx.fillStyle = 'rgba(0,0,0,0.75)';
            this.ctx.fillRect(nx, ny, sp.name.length * 4.5 + 8, 12);
            this.ctx.fillStyle = '#e8eaf6';
            this.ctx.font = `8px "Press Start 2P"`;
            this.ctx.fillText(sp.name, nx + 4, ny + 9);
        }
        // Speech bubble
        if (sp.speech && sp.speechT > 0) {
            sp.speechT -= this.deltaTime;
            const bx = x - 6, by = y - 22, bw = Math.min(sp.speech.length * 3.5 + 12, 80);
            this.px(bx, by, bw, 11, '#151d30');
            this.px(bx, by, bw, 1, '#4ecdc4');
            this.px(bx, by + 10, bw, 1, '#4ecdc4');
            this.px(bx, by, 1, 11, '#4ecdc4');
            this.px(bx + bw - 1, by, 1, 11, '#4ecdc4');
            this.px(bx + 5, by + 11, 2, 2, '#4ecdc4');
            this.ctx.fillStyle = '#e8eaf6';
            this.ctx.font = `${Math.max(4, 5 * this.scale * 0.6)}px "Press Start 2P"`;
            const txt = sp.speech.length > 16 ? sp.speech.substring(0, 16) + '..' : sp.speech;
            this.ctx.fillText(txt, (bx + 4) * this.scale + this.camera.x, (by + 7.5) * this.scale + this.camera.y);
            if (sp.speechT <= 0) sp.speech = null;
        }
    }

    // === AGENT PATHFINDING (A*) ===
    findPath(startX, startY, endX, endY) {
        const heuristic = (x1, y1, x2, y2) => Math.abs(x1 - x2) + Math.abs(y1 - y2);
        const open = [{ x: startX, y: startY, g: 0, f: heuristic(startX, startY, endX, endY), parent: null }];
        const closed = new Set();
        const getCost = (x, y) => {
            if (x < 0 || y < 0 || x >= this.MW || y >= this.MH) return Infinity; // out of bounds
            if (!this.map[y][x]) return Infinity; // wall/null map
            return 1;
        };
        
        // Safety bail-out for disconnected areas
        let iterations = 0;
        
        while (open.length > 0 && iterations < 1000) {
            iterations++;
            open.sort((a, b) => a.f - b.f);
            const current = open.shift();
            const key = `${current.x},${current.y}`;
            
            if (current.x === endX && current.y === endY) {
                const path = [];
                let curr = current;
                while (curr) { path.unshift({ x: curr.x, y: curr.y }); curr = curr.parent; }
                return path;
            }
            
            closed.add(key);
            const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
            for (let [dx, dy] of dirs) {
                const nx = current.x + dx, ny = current.y + dy;
                const nKey = `${nx},${ny}`;
                if (closed.has(nKey)) continue;
                
                const cost = getCost(nx, ny);
                if (cost === Infinity) continue;
                
                const g = current.g + cost;
                const existing = open.find(n => n.x === nx && n.y === ny);
                if (!existing) {
                    open.push({ x: nx, y: ny, g, f: g + heuristic(nx, ny, endX, endY), parent: current });
                } else if (g < existing.g) {
                    existing.g = g;
                    existing.f = g + heuristic(nx, ny, endX, endY);
                    existing.parent = current;
                }
            }
        }
        return []; // No path found or too complex
    }

    // === AGENT API ===
    addAgentSprite(agent) {
        const slot = this.deskSlots.find(s => !s.occupied);
        if (slot) { slot.occupied = true; slot.agentId = agent.id; }
        const hairs = ['#3a2820', '#1a1a1a', '#8b4513', '#c0392b', '#2c3e50', '#d4a017'];
        const doorT = this.T;
        
        let startTx = 1, startTy = 10;
        let pTargetX = slot ? (slot.tx + 0.5) * doorT : 5 * doorT;
        let pTargetY = slot ? (slot.ty + 1) * doorT : 5 * doorT;
        let targetTx = Math.floor(pTargetX / doorT);
        let targetTy = Math.floor(pTargetY / doorT);
        
        let path = this.findPath(startTx, startTy, targetTx, targetTy);

        this.agentSprites.set(agent.id, {
            id: agent.id, name: agent.name, color: agent.color, role: agent.role, status: 'idle',
            desk: slot, hairColor: hairs[Math.floor(Math.random() * hairs.length)],
            x: startTx * doorT + doorT/2, y: startTy * doorT + doorT/2,
            targetX: pTargetX,
            targetY: pTargetY,
            path: path,
            pathIndex: 0,
            isWalking: true, blink: false, blinkT: 60 + Math.random() * 120,
            speech: null, speechT: 0,
        });
    }

    removeAgentSprite(id) {
        const sp = this.agentSprites.get(id);
        if (sp?.desk) { sp.desk.occupied = false; sp.desk.agentId = null; }
        this.agentSprites.delete(id);
    }
    updateAgentStatus(id, s) { const sp = this.agentSprites.get(id); if (sp) sp.status = s; }
    showSpeechBubble(id, msg, dur = 3000) { const sp = this.agentSprites.get(id); if (sp) { sp.speech = msg; sp.speechT = dur / 16; } }

    // === SEND AGENT TO INTERACTION POINT ===
    sendAgentTo(agentId, targetTx, targetTy, onArrive = null) {
        const sp = this.agentSprites.get(agentId);
        if (!sp || sp.isWalking) return false;

        // Release desk if sitting
        if (sp.desk) {
            sp.desk.occupied = false;
            sp.desk.agentId = null;
        }

        const startTx = Math.floor(sp.x / this.T);
        const startTy = Math.floor(sp.y / this.T);
        const path = this.findPath(startTx, startTy, targetTx, targetTy);

        if (path.length === 0) return false;

        sp.targetX = (targetTx + 0.5) * this.T;
        sp.targetY = (targetTy + 0.5) * this.T;
        sp.path = path;
        sp.pathIndex = 0;
        sp.isWalking = true;
        sp.isRoaming = true;
        sp.onArrive = onArrive;
        sp.roamTarget = { tx: targetTx, ty: targetTy };
        return true;
    }

    // Send agent back to their desk
    sendAgentToDesk(agentId) {
        const sp = this.agentSprites.get(agentId);
        if (!sp) return;

        // Find an available desk
        let slot = this.deskSlots.find(s => s.agentId === agentId);
        if (!slot) slot = this.deskSlots.find(s => !s.occupied);
        if (!slot) return;

        slot.occupied = true;
        slot.agentId = agentId;
        sp.desk = slot;

        const startTx = Math.floor(sp.x / this.T);
        const startTy = Math.floor(sp.y / this.T);
        const path = this.findPath(startTx, startTy, slot.tx, slot.ty);

        sp.targetX = slot.x;
        sp.targetY = slot.y;
        sp.path = path;
        sp.pathIndex = 0;
        sp.isWalking = true;
        sp.isRoaming = false;
        sp.onArrive = null;
    }

    // Spawn interaction FX
    spawnInteractionFx(tx, ty, emoji) {
        this.interactionFx.push({
            x: (tx + 0.5) * this.T,
            y: ty * this.T - 4,
            emoji: emoji,
            life: 60,
            maxLife: 60,
        });
    }

    getRandomInteraction() {
        if (!this.interactionPoints?.length) return null;
        return this.interactionPoints[Math.floor(Math.random() * this.interactionPoints.length)];
    }

    // === MINIMAP ===
    drawMinimap() {
        const c = this.mmCtx, mw = this.mmCanvas.width, mh = this.mmCanvas.height;
        const sx = mw / (this.MW * this.T), sy = mh / (this.MH * this.T);
        c.fillStyle = '#0a0e1a'; c.fillRect(0, 0, mw, mh);
        const floorCols = { wood: '#8c6838', tile: '#d5d0c0', carpet: '#456585' };
        for (let y = 0; y < this.MH; y++) for (let x = 0; x < this.MW; x++) {
            if (this.map[y][x]) { c.fillStyle = floorCols[this.map[y][x]]; c.fillRect(x * this.T * sx, y * this.T * sy, this.T * sx + 1, this.T * sy + 1); }
        }
        this.agentSprites.forEach(sp => { c.fillStyle = sp.color; c.fillRect(sp.x * sx, sp.y * sy, 4, 4); });
        c.strokeStyle = '#4ecdc4'; c.lineWidth = 1;
        c.strokeRect(-this.camera.x / this.scale * sx, -this.camera.y / this.scale * sy, this.canvas.width / this.scale * sx, this.canvas.height / this.scale * sy);
    }

    // === RENDER LOOP ===
    render(timestamp) {
        // DeltaTime calculation (normalized to 60fps: 1.0 = 16.67ms)
        if (!timestamp) timestamp = performance.now();
        const rawDelta = timestamp - this.lastTime;
        this.deltaTime = Math.min(rawDelta / 16.67, 3); // cap at 3x to prevent teleporting
        this.lastTime = timestamp;
        this.elapsed += this.deltaTime;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#0d1117';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawGrid();
        this.drawFloors();
        this.drawWalls();

        // Walk agents toward targets (speed normalized with deltaTime)
        const moveSpeed = 0.5 * this.deltaTime;
        this.agentSprites.forEach(sp => {
            if (sp.isWalking) {
                let ptx = sp.targetX;
                let pty = sp.targetY;
                if (sp.path && sp.pathIndex < sp.path.length) {
                    const node = sp.path[sp.pathIndex];
                    ptx = (node.x + 0.5) * this.T;
                    pty = (node.y + 0.5) * this.T;
                }
                
                const dx = ptx - sp.x, dy = pty - sp.y, d = Math.sqrt(dx * dx + dy * dy);
                if (d > 1) { 
                    sp.x += dx / d * moveSpeed; 
                    sp.y += dy / d * moveSpeed; 
                } else { 
                    sp.x = ptx; 
                    sp.y = pty;
                    if (sp.path && sp.pathIndex < sp.path.length) {
                        sp.pathIndex++;
                    } else {
                        sp.isWalking = false; 
                        sp.x = sp.targetX; 
                        sp.y = sp.targetY;
                        // Callback on arrival (for roaming / interaction)
                        if (sp.onArrive) {
                            const cb = sp.onArrive;
                            sp.onArrive = null;
                            cb(sp);
                        }
                    }
                }
            }
        });

        // Collect renderables sorted by Y
        const items = [];
        this.furniture.forEach(f => items.push({ y: f.y + (f.t === 'desk' ? 20 : 16), type: 'f', data: f }));
        this.agentSprites.forEach(sp => { if (sp.isWalking || sp.isRoaming) items.push({ y: sp.y + 18, type: 'a', data: sp }); });
        items.sort((a, b) => a.y - b.y);

        items.forEach(it => {
            if (it.type === 'f') {
                const f = it.data;
                if (f.t === 'desk' && f.slotIdx !== undefined) {
                    const slot = this.deskSlots[f.slotIdx];
                    if (slot?.occupied) {
                        const sp = this.agentSprites.get(slot.agentId);
                        if (sp && !sp.isWalking && !sp.isRoaming) this.drawCharSitting(sp, f.x, f.y);
                    }
                }
                this.drawFurn(f);
            } else {
                this.drawCharWalking(it.data);
            }
        });

        // Draw interaction FX particles
        this.interactionFx = this.interactionFx.filter(fx => {
            fx.life -= this.deltaTime;
            if (fx.life <= 0) return false;
            const alpha = fx.life / fx.maxLife;
            const rise = (1 - fx.life / fx.maxLife) * 20;
            this.ctx.globalAlpha = alpha;
            this.ctx.font = `${12 + (1 - alpha) * 6}px serif`;
            this.ctx.fillText(fx.emoji, fx.x * this.scale + this.camera.x, (fx.y - rise) * this.scale + this.camera.y);
            this.ctx.globalAlpha = 1;
            return true;
        });

        // Draw standing roaming agents (at interaction points, not walking)
        this.agentSprites.forEach(sp => {
            if (sp.isRoaming && !sp.isWalking) {
                this.drawCharWalking(sp);
            }
        });

        // Overlays
        this.agentSprites.forEach(sp => this.drawOverlays(sp));
        this.drawMinimap();
        
        if (this._postRender) this._postRender();
        requestAnimationFrame((t) => this.render(t));
    }
}

window.PixelEngine = PixelEngine;
