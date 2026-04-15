/**
 * Pixel Engine v3 — Room-based office inspired by Pixel Agents extension.
 * Multi-room layout, distinct floor types, detailed sprites, grid overlay.
 */
class PixelEngine {
    constructor(canvasId, minimapId, unlockedRooms) {
        this._initUnlockedRooms = unlockedRooms || [0, 1];
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.mmCanvas = document.getElementById(minimapId);
        this.mmCtx = this.mmCanvas.getContext('2d');
        this.T = 16; // tile size in world pixels
        this.scale = 2.5;
        this.MW = 20; this.MH = 20; // will be set by buildMap()
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
        
        this.charImages = [];
        for (let i = 0; i < 6; i++) {
            const img = new Image();
            img.src = `assets/characters/char_${i}.png`;
            this.charImages.push(img);
        }
        
        this.floorImages = {};
        const floorFiles = ['floor_0', 'floor_1', 'floor_2', 'floor_3', 'floor_4', 'floor_5', 'floor_6', 'floor_7', 'floor_8'];
        floorFiles.forEach(f => {
            const img = new Image();
            img.src = `assets/floors/${f}.png`;
            this.floorImages[f] = img;
        });

        this.wallImages = {};
        const imgWall = new Image();
        imgWall.src = `assets/walls/wall_0.png`;
        this.wallImages['wall_0'] = imgWall;
        
        this.furnImages = {};
        const furnMap = {
            'desk': 'DESK/DESK_FRONT.png',
            'mtable': 'TABLE_FRONT/TABLE_FRONT.png',
            'table_small': 'SMALL_TABLE/SMALL_TABLE_FRONT.png',
            'table_low': 'COFFEE_TABLE/COFFEE_TABLE.png',
            'mchair': 'CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png',
            'chair': 'WOODEN_CHAIR/WOODEN_CHAIR_FRONT.png',
            'sofa': 'SOFA/SOFA_FRONT.png',
            'armchair': 'CUSHIONED_BENCH/CUSHIONED_BENCH.png',
            'bookshelf': 'BOOKSHELF/BOOKSHELF.png',
            'cabinet': 'DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png',
            'boxes': 'BIN/BIN.png',
            'coffee': 'COFFEE/COFFEE.png',
            'plant': 'PLANT/PLANT.png',
            'cactus': 'CACTUS/CACTUS.png',
            'painting': 'LARGE_PAINTING/LARGE_PAINTING.png',
            'clock': 'CLOCK/CLOCK.png',
            'pictureframe': 'SMALL_PAINTING/SMALL_PAINTING.png',
            'whiteboard': 'WHITEBOARD/WHITEBOARD.png',
            'bench': 'WOODEN_BENCH/WOODEN_BENCH.png',
            'large_plant': 'LARGE_PLANT/LARGE_PLANT.png',
            'hanging_plant': 'HANGING_PLANT/HANGING_PLANT.png',
            'plant2': 'PLANT_2/PLANT_2.png',
            'pot': 'POT/POT.png',
            'painting2': 'SMALL_PAINTING_2/SMALL_PAINTING_2.png',
            'pc': 'PC/PC_FRONT_OFF.png'
        };
        for (const [id, path] of Object.entries(furnMap)) {
            const img = new Image();
            img.src = `assets/furniture/${path}`;
            this.furnImages[id] = img;
        }

        // PC animation frames (ON state cycling)
        this.pcOnFrames = [];
        for (let i = 1; i <= 3; i++) {
            const pcImg = new Image();
            pcImg.src = `assets/furniture/PC/PC_FRONT_ON_${i}.png`;
            this.pcOnFrames.push(pcImg);
        }

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
                else {
                    this.selectedAgent = null;
                    // Check for interaction point clicks
                    if (this.onInteractionClick && this.interactionPoints) {
                        const rect = this.canvas.getBoundingClientRect();
                        const mx = (e.clientX - rect.left - this.camera.x) / this.scale;
                        const my = (e.clientY - rect.top - this.camera.y) / this.scale;
                        for (const pt of this.interactionPoints) {
                            const px = pt.tx * this.T, py = pt.ty * this.T;
                            if (Math.abs(mx - px) < this.T * 2 && Math.abs(my - py) < this.T * 2) {
                                this.onInteractionClick(pt);
                                break;
                            }
                        }
                    }
                }
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

        this.buildMap(this._initUnlockedRooms);
        this.render(performance.now());
    }

    resize() { const vp = document.getElementById('officeViewport'); this.canvas.width = vp.clientWidth; this.canvas.height = vp.clientHeight; this.ctx.imageSmoothingEnabled = false; }

    // === MAP BUILDING (Dynamic Room System) ===
    buildMap(unlockedRooms) {
        const T = this.T;
        this.furniture = [];
        this.deskSlots = [];
        this.interactionPoints = [];
        this.interactionFx = [];
        this._unlockedRooms = unlockedRooms || [0, 1];

        const leftOrder = [0, 1, 6, 7, 8];
        const rightOrder = [2, 3, 4, 5, 9, 10];
        const leftRooms = leftOrder.filter(id => this._unlockedRooms.includes(id));
        const rightRooms = rightOrder.filter(id => this._unlockedRooms.includes(id));

        const PAD = 2, LX = 1, RX = 24, SY = 1;
        const roomDefs = {
            0:{w:12,h:8,f:'wood'}, 1:{w:20,h:16,f:'wood'}, 2:{w:15,h:10,f:'tile'},
            3:{w:15,h:8,f:'carpet'}, 4:{w:15,h:7,f:'carpet'}, 5:{w:12,h:8,f:'tile'},
            6:{w:12,h:8,f:'wood'}, 7:{w:14,h:8,f:'wood'}, 8:{w:12,h:8,f:'carpet'},
            9:{w:14,h:8,f:'carpet'}, 10:{w:15,h:10,f:'tile'},
        };

        const placed = [];
        let ly = SY;
        leftRooms.forEach(id => { const d = roomDefs[id]; placed.push({id,x:LX,y:ly,w:d.w,h:d.h,f:d.f}); ly += d.h + PAD; });
        let ry = SY;
        rightRooms.forEach(id => { const d = roomDefs[id]; placed.push({id,x:RX,y:ry,w:d.w,h:d.h,f:d.f}); ry += d.h + PAD; });

        let mx = 20, my = 20;
        placed.forEach(r => { mx = Math.max(mx, r.x+r.w+2); my = Math.max(my, r.y+r.h+2); });
        this.MW = mx; this.MH = my;

        this.map = [];
        for (let y = 0; y < this.MH; y++) { this.map[y] = []; for (let x = 0; x < this.MW; x++) this.map[y][x] = null; }
        placed.forEach(r => { for (let dy=0;dy<r.h;dy++) for (let dx=0;dx<r.w;dx++) if(this.map[r.y+dy]) this.map[r.y+dy][r.x+dx]=r.f; });

        this._addCorridors(placed);
        placed.forEach(r => this._furnishRoom(r));
        this._placedRooms = placed;
    }

    _addCorridors(rooms) {
        const connect = (list) => {
            const sorted = list.sort((a,b) => a.y - b.y);
            for (let i=0;i<sorted.length-1;i++) {
                const top=sorted[i], bot=sorted[i+1];
                const cy = top.y+top.h, ch = bot.y-cy;
                if (ch>0 && ch<=4) {
                    const cx = Math.max(top.x,bot.x)+3;
                    for (let dy=0;dy<ch;dy++) for (let dx=0;dx<4;dx++)
                        if(this.map[cy+dy]) this.map[cy+dy][cx+dx] = top.f;
                }
            }
        };
        connect(rooms.filter(r=>r.x<18));
        connect(rooms.filter(r=>r.x>=18));
        // Horizontal corridor between columns
        const L = rooms.filter(r=>r.x<18).sort((a,b)=>a.y-b.y);
        const R = rooms.filter(r=>r.x>=18).sort((a,b)=>a.y-b.y);
        if (L.length && R.length) {
            const oy = Math.max(L[0].y, R[0].y)+2;
            const x1 = L[0].x+L[0].w, x2 = R[0].x;
            if (x2>x1) for (let dy=0;dy<3;dy++) for (let dx=x1;dx<x2;dx++)
                if(this.map[oy+dy]) this.map[oy+dy][dx]='wood';
        }
    }

    _furnishRoom(room) {
        const T=this.T, f=this.furniture, rx=room.x, ry=room.y;
        switch(room.id) {
            case 0: // Meeting
                f.push({t:'mtable',x:(rx+2)*T,y:(ry+1)*T,w:3,h:4});
                f.push({t:'mchair',x:(rx+2)*T,y:(ry+1)*T,dir:'down'},{t:'mchair',x:(rx+4)*T,y:(ry+1)*T,dir:'down'});
                f.push({t:'mchair',x:(rx+2)*T,y:(ry+5)*T,dir:'up'},{t:'mchair',x:(rx+4)*T,y:(ry+5)*T,dir:'up'});
                f.push({t:'mchair',x:(rx+1)*T,y:(ry+3)*T,dir:'right'},{t:'mchair',x:(rx+7)*T,y:(ry+3)*T,dir:'left'});
                f.push({t:'whiteboard',x:(rx+8)*T,y:ry*T});
                f.push({t:'plant',x:rx*T,y:ry*T},{t:'plant',x:rx*T,y:(ry+5)*T});
                f.push({t:'clock',x:(rx+9)*T,y:ry*T});
                break;
            case 1: // Office — 4 columns x 3 rows = 12 desks
                [[rx+1,ry+3],[rx+5,ry+3],[rx+9,ry+3],[rx+13,ry+3],
                 [rx+1,ry+7],[rx+5,ry+7],[rx+9,ry+7],[rx+13,ry+7],
                 [rx+1,ry+11],[rx+5,ry+11],[rx+9,ry+11],[rx+13,ry+11]].forEach(([dx,dy])=>{
                    f.push({t:'desk',x:dx*T,y:dy*T,slotIdx:this.deskSlots.length});
                    this.deskSlots.push({tx:dx,ty:dy,x:(dx+0.5)*T,y:(dy+0.5)*T,occupied:false,agentId:null});
                    f.push({t:'pc',x:(dx+1)*T,y:(dy-1)*T});
                });
                f.push({t:'bookshelf',x:(rx+1)*T,y:ry*T},{t:'bookshelf',x:(rx+4)*T,y:ry*T},{t:'bookshelf',x:(rx+7)*T,y:ry*T},{t:'bookshelf',x:(rx+10)*T,y:ry*T},{t:'bookshelf',x:(rx+13)*T,y:ry*T});
                f.push({t:'plant',x:rx*T,y:ry*T},{t:'plant',x:(rx+18)*T,y:ry*T},{t:'plant',x:rx*T,y:(ry+14)*T},{t:'plant',x:(rx+18)*T,y:(ry+14)*T});
                f.push({t:'boxes',x:(rx+16)*T,y:ry*T},{t:'painting',x:(rx+15)*T,y:ry*T});
                this.interactionPoints.push(
                    {id:'bs1',type:'bookshelf',tx:rx+1,ty:ry+1,emoji:'📖',label:'Kệ sách',effect:'xp'},
                    {id:'bs2',type:'bookshelf',tx:rx+4,ty:ry+1,emoji:'📚',label:'Kệ sách',effect:'xp'},
                    {id:'pl1',type:'plant',tx:rx,ty:ry+1,emoji:'🌿',label:'Cây xanh',effect:'mood'},
                );
                break;
            case 2: // Kitchen
                f.push({t:'vending',x:(rx+1)*T,y:ry*T},{t:'vending',x:(rx+3)*T,y:ry*T});
                f.push({t:'coffee',x:(rx+5)*T,y:ry*T},{t:'counter',x:(rx+7)*T,y:ry*T,w:4});
                f.push({t:'fridge',x:(rx+12)*T,y:ry*T},{t:'fridge',x:(rx+14)*T,y:ry*T});
                f.push({t:'clock',x:(rx+11)*T,y:ry*T});
                f.push({t:'table_small',x:(rx+3)*T,y:(ry+4)*T},{t:'bench',x:(rx+3)*T,y:(ry+6)*T});
                f.push({t:'table_small',x:(rx+8)*T,y:(ry+4)*T},{t:'bench',x:(rx+8)*T,y:(ry+6)*T});
                f.push({t:'plant',x:rx*T,y:ry*T},{t:'plant',x:rx*T,y:(ry+8)*T});
                [[rx+11,ry+5],[rx+11,ry+7]].forEach(([dx,dy])=>{
                    f.push({t:'desk',x:dx*T,y:dy*T,slotIdx:this.deskSlots.length});
                    this.deskSlots.push({tx:dx,ty:dy,x:(dx+0.5)*T,y:(dy+0.5)*T,occupied:false,agentId:null});
                });
                this.interactionPoints.push(
                    {id:'coffee1',type:'coffee',tx:rx+5,ty:ry+1,emoji:'☕',label:'Máy cà phê',effect:'energy'},
                    {id:'vend1',type:'vending',tx:rx+1,ty:ry+1,emoji:'🥤',label:'Máy bán nước',effect:'energy'},
                    {id:'fridge1',type:'fridge',tx:rx+12,ty:ry+1,emoji:'🍽️',label:'Tủ lạnh',effect:'energy'},
                );
                break;
            case 3: // Game Room
                f.push({t:'poker_table',x:(rx+2)*T,y:(ry+2)*T,w:3,h:2});
                f.push({t:'billiard_table',x:(rx+8)*T,y:(ry+2)*T,w:3,h:2});
                f.push({t:'sofa',x:(rx+12)*T,y:(ry+1)*T},{t:'armchair',x:(rx+12)*T,y:(ry+6)*T});
                f.push({t:'plant',x:rx*T,y:ry*T},{t:'plant',x:(rx+14)*T,y:ry*T});
                f.push({t:'painting',x:(rx+5)*T,y:ry*T},{t:'bookshelf',x:rx*T,y:(ry+6)*T});
                f.push({t:'table_low',x:(rx+6)*T,y:(ry+6)*T});
                this.interactionPoints.push(
                    {id:'poker1',type:'poker',tx:rx+3,ty:ry+3,emoji:'🃏',label:'Bàn Poker',effect:'poker'},
                    {id:'billiard1',type:'billiard',tx:rx+9,ty:ry+3,emoji:'🎱',label:'Bàn Billiard',effect:'billiard'},
                );
                break;
            case 4: // Lounge — cozy relaxation area
                f.push({t:'sofa',x:(rx+2)*T,y:(ry+2)*T},{t:'sofa',x:(rx+8)*T,y:(ry+2)*T});
                f.push({t:'armchair',x:(rx+1)*T,y:(ry+4)*T},{t:'armchair',x:(rx+13)*T,y:(ry+4)*T});
                f.push({t:'table_low',x:(rx+5)*T,y:(ry+3)*T},{t:'table_low',x:(rx+11)*T,y:(ry+3)*T});
                f.push({t:'rug',x:(rx+4)*T,y:(ry+2)*T},{t:'rug',x:(rx+10)*T,y:(ry+2)*T});
                f.push({t:'lamp',x:(rx+1)*T,y:ry*T},{t:'lamp',x:(rx+13)*T,y:ry*T});
                f.push({t:'bookshelf',x:(rx+3)*T,y:ry*T},{t:'bookshelf',x:(rx+6)*T,y:ry*T});
                f.push({t:'painting',x:(rx+9)*T,y:ry*T},{t:'painting',x:(rx+11)*T,y:ry*T});
                f.push({t:'plant',x:rx*T,y:ry*T},{t:'plant',x:(rx+14)*T,y:ry*T});
                f.push({t:'pillow',x:(rx+3)*T,y:(ry+2)*T},{t:'pillow',x:(rx+9)*T,y:(ry+2)*T});
                f.push({t:'coffee',x:(rx+7)*T,y:(ry+5)*T});
                this.interactionPoints.push(
                    {id:'sofa1',type:'sofa',tx:rx+3,ty:ry+3,emoji:'😴',label:'Sofa',effect:'rest'},
                    {id:'sofa2',type:'sofa',tx:rx+9,ty:ry+3,emoji:'😴',label:'Sofa',effect:'rest'},
                    {id:'lcoffee',type:'coffee',tx:rx+7,ty:ry+5,emoji:'☕',label:'Cà phê',effect:'energy'},
                );
                break;
            case 5: // Server Room — tech equipment
                for(let i=0;i<3;i++) f.push({t:'server_rack',x:(rx+1+i*4)*T,y:ry*T});
                for(let i=0;i<3;i++) f.push({t:'server_rack',x:(rx+1+i*4)*T,y:(ry+5)*T});
                f.push({t:'lamp',x:(rx+2)*T,y:(ry+3)*T},{t:'lamp',x:(rx+5)*T,y:(ry+3)*T},{t:'lamp',x:(rx+8)*T,y:(ry+3)*T});
                f.push({t:'clock',x:(rx+11)*T,y:ry*T});
                [[rx+1,ry+3],[rx+5,ry+3],[rx+9,ry+3]].forEach(([dx,dy])=>{
                    f.push({t:'desk',x:dx*T,y:dy*T,slotIdx:this.deskSlots.length});
                    this.deskSlots.push({tx:dx,ty:dy,x:(dx+0.5)*T,y:(dy+0.5)*T,occupied:false,agentId:null});
                    f.push({t:'pc',x:(dx+1)*T,y:(dy-1)*T});
                });
                f.push({t:'plant',x:rx*T,y:ry*T});
                this.interactionPoints.push(
                    {id:'srv1',type:'cabinet',tx:rx+1,ty:ry+1,emoji:'🖥️',label:'Server Rack',effect:'productivity'},
                    {id:'srv2',type:'cabinet',tx:rx+5,ty:ry+1,emoji:'🖥️',label:'Server Rack',effect:'productivity'},
                );
                break;
            case 6: // Gym — workout area
                f.push({t:'treadmill',x:(rx+1)*T,y:(ry+1)*T},{t:'treadmill',x:(rx+4)*T,y:(ry+1)*T},{t:'treadmill',x:(rx+7)*T,y:(ry+1)*T});
                f.push({t:'dumbbell',x:(rx+1)*T,y:(ry+4)*T},{t:'dumbbell',x:(rx+4)*T,y:(ry+4)*T});
                f.push({t:'yoga_mat',x:(rx+7)*T,y:(ry+4)*T},{t:'yoga_mat',x:(rx+9)*T,y:(ry+4)*T});
                f.push({t:'bench',x:(rx+1)*T,y:(ry+6)*T},{t:'bench',x:(rx+4)*T,y:(ry+6)*T});
                f.push({t:'vending',x:(rx+10)*T,y:ry*T},{t:'vending',x:(rx+10)*T,y:(ry+4)*T});
                f.push({t:'clock',x:(rx+8)*T,y:ry*T});
                f.push({t:'plant',x:rx*T,y:ry*T},{t:'plant',x:(rx+11)*T,y:ry*T});
                this.interactionPoints.push(
                    {id:'gym1',type:'vending',tx:rx+10,ty:ry+1,emoji:'💪',label:'Tập gym',effect:'energy'},
                    {id:'gym2',type:'vending',tx:rx+10,ty:ry+5,emoji:'🥤',label:'Nước uống',effect:'energy'},
                );
                break;
            case 7: // Library — study area
                for(let i=0;i<6;i++) f.push({t:'bookshelf',x:(rx+1+i*2)*T,y:ry*T});
                f.push({t:'table_small',x:(rx+2)*T,y:(ry+3)*T},{t:'table_small',x:(rx+7)*T,y:(ry+3)*T});
                f.push({t:'armchair',x:(rx+2)*T,y:(ry+5)*T},{t:'armchair',x:(rx+7)*T,y:(ry+5)*T});
                f.push({t:'lamp',x:(rx+3)*T,y:(ry+3)*T},{t:'lamp',x:(rx+8)*T,y:(ry+3)*T});
                f.push({t:'rug',x:(rx+2)*T,y:(ry+4)*T},{t:'rug',x:(rx+7)*T,y:(ry+4)*T});
                f.push({t:'plant',x:rx*T,y:ry*T},{t:'plant',x:(rx+13)*T,y:ry*T});
                [[rx+2,ry+6],[rx+7,ry+6],[rx+11,ry+3]].forEach(([dx,dy])=>{
                    f.push({t:'desk',x:dx*T,y:dy*T,slotIdx:this.deskSlots.length});
                    this.deskSlots.push({tx:dx,ty:dy,x:(dx+0.5)*T,y:(dy+0.5)*T,occupied:false,agentId:null});
                    f.push({t:'pc',x:(dx+1)*T,y:(dy-1)*T});
                });
                this.interactionPoints.push(
                    {id:'lib1',type:'bookshelf',tx:rx+1,ty:ry+1,emoji:'📚',label:'Thư viện',effect:'xp'},
                    {id:'lib2',type:'bookshelf',tx:rx+5,ty:ry+1,emoji:'📖',label:'Đọc sách',effect:'xp'},
                );
                break;
            case 8: // Garden — outdoor zen
                f.push({t:'tree',x:(rx+1)*T,y:ry*T},{t:'tree',x:(rx+9)*T,y:ry*T});
                f.push({t:'fountain',x:(rx+4)*T,y:(ry+1)*T});
                for(let i=0;i<5;i++) f.push({t:'plant',x:(rx+1+i*2)*T,y:(ry+5)*T});
                for(let i=0;i<3;i++) f.push({t:'cactus',x:(rx+2+i*3)*T,y:(ry+6)*T});
                f.push({t:'bench',x:(rx+2)*T,y:(ry+3)*T},{t:'bench',x:(rx+7)*T,y:(ry+3)*T});
                f.push({t:'table_low',x:(rx+4)*T,y:(ry+4)*T});
                f.push({t:'lamp',x:(rx+11)*T,y:ry*T});
                this.interactionPoints.push(
                    {id:'garden1',type:'plant',tx:rx+5,ty:ry+2,emoji:'⛲',label:'Đài phun nước',effect:'mood'},
                    {id:'garden2',type:'plant',tx:rx+2,ty:ry+1,emoji:'🌿',label:'Vườn cây',effect:'mood'},
                );
                break;
            case 9: // VIP Lounge — luxury
                f.push({t:'sofa',x:(rx+2)*T,y:(ry+2)*T},{t:'sofa',x:(rx+8)*T,y:(ry+2)*T});
                f.push({t:'armchair',x:(rx+1)*T,y:(ry+4)*T},{t:'armchair',x:(rx+12)*T,y:(ry+4)*T});
                f.push({t:'bed_single',x:(rx+5)*T,y:(ry+5)*T},{t:'bed_single',x:(rx+9)*T,y:(ry+5)*T});
                f.push({t:'table_low',x:(rx+5)*T,y:(ry+2)*T},{t:'table_low',x:(rx+10)*T,y:(ry+2)*T});
                f.push({t:'rug',x:(rx+3)*T,y:(ry+3)*T},{t:'rug',x:(rx+9)*T,y:(ry+3)*T});
                f.push({t:'painting',x:(rx+4)*T,y:ry*T},{t:'painting',x:(rx+8)*T,y:ry*T},{t:'pictureframe',x:(rx+6)*T,y:ry*T});
                f.push({t:'lamp',x:(rx+1)*T,y:ry*T},{t:'lamp',x:(rx+13)*T,y:ry*T});
                f.push({t:'plant',x:rx*T,y:ry*T},{t:'plant',x:(rx+13)*T,y:(ry+6)*T});
                f.push({t:'vending',x:(rx+12)*T,y:(ry+6)*T},{t:'coffee',x:(rx+12)*T,y:ry*T});
                f.push({t:'pillow',x:(rx+3)*T,y:(ry+2)*T},{t:'pillow',x:(rx+9)*T,y:(ry+2)*T});
                this.interactionPoints.push(
                    {id:'vip1',type:'sofa',tx:rx+3,ty:ry+3,emoji:'👑',label:'VIP Sofa',effect:'rest'},
                    {id:'vip2',type:'coffee',tx:rx+12,ty:ry+1,emoji:'☕',label:'VIP Coffee',effect:'energy'},
                );
                break;
            case 10: // R&D Lab — research station
                [[rx+1,ry+2],[rx+5,ry+2],[rx+9,ry+2],[rx+1,ry+6],[rx+5,ry+6],[rx+9,ry+6]].forEach(([dx,dy])=>{
                    f.push({t:'desk',x:dx*T,y:dy*T,slotIdx:this.deskSlots.length});
                    this.deskSlots.push({tx:dx,ty:dy,x:(dx+0.5)*T,y:(dy+0.5)*T,occupied:false,agentId:null});
                    f.push({t:'pc',x:(dx+1)*T,y:(dy-1)*T});
                });
                f.push({t:'microscope',x:(rx+13)*T,y:(ry+1)*T},{t:'microscope',x:(rx+13)*T,y:(ry+5)*T});
                f.push({t:'flask',x:(rx+12)*T,y:(ry+1)*T},{t:'flask',x:(rx+12)*T,y:(ry+5)*T});
                f.push({t:'whiteboard',x:(rx+12)*T,y:(ry+3)*T});
                f.push({t:'bookshelf',x:(rx+13)*T,y:(ry+8)*T});
                f.push({t:'lamp',x:(rx+3)*T,y:ry*T},{t:'lamp',x:(rx+7)*T,y:ry*T},{t:'lamp',x:(rx+11)*T,y:ry*T});
                f.push({t:'plant',x:rx*T,y:ry*T},{t:'plant',x:(rx+14)*T,y:ry*T});
                f.push({t:'clock',x:(rx+6)*T,y:ry*T});
                this.interactionPoints.push(
                    {id:'lab1',type:'bookshelf',tx:rx+13,ty:ry+2,emoji:'🔬',label:'Kính hiển vi',effect:'xp'},
                    {id:'lab2',type:'cabinet',tx:rx+12,ty:ry+2,emoji:'🧪',label:'Phòng thí nghiệm',effect:'xp'},
                );
                break;
        }
    }

    rebuildMap(unlockedRooms) {
        this.furniture = [];
        this.deskSlots = [];
        this.buildMap(unlockedRooms);
    }

    // === DRAWING HELPERS ===
    px(x, y, w, h, c) { this.ctx.fillStyle = c; this.ctx.fillRect(Math.floor(x * this.scale + this.camera.x), Math.floor(y * this.scale + this.camera.y), Math.ceil(w * this.scale), Math.ceil(h * this.scale)); }
    li(hex, a) { const n = parseInt(hex.replace('#', ''), 16); return '#' + (1 << 24 | Math.min(255, (n >> 16) + a) << 16 | Math.min(255, ((n >> 8) & 0xff) + a) << 8 | Math.min(255, (n & 0xff) + a)).toString(16).slice(1); }
    dk(hex, a) { return this.li(hex, -a); }

    // === FLOORS ===
    drawFloors() {
        const T = this.T;
        const floorMap = {
            'wood': 'floor_0',
            'tile': 'floor_1',
            'carpet': 'floor_3'
        };
        for (let y = 0; y < this.MH; y++) {
            for (let x = 0; x < this.MW; x++) {
                const fl = this.map[y][x];
                if (!fl) continue;
                
                const px = x * T;
                const py = y * T;
                const imgKey = floorMap[fl] || 'floor_0';
                const img = this.floorImages[imgKey];
                
                if (img && img.complete) {
                    this.ctx.drawImage(
                        img, 
                        Math.floor(px * this.scale + this.camera.x), 
                        Math.floor(py * this.scale + this.camera.y), 
                        Math.ceil(T * this.scale), 
                        Math.ceil(T * this.scale)
                    );
                } else {
                    this.px(px, py, T, T, fl === 'wood' ? '#a0794a' : fl === 'tile' ? '#e8e0d0' : '#4a6a8a');
                }
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
        const imgWall = this.wallImages['wall_0'];
        const sw = Math.ceil(16 * this.scale);
        const sh = Math.ceil(32 * this.scale);

        for (let y = 0; y < this.MH; y++) {
            for (let x = 0; x < this.MW; x++) {
                if (!map[y][x]) continue;
                const hasFloor = (tx, ty) => tx >= 0 && ty >= 0 && tx < this.MW && ty < this.MH && map[ty][tx];
                
                const px = x * T;
                const py = y * T;
                
                if (!hasFloor(x, y - 1)) {
                    if (imgWall && imgWall.complete) {
                        // Draw North Wall sprite spanning -16y to cover background behind top edge
                        this.ctx.drawImage(
                            imgWall, 
                            0, 0, 16, 32,
                            Math.floor(px * this.scale + this.camera.x), 
                            Math.floor((py - T) * this.scale + this.camera.y), 
                            sw, sh
                        );
                    } else {
                        // Fallback procedural north wall
                        this.px(px, py - 3, T, 6, '#1e2638'); 
                        this.px(px, py + 2, T, 1, '#2a3550');
                    }
                }
                
                if (!imgWall || !imgWall.complete) {
                     // Keep procedural trim for others if no image loaded
                     if (!hasFloor(x, y + 1)) { this.px(x * T, (y + 1) * T - 2, T, 5, '#1e2638'); this.px(x * T, (y + 1) * T - 2, T, 1, '#2a3550'); }
                     if (!hasFloor(x - 1, y)) { this.px(x * T - 2, y * T, 5, T, '#1e2638'); this.px(x * T + 2, y * T, 1, T, '#2a3550'); }
                     if (!hasFloor(x + 1, y)) { this.px((x + 1) * T - 2, y * T, 5, T, '#1e2638'); this.px((x + 1) * T - 2, y * T, 1, T, '#2a3550'); }
                }
            }
        }
    }

    // === FURNITURE ===
    drawFurn(f) {
        const T = this.T, x = f.x, y = f.y;
        
        let img = this.furnImages[f.t];
        if (img && img.complete) {
            // Compute footprint from actual sprite dimensions (auto-matches manifest)
            const footprintH = Math.ceil(img.height / T);

            // PC animation: cycle ON frames when any agent is working
            let drawImg = img;
            if (f.t === 'pc' && this.pcOnFrames?.length) {
                // Animate PC screen
                const frame = Math.floor(this.elapsed * 0.08) % 3;
                const pcFrame = this.pcOnFrames[frame];
                if (pcFrame && pcFrame.complete) drawImg = pcFrame;
            }
            
            this.ctx.drawImage(
                drawImg,
                Math.floor(x * this.scale + this.camera.x),
                Math.floor((y + footprintH * T - drawImg.height) * this.scale + this.camera.y),
                Math.ceil(drawImg.width * this.scale),
                Math.ceil(drawImg.height * this.scale)
            );
            
            // Screen code for desk
            if (f.t === 'desk' && f.slotIdx !== undefined) {
                const slot = this.deskSlots[f.slotIdx];
                if (slot?.occupied) {
                    const sp = this.agentSprites.get(slot.agentId);
                    if (sp?.status === 'working' || sp?.status === 'thinking') {
                        const scX = x + 16, scY = y + footprintH * T - drawImg.height + 7;
                        for (let i = 0; i < 3; i++) {
                            const lw = 3 + Math.sin(this.elapsed * 0.04 + i) * 3;
                            this.px(scX, scY + i * 2, Math.max(2, lw), 1, ['#4ecdc4', '#78e08f', '#ffd93d'][i]);
                        }
                    }
                }
            }
            return;
        }

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
            case 'poker_table': this.drawPokerTable(x, y); break;
            case 'billiard_table': this.drawBilliardTable(x, y); break;
            // Room-specific assets
            case 'treadmill': this.drawTreadmill(x, y); break;
            case 'dumbbell': this.drawDumbbell(x, y); break;
            case 'yoga_mat': this.drawYogaMat(x, y); break;
            case 'server_rack': this.drawServerRack(x, y); break;
            case 'microscope': this.drawMicroscope(x, y); break;
            case 'flask': this.drawFlask(x, y); break;
            case 'fountain': this.drawFountain(x, y); break;
            case 'tree': this.drawTree(x, y); break;
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

    drawPokerTable(x, y) {
        const T = this.T;
        const w = T * 3, h = T * 2;
        // Table legs
        this.px(x + 4, y + h, 3, 5, '#3d2610');
        this.px(x + w - 7, y + h, 3, 5, '#3d2610');
        // Wooden border
        this.px(x, y, w, h, '#5a3a1e');
        this.px(x + 1, y + 1, w - 2, h - 2, '#6b4a2a');
        // Green felt
        this.px(x + 3, y + 3, w - 6, h - 6, '#1a6b3a');
        this.px(x + 4, y + 4, w - 8, h - 8, '#1f7a42');
        // Card slots (community cards)
        const cardW = 4, cardH = 5;
        const startX = x + (w - cardW * 5 - 4) / 2;
        const cardY = y + (h - cardH) / 2;
        for (let i = 0; i < 5; i++) {
            this.px(startX + i * (cardW + 1), cardY, cardW, cardH, 'rgba(255,255,255,0.15)');
        }
        // Chips decoration
        const chipColors = ['#e74c3c', '#3498db', '#f1c40f'];
        for (let i = 0; i < 3; i++) {
            this.px(x + 5 + i * 3, y + h - 8, 2, 2, chipColors[i]);
        }
        // Poker emoji indicator (animated glow)
        if (Math.floor(this.elapsed * 0.03) % 2 === 0) {
            this.px(x + w / 2 - 2, y + 3, 4, 1, 'rgba(255,217,61,0.3)');
        }
    }

    drawBilliardTable(x, y) {
        const T = this.T;
        const w = T * 3, h = T * 2;
        // Table legs
        this.px(x + 4, y + h, 3, 5, '#3d2610');
        this.px(x + w - 7, y + h, 3, 5, '#3d2610');
        // Wooden border
        this.px(x, y, w, h, '#5a3a1e');
        this.px(x + 1, y + 1, w - 2, h - 2, '#6b4a2a');
        // Green felt
        this.px(x + 3, y + 3, w - 6, h - 6, '#1a6b3a');
        this.px(x + 4, y + 4, w - 8, h - 8, '#1f7a42');
        // 6 pockets (corner + mid)
        const pr = 2;
        this.px(x + 2, y + 2, pr + 1, pr + 1, '#111');           // TL
        this.px(x + w / 2 - 1, y + 1, pr + 1, pr, '#111');       // TC
        this.px(x + w - pr - 3, y + 2, pr + 1, pr + 1, '#111');  // TR
        this.px(x + 2, y + h - pr - 3, pr + 1, pr + 1, '#111');  // BL
        this.px(x + w / 2 - 1, y + h - pr - 1, pr + 1, pr, '#111'); // BC
        this.px(x + w - pr - 3, y + h - pr - 3, pr + 1, pr + 1, '#111'); // BR
        // Decorative balls on table
        const ballColors = ['#f1c40f', '#e74c3c', '#2980b9', '#1a1a1a', '#ffffff'];
        const ballPositions = [[w*0.6, h*0.35], [w*0.65, h*0.5], [w*0.6, h*0.65], [w*0.7, h*0.5], [w*0.3, h*0.5]];
        for (let i = 0; i < 5; i++) {
            this.px(x + ballPositions[i][0], y + ballPositions[i][1], 2, 2, ballColors[i]);
        }
        // Billiard emoji indicator (animated glow)
        if (Math.floor(this.elapsed * 0.025) % 2 === 0) {
            this.px(x + w / 2 - 2, y + 3, 4, 1, 'rgba(78,205,196,0.3)');
        }
    }

    // === ROOM-SPECIFIC ASSETS ===

    drawTreadmill(x, y) {
        // Base/platform
        this.px(x, y + 12, 14, 3, '#444');
        this.px(x + 1, y + 13, 12, 1, '#555');
        // Running belt
        this.px(x + 1, y + 8, 12, 4, '#222');
        this.px(x + 2, y + 9, 10, 2, '#333');
        // Belt lines (animated)
        const shift = Math.floor(this.elapsed * 0.1) % 3;
        for (let i = 0; i < 4; i++) {
            this.px(x + 2 + ((i * 3 + shift) % 10), y + 9, 1, 2, '#444');
        }
        // Handlebar posts
        this.px(x + 2, y, 2, 9, '#666');
        this.px(x + 10, y, 2, 9, '#666');
        // Top bar
        this.px(x + 2, y, 10, 2, '#777');
        // Display panel
        this.px(x + 5, y + 1, 4, 3, '#111');
        this.px(x + 6, y + 2, 2, 1, '#4ecdc4');
        // Speed indicator
        if (Math.floor(this.elapsed * 0.03) % 2) this.px(x + 5, y + 3, 1, 1, '#ff6b6b');
    }

    drawDumbbell(x, y) {
        // Left weight plates
        this.px(x, y + 3, 3, 8, '#555');
        this.px(x + 1, y + 4, 1, 6, '#666');
        // Bar
        this.px(x + 3, y + 6, 8, 2, '#888');
        this.px(x + 3, y + 5, 8, 1, '#999');
        // Right weight plates
        this.px(x + 11, y + 3, 3, 8, '#555');
        this.px(x + 12, y + 4, 1, 6, '#666');
        // Shine
        this.px(x + 1, y + 3, 1, 1, '#777');
        this.px(x + 12, y + 3, 1, 1, '#777');
    }

    drawYogaMat(x, y) {
        // Mat body (rolled slightly at top)
        this.px(x, y + 2, 14, 10, '#9b59b6');
        this.px(x + 1, y + 3, 12, 8, '#a66bbe');
        // Rolled edge at top
        this.px(x, y, 14, 3, '#8e44ad');
        this.px(x + 1, y + 1, 12, 1, '#7d3c98');
        // Center line
        this.px(x + 6, y + 4, 2, 6, '#c39bd3');
        // Texture dots
        this.px(x + 3, y + 5, 1, 1, '#c39bd3');
        this.px(x + 10, y + 5, 1, 1, '#c39bd3');
        this.px(x + 3, y + 9, 1, 1, '#c39bd3');
        this.px(x + 10, y + 9, 1, 1, '#c39bd3');
    }

    drawServerRack(x, y) {
        const T = this.T;
        // Rack body
        this.px(x, y, 14, T + 8, '#2c3e50');
        this.px(x + 1, y + 1, 12, T + 6, '#34495e');
        // Server slots with blinking LEDs
        for (let i = 0; i < 4; i++) {
            const sy = y + 2 + i * 5;
            this.px(x + 2, sy, 10, 4, '#1a252f');
            this.px(x + 3, sy + 1, 8, 2, '#22303d');
            // LEDs
            const on = (Math.floor(this.elapsed * 0.05 + i * 7) % 3) !== 0;
            this.px(x + 3, sy + 1, 1, 1, on ? '#2ecc71' : '#1a5c32');
            this.px(x + 5, sy + 1, 1, 1, '#f39c12');
            // Ventilation slots
            for (let j = 0; j < 3; j++) this.px(x + 7 + j * 2, sy + 1, 1, 2, '#1a252f');
        }
        // Top handle
        this.px(x + 5, y, 4, 1, '#7f8c8d');
    }

    drawMicroscope(x, y) {
        // Base
        this.px(x + 2, y + 12, 10, 3, '#2c3e50');
        this.px(x + 3, y + 13, 8, 1, '#34495e');
        // Stage/platform
        this.px(x + 4, y + 10, 6, 2, '#555');
        // Specimen (small colored dot)
        this.px(x + 6, y + 10, 2, 1, '#4ecdc4');
        // Body tube (vertical)
        this.px(x + 6, y + 3, 2, 8, '#7f8c8d');
        this.px(x + 7, y + 4, 1, 6, '#95a5a6');
        // Eyepiece
        this.px(x + 5, y, 4, 3, '#2c3e50');
        this.px(x + 6, y + 1, 2, 1, '#87ceeb');
        // Objective lens
        this.px(x + 5, y + 9, 4, 2, '#bdc3c7');
        this.px(x + 6, y + 10, 2, 1, '#ecf0f1');
        // Focus knob
        this.px(x + 9, y + 6, 2, 3, '#e74c3c');
        this.px(x + 3, y + 6, 2, 3, '#e74c3c');
    }

    drawFlask(x, y) {
        // Flask body (Erlenmeyer shape)
        this.px(x + 3, y + 5, 8, 8, '#d5f5e3');
        this.px(x + 4, y + 4, 6, 1, '#d5f5e3');
        this.px(x + 5, y + 3, 4, 1, '#d5f5e3');
        // Neck
        this.px(x + 5, y, 4, 4, '#d5f5e3');
        this.px(x + 6, y, 2, 1, '#bdc3c7');
        // Liquid inside (animated bubbling)
        this.px(x + 4, y + 7, 6, 5, '#2ecc71');
        this.px(x + 5, y + 6, 4, 1, '#27ae60');
        // Bubbles
        const bub = Math.floor(this.elapsed * 0.06) % 4;
        this.px(x + 5 + bub, y + 8, 1, 1, '#82e0aa');
        this.px(x + 7 - (bub % 3), y + 9, 1, 1, '#abebc6');
        // Glass shine
        this.px(x + 4, y + 5, 1, 4, 'rgba(255,255,255,0.3)');
        // Base
        this.px(x + 2, y + 13, 10, 2, '#95a5a6');
    }

    drawFountain(x, y) {
        const T = this.T;
        // Bottom basin
        this.px(x, y + 10, 16, 5, '#7f8c8d');
        this.px(x + 1, y + 11, 14, 3, '#95a5a6');
        // Water in basin
        this.px(x + 2, y + 11, 12, 2, '#3498db');
        this.px(x + 3, y + 12, 10, 1, '#2980b9');
        // Middle tier
        this.px(x + 4, y + 6, 8, 5, '#bdc3c7');
        this.px(x + 5, y + 7, 6, 3, '#95a5a6');
        // Water in middle
        this.px(x + 5, y + 8, 6, 1, '#3498db');
        // Top spout
        this.px(x + 6, y + 1, 4, 5, '#bdc3c7');
        this.px(x + 7, y + 2, 2, 3, '#95a5a6');
        // Animated water spray
        const sp = Math.floor(this.elapsed * 0.08) % 3;
        this.px(x + 7, y - 1 - sp, 2, 2, 'rgba(52,152,219,0.6)');
        // Water droplets falling
        const d1 = (Math.floor(this.elapsed * 0.06) % 5);
        const d2 = (Math.floor(this.elapsed * 0.06 + 2) % 5);
        this.px(x + 3 + d1, y + 9 + (d1 > 2 ? 1 : 0), 1, 1, '#5dade2');
        this.px(x + 10 - d2, y + 9 + (d2 > 2 ? 1 : 0), 1, 1, '#5dade2');
    }

    drawTree(x, y) {
        // Trunk
        this.px(x + 5, y + 8, 4, 8, '#5d4037');
        this.px(x + 6, y + 9, 2, 6, '#6d4c41');
        // Roots
        this.px(x + 3, y + 15, 3, 1, '#5d4037');
        this.px(x + 8, y + 15, 3, 1, '#5d4037');
        // Crown (layered circles)
        this.px(x + 2, y + 3, 10, 6, '#27ae60');
        this.px(x + 1, y + 4, 12, 4, '#2ecc71');
        this.px(x + 3, y + 1, 8, 4, '#27ae60');
        this.px(x + 4, y, 6, 3, '#229954');
        // Highlight/depth
        this.px(x + 3, y + 2, 4, 3, '#2ecc71');
        this.px(x + 8, y + 5, 3, 2, '#1e8449');
        // Fruit/flowers
        this.px(x + 4, y + 3, 1, 1, '#e74c3c');
        this.px(x + 9, y + 4, 1, 1, '#f39c12');
        this.px(x + 6, y + 1, 1, 1, '#e74c3c');
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
        const img = this.charImages[sp.charIndex] || this.charImages[0];
        if (!img || !img.complete) return;
        
        let frame = 1; // Idle is frame 1
        if (sp.status === 'working') {
            frame = (Math.floor(this.elapsed * 0.1) % 2) === 0 ? 3 : 4;
        } else if (sp.status === 'reading') {
            frame = (Math.floor(this.elapsed * 0.1) % 2) === 0 ? 5 : 6;
        }
        
        this.ctx.drawImage(
            img,
            frame * 16, 0, 16, 32, // sx, sy, sw, sh
            Math.floor((x - 8) * this.scale + this.camera.x), 
            Math.floor((y - 14) * this.scale + this.camera.y),
            Math.ceil(16 * this.scale), 
            Math.ceil(32 * this.scale)
        );
    }

    drawCharWalking(sp) {
        const T = this.T, x = sp.x, y = sp.y;

        
        const img = this.charImages[sp.charIndex] || this.charImages[0];
        if (!img || !img.complete) return;
        
        const row = (sp.dir === 'down') ? 0 : (sp.dir === 'up') ? 1 : 2;
        
        // Walk cycle uses frames: [0, 1, 2, 1]
        const walkCycle = [0, 1, 2, 1];
        const frame = sp.isWalking ? walkCycle[Math.floor(this.elapsed * 0.15) % 4] : 1;
        
        // Shadow
        this.ctx.globalAlpha = 0.2; this.px(x - 6, y + 14, 12, 3, '#000'); this.ctx.globalAlpha = 1;
        
        this.ctx.save();
        if (sp.dir === 'left') {
            this.ctx.translate(Math.floor((x + 8) * this.scale + this.camera.x), Math.floor((y - 15) * this.scale + this.camera.y));
            this.ctx.scale(-1, 1);
            this.ctx.drawImage(img, frame * 16, row * 32, 16, 32, Math.floor(-8 * this.scale), 0, Math.ceil(16 * this.scale), Math.ceil(32 * this.scale));
        } else {
            this.ctx.translate(Math.floor((x - 8) * this.scale + this.camera.x), Math.floor((y - 15) * this.scale + this.camera.y));
            this.ctx.drawImage(img, frame * 16, row * 32, 16, 32, 0, 0, Math.ceil(16 * this.scale), Math.ceil(32 * this.scale));
        }
        this.ctx.restore();
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
            charIndex: agent.charIndex || 0, dir: 'down',
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
        // Exclude poker points from normal roaming (poker handled separately)
        const nonPoker = this.interactionPoints.filter(p => p.type !== 'poker' && p.type !== 'billiard');
        if (!nonPoker.length) return null;
        return nonPoker[Math.floor(Math.random() * nonPoker.length)];
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

    // === ZOOM ===
    zoomTo(newScale) {
        this.scale = Math.max(1, Math.min(5, newScale));
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
                    
                    if (Math.abs(dx) > Math.abs(dy)) {
                        sp.dir = dx > 0 ? 'right' : 'left';
                    } else {
                        sp.dir = dy > 0 ? 'down' : 'up';
                    }
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
        this.furniture.forEach(f => {
            let yOffset = 16;
            if (f.t === 'pc') yOffset = 22; // Draw after desk
            else if (f.t === 'desk') yOffset = 20;
            items.push({ y: f.y + yOffset, type: 'f', data: f });
        });
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
