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
        this.interactionPoints = [];
        this.interactionFx = [];
        this.agentSprites = new Map();
        this.hoveredAgent = null;
        this.selectedAgent = null;
        this.onAgentClick = null;
        this._clickPos = null;
        this.editMode = null; // for toolbar
        
        // Scene system
        this.scenes = {};
        this.activeScene = 'indoor';
        this._sceneTransition = { active: false, alpha: 0, target: null, phase: 'none' };
        
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

    // === MAP BUILDING (Scene System) ===
    buildMap(unlockedRooms) {
        this._unlockedRooms = unlockedRooms || [0, 1];
        this.scenes = {};

        const PAD = 2, LX = 1, RX = 24;
        const roomDefs = {
            // ═══ STANDARDIZED ROOM SIZES ═══
            // Small rooms: 10×8
            0:{w:10,h:8,f:'wood'},    // Meeting Room
            2:{w:10,h:8,f:'tile'},    // Kitchen
            5:{w:10,h:8,f:'tile'},    // Server Room
            6:{w:10,h:8,f:'wood'},    // Gym
            7:{w:10,h:8,f:'wood'},    // Library
            8:{w:10,h:8,f:'carpet'},  // Garden
            9:{w:10,h:8,f:'carpet'},  // VIP Lounge
            12:{w:5,h:8,f:'metal'},   // Elevator (narrow)
            // Medium rooms: 14×8
            1:{w:14,h:8,f:'wood'},    // Office
            3:{w:14,h:8,f:'carpet'},  // Game Room
            4:{w:10,h:8,f:'carpet'},  // Lounge
            10:{w:14,h:8,f:'tile'},   // R&D Lab
            // Large / Special
            11:{w:18,h:20,f:'grass'}, // Outdoor (separate scene)
            13:{w:20,h:10,f:'concrete'}, // Rooftop
            14:{w:16,h:10,f:'wood'},  // Cafe
        };

        // ═══ SCENE: INDOOR (Building) — Elevator now lives here ═══
        const indoorLeft  = [0, 1, 6, 7, 8].filter(id => this._unlockedRooms.includes(id));
        const indoorRight = [2, 3, 4, 5, 9, 10, 12].filter(id => this._unlockedRooms.includes(id));
        if (indoorLeft.length || indoorRight.length) {
            this._buildScene('indoor', indoorLeft, indoorRight, roomDefs, LX, RX, PAD, '🏢');
        }

        // ═══ SCENE: OUTDOOR ═══
        if (this._unlockedRooms.includes(11)) {
            this._buildScene('outdoor', [11], [], roomDefs, LX + 1, RX, PAD, '🏞️');
        }

        // ═══ SCENE: ROOFTOP ═══
        if (this._unlockedRooms.includes(13)) {
            this._buildScene('rooftop', [13], [], roomDefs, LX + 2, RX, PAD, '🌆');
        }

        // ═══ SCENE: CAFE ═══
        if (this._unlockedRooms.includes(14)) {
            this._buildScene('cafe', [14], [], roomDefs, LX + 2, RX, PAD, '☕');
        }
        // Activate default scene
        const defaultScene = this.scenes['indoor'] || this.scenes[Object.keys(this.scenes)[0]];
        if (defaultScene) {
            this.activeScene = defaultScene.name;
            this._applyScene(defaultScene);
        }
    }

    _buildScene(name, leftIds, rightIds, roomDefs, LX, RX, PAD, icon) {
        const placed = [];
        const furn = [];
        const desks = [];
        const iPoints = [];

        // Store originals, swap temporarily
        const origFurn = this.furniture;
        const origDesks = this.deskSlots;
        const origIP = this.interactionPoints;
        this.furniture = furn;
        this.deskSlots = desks;
        this.interactionPoints = iPoints;

        if (name === 'indoor') {
            // ═══ BUILDING LAYOUT: 3-Floor Office Building ═══
            // All indoor rooms are h=8, consistent grid layout
            const GAP = 2;         // gap between rooms on same floor
            const FLOOR_SEP = 3;   // separator between floors (hallway/stairs)
            const MARGIN = 1;      // left margin
            const allIds = [...leftIds, ...rightIds];

            // Floor assignments: rooms placed left-to-right per floor
            const floors = [
                // Floor 1 (Ground): Meeting + Office + Elevator
                [0, 1, 12],
                // Floor 2: Kitchen + Server Room + Game Room + Lounge
                [2, 5, 3, 4],
                // Floor 3: Gym + Library + Garden + VIP + R&D
                [6, 7, 8, 9, 10],
            ];

            let curY = 1;
            const floorData = []; // store for corridor building

            floors.forEach((floorRoomIds, fi) => {
                const available = floorRoomIds.filter(id => allIds.includes(id) && roomDefs[id]);
                if (!available.length) return;

                const floorStartY = curY;
                let cx = MARGIN; // current X cursor

                available.forEach(id => {
                    const d = roomDefs[id];
                    placed.push({id, x:cx, y:curY, w:d.w, h:d.h, f:d.f, zone:name});
                    cx += d.w + GAP;
                });

                const floorH = 8; // all rooms are h=8
                const floorEndX = cx - GAP; // rightmost edge

                floorData.push({
                    y: curY,
                    h: floorH,
                    startX: MARGIN,
                    endX: floorEndX,
                    floorIdx: fi,
                });

                curY += floorH + FLOOR_SEP;
            });

            // Store floor data for corridors (on the instance temporarily)
            this._floorHalls = floorData;

        } else {
            // Non-indoor scenes: simple linear placement
            let ly = 1;
            leftIds.forEach(id => {
                const d = roomDefs[id];
                placed.push({id, x:LX, y:ly, w:d.w, h:d.h, f:d.f, zone:name});
                ly += d.h + PAD;
            });
            let ry = 1;
            rightIds.forEach(id => {
                const d = roomDefs[id];
                placed.push({id, x:RX, y:ry, w:d.w, h:d.h, f:d.f, zone:name});
                ry += d.h + PAD;
            });
        }

        // Calculate map bounds
        let mx = 20, my = 20;
        placed.forEach(r => { mx = Math.max(mx, r.x+r.w+3); my = Math.max(my, r.y+r.h+3); });

        // Build tile map
        const map = [];
        for (let y = 0; y < my; y++) { map[y] = []; for (let x = 0; x < mx; x++) map[y][x] = null; }
        placed.forEach(r => {
            for (let dy=0;dy<r.h;dy++) for (let dx=0;dx<r.w;dx++)
                if(map[r.y+dy]) map[r.y+dy][r.x+dx]=r.f;
        });

        // Temporarily swap map for corridor building
        const origMap = this.map;
        const origMW = this.MW;
        const origMH = this.MH;
        this.map = map;
        this.MW = mx;
        this.MH = my;

        // Add corridors for indoor scene
        if (name === 'indoor') {
            this._addIndoorCorridors(placed);
        }

        // Furnish rooms
        placed.forEach(r => this._furnishRoom(r));

        // Save scene (include floorData for labels)
        this.scenes[name] = {
            name, icon,
            map, MW: mx, MH: my,
            furniture: furn,
            deskSlots: desks,
            interactionPoints: iPoints,
            placedRooms: placed,
            floorData: this._floorHalls || null,
        };

        // Restore originals
        this.furniture = origFurn;
        this.deskSlots = origDesks;
        this.interactionPoints = origIP;
        this.map = origMap;
        this.MW = origMW;
        this.MH = origMH;
        this._floorHalls = null;
    }

    _applyScene(scene) {
        this.map = scene.map;
        this.MW = scene.MW;
        this.MH = scene.MH;
        this.furniture = scene.furniture;
        this.deskSlots = scene.deskSlots;
        this.interactionPoints = scene.interactionPoints;
        this._placedRooms = scene.placedRooms;
        this.activeScene = scene.name;
    }

    // === SCENE SWITCHING ===
    switchScene(sceneName) {
        const scene = this.scenes[sceneName];
        if (!scene || sceneName === this.activeScene) return false;

        // Start fade-out transition
        this._sceneTransition = {
            active: true,
            alpha: 0,
            target: sceneName,
            phase: 'fadeOut',
            startTime: performance.now(),
            duration: 300,
        };
        return true;
    }

    _updateSceneTransition() {
        const tr = this._sceneTransition;
        if (!tr.active) return;

        const elapsed = performance.now() - tr.startTime;
        const t = Math.min(elapsed / tr.duration, 1);

        if (tr.phase === 'fadeOut') {
            tr.alpha = t;
            if (t >= 1) {
                // Apply new scene at full black
                const scene = this.scenes[tr.target];
                this._applyScene(scene);
                // Reset camera to center of new scene
                const cW = this.canvas.width;
                const cH = this.canvas.height;
                const worldW = this.MW * this.T * this.scale;
                const worldH = this.MH * this.T * this.scale;
                this.camera.x = (cW - worldW) / 2;
                this.camera.y = (cH - worldH) / 2;
                // Start fade-in
                tr.phase = 'fadeIn';
                tr.startTime = performance.now();
                tr.alpha = 1;
            }
        } else if (tr.phase === 'fadeIn') {
            tr.alpha = 1 - t;
            if (t >= 1) {
                tr.active = false;
                tr.alpha = 0;
                tr.phase = 'none';
            }
        }
    }

    _drawSceneTransition() {
        const tr = this._sceneTransition;
        if (!tr.active || tr.alpha <= 0) return;
        this.ctx.globalAlpha = tr.alpha;
        this.ctx.fillStyle = '#0a0e1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        // Scene name label at center during full fade
        if (tr.alpha > 0.7) {
            const scene = this.scenes[tr.target];
            if (scene) {
                this.ctx.globalAlpha = Math.min(1, (tr.alpha - 0.7) * 3.3);
                this.ctx.fillStyle = '#4ecdc4';
                this.ctx.font = '14px "Press Start 2P", monospace';
                this.ctx.textAlign = 'center';
                const label = {
                    indoor: '🏢 TÒA NHÀ',
                    outdoor: '🏞️ NGOÀI TRỜI',
                    rooftop: '🌆 TẦNG THƯỢNG',
                    cafe: '☕ QUÁN CAFE'
                }[tr.target] || tr.target.toUpperCase();
                this.ctx.fillText(label, this.canvas.width / 2, this.canvas.height / 2);
                this.ctx.textAlign = 'start';
            }
        }
        this.ctx.globalAlpha = 1;
    }

    getSceneNames() {
        return Object.keys(this.scenes);
    }

    _addIndoorCorridors(rooms) {
        if (!this._floorHalls || !this._floorHalls.length) return;

        // For each floor, fill gaps between rooms with hallway tiles
        this._floorHalls.forEach(floor => {
            const floorRooms = rooms.filter(r => r.y === floor.y).sort((a, b) => a.x - b.x);
            if (floorRooms.length < 2) return;

            for (let i = 0; i < floorRooms.length - 1; i++) {
                const left = floorRooms[i];
                const right = floorRooms[i + 1];
                const gapX1 = left.x + left.w;
                const gapX2 = right.x;
                if (gapX2 <= gapX1) continue;

                // Full-height hallway between rooms (same height as rooms)
                for (let dy = 0; dy < floor.h; dy++) {
                    for (let dx = gapX1; dx < gapX2; dx++) {
                        const ty = floor.y + dy;
                        if (ty >= 0 && ty < this.MH && this.map[ty]) {
                            this.map[ty][dx] = 'tile';
                        }
                    }
                }
            }
        });

        // Vertical stairwell connecting floors
        if (this._floorHalls.length > 1) {
            // Place stairwell at x=3 (centered in the building's left area)
            const stairX = 3;
            const stairW = 3;

            for (let i = 0; i < this._floorHalls.length - 1; i++) {
                const upper = this._floorHalls[i];
                const lower = this._floorHalls[i + 1];
                const startY = upper.y + upper.h;
                const endY = lower.y;

                for (let dy = startY; dy < endY; dy++) {
                    for (let dx = 0; dx < stairW; dx++) {
                        if (dy < this.MH && this.map[dy]) {
                            this.map[dy][stairX + dx] = 'tile';
                        }
                    }
                }
            }
        }
    }

    _furnishRoom(room) {
        const T=this.T, f=this.furniture, rx=room.x, ry=room.y;
        switch(room.id) {
            case 0: // Meeting — bonsai for sophistication
                f.push({t:'mtable',x:(rx+2)*T,y:(ry+1)*T,w:3,h:4});
                f.push({t:'mchair',x:(rx+2)*T,y:(ry+1)*T,dir:'down'},{t:'mchair',x:(rx+4)*T,y:(ry+1)*T,dir:'down'});
                f.push({t:'mchair',x:(rx+2)*T,y:(ry+5)*T,dir:'up'},{t:'mchair',x:(rx+4)*T,y:(ry+5)*T,dir:'up'});
                f.push({t:'mchair',x:(rx+1)*T,y:(ry+3)*T,dir:'right'},{t:'mchair',x:(rx+7)*T,y:(ry+3)*T,dir:'left'});
                f.push({t:'whiteboard',x:(rx+8)*T,y:ry*T});
                f.push({t:'bonsai',x:rx*T,y:ry*T},{t:'bonsai',x:rx*T,y:(ry+5)*T});
                f.push({t:'clock',x:(rx+9)*T,y:ry*T});
                break;
            case 1: // Office — 3 columns x 2 rows = 6 desks (14×8)
                [[rx+1,ry+2],[rx+5,ry+2],[rx+9,ry+2],
                 [rx+1,ry+5],[rx+5,ry+5],[rx+9,ry+5]].forEach(([dx,dy])=>{
                    f.push({t:'desk',x:dx*T,y:dy*T,slotIdx:this.deskSlots.length});
                    this.deskSlots.push({tx:dx,ty:dy,x:(dx+0.5)*T,y:(dy+0.5)*T,occupied:false,agentId:null});
                    f.push({t:'pc',x:(dx+1)*T,y:(dy-1)*T});
                });
                f.push({t:'bookshelf',x:(rx+1)*T,y:ry*T},{t:'bookshelf',x:(rx+4)*T,y:ry*T},{t:'bookshelf',x:(rx+7)*T,y:ry*T},{t:'bookshelf',x:(rx+10)*T,y:ry*T});
                f.push({t:'succulent',x:rx*T,y:ry*T},{t:'succulent',x:(rx+13)*T,y:ry*T});
                f.push({t:'painting',x:(rx+12)*T,y:ry*T});
                this.interactionPoints.push(
                    {id:'bs1',type:'bookshelf',tx:rx+1,ty:ry+1,emoji:'📖',label:'Kệ sách',effect:'xp'},
                    {id:'bs2',type:'bookshelf',tx:rx+4,ty:ry+1,emoji:'📚',label:'Kệ sách',effect:'xp'},
                    {id:'pl1',type:'plant',tx:rx,ty:ry+1,emoji:'🌿',label:'Cây xanh',effect:'mood'},
                );
                break;
            case 2: // Kitchen (10×8)
                f.push({t:'vending',x:(rx+1)*T,y:ry*T},{t:'vending',x:(rx+3)*T,y:ry*T});
                f.push({t:'coffee',x:(rx+5)*T,y:ry*T},{t:'counter',x:(rx+7)*T,y:ry*T,w:2});
                f.push({t:'fridge',x:(rx+9)*T,y:ry*T});
                f.push({t:'table_small',x:(rx+2)*T,y:(ry+3)*T},{t:'bench',x:(rx+2)*T,y:(ry+5)*T});
                f.push({t:'table_small',x:(rx+6)*T,y:(ry+3)*T},{t:'bench',x:(rx+6)*T,y:(ry+5)*T});
                f.push({t:'fern',x:rx*T,y:ry*T},{t:'fern',x:rx*T,y:(ry+6)*T});
                this.interactionPoints.push(
                    {id:'coffee1',type:'coffee',tx:rx+5,ty:ry+1,emoji:'☕',label:'Máy cà phê',effect:'energy'},
                    {id:'vend1',type:'vending',tx:rx+1,ty:ry+1,emoji:'🥤',label:'Máy bán nước',effect:'energy'},
                    {id:'fridge1',type:'fridge',tx:rx+9,ty:ry+1,emoji:'🍽️',label:'Tủ lạnh',effect:'energy'},
                    {id:'eat1',type:'table',tx:rx+3,ty:ry+4,emoji:'🍜',label:'Ăn trưa',effect:'energy'},
                );
                // NPCs
                f.push({t:'npc',x:(rx+4)*T,y:(ry+4)*T,charIndex:2,emoji:'👨‍🍳',wanderRange:3,speeches:['Hôm nay nấu gì?','Phở hay cơm?','Ai muốn cà phê?','Rửa bát đi nào!']});
                f.push({t:'npc',x:(rx+8)*T,y:(ry+5)*T,charIndex:4,emoji:'🍽️',wanderRange:2,speeches:['Ngon quá!','Nghỉ trưa thôi','Ăn no rồi..']});
                break;
            case 3: // Game Room (14×8)
                f.push({t:'poker_table',x:(rx+1)*T,y:(ry+1)*T,w:3,h:2});
                f.push({t:'billiard_table',x:(rx+7)*T,y:(ry+1)*T,w:3,h:2});
                f.push({t:'slot_machine',x:(rx+1)*T,y:(ry+5)*T,w:2,h:2});
                f.push({t:'gold_terminal',x:(rx+7)*T,y:(ry+5)*T,w:3,h:2});
                f.push({t:'palm_indoor',x:rx*T,y:ry*T},{t:'palm_indoor',x:(rx+13)*T,y:ry*T});
                f.push({t:'painting',x:(rx+5)*T,y:ry*T},{t:'vending',x:(rx+12)*T,y:(ry+4)*T});
                this.interactionPoints.push(
                    {id:'poker1',type:'poker',tx:rx+2,ty:ry+2,emoji:'🃏',label:'Bàn Poker',effect:'poker'},
                    {id:'billiard1',type:'billiard',tx:rx+8,ty:ry+2,emoji:'🎱',label:'Bàn Billiard',effect:'billiard'},
                    {id:'slot1',type:'slot',tx:rx+2,ty:ry+6,emoji:'🎰',label:'Slot Machine',effect:'slot'},
                    {id:'goldtrade1',type:'gold_trade',tx:rx+8,ty:ry+6,emoji:'📊',label:'Gold Trading',effect:'gold_trade'},
                );
                // NPCs
                f.push({t:'npc',x:(rx+3)*T,y:(ry+3)*T,charIndex:1,emoji:'🎮',wanderRange:3,speeches:['All in!','Raise!','Ván nữa đi!','GG EZ','Lucky hand!']});
                f.push({t:'npc',x:(rx+10)*T,y:(ry+3)*T,charIndex:5,emoji:'🎲',wanderRange:2,speeches:['Cue ball...','Nice shot!','Đánh lỗ rồi!']});
                break;
            case 4: // Lounge (10×8)
                f.push({t:'sofa',x:(rx+1)*T,y:(ry+2)*T},{t:'sofa',x:(rx+5)*T,y:(ry+2)*T});
                f.push({t:'armchair',x:(rx+1)*T,y:(ry+5)*T},{t:'armchair',x:(rx+8)*T,y:(ry+5)*T});
                f.push({t:'table_low',x:(rx+3)*T,y:(ry+3)*T},{t:'table_low',x:(rx+7)*T,y:(ry+3)*T});
                f.push({t:'rug',x:(rx+2)*T,y:(ry+3)*T},{t:'rug',x:(rx+6)*T,y:(ry+3)*T});
                f.push({t:'lamp',x:(rx+1)*T,y:ry*T},{t:'lamp',x:(rx+9)*T,y:ry*T});
                f.push({t:'bookshelf',x:(rx+3)*T,y:ry*T},{t:'painting',x:(rx+6)*T,y:ry*T});
                f.push({t:'palm_indoor',x:rx*T,y:ry*T},{t:'coffee',x:(rx+5)*T,y:(ry+5)*T});
                this.interactionPoints.push(
                    {id:'sofa1',type:'sofa',tx:rx+2,ty:ry+3,emoji:'😴',label:'Sofa',effect:'rest'},
                    {id:'sofa2',type:'sofa',tx:rx+6,ty:ry+3,emoji:'😴',label:'Sofa',effect:'rest'},
                    {id:'lcoffee',type:'coffee',tx:rx+5,ty:ry+6,emoji:'☕',label:'Cà phê',effect:'energy'},
                );
                // NPCs
                f.push({t:'npc',x:(rx+4)*T,y:(ry+4)*T,charIndex:3,emoji:'📖',wanderRange:2,speeches:['Đọc gì hay?','Chill thôi~','Mệt quá...','Ngủ chút']});
                break;
            case 5: // Server Room (10×8)
                for(let i=0;i<3;i++) f.push({t:'server_rack',x:(rx+1+i*3)*T,y:ry*T});
                for(let i=0;i<3;i++) f.push({t:'server_rack',x:(rx+1+i*3)*T,y:(ry+5)*T});
                f.push({t:'lamp',x:(rx+2)*T,y:(ry+3)*T},{t:'lamp',x:(rx+5)*T,y:(ry+3)*T});
                f.push({t:'clock',x:(rx+9)*T,y:ry*T});
                [[rx+1,ry+3],[rx+5,ry+3]].forEach(([dx,dy])=>{
                    f.push({t:'desk',x:dx*T,y:dy*T,slotIdx:this.deskSlots.length});
                    this.deskSlots.push({tx:dx,ty:dy,x:(dx+0.5)*T,y:(dy+0.5)*T,occupied:false,agentId:null});
                    f.push({t:'pc',x:(dx+1)*T,y:(dy-1)*T});
                });
                f.push({t:'bamboo',x:rx*T,y:ry*T},{t:'bamboo',x:(rx+9)*T,y:(ry+6)*T});
                this.interactionPoints.push(
                    {id:'srv1',type:'cabinet',tx:rx+1,ty:ry+1,emoji:'🖥️',label:'Server Rack',effect:'productivity'},
                    {id:'srv2',type:'cabinet',tx:rx+4,ty:ry+1,emoji:'🖥️',label:'Server Rack',effect:'productivity'},
                    {id:'srv3',type:'cabinet',tx:rx+7,ty:ry+6,emoji:'💻',label:'Monitoring',effect:'xp'},
                );
                break;
            case 6: // Gym (10×8)
                f.push({t:'treadmill',x:(rx+1)*T,y:(ry+1)*T},{t:'treadmill',x:(rx+4)*T,y:(ry+1)*T});
                f.push({t:'dumbbell',x:(rx+1)*T,y:(ry+4)*T},{t:'dumbbell',x:(rx+4)*T,y:(ry+4)*T});
                f.push({t:'yoga_mat',x:(rx+7)*T,y:(ry+4)*T});
                f.push({t:'bench',x:(rx+1)*T,y:(ry+6)*T},{t:'bench',x:(rx+4)*T,y:(ry+6)*T});
                f.push({t:'vending',x:(rx+8)*T,y:ry*T});
                f.push({t:'clock',x:(rx+7)*T,y:ry*T});
                f.push({t:'plant',x:rx*T,y:ry*T},{t:'vine_wall',x:(rx+9)*T,y:ry*T});
                this.interactionPoints.push(
                    {id:'gym1',type:'treadmill',tx:rx+2,ty:ry+2,emoji:'🏃',label:'Chạy bộ',effect:'energy'},
                    {id:'gym2',type:'dumbbell',tx:rx+2,ty:ry+5,emoji:'💪',label:'Tập tạ',effect:'energy'},
                    {id:'gym3',type:'yoga',tx:rx+7,ty:ry+5,emoji:'🧘',label:'Yoga',effect:'mood'},
                    {id:'gym4',type:'vending',tx:rx+8,ty:ry+1,emoji:'🥤',label:'Nước uống',effect:'energy'},
                );
                // NPCs
                f.push({t:'npc',x:(rx+6)*T,y:(ry+3)*T,charIndex:0,emoji:'🏋️',wanderRange:3,speeches:['No pain no gain!','1 hiệp nữa!','Warm up đi!','Cố lên!']});
                break;
            case 7: // Library (10×8)
                for(let i=0;i<4;i++) f.push({t:'bookshelf',x:(rx+1+i*2)*T,y:ry*T});
                f.push({t:'table_small',x:(rx+2)*T,y:(ry+3)*T},{t:'table_small',x:(rx+6)*T,y:(ry+3)*T});
                f.push({t:'armchair',x:(rx+2)*T,y:(ry+5)*T},{t:'armchair',x:(rx+6)*T,y:(ry+5)*T});
                f.push({t:'lamp',x:(rx+3)*T,y:(ry+3)*T},{t:'lamp',x:(rx+7)*T,y:(ry+3)*T});
                f.push({t:'rug',x:(rx+2)*T,y:(ry+4)*T},{t:'rug',x:(rx+6)*T,y:(ry+4)*T});
                f.push({t:'bonsai',x:rx*T,y:ry*T},{t:'bonsai',x:(rx+9)*T,y:ry*T});
                [[rx+2,ry+6],[rx+6,ry+6]].forEach(([dx,dy])=>{
                    f.push({t:'desk',x:dx*T,y:dy*T,slotIdx:this.deskSlots.length});
                    this.deskSlots.push({tx:dx,ty:dy,x:(dx+0.5)*T,y:(dy+0.5)*T,occupied:false,agentId:null});
                    f.push({t:'pc',x:(dx+1)*T,y:(dy-1)*T});
                });
                this.interactionPoints.push(
                    {id:'lib1',type:'bookshelf',tx:rx+1,ty:ry+1,emoji:'📚',label:'Thư viện',effect:'xp'},
                    {id:'lib2',type:'bookshelf',tx:rx+5,ty:ry+1,emoji:'📖',label:'Đọc sách',effect:'xp'},
                    {id:'lib3',type:'desk',tx:rx+3,ty:ry+4,emoji:'✍️',label:'Học tập',effect:'xp'},
                );
                // NPCs
                f.push({t:'npc',x:(rx+5)*T,y:(ry+4)*T,charIndex:5,emoji:'📚',wanderRange:2,speeches:['Sssh...im lặng','Sách hay lắm!','Tìm tài liệu...','Chương 3 rồi']});
                break;
            case 8: // Garden — outdoor zen
                f.push({t:'tree',x:(rx+1)*T,y:ry*T},{t:'tree',x:(rx+9)*T,y:ry*T});
                f.push({t:'fountain',x:(rx+4)*T,y:(ry+1)*T});
                f.push({t:'bamboo',x:(rx+1)*T,y:(ry+5)*T},{t:'fern',x:(rx+3)*T,y:(ry+5)*T},{t:'plant',x:(rx+5)*T,y:(ry+5)*T},{t:'fern',x:(rx+7)*T,y:(ry+5)*T},{t:'bamboo',x:(rx+9)*T,y:(ry+5)*T});
                f.push({t:'succulent',x:(rx+2)*T,y:(ry+6)*T},{t:'orchid',x:(rx+5)*T,y:(ry+6)*T},{t:'succulent',x:(rx+8)*T,y:(ry+6)*T});
                f.push({t:'bench',x:(rx+2)*T,y:(ry+3)*T},{t:'bench',x:(rx+7)*T,y:(ry+3)*T});
                f.push({t:'table_low',x:(rx+4)*T,y:(ry+4)*T});
                f.push({t:'lamp',x:(rx+11)*T,y:ry*T});
                this.interactionPoints.push(
                    {id:'garden1',type:'plant',tx:rx+5,ty:ry+2,emoji:'⛲',label:'Đài phun nước',effect:'mood'},
                    {id:'garden2',type:'plant',tx:rx+2,ty:ry+1,emoji:'🌿',label:'Vườn cây',effect:'mood'},
                );
                break;
            case 9: // VIP Lounge (10×8)
                f.push({t:'sofa',x:(rx+1)*T,y:(ry+2)*T},{t:'sofa',x:(rx+5)*T,y:(ry+2)*T});
                f.push({t:'armchair',x:(rx+1)*T,y:(ry+5)*T},{t:'armchair',x:(rx+8)*T,y:(ry+5)*T});
                f.push({t:'table_low',x:(rx+3)*T,y:(ry+2)*T},{t:'table_low',x:(rx+7)*T,y:(ry+2)*T});
                f.push({t:'rug',x:(rx+2)*T,y:(ry+3)*T},{t:'rug',x:(rx+6)*T,y:(ry+3)*T});
                f.push({t:'painting',x:(rx+3)*T,y:ry*T},{t:'painting',x:(rx+6)*T,y:ry*T});
                f.push({t:'lamp',x:(rx+1)*T,y:ry*T},{t:'lamp',x:(rx+9)*T,y:ry*T});
                f.push({t:'orchid',x:rx*T,y:ry*T},{t:'orchid',x:(rx+9)*T,y:(ry+6)*T});
                f.push({t:'coffee',x:(rx+8)*T,y:ry*T});
                this.interactionPoints.push(
                    {id:'vip1',type:'sofa',tx:rx+2,ty:ry+3,emoji:'👑',label:'VIP Sofa',effect:'rest'},
                    {id:'vip2',type:'coffee',tx:rx+8,ty:ry+1,emoji:'☕',label:'VIP Coffee',effect:'energy'},
                    {id:'vip3',type:'painting',tx:rx+5,ty:ry+1,emoji:'🎨',label:'Ngắm tranh',effect:'mood'},
                );
                break;
            case 10: // R&D Lab (14×8)
                [[rx+1,ry+2],[rx+5,ry+2],[rx+9,ry+2],[rx+1,ry+5],[rx+5,ry+5],[rx+9,ry+5]].forEach(([dx,dy])=>{
                    f.push({t:'desk',x:dx*T,y:dy*T,slotIdx:this.deskSlots.length});
                    this.deskSlots.push({tx:dx,ty:dy,x:(dx+0.5)*T,y:(dy+0.5)*T,occupied:false,agentId:null});
                    f.push({t:'pc',x:(dx+1)*T,y:(dy-1)*T});
                });
                f.push({t:'microscope',x:(rx+12)*T,y:(ry+1)*T},{t:'microscope',x:(rx+12)*T,y:(ry+5)*T});
                f.push({t:'flask',x:(rx+13)*T,y:(ry+1)*T},{t:'flask',x:(rx+13)*T,y:(ry+5)*T});
                f.push({t:'whiteboard',x:(rx+12)*T,y:(ry+3)*T});
                f.push({t:'lamp',x:(rx+3)*T,y:ry*T},{t:'lamp',x:(rx+7)*T,y:ry*T},{t:'lamp',x:(rx+11)*T,y:ry*T});
                f.push({t:'bamboo',x:rx*T,y:ry*T},{t:'bamboo',x:(rx+13)*T,y:ry*T});
                f.push({t:'clock',x:(rx+6)*T,y:ry*T});
                this.interactionPoints.push(
                    {id:'lab1',type:'bookshelf',tx:rx+12,ty:ry+2,emoji:'🔬',label:'Kính hiển vi',effect:'xp'},
                    {id:'lab2',type:'cabinet',tx:rx+13,ty:ry+2,emoji:'🧪',label:'Phòng thí nghiệm',effect:'xp'},
                    {id:'lab3',type:'desk',tx:rx+5,ty:ry+3,emoji:'💻',label:'Nghiên cứu',effect:'xp'},
                );
                break;
            case 11: // Sân Ngoài Trời — Outdoor space with nature & animals
                // Fruit trees along top
                f.push({t:'fruit_tree',x:(rx+1)*T,y:ry*T,fruit:'apple'});
                f.push({t:'fruit_tree',x:(rx+6)*T,y:ry*T,fruit:'orange'});
                f.push({t:'fruit_tree',x:(rx+11)*T,y:ry*T,fruit:'cherry'});
                f.push({t:'tree',x:(rx+16)*T,y:ry*T});
                // Parking area with vehicles
                f.push({t:'car_sedan',x:(rx+1)*T,y:(ry+1)*T});
                f.push({t:'car_van',x:(rx+5)*T,y:(ry+1)*T});
                f.push({t:'car_sport',x:(rx+10)*T,y:(ry+1)*T});
                // Flower beds (scattered)
                f.push({t:'flower_bed',x:(rx+1)*T,y:(ry+3)*T,color:'#ff6b9d'});
                f.push({t:'flower_bed',x:(rx+7)*T,y:(ry+3)*T,color:'#6c5ce7'});
                f.push({t:'flower_bed',x:(rx+13)*T,y:(ry+3)*T,color:'#ffd93d'});
                // Bushes
                f.push({t:'bush',x:(rx)*T,y:(ry+5)*T});
                f.push({t:'bush',x:(rx+17)*T,y:(ry+5)*T});
                f.push({t:'bush',x:(rx)*T,y:(ry+8)*T});
                f.push({t:'bush',x:(rx+17)*T,y:(ry+8)*T});
                // Bird bath
                f.push({t:'bird_bath',x:(rx+12)*T,y:(ry+5)*T});
                // Parasol seating areas
                f.push({t:'parasol',x:(rx+2)*T,y:(ry+4)*T},{t:'parasol',x:(rx+8)*T,y:(ry+4)*T},{t:'parasol',x:(rx+14)*T,y:(ry+4)*T});
                f.push({t:'bench',x:(rx+2)*T,y:(ry+6)*T},{t:'bench',x:(rx+8)*T,y:(ry+6)*T},{t:'bench',x:(rx+14)*T,y:(ry+6)*T});
                // BBQ area
                f.push({t:'bbq_grill',x:(rx+3)*T,y:(ry+7)*T});
                f.push({t:'table_small',x:(rx+4)*T,y:(ry+9)*T},{t:'bench',x:(rx+4)*T,y:(ry+10)*T});
                // Pond area
                f.push({t:'pond',x:(rx+10)*T,y:(ry+7)*T});
                f.push({t:'bench',x:(rx+13)*T,y:(ry+8)*T});
                // Fountain
                f.push({t:'fountain',x:(rx+14)*T,y:(ry+3)*T});
                // Street lamps
                f.push({t:'street_lamp',x:(rx)*T,y:(ry+6)*T},{t:'street_lamp',x:(rx+17)*T,y:(ry+6)*T});
                // === ANIMALS ===
                f.push({t:'animal_bird',x:(rx+3)*T,y:(ry+5)*T,birdColor:'#e67e22',bellyColor:'#fdebd0'});
                f.push({t:'animal_bird',x:(rx+9)*T,y:(ry+6)*T,birdColor:'#3498db',bellyColor:'#d6eaf8'});
                f.push({t:'animal_cat',x:(rx+5)*T,y:(ry+8)*T,catColor:'#f39c12',stripeColor:'#d68910'});
                f.push({t:'animal_dog',x:(rx+8)*T,y:(ry+9)*T,dogColor:'#8B4513',lightColor:'#d4a76a'});

                // === NÔNG TRẠI (FARM) ===
                // Farm sign
                f.push({t:'farm_sign',x:(rx+8)*T,y:(ry+10)*T});
                // Water well
                f.push({t:'water_well',x:(rx+16)*T,y:(ry+10)*T});
                // Scarecrow
                f.push({t:'scarecrow',x:(rx)*T,y:(ry+11)*T});
                // Compost bin
                f.push({t:'compost_bin',x:(rx+17)*T,y:(ry+11)*T});

                // 12 Farm plots (3 rows x 4 columns) — plotId stored for FarmManager
                for (let row = 0; row < 3; row++) {
                    for (let col = 0; col < 4; col++) {
                        const plotX = rx + 1 + col * 4;
                        const plotY = ry + 11 + row * 3;
                        f.push({t:'farm_plot', x:plotX*T, y:plotY*T, plotId: row*4+col, w:3, h:2});
                    }
                }

                // Interaction points (original + farm)
                this.interactionPoints.push(
                    {id:'outdoor1',type:'parasol',tx:rx+3,ty:ry+5,emoji:'☂️',label:'Ngồi dưới ô',effect:'rest'},
                    {id:'outdoor2',type:'bbq',tx:rx+4,ty:ry+8,emoji:'🍖',label:'Nướng BBQ',effect:'energy'},
                    {id:'outdoor3',type:'pond',tx:rx+11,ty:ry+8,emoji:'🐟',label:'Ngắm cá',effect:'mood'},
                    {id:'outdoor4',type:'plant',tx:rx+15,ty:ry+4,emoji:'⛲',label:'Đài phun nước',effect:'mood'},
                    {id:'outdoor5',type:'car',tx:rx+3,ty:ry+2,emoji:'🚗',label:'Bãi đỗ xe',effect:'mood'},
                    {id:'outdoor6',type:'animal',tx:rx+9,ty:ry+7,emoji:'🐕',label:'Chơi với thú cưng',effect:'mood'},
                    {id:'outdoor7',type:'fruit',tx:rx+4,ty:ry+1,emoji:'🍎',label:'Hái trái cây',effect:'energy'},
                    // Farm interaction points
                    {id:'farm1',type:'farm_plot',tx:rx+3,ty:ry+12,emoji:'🌱',label:'Luống rau 1',effect:'farm'},
                    {id:'farm2',type:'farm_plot',tx:rx+7,ty:ry+12,emoji:'🌱',label:'Luống rau 2',effect:'farm'},
                    {id:'farm3',type:'farm_plot',tx:rx+11,ty:ry+12,emoji:'🌱',label:'Luống rau 3',effect:'farm'},
                    {id:'farm4',type:'farm_plot',tx:rx+15,ty:ry+12,emoji:'🌱',label:'Luống rau 4',effect:'farm'},
                    {id:'well1',type:'water_well',tx:rx+16,ty:ry+11,emoji:'💧',label:'Giếng nước',effect:'energy'},
                );
                // NPCs
                f.push({t:'npc',x:(rx+6)*T,y:(ry+5)*T,charIndex:2,emoji:'🚶',wanderRange:5,speeches:['Trời đẹp quá!','Hít thở nào~','Dạo chơi tí']});
                f.push({t:'npc',x:(rx+12)*T,y:(ry+7)*T,charIndex:4,emoji:'🌻',wanderRange:4,speeches:['Tưới cây thôi','Hoa nở rồi!','Cỏ mọc quá!']});
                f.push({t:'npc',x:(rx+4)*T,y:(ry+9)*T,charIndex:0,emoji:'🧑‍🌾',wanderRange:3,speeches:['Thu hoạch nào!','Đất tốt lắm','Gieo hạt đi!']});
                break;
            case 12: // Elevator (5×8)
                f.push({t:'elevator_door',x:(rx+1)*T,y:(ry+1)*T});
                f.push({t:'elevator_panel',x:(rx+3)*T,y:(ry+1)*T});
                f.push({t:'lamp',x:rx*T,y:ry*T},{t:'lamp',x:(rx+4)*T,y:ry*T});
                f.push({t:'clock',x:(rx+2)*T,y:ry*T});
                this.interactionPoints.push(
                    {id:'elev1',type:'elevator',tx:rx+2,ty:ry+3,emoji:'🛗',label:'Thang máy',effect:'energy'},
                );
                break;
            case 14: // Quán Cafe — Cozy cafe with bar counter, tables, pastries
                // Bar counter (left side)
                f.push({t:'cafe_counter',x:(rx+1)*T,y:(ry+1)*T,w:4,h:2});
                f.push({t:'coffee',x:(rx+1)*T,y:ry*T});
                f.push({t:'coffee',x:(rx+3)*T,y:ry*T});
                // Bar stools
                f.push({t:'chair',x:(rx+1)*T,y:(ry+3)*T});
                f.push({t:'chair',x:(rx+3)*T,y:(ry+3)*T});
                f.push({t:'chair',x:(rx+5)*T,y:(ry+3)*T});
                // Cafe tables (center area)
                f.push({t:'table_small',x:(rx+2)*T,y:(ry+5)*T});
                f.push({t:'chair',x:(rx+1)*T,y:(ry+5)*T,dir:'right'});
                f.push({t:'chair',x:(rx+4)*T,y:(ry+5)*T,dir:'left'});
                f.push({t:'table_small',x:(rx+7)*T,y:(ry+5)*T});
                f.push({t:'chair',x:(rx+6)*T,y:(ry+5)*T,dir:'right'});
                f.push({t:'chair',x:(rx+9)*T,y:(ry+5)*T,dir:'left'});
                f.push({t:'table_small',x:(rx+12)*T,y:(ry+5)*T});
                f.push({t:'chair',x:(rx+11)*T,y:(ry+5)*T,dir:'right'});
                f.push({t:'chair',x:(rx+14)*T,y:(ry+5)*T,dir:'left'});
                // Sofa lounge area (right side)
                f.push({t:'sofa',x:(rx+10)*T,y:(ry+1)*T});
                f.push({t:'sofa',x:(rx+13)*T,y:(ry+1)*T});
                f.push({t:'table_low',x:(rx+11)*T,y:(ry+3)*T});
                // Window tables (bottom row)
                f.push({t:'table_small',x:(rx+2)*T,y:(ry+8)*T});
                f.push({t:'chair',x:(rx+1)*T,y:(ry+8)*T,dir:'right'});
                f.push({t:'chair',x:(rx+4)*T,y:(ry+8)*T,dir:'left'});
                f.push({t:'table_small',x:(rx+7)*T,y:(ry+8)*T});
                f.push({t:'chair',x:(rx+6)*T,y:(ry+8)*T,dir:'right'});
                f.push({t:'chair',x:(rx+9)*T,y:(ry+8)*T,dir:'left'});
                f.push({t:'sofa',x:(rx+12)*T,y:(ry+8)*T});
                f.push({t:'table_low',x:(rx+12)*T,y:(ry+10)*T});
                // Decorations
                f.push({t:'fern',x:rx*T,y:ry*T},{t:'fern',x:(rx+15)*T,y:ry*T});
                f.push({t:'fern',x:rx*T,y:(ry+10)*T},{t:'fern',x:(rx+15)*T,y:(ry+10)*T});
                f.push({t:'painting',x:(rx+7)*T,y:ry*T});
                f.push({t:'painting2',x:(rx+9)*T,y:ry*T});
                f.push({t:'pictureframe',x:(rx+6)*T,y:ry*T});
                f.push({t:'hanging_plant',x:(rx+5)*T,y:ry*T});
                f.push({t:'hanging_plant',x:(rx+10)*T,y:ry*T});
                // Pastry display
                f.push({t:'vending',x:(rx+7)*T,y:(ry+1)*T});
                // Interaction points
                this.interactionPoints.push(
                    {id:'cafe1',type:'coffee',tx:rx+2,ty:ry+2,emoji:'☕',label:'Espresso Bar',effect:'energy'},
                    {id:'cafe2',type:'coffee',tx:rx+4,ty:ry+2,emoji:'🧋',label:'Trà sữa',effect:'energy'},
                    {id:'cafe3',type:'rest',tx:rx+11,ty:ry+2,emoji:'🛋️',label:'Sofa nghỉ ngơi',effect:'rest'},
                    {id:'cafe4',type:'food',tx:rx+8,ty:ry+2,emoji:'🧁',label:'Bánh ngọt',effect:'energy'},
                    {id:'cafe5',type:'social',tx:rx+3,ty:ry+6,emoji:'💬',label:'Chat bạn bè',effect:'mood'},
                    {id:'cafe6',type:'social',tx:rx+8,ty:ry+6,emoji:'📰',label:'Đọc báo',effect:'xp'},
                    {id:'cafe7',type:'rest',tx:rx+13,ty:ry+9,emoji:'🎵',label:'Nghe nhạc chill',effect:'mood'},
                );
                // NPCs
                f.push({t:'npc',x:(rx+3)*T,y:(ry+3)*T,charIndex:3,emoji:'☕',wanderRange:3,speeches:['Latte nóng nhé!','Trà sữa không?','Order gì ạ?','Cà phê sáng~']});
                f.push({t:'npc',x:(rx+8)*T,y:(ry+7)*T,charIndex:1,emoji:'💻',wanderRange:3,speeches:['Wifi mạnh ghê','Làm việc chút','Quán đẹp thật','Ngồi cả ngày!']});
                f.push({t:'npc',x:(rx+12)*T,y:(ry+4)*T,charIndex:5,emoji:'📱',wanderRange:2,speeches:['Check mail...','Story mới nè','Selfie nào!','Like nhiều quá']});
                break;
            case 13: // Tầng Thượng — Rooftop terrace with telescope, antenna, helipad
                // Telescope area (left)
                f.push({t:'telescope',x:(rx+1)*T,y:(ry+1)*T});
                f.push({t:'bench',x:(rx+1)*T,y:(ry+3)*T});
                // Antenna/satellite (right)
                f.push({t:'antenna',x:(rx+14)*T,y:ry*T},{t:'antenna',x:(rx+16)*T,y:ry*T});
                // Helipad (center) + Helicopter!
                f.push({t:'helipad',x:(rx+6)*T,y:(ry+3)*T});
                f.push({t:'helicopter',x:(rx+7)*T,y:(ry+3)*T});
                // Lounge area
                f.push({t:'parasol',x:(rx+2)*T,y:(ry+5)*T},{t:'parasol',x:(rx+8)*T,y:(ry+5)*T});
                f.push({t:'sofa',x:(rx+2)*T,y:(ry+7)*T},{t:'sofa',x:(rx+8)*T,y:(ry+7)*T});
                f.push({t:'table_low',x:(rx+5)*T,y:(ry+7)*T},{t:'table_low',x:(rx+11)*T,y:(ry+7)*T});
                // BBQ corner
                f.push({t:'bbq_grill',x:(rx+14)*T,y:(ry+6)*T});
                f.push({t:'table_small',x:(rx+14)*T,y:(ry+8)*T},{t:'bench',x:(rx+14)*T,y:(ry+9)*T});
                // Plants & decor
                f.push({t:'palm_indoor',x:rx*T,y:ry*T},{t:'palm_indoor',x:(rx+17)*T,y:ry*T});
                f.push({t:'orchid',x:rx*T,y:(ry+8)*T},{t:'orchid',x:(rx+17)*T,y:(ry+8)*T});
                f.push({t:'street_lamp',x:(rx+4)*T,y:(ry+5)*T},{t:'street_lamp',x:(rx+10)*T,y:(ry+5)*T},{t:'street_lamp',x:(rx+16)*T,y:(ry+5)*T});
                f.push({t:'cactus',x:(rx+12)*T,y:(ry+8)*T},{t:'cactus',x:(rx+13)*T,y:(ry+8)*T});
                // Rooftop garden: flowers & fruit tree
                f.push({t:'flower_bed',x:(rx+3)*T,y:(ry+8)*T,color:'#e74c3c'});
                f.push({t:'flower_bed',x:(rx+9)*T,y:(ry+8)*T,color:'#3498db'});
                f.push({t:'fruit_tree',x:(rx+18)*T,y:(ry+3)*T,fruit:'lemon'});
                f.push({t:'bush',x:(rx+18)*T,y:(ry+7)*T});
                // Rooftop birds
                f.push({t:'animal_bird',x:(rx+5)*T,y:(ry+2)*T,birdColor:'#ecf0f1',bellyColor:'#bdc3c7'});
                f.push({t:'animal_bird',x:(rx+13)*T,y:(ry+4)*T,birdColor:'#f1c40f',bellyColor:'#fef9e7'});
                this.interactionPoints.push(
                    {id:'roof1',type:'telescope',tx:rx+2,ty:ry+2,emoji:'🔭',label:'Kính thiên văn',effect:'xp'},
                    {id:'roof2',type:'helipad',tx:rx+8,ty:ry+5,emoji:'🚁',label:'Trực thăng',effect:'mood'},
                    {id:'roof3',type:'antenna',tx:rx+15,ty:ry+1,emoji:'📡',label:'Ăng-ten',effect:'xp'},
                    {id:'roof4',type:'parasol',tx:rx+3,ty:ry+6,emoji:'☂️',label:'Ngồi ngắm cảnh',effect:'rest'},
                    {id:'roof5',type:'bbq',tx:rx+15,ty:ry+7,emoji:'🍖',label:'BBQ Rooftop',effect:'energy'},
                );
                // NPCs
                f.push({t:'npc',x:(rx+4)*T,y:(ry+6)*T,charIndex:1,emoji:'🌙',wanderRange:4,speeches:['Ngắm sao đẹp!','View đỉnh thật','Gió mát quá~','Chụp ảnh nào!']});
                f.push({t:'npc',x:(rx+12)*T,y:(ry+7)*T,charIndex:3,emoji:'🍻',wanderRange:3,speeches:['Cheers!','Nướng thêm đi','BBQ time!']});
                break;
        }
    }

    rebuildMap(unlockedRooms) {
        this.furniture = [];
        this.deskSlots = [];
        this.interactionPoints = [];
        this.interactionFx = [];
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
            'carpet': 'floor_3',
            'grass': 'floor_4',
            'metal': 'floor_5',
            'concrete': 'floor_6'
        };
        for (let y = 0; y < this.MH; y++) {
            for (let x = 0; x < this.MW; x++) {
                const fl = this.map[y][x];
                if (!fl) continue;
                
                const px = x * T;
                const py = y * T;

                // Wall tiles get a special dark brick appearance
                if (fl === 'wall') {
                    this.px(px, py, T, T, '#1a2035');
                    // Brick pattern lines
                    this.px(px, py, T, 1, '#2a3550');
                    this.px(px, py + Math.floor(T/2), T, 1, '#2a3550');
                    this.px(px + Math.floor(T/2), py, 1, Math.floor(T/2), '#2a3550');
                    this.px(px, py + Math.floor(T/2), 1, Math.floor(T/2), '#2a3550');
                    continue;
                }

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
                    this.px(px, py, T, T, fl === 'wood' ? '#a0794a' : fl === 'tile' ? '#e8e0d0' : fl === 'grass' ? '#4a7c3f' : fl === 'metal' ? '#7a7a8a' : fl === 'concrete' ? '#8a8a8a' : '#4a6a8a');
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
                if (!map[y][x] || map[y][x] === 'wall') continue;
                const hasFloor = (tx, ty) => tx >= 0 && ty >= 0 && tx < this.MW && ty < this.MH && map[ty][tx] && map[ty][tx] !== 'wall';
                
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

    _drawRoomLabels() {
        if (!this._placedRooms) return;
        const T = this.T;
        const ctx = this.ctx;
        const roomNames = {
            0: '🤝 PHÒNG HỌP',
            1: '💻 VĂN PHÒNG',
            2: '🍳 PHÒNG BẾP',
            3: '🎮 PHÒNG GAME',
            4: '🛋️ LOUNGE',
            5: '🖥️ SERVER ROOM',
            6: '💪 PHÒNG GYM',
            7: '📚 THƯ VIỆN',
            8: '🌿 VƯỜN CÂY',
            9: '👑 VIP LOUNGE',
            10: '🔬 PHÒNG R&D',
            11: '🌳 SÂN NGOÀI',
            12: '🛗 THANG MÁY',
            13: '🌆 TẦNG THƯỢNG',
            14: '☕ QUÁN CAFE',
        };

        ctx.save();
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.textAlign = 'center';

        this._placedRooms.forEach(r => {
            const name = roomNames[r.id];
            if (!name) return;

            const cx = (r.x + r.w / 2) * T;
            const cy = r.y * T - 4;  // just above the room

            const sx = Math.floor(cx * this.scale + this.camera.x);
            const sy = Math.floor(cy * this.scale + this.camera.y);

            // Background strip
            const textW = ctx.measureText(name).width;
            ctx.fillStyle = 'rgba(13, 17, 23, 0.75)';
            ctx.fillRect(sx - textW / 2 - 6, sy - 8, textW + 12, 14);

            // Accent line below label
            ctx.fillStyle = '#4ecdc4';
            ctx.fillRect(sx - textW / 2 - 6, sy + 5, textW + 12, 1);

            // Text
            ctx.fillStyle = '#e0e6ed';
            ctx.fillText(name, sx, sy + 2);
        });

        ctx.restore();
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
            case 'slot_machine': this.drawSlotMachine(x, y); break;
            case 'gold_terminal': this.drawGoldTerminal(x, y); break;
            // Room-specific assets
            case 'treadmill': this.drawTreadmill(x, y); break;
            case 'dumbbell': this.drawDumbbell(x, y); break;
            case 'yoga_mat': this.drawYogaMat(x, y); break;
            case 'server_rack': this.drawServerRack(x, y); break;
            case 'microscope': this.drawMicroscope(x, y); break;
            case 'flask': this.drawFlask(x, y); break;
            case 'fountain': this.drawFountain(x, y); break;
            case 'tree': this.drawTree(x, y); break;
            // New areas furniture
            case 'parasol': this.drawParasol(x, y); break;
            case 'bbq_grill': this.drawBBQ(x, y); break;
            case 'pond': this.drawPond(x, y); break;
            case 'elevator_door': this.drawElevatorDoor(x, y); break;
            case 'elevator_panel': this.drawElevatorPanel(x, y); break;
            case 'telescope': this.drawTelescope(x, y); break;
            case 'antenna': this.drawAntenna(x, y); break;
            case 'helipad': this.drawHelipad(x, y); break;
            case 'bench_outdoor': this.drawBenchOutdoor(x, y); break;
            // Vehicles
            case 'helicopter': this.drawHelicopter(x, y); break;
            case 'car_sedan': this.drawCarSedan(x, y); break;
            case 'car_van': this.drawCarVan(x, y); break;
            case 'car_sport': this.drawCarSport(x, y); break;
            // Nature & Flora
            case 'fruit_tree': this.drawFruitTree(x, y, f.fruit || 'apple'); break;
            case 'flower_bed': this.drawFlowerBed(x, y, f.color || '#ff6b9d'); break;
            case 'bush': this.drawBush(x, y); break;
            case 'bird_bath': this.drawBirdBath(x, y); break;
            // Animated Animals
            case 'animal_bird': this.drawAnimalBird(f); break;
            case 'animal_cat': this.drawAnimalCat(f); break;
            case 'animal_dog': this.drawAnimalDog(f); break;
            // NPCs (wandering characters)
            case 'npc': this.drawNpc(f); break;
            // Street furniture
            case 'street_lamp': this.drawStreetLamp(x, y); break;
            // Farm objects
            case 'farm_plot': this.drawFarmPlot(f); break;
            case 'farm_sign': this.drawFarmSign(x, y); break;
            case 'scarecrow': this.drawScarecrow(x, y); break;
            case 'water_well': this.drawWaterWell(x, y); break;
            case 'compost_bin': this.drawCompostBin(x, y); break;
            // Cafe
            case 'cafe_counter': this.drawCafeCounter(x, y, f.w || 6); break;
            // Themed plants
            case 'bamboo': this.drawBamboo(x, y); break;
            case 'succulent': this.drawSucculent(x, y); break;
            case 'bonsai': this.drawBonsai(x, y); break;
            case 'palm_indoor': this.drawPalmIndoor(x, y); break;
            case 'fern': this.drawFern(x, y); break;
            case 'orchid': this.drawOrchid(x, y); break;
            case 'vine_wall': this.drawVineWall(x, y); break;
            case 'money_tree': this.drawMoneyTree(x, y); break;
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

    drawSlotMachine(x, y) {
        const T = this.T;
        const w = T * 2, h = T * 3;
        // Machine body
        this.px(x, y, w, h, '#8B0000');
        this.px(x + 1, y + 1, w - 2, h - 2, '#a01010');
        // Top header — "SLOTS"
        this.px(x + 2, y + 2, w - 4, 6, '#ffd93d');
        this.px(x + 3, y + 3, w - 6, 4, '#ffaa00');
        // Three reel windows
        const reelW = 6, reelH = 8;
        const reelY = y + 10;
        for (let r = 0; r < 3; r++) {
            const rx = x + 3 + r * (reelW + 2);
            this.px(rx, reelY, reelW, reelH, '#1a1a2e');
            this.px(rx + 1, reelY + 1, reelW - 2, reelH - 2, '#0d0d1a');
            // Animated symbol lines
            const frame = Math.floor(this.elapsed * 0.05 + r * 17) % 5;
            const symColors = ['#ff6b6b', '#ffd93d', '#4ecdc4', '#6c5ce7', '#78e08f'];
            this.px(rx + 1, reelY + 2 + frame, reelW - 2, 2, symColors[frame]);
        }
        // Payline indicator
        const flash = Math.floor(this.elapsed * 0.04) % 2;
        if (flash) {
            this.px(x + 1, reelY + reelH / 2 - 1, w - 2, 1, 'rgba(255,217,61,0.6)');
        }
        // Handle/lever
        this.px(x + w, y + 8, 3, 2, '#888');
        this.px(x + w + 1, y + 10, 1, 12, '#666');
        this.px(x + w, y + 22, 3, 3, '#e74c3c');
        // Coin slot
        this.px(x + w / 2 - 2, y + h - 10, 4, 2, '#333');
        this.px(x + w / 2 - 1, y + h - 9, 2, 1, '#555');
        // Tray at bottom
        this.px(x + 2, y + h - 5, w - 4, 4, '#222');
        this.px(x + 3, y + h - 4, w - 6, 2, '#333');
        // Decorative lights (animated)
        const lightPhase = Math.floor(this.elapsed * 0.06) % 4;
        const lightColors = ['#ff6b6b', '#ffd93d', '#4ecdc4', '#6c5ce7'];
        for (let i = 0; i < 4; i++) {
            const lx = x + 2 + i * 7;
            this.px(lx, y + h - 2, 2, 1, lightColors[(i + lightPhase) % 4]);
        }
        // Animated glow effect
        if (Math.floor(this.elapsed * 0.03) % 3 === 0) {
            this.px(x - 1, y - 1, w + 2, 1, 'rgba(255,217,61,0.15)');
            this.px(x - 1, y + h, w + 2, 1, 'rgba(255,217,61,0.15)');
        }
    }

    drawGoldTerminal(x, y) {
        const T = this.T;
        const w = T * 3, h = T * 3;
        // Terminal body
        this.px(x, y, w, h, '#1a1a2e');
        this.px(x + 1, y + 1, w - 2, h - 2, '#16213e');
        // Screen
        const scX = x + 3, scY = y + 3;
        const scW = w - 6, scH = h - 16;
        this.px(scX, scY, scW, scH, '#0a1628');
        this.px(scX + 1, scY + 1, scW - 2, scH - 2, '#0d1f33');
        // Mini chart lines (animated)
        const chartY = scY + scH - 3;
        let prevPy = 0;
        for (let i = 0; i < scW - 4; i++) {
            const wave = Math.sin(this.elapsed * 0.008 + i * 0.5) * 4 +
                         Math.sin(this.elapsed * 0.015 + i * 0.3) * 2;
            const py = Math.floor(chartY - 4 - wave);
            const isUp = i > 0 ? py <= prevPy : true;
            this.px(scX + 2 + i, py, 1, chartY - py, isUp ? 'rgba(0,212,170,0.4)' : 'rgba(255,71,87,0.4)');
            this.px(scX + 2 + i, py, 1, 1, isUp ? '#00d4aa' : '#ff4757');
            prevPy = py;
        }
        // Price display
        const priceFlash = Math.floor(this.elapsed * 0.03) % 2;
        this.px(scX + 2, scY + 2, 12, 3, priceFlash ? '#00d4aa' : '#ffd93d');
        // "XAU" label
        this.px(scX + scW - 10, scY + 2, 8, 2, '#6c5ce7');
        // Keyboard area
        this.px(x + 3, y + h - 11, w - 6, 4, '#2a2a3a');
        this.px(x + 4, y + h - 10, w - 8, 2, '#3a3a4a');
        // Buy/Sell buttons
        this.px(x + 4, y + h - 6, (w - 10) / 2, 3, '#00d4aa');
        this.px(x + w / 2 + 1, y + h - 6, (w - 10) / 2, 3, '#ff4757');
        // Status LED
        const ledOn = Math.floor(this.elapsed * 0.04) % 3 !== 0;
        this.px(x + w - 5, y + 2, 2, 2, ledOn ? '#00d4aa' : '#333');
        // Gold bars decoration at base
        this.px(x + 3, y + h - 2, 4, 2, '#ffd93d');
        this.px(x + 8, y + h - 2, 4, 2, '#ffaa00');
        // Animated ticker line at bottom of screen
        const tickerOffset = Math.floor(this.elapsed * 0.1) % scW;
        this.px(scX + tickerOffset, scY + scH - 2, 3, 1, '#ffd93d');
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

    // === NEW AREAS FURNITURE ===

    drawParasol(x, y) {
        const T = this.T;
        // Pole
        this.px(x + 7, y + 6, 2, T + 2, '#8B6914');
        this.px(x + 6, y + T + 7, 4, 2, '#7a5a10');
        // Umbrella canopy (animated slight sway)
        const sw = Math.sin(this.elapsed * 0.012 + x) * 0.5;
        this.px(x - 2 + sw, y, 20, 3, '#e74c3c');
        this.px(x + sw, y + 1, 16, 2, '#c0392b');
        this.px(x + 2 + sw, y + 3, 12, 1, '#a93226');
        // Stripe pattern
        this.px(x + 2 + sw, y, 3, 3, '#f5f5f5');
        this.px(x + 8 + sw, y, 3, 3, '#f5f5f5');
        this.px(x + 14 + sw, y, 3, 3, '#f5f5f5');
        // Shadow
        this.ctx.globalAlpha = 0.15;
        this.px(x - 1, y + T + 8, 18, 4, '#000');
        this.ctx.globalAlpha = 1;
    }

    drawBBQ(x, y) {
        const T = this.T;
        // Legs
        this.px(x + 2, y + T - 2, 2, 4, '#555');
        this.px(x + 10, y + T - 2, 2, 4, '#555');
        // Body
        this.px(x, y + 4, 14, T - 6, '#2c2c2c');
        this.px(x + 1, y + 5, 12, T - 8, '#3a3a3a');
        // Grill lines
        for (let i = 0; i < 5; i++) {
            this.px(x + 2, y + 6 + i * 2, 10, 1, '#555');
        }
        // Food on grill (animated sizzle)
        const sizzle = Math.floor(this.elapsed * 0.06) % 3;
        this.px(x + 3, y + 6, 2, 2, '#c0392b');  // steak
        this.px(x + 6, y + 7, 3, 1, '#f39c12');  // sausage
        this.px(x + 9, y + 6, 2, 2, '#e67e22');  // chicken
        // Smoke (animated)
        if (sizzle !== 2) {
            this.ctx.globalAlpha = 0.3;
            this.px(x + 3 + sizzle, y + 1, 2, 4, '#ccc');
            this.px(x + 7 - sizzle, y - 1, 2, 5, '#bbb');
            this.px(x + 10, y + 2 - sizzle, 1, 3, '#aaa');
            this.ctx.globalAlpha = 1;
        }
        // Handle
        this.px(x + 13, y + 6, 3, 2, '#777');
        this.px(x + 14, y + 5, 2, 1, '#888');
    }

    drawPond(x, y) {
        const T = this.T;
        const w = T * 3, h = T * 2;
        // Pond border (stones)
        this.px(x + 2, y + 1, w - 4, h - 2, '#7f8c8d');
        this.px(x + 1, y + 3, w - 2, h - 6, '#7f8c8d');
        // Water
        this.px(x + 3, y + 3, w - 6, h - 6, '#2980b9');
        this.px(x + 4, y + 4, w - 8, h - 8, '#3498db');
        // Lily pads
        this.px(x + 5, y + 5, 3, 2, '#27ae60');
        this.px(x + w - 10, y + h - 7, 3, 2, '#2ecc71');
        // Animated ripples
        const rip = Math.floor(this.elapsed * 0.04) % 4;
        this.ctx.globalAlpha = 0.3;
        this.px(x + 8 + rip, y + 6, 4, 1, '#85c1e9');
        this.px(x + 12 - rip, y + h - 6, 3, 1, '#aed6f1');
        this.ctx.globalAlpha = 1;
        // Fish (animated swimming)
        const fishX = (Math.floor(this.elapsed * 0.03) % (w - 12)) + 4;
        this.px(x + fishX, y + h - 8, 3, 1, '#f39c12');
        this.px(x + fishX + 3, y + h - 9, 1, 1, '#e67e22');
        // Second fish opposite direction
        const fishX2 = w - 6 - (Math.floor(this.elapsed * 0.025) % (w - 12));
        this.px(x + fishX2, y + 7, 3, 1, '#e74c3c');
        this.px(x + fishX2 - 1, y + 6, 1, 1, '#c0392b');
    }

    drawElevatorDoor(x, y) {
        const T = this.T;
        const w = T * 2.5, h = T * 3;
        // Frame
        this.px(x, y, w, h, '#4a4a5a');
        this.px(x + 1, y + 1, w - 2, h - 2, '#5a5a6a');
        // Doors (two panels)
        const halfW = (w - 6) / 2;
        // Animated door opening/closing
        const doorPhase = Math.floor(this.elapsed * 0.015) % 80;
        let gap = 0;
        if (doorPhase < 10) gap = doorPhase * 0.5;
        else if (doorPhase < 20) gap = 5;
        else if (doorPhase < 30) gap = 5 - (doorPhase - 20) * 0.5;
        // Left door
        this.px(x + 3 - gap, y + 3, halfW, h - 6, '#8a8a9a');
        this.px(x + 4 - gap, y + 4, halfW - 2, h - 8, '#9a9aaa');
        // Right door
        this.px(x + 3 + halfW + gap, y + 3, halfW, h - 6, '#8a8a9a');
        this.px(x + 4 + halfW + gap, y + 4, halfW - 2, h - 8, '#9a9aaa');
        // Center line
        if (gap < 1) {
            this.px(x + w / 2 - 1, y + 3, 2, h - 6, '#6a6a7a');
        }
        // Door handles
        this.px(x + w / 2 - 4, y + h / 2, 2, 4, '#c0c0d0');
        this.px(x + w / 2 + 2, y + h / 2, 2, 4, '#c0c0d0');
        // Top indicator (floor number)
        this.px(x + w / 2 - 4, y + 1, 8, 3, '#1a1a2e');
        // LED indicator (animated)
        const ledColor = doorPhase < 20 ? '#2ecc71' : '#e74c3c';
        this.px(x + w / 2 - 2, y + 2, 4, 1, ledColor);
        // Arrow indicators
        const arrowUp = Math.floor(this.elapsed * 0.02) % 2;
        this.px(x + w / 2 - 1, y - 1, 2, 1, arrowUp ? '#4ecdc4' : '#333');
    }

    drawElevatorPanel(x, y) {
        const T = this.T;
        // Wall-mounted panel
        this.px(x, y, 8, 16, '#4a4a5a');
        this.px(x + 1, y + 1, 6, 14, '#5a5a6a');
        // Floor buttons (3 rows)
        const buttonColors = ['#2ecc71', '#f39c12', '#e74c3c'];
        for (let i = 0; i < 3; i++) {
            const by = y + 3 + i * 4;
            this.px(x + 2, by, 4, 3, '#333');
            // Active button (animated)
            const active = Math.floor(this.elapsed * 0.02) % 3 === i;
            this.px(x + 3, by + 1, 2, 1, active ? buttonColors[i] : '#555');
        }
        // Screen at top
        this.px(x + 2, y + 1, 4, 2, '#1a1a2e');
        const floorNum = Math.floor(this.elapsed * 0.01) % 3 + 1;
        this.px(x + 3, y + 1, 2, 1, '#4ecdc4');
    }

    drawTelescope(x, y) {
        const T = this.T;
        // Tripod legs
        this.px(x + 3, y + 12, 2, 6, '#666');
        this.px(x + 9, y + 12, 2, 6, '#666');
        this.px(x + 6, y + 14, 2, 4, '#666');
        // Tripod center hub
        this.px(x + 4, y + 11, 6, 3, '#555');
        // Telescope tube (angled)
        this.px(x + 2, y + 3, 10, 4, '#7f8c8d');
        this.px(x + 3, y + 4, 8, 2, '#95a5a6');
        // Objective lens
        this.px(x, y + 3, 3, 4, '#2c3e50');
        this.px(x + 1, y + 4, 1, 2, '#87ceeb');
        // Eyepiece
        this.px(x + 11, y + 4, 3, 2, '#2c3e50');
        // Finder scope
        this.px(x + 5, y + 1, 4, 2, '#555');
        this.px(x + 6, y, 2, 2, '#444');
        this.px(x + 6, y, 1, 1, '#87ceeb');
        // Star sparkle near lens (animated)
        if (Math.floor(this.elapsed * 0.04) % 3 === 0) {
            this.px(x - 2, y + 2, 1, 1, '#ffd93d');
            this.px(x - 1, y + 5, 1, 1, '#ffd93d');
        }
    }

    drawAntenna(x, y) {
        const T = this.T;
        // Main pole
        this.px(x + 6, y + 2, 2, T + 10, '#7f8c8d');
        this.px(x + 7, y + 3, 1, T + 8, '#95a5a6');
        // Cross bars
        this.px(x + 2, y + 4, 10, 2, '#6a6a7a');
        this.px(x + 3, y + 8, 8, 2, '#6a6a7a');
        this.px(x + 4, y + 12, 6, 1, '#6a6a7a');
        // Dish elements on bars
        this.px(x + 1, y + 3, 3, 3, '#bdc3c7');
        this.px(x + 10, y + 3, 3, 3, '#bdc3c7');
        this.px(x + 2, y + 7, 2, 2, '#95a5a6');
        this.px(x + 10, y + 7, 2, 2, '#95a5a6');
        // Top beacon light (animated blink)
        const beacon = Math.floor(this.elapsed * 0.06) % 4;
        const beaconColor = beacon === 0 ? '#e74c3c' : beacon === 2 ? '#ff6b6b' : '#551111';
        this.px(x + 6, y, 2, 2, beaconColor);
        // Signal waves (animated)
        if (beacon < 2) {
            this.ctx.globalAlpha = 0.2;
            this.px(x + 3, y - 1, 1, 1, '#4ecdc4');
            this.px(x + 11, y - 1, 1, 1, '#4ecdc4');
            this.px(x + 1, y + 1, 1, 1, '#4ecdc4');
            this.px(x + 13, y + 1, 1, 1, '#4ecdc4');
            this.ctx.globalAlpha = 1;
        }
        // Base plate
        this.px(x + 3, y + T + 11, 8, 2, '#555');
    }

    drawHelipad(x, y) {
        const T = this.T;
        const size = T * 4;
        // Concrete pad
        this.px(x, y, size, size, '#6a6a6a');
        this.px(x + 2, y + 2, size - 4, size - 4, '#7a7a7a');
        // Circle border
        const cx = x + size / 2, cy = y + size / 2, r = size / 2 - 4;
        // Draw octagon approximation of circle
        this.px(x + 8, y + 2, size - 16, 2, '#f1c40f');
        this.px(x + 8, y + size - 4, size - 16, 2, '#f1c40f');
        this.px(x + 2, y + 8, 2, size - 16, '#f1c40f');
        this.px(x + size - 4, y + 8, 2, size - 16, '#f1c40f');
        // Diagonal corners
        this.px(x + 4, y + 4, 4, 4, '#f1c40f');
        this.px(x + size - 8, y + 4, 4, 4, '#f1c40f');
        this.px(x + 4, y + size - 8, 4, 4, '#f1c40f');
        this.px(x + size - 8, y + size - 8, 4, 4, '#f1c40f');
        // "H" letter in center
        const hx = x + size / 2 - 6, hy = y + size / 2 - 6;
        this.px(hx, hy, 3, 12, '#f5f5f5');
        this.px(hx + 9, hy, 3, 12, '#f5f5f5');
        this.px(hx + 3, hy + 5, 6, 2, '#f5f5f5');
        // Landing lights (animated)
        const lightPhase = Math.floor(this.elapsed * 0.04) % 4;
        const lc = ['#e74c3c', '#f39c12', '#2ecc71', '#3498db'];
        this.px(x + 2, y + 2, 2, 2, lc[lightPhase]);
        this.px(x + size - 4, y + 2, 2, 2, lc[(lightPhase + 1) % 4]);
        this.px(x + 2, y + size - 4, 2, 2, lc[(lightPhase + 2) % 4]);
        this.px(x + size - 4, y + size - 4, 2, 2, lc[(lightPhase + 3) % 4]);
    }

    drawBenchOutdoor(x, y) {
        const T = this.T;
        // Stone/concrete bench
        this.px(x, y + 4, T * 2, 6, '#95a5a6');
        this.px(x + 1, y + 5, T * 2 - 2, 4, '#bdc3c7');
        // Legs
        this.px(x + 2, y + 10, 3, 4, '#7f8c8d');
        this.px(x + T * 2 - 5, y + 10, 3, 4, '#7f8c8d');
        // Backrest
        this.px(x, y, T * 2, 4, '#7f8c8d');
        this.px(x + 1, y + 1, T * 2 - 2, 2, '#95a5a6');
    }

    // === VEHICLES ===

    drawHelicopter(x, y) {
        const T = this.T;
        // Shadow
        this.ctx.globalAlpha = 0.15;
        this.px(x - 4, y + T * 2 + 6, T * 3 + 8, 6, '#000');
        this.ctx.globalAlpha = 1;
        // Landing skids
        this.px(x + 2, y + T * 2 + 2, T * 2.5, 2, '#555');
        this.px(x + 4, y + T * 2 - 2, 2, 4, '#666');
        this.px(x + T * 2, y + T * 2 - 2, 2, 4, '#666');
        // Body (fuselage)
        this.px(x + 4, y + T, T * 2, T, '#2c3e50');
        this.px(x + 5, y + T + 1, T * 2 - 2, T - 2, '#34495e');
        // Cockpit glass
        this.px(x + 6, y + T + 2, 8, T - 4, '#87ceeb');
        this.px(x + 7, y + T + 3, 6, T - 6, '#aee1f9');
        // Glass shine
        this.px(x + 7, y + T + 3, 2, 2, 'rgba(255,255,255,0.4)');
        // Tail boom
        this.px(x + T * 2 + 4, y + T + 2, T, 3, '#3d566e');
        this.px(x + T * 2 + 4, y + T + 3, T + 2, 2, '#2c3e50');
        // Tail rotor (animated)
        const tailSpin = Math.floor(this.elapsed * 0.2) % 4;
        const tailOffset = [-3, 0, 3, 0][tailSpin];
        this.px(x + T * 3 + 4, y + T - 1 + tailOffset, 2, 8, '#95a5a6');
        this.px(x + T * 3 + 3, y + T + 2, 4, 2, '#7f8c8d');
        // Main rotor mast
        this.px(x + T + 2, y + T - 2, 3, 4, '#555');
        // Main rotor blades (animated spin)
        const spin = Math.floor(this.elapsed * 0.25) % 6;
        this.ctx.globalAlpha = 0.7;
        if (spin < 2) {
            // Horizontal position
            this.px(x - 8, y + T - 3, T * 3 + 16, 2, '#7f8c8d');
            this.px(x - 6, y + T - 2, T * 3 + 12, 1, '#95a5a6');
        } else if (spin < 4) {
            // Diagonal
            this.px(x - 4, y + T - 5, T * 3 + 8, 2, '#7f8c8d');
            this.px(x + 2, y + T - 1, T * 2, 2, '#95a5a6');
        } else {
            // Other diagonal
            this.px(x - 2, y + T - 1, T * 3 + 4, 2, '#7f8c8d');
            this.px(x + 4, y + T - 4, T, 2, '#95a5a6');
        }
        this.ctx.globalAlpha = 1;
        // Rotor disc blur effect
        this.ctx.globalAlpha = 0.06;
        this.px(x - 10, y + T - 6, T * 3 + 20, 8, '#87ceeb');
        this.ctx.globalAlpha = 1;
        // Company logo stripe
        this.px(x + 8, y + T + T - 2, T, 1, '#e74c3c');
        this.px(x + 8, y + T + T - 1, T, 1, '#f1c40f');
    }

    drawCarSedan(x, y) {
        const T = this.T;
        // Shadow
        this.ctx.globalAlpha = 0.12;
        this.px(x - 1, y + T + 4, T * 2.5 + 2, 4, '#000');
        this.ctx.globalAlpha = 1;
        // Body
        this.px(x + 2, y + 6, T * 2, T - 2, '#2980b9');
        this.px(x + 3, y + 7, T * 2 - 2, T - 4, '#3498db');
        // Roof
        this.px(x + 6, y + 2, T, 5, '#2471a3');
        this.px(x + 7, y + 3, T - 2, 3, '#87ceeb');
        // Windshield
        this.px(x + 5, y + 4, 3, 3, '#aed6f1');
        this.px(x + T + 4, y + 4, 3, 3, '#aed6f1');
        // Wheels
        this.px(x + 3, y + T + 2, 4, 4, '#222');
        this.px(x + 4, y + T + 3, 2, 2, '#555');
        this.px(x + T + 7, y + T + 2, 4, 4, '#222');
        this.px(x + T + 8, y + T + 3, 2, 2, '#555');
        // Headlights
        this.px(x + 2, y + 8, 2, 2, '#f1c40f');
        // Taillights
        this.px(x + T * 2, y + 8, 2, 2, '#e74c3c');
        // Shine
        this.px(x + 8, y + 3, 3, 1, 'rgba(255,255,255,0.3)');
    }

    drawCarVan(x, y) {
        const T = this.T;
        // Shadow
        this.ctx.globalAlpha = 0.12;
        this.px(x - 1, y + T + 6, T * 2.5 + 2, 4, '#000');
        this.ctx.globalAlpha = 1;
        // Body (taller than sedan)
        this.px(x + 1, y + 2, T * 2.2, T + 4, '#ecf0f1');
        this.px(x + 2, y + 3, T * 2.2 - 2, T + 2, '#f0f0f0');
        // Roof
        this.px(x + 2, y, T * 2.2 - 2, 3, '#bdc3c7');
        // Windows
        this.px(x + 3, y + 3, 4, 4, '#87ceeb');
        this.px(x + 9, y + 3, 4, 4, '#87ceeb');
        this.px(x + 15, y + 3, 4, 4, '#87ceeb');
        // Side stripe
        this.px(x + 2, y + 8, T * 2, 2, '#e74c3c');
        this.px(x + 2, y + 10, T * 2, 1, '#c0392b');
        // Company text area
        this.px(x + 5, y + 9, 6, 1, '#f5f5f5');
        // Wheels
        this.px(x + 3, y + T + 4, 5, 5, '#222');
        this.px(x + 4, y + T + 5, 3, 3, '#555');
        this.px(x + T + 6, y + T + 4, 5, 5, '#222');
        this.px(x + T + 7, y + T + 5, 3, 3, '#555');
        // Headlights
        this.px(x + 1, y + 6, 2, 3, '#f1c40f');
        // Taillights
        this.px(x + T * 2, y + 6, 2, 3, '#e74c3c');
    }

    drawCarSport(x, y) {
        const T = this.T;
        // Shadow
        this.ctx.globalAlpha = 0.12;
        this.px(x - 1, y + T + 2, T * 2.5 + 2, 4, '#000');
        this.ctx.globalAlpha = 1;
        // Low body (sport car)
        this.px(x + 1, y + 6, T * 2.2, T - 4, '#c0392b');
        this.px(x + 2, y + 7, T * 2.2 - 2, T - 6, '#e74c3c');
        // Roof (very low)
        this.px(x + 7, y + 4, T - 2, 3, '#a93226');
        this.px(x + 8, y + 4, T - 4, 2, '#85c1e9');
        // Front windshield
        this.px(x + 5, y + 5, 3, 2, '#aed6f1');
        // Rear window
        this.px(x + T + 3, y + 5, 3, 2, '#aed6f1');
        // Spoiler
        this.px(x + T * 2, y + 5, 3, 1, '#922b21');
        this.px(x + T * 2 + 1, y + 4, 1, 2, '#7b241c');
        // Wheels (low profile)
        this.px(x + 3, y + T, 4, 4, '#1a1a1a');
        this.px(x + 4, y + T + 1, 2, 2, '#c0c0c0');
        this.px(x + T + 6, y + T, 4, 4, '#1a1a1a');
        this.px(x + T + 7, y + T + 1, 2, 2, '#c0c0c0');
        // Headlights (aggressive)
        this.px(x + 1, y + 7, 2, 1, '#f1c40f');
        this.px(x + 1, y + 9, 2, 1, '#f1c40f');
        // Taillights
        this.px(x + T * 2 + 1, y + 7, 2, 1, '#ff3333');
        this.px(x + T * 2 + 1, y + 9, 2, 1, '#ff3333');
        // Racing stripe
        this.px(x + 4, y + 7, T + 6, 1, '#f5f5f5');
        // Shine
        this.px(x + 8, y + 5, 4, 1, 'rgba(255,255,255,0.35)');
    }

    // === NATURE & FLORA ===
    drawFruitTree(x, y, fruit) {
        const T = this.T;
        // Trunk
        this.px(x + 5, y + T, 5, T, '#5d3a1a');
        this.px(x + 6, y + T, 3, T, '#7a4d28');
        // Root bumps
        this.px(x + 3, y + T * 2 - 2, 3, 2, '#5d3a1a');
        this.px(x + 9, y + T * 2 - 2, 3, 2, '#5d3a1a');
        // Canopy layers
        const sway = Math.sin(this.elapsed * 0.02) * 0.5;
        this.px(x - 2 + sway, y - 6, T + 4, T + 2, '#2d6a2e');
        this.px(x - 1 + sway, y - 4, T + 2, T, '#3a8c3e');
        this.px(x + 1 + sway, y - 2, T - 2, T - 2, '#4a9e4a');
        // Highlight
        this.px(x + 2 + sway, y - 5, 4, 3, '#5cb85c');
        // Fruits
        const fruitColors = {
            apple: '#e74c3c', orange: '#f39c12', cherry: '#c0392b',
            lemon: '#f1c40f', plum: '#8e44ad', peach: '#f5b7b1'
        };
        const fc = fruitColors[fruit] || '#e74c3c';
        const bob = Math.sin(this.elapsed * 0.03) * 1;
        this.px(x + sway, y - 3 + bob, 3, 3, fc);
        this.px(x + 7 + sway, y - 1 + bob * 0.7, 3, 3, fc);
        this.px(x + 3 + sway, y + 2 - bob * 0.5, 3, 3, fc);
        this.px(x + 10 + sway, y + 1 + bob, 2, 2, fc);
        // Fruit shine
        this.px(x + 1 + sway, y - 2 + bob, 1, 1, 'rgba(255,255,255,0.5)');
        this.px(x + 8 + sway, y + bob * 0.7, 1, 1, 'rgba(255,255,255,0.5)');
    }

    drawFlowerBed(x, y, color) {
        const T = this.T;
        // Soil bed
        this.px(x, y + T - 4, T, 4, '#4a3520');
        this.px(x + 1, y + T - 3, T - 2, 2, '#5c422e');
        // Flowers with swaying
        const colors = [color, '#ffd93d', '#ff6b9d', '#78e08f', '#6c5ce7'];
        for (let i = 0; i < 4; i++) {
            const fx = x + 2 + i * 3;
            const sway = Math.sin(this.elapsed * 0.025 + i * 1.5) * 1;
            const fc = colors[i % colors.length];
            // Stem
            this.px(fx + 1, y + 4 + sway * 0.3, 1, T - 8, '#2d8a2e');
            // Petals
            this.px(fx + sway, y + 2, 3, 3, fc);
            this.px(fx + 1 + sway, y + 1, 1, 1, fc);
            this.px(fx + sway, y + 3, 1, 1, fc);
            this.px(fx + 2 + sway, y + 3, 1, 1, fc);
            // Center
            this.px(fx + 1 + sway, y + 3, 1, 1, '#f1c40f');
        }
    }

    drawBush(x, y) {
        const T = this.T;
        const sway = Math.sin(this.elapsed * 0.015) * 0.5;
        // Bush body
        this.px(x + 1 + sway, y + 4, T - 2, T - 6, '#2d7a2e');
        this.px(x + 2 + sway, y + 2, T - 4, T - 4, '#3a8c3e');
        this.px(x + 3 + sway, y + 3, T - 6, T - 6, '#4a9e4a');
        // Highlights
        this.px(x + 4 + sway, y + 3, 3, 2, '#5cb85c');
        this.px(x + 2 + sway, y + 6, 2, 1, '#5cb85c');
        // Small berries
        if (Math.sin(this.elapsed * 0.01) > 0) {
            this.px(x + 3 + sway, y + 5, 2, 2, '#c0392b');
            this.px(x + 8 + sway, y + 4, 2, 2, '#c0392b');
        }
    }

    // === THEMED PLANT DRAWING METHODS ===

    drawBamboo(x, y) {
        const T = this.T, sw = Math.sin(this.elapsed * 0.02 + x) * 0.8;
        // Pot
        this.px(x + 2, y + T * 2 - 6, 10, 6, '#6d4c2e');
        this.px(x + 3, y + T * 2 - 5, 8, 4, '#8b6340');
        // Stalks (3 bamboo poles)
        for (let i = 0; i < 3; i++) {
            const bx = x + 3 + i * 3;
            const sway = sw * (1 + i * 0.3);
            // Main stalk
            this.px(bx + sway, y + 2, 2, T * 2 - 8, '#2d8a2e');
            this.px(bx + 1 + sway, y + 3, 1, T * 2 - 10, '#3aad3e');
            // Nodes (joints)
            this.px(bx - 1 + sway, y + T * 0.5, 4, 1, '#1e6b20');
            this.px(bx - 1 + sway, y + T, 4, 1, '#1e6b20');
            // Leaves at top
            this.px(bx - 2 + sway, y + 1, 3, 2, '#27ae60');
            this.px(bx + 2 + sway, y, 3, 2, '#2ecc71');
            this.px(bx - 1 + sway, y + T * 0.3, 2, 1, '#32d967');
        }
    }

    drawSucculent(x, y) {
        const T = this.T;
        // Small terracotta pot
        this.px(x + 3, y + T - 5, 8, 5, '#c0724a');
        this.px(x + 4, y + T - 4, 6, 3, '#d4845c');
        this.px(x + 2, y + T - 5, 10, 1, '#a85d3a');
        // Rosette leaves (layered circles from bottom)
        const pulse = Math.sin(this.elapsed * 0.008) * 0.5;
        // Outer ring
        this.px(x + 2, y + T - 9, 10, 4, '#5ba85b');
        this.px(x + 3, y + T - 10, 8, 3, '#6bc06b');
        // Middle ring
        this.px(x + 4 + pulse, y + T - 11, 6, 3, '#7ed67e');
        // Center rosette
        this.px(x + 5, y + T - 11, 4, 2, '#92e892');
        this.px(x + 6, y + T - 12, 2, 2, '#a8f0a8');
        // Tiny highlight
        this.px(x + 6, y + T - 12, 1, 1, '#c8ffc8');
    }

    drawBonsai(x, y) {
        const T = this.T, sw = Math.sin(this.elapsed * 0.012 + x) * 0.5;
        // Ceramic pot (flat, elegant)
        this.px(x + 1, y + T * 2 - 5, 12, 5, '#5a4a3a');
        this.px(x + 2, y + T * 2 - 4, 10, 3, '#6e5c4a');
        this.px(x + 0, y + T * 2 - 5, 14, 1, '#4a3a2a');
        this.px(x + 3, y + T * 2 - 1, 8, 1, '#4a3a2a');
        // Trunk (curved bonsai style)
        this.px(x + 6, y + T, 2, T - 5, '#6d4c2e');
        this.px(x + 5, y + T * 0.8, 2, 3, '#7d5c3e');
        this.px(x + 4, y + T * 0.6, 2, 3, '#6d4c2e');
        // Crown (shaped cloud)
        this.px(x + 1 + sw, y + T * 0.2, 6, 5, '#1a6b2a');
        this.px(x + 2 + sw, y + T * 0.1, 4, 3, '#228b35');
        this.px(x + 7 + sw, y + T * 0.35, 5, 4, '#1f7a30');
        this.px(x + 8 + sw, y + T * 0.25, 3, 3, '#27a040');
        // Highlight dots
        this.px(x + 3 + sw, y + T * 0.15, 1, 1, '#3bbd55');
        this.px(x + 9 + sw, y + T * 0.3, 1, 1, '#3bbd55');
    }

    drawPalmIndoor(x, y) {
        const T = this.T, sw = Math.sin(this.elapsed * 0.018 + x) * 1.2;
        // Decorative pot
        this.px(x + 3, y + T * 2 - 6, 8, 6, '#8b7355');
        this.px(x + 4, y + T * 2 - 5, 6, 4, '#a08868');
        this.px(x + 2, y + T * 2 - 6, 10, 1, '#7a6245');
        // Trunk (slightly curved)
        this.px(x + 6, y + T * 0.5, 2, T * 1.2, '#8d6e4a');
        this.px(x + 7, y + T * 0.6, 1, T, '#a0805a');
        // Palm fronds (radiating from top)
        // Left fronds
        this.px(x + sw, y + 2, 7, 2, '#228B22');
        this.px(x - 1 + sw, y + 4, 5, 1, '#1a7a1a');
        this.px(x + 1 + sw, y + 1, 4, 1, '#2ecc71');
        // Right fronds
        this.px(x + 7 + sw, y + 1, 6, 2, '#228B22');
        this.px(x + 9 + sw, y + 3, 4, 1, '#1a7a1a');
        this.px(x + 8 + sw, y, 4, 1, '#2ecc71');
        // Top tuft
        this.px(x + 4 + sw, y, 5, 2, '#27ae60');
        this.px(x + 5 + sw, y - 1, 3, 2, '#2ecc71');
    }

    drawFern(x, y) {
        const T = this.T, sw = Math.sin(this.elapsed * 0.02 + x) * 0.6;
        // Hanging basket / pot
        this.px(x + 2, y + T * 2 - 5, 10, 5, '#7a5a3a');
        this.px(x + 3, y + T * 2 - 4, 8, 3, '#8d6d4a');
        // Cascading fronds (fern leaves drooping)
        for (let i = 0; i < 5; i++) {
            const fx = x + 1 + i * 2.5;
            const sway = sw * (1 + Math.sin(i) * 0.5);
            const droopY = y + T * 0.3 + i * 1.5;
            // Main frond
            this.px(fx + sway, droopY, 2, T * 0.8, '#2d7a2e');
            // Leaflets (alternating sides)
            for (let j = 0; j < 4; j++) {
                const ly = droopY + j * 3;
                this.px(fx - 1 + sway, ly, 1, 2, '#3a9e3e');
                this.px(fx + 2 + sway, ly + 1, 1, 2, '#3a9e3e');
            }
        }
        // Top crown
        this.px(x + 3 + sw, y + T * 0.1, 8, 3, '#27ae60');
        this.px(x + 4 + sw, y, 6, 2, '#2ecc71');
    }

    drawOrchid(x, y) {
        const T = this.T, sw = Math.sin(this.elapsed * 0.015 + x) * 0.4;
        // Elegant slim pot
        this.px(x + 4, y + T * 2 - 6, 6, 6, '#dcd0c0');
        this.px(x + 5, y + T * 2 - 5, 4, 4, '#ece0d0');
        this.px(x + 3, y + T * 2 - 6, 8, 1, '#c4b8a8');
        // Thin stem
        this.px(x + 6, y + T * 0.5, 1, T, '#3a7a3a');
        this.px(x + 7, y + T * 0.4, 1, T * 0.3, '#4a8a4a');
        // Orchid flowers (elegant petals)
        const colors = ['#d946a8', '#e468b8', '#c83898'];
        for (let i = 0; i < 3; i++) {
            const fx = x + 3 + i * 3 + sw;
            const fy = y + 2 + i * 2.5;
            const c = colors[i];
            // Petals
            this.px(fx, fy, 4, 3, c);
            this.px(fx + 1, fy - 1, 2, 1, c);
            this.px(fx, fy + 2, 1, 1, c);
            this.px(fx + 3, fy + 2, 1, 1, c);
            // Center
            this.px(fx + 1, fy + 1, 2, 1, '#f1c40f');
        }
        // Leaves at base
        this.px(x + 3, y + T * 1.2, 4, 3, '#2d7a2e');
        this.px(x + 7, y + T * 1.3, 4, 3, '#3a8e3e');
    }

    drawVineWall(x, y) {
        const T = this.T;
        // Wall trellis (wooden frame)
        this.px(x + 1, y, 2, T * 2, '#8b6d4a');
        this.px(x + T - 3, y, 2, T * 2, '#8b6d4a');
        this.px(x + 1, y + T * 0.5, T - 2, 1, '#8b6d4a');
        this.px(x + 1, y + T, T - 2, 1, '#8b6d4a');
        this.px(x + 1, y + T * 1.5, T - 2, 1, '#8b6d4a');
        // Climbing vines (ivy pattern)
        for (let i = 0; i < 6; i++) {
            const vx = x + 2 + (i % 3) * 3;
            const vy = y + 1 + i * 3;
            const sway = Math.sin(this.elapsed * 0.01 + i * 1.2) * 0.3;
            // Vine tendrils
            this.px(vx + sway, vy, 2, 3, '#27783a');
            // Leaves
            this.px(vx - 1 + sway, vy + 1, 2, 2, '#2ecc71');
            this.px(vx + 2 + sway, vy, 2, 2, '#27ae60');
            // Highlight
            this.px(vx + sway, vy, 1, 1, '#3beb5c');
        }
    }

    drawMoneyTree(x, y) {
        const T = this.T, sw = Math.sin(this.elapsed * 0.013 + x) * 0.5;
        // Ornate pot (golden rim)
        this.px(x + 2, y + T * 2 - 6, 10, 6, '#a0392e');
        this.px(x + 3, y + T * 2 - 5, 8, 4, '#b84a3e');
        this.px(x + 1, y + T * 2 - 6, 12, 1, '#d4a017');
        this.px(x + 2, y + T * 2 - 1, 10, 1, '#d4a017');
        // Braided trunk
        for (let i = 0; i < 5; i++) {
            const ty = y + T * 0.5 + i * 3;
            this.px(x + 5 + (i % 2), ty, 2, 3, '#8b6d4a');
            this.px(x + 7 - (i % 2), ty, 2, 3, '#7a5c3a');
        }
        // Round money leaves (jade green)
        const lx = x + sw;
        this.px(lx + 2, y + 2, 4, 3, '#1a8a2e');
        this.px(lx + 7, y + 1, 4, 3, '#228b35');
        this.px(lx + 1, y + 5, 3, 3, '#27ae60');
        this.px(lx + 9, y + 4, 3, 3, '#2ecc71');
        this.px(lx + 4, y, 3, 2, '#32d967');
        this.px(lx + 6, y + 6, 3, 2, '#27ae60');
        // Golden coin highlights (prosperity!)
        const blink = Math.sin(this.elapsed * 0.04) > 0.5;
        if (blink) {
            this.px(lx + 3, y + 3, 2, 1, '#f1c40f');
            this.px(lx + 8, y + 2, 2, 1, '#f1c40f');
            this.px(lx + 5, y + 1, 1, 1, '#f39c12');
        }
    }

    drawBirdBath(x, y) {
        const T = this.T;
        // Pedestal
        this.px(x + 5, y + T, 5, T - 2, '#95a5a6');
        this.px(x + 4, y + T * 2 - 4, 7, 3, '#7f8c8d');
        // Bowl
        this.px(x + 1, y + T - 4, T - 2, 5, '#bdc3c7');
        this.px(x + 2, y + T - 3, T - 4, 3, '#ecf0f1');
        // Water
        const ripple = Math.sin(this.elapsed * 0.04) * 1;
        this.px(x + 3 + ripple, y + T - 2, T - 6 - ripple, 1, '#74b9ff');
        this.px(x + 4, y + T - 3, T - 8, 1, '#a8d8ff');
    }

    drawStreetLamp(x, y) {
        const T = this.T;
        // Base plate
        this.px(x + 3, y + T * 2 - 3, 9, 3, '#5a5a5a');
        this.px(x + 4, y + T * 2 - 2, 7, 2, '#6b6b6b');
        // Pole (tall, dark metal)
        this.px(x + 6, y + 4, 3, T * 2 - 7, '#4a4a4a');
        this.px(x + 7, y + 4, 1, T * 2 - 7, '#5a5a5a');
        // Curved arm (extends right)
        this.px(x + 8, y + 4, 4, 2, '#4a4a4a');
        this.px(x + 11, y + 3, 2, 2, '#4a4a4a');
        // Curved arm (extends left)
        this.px(x + 3, y + 4, 4, 2, '#4a4a4a');
        this.px(x + 2, y + 3, 2, 2, '#4a4a4a');
        // Lamp head right
        this.px(x + 11, y + 4, 3, 4, '#3a3a3a');
        this.px(x + 12, y + 5, 1, 2, '#ffeaa7');
        // Lamp head left
        this.px(x + 1, y + 4, 3, 4, '#3a3a3a');
        this.px(x + 2, y + 5, 1, 2, '#ffeaa7');
        // Lamp bulb glow (animated warm light)
        const glow = 0.3 + Math.sin(this.elapsed * 0.03) * 0.1;
        this.ctx.globalAlpha = glow;
        this.px(x + 10, y + 5, 5, 3, '#ffeaa7');
        this.px(x, y + 5, 5, 3, '#ffeaa7');
        this.ctx.globalAlpha = 1;
        // Light cone on ground (right)
        this.ctx.globalAlpha = 0.08 + Math.sin(this.elapsed * 0.02) * 0.02;
        this.px(x + 8, y + T * 2 - 5, 8, 4, '#ffeaa7');
        // Light cone on ground (left)
        this.px(x - 1, y + T * 2 - 5, 8, 4, '#ffeaa7');
        this.ctx.globalAlpha = 1;
        // Ornamental top
        this.px(x + 6, y + 2, 3, 2, '#5a5a5a');
        this.px(x + 7, y + 1, 1, 2, '#6b6b6b');
    }

    // === ANIMATED ANIMALS ===
    drawAnimalBird(f) {
        const T = this.T;
        // Initialize movement state
        if (!f._animalInit) {
            f._animalInit = true;
            f._baseX = f.x; f._baseY = f.y;
            f._wanderX = f.x; f._wanderY = f.y;
            f._nextMove = this.elapsed + 30 + Math.random() * 60;
            f._flying = false; f._flyY = 0;
        }
        // Wander logic
        if (this.elapsed > f._nextMove) {
            f._nextMove = this.elapsed + 40 + Math.random() * 80;
            let wx = f._baseX, wy = f._baseY;
            for (let a = 0; a < 5; a++) {
                const cx = f._baseX + (Math.random() - 0.5) * T * 3;
                const cy = f._baseY + (Math.random() - 0.5) * T * 1.5;
                if (this.isPositionWalkable(cx, cy)) { wx = cx; wy = cy; break; }
            }
            f._wanderX = wx; f._wanderY = wy;
            f._flying = Math.random() < 0.3;
        }
        // Move toward target
        const dx = f._wanderX - f.x, dy = f._wanderY - f.y;
        const d = Math.sqrt(dx*dx + dy*dy);
        if (d > 1) {
            const nx = f.x + dx * 0.02 * this.deltaTime;
            const ny = f.y + dy * 0.02 * this.deltaTime;
            if (f._flying || this.isPositionWalkable(nx, ny)) {
                f.x = nx; f.y = ny;
            } else {
                f._wanderX = f.x; f._wanderY = f.y;
                f._nextMove = this.elapsed + 15;
            }
        }
        const x = f.x, y = f.y;
        const flapAnim = Math.sin(this.elapsed * 0.3) > 0;
        const flyOff = f._flying ? Math.sin(this.elapsed * 0.08) * 6 : 0;
        const birdColor = f.birdColor || '#e67e22';
        const bellyColor = f.bellyColor || '#fdebd0';

        // Shadow
        this.ctx.globalAlpha = 0.15;
        this.px(x + 1, y + T - 1 - flyOff * 0.3, 6, 2, '#000');
        this.ctx.globalAlpha = 1;
        // Body
        this.px(x + 1, y + 4 - flyOff, 6, 5, birdColor);
        this.px(x + 2, y + 5 - flyOff, 4, 3, bellyColor);
        // Head
        this.px(x + 5, y + 2 - flyOff, 4, 4, birdColor);
        this.px(x + 6, y + 3 - flyOff, 2, 2, bellyColor);
        // Eye
        this.px(x + 7, y + 3 - flyOff, 1, 1, '#1a1a1a');
        // Beak
        this.px(x + 9, y + 4 - flyOff, 2, 1, '#f39c12');
        // Wings
        if (f._flying || flapAnim) {
            this.px(x - 1, y + 3 - flyOff - 2, 3, 2, birdColor);
            this.px(x + 6, y + 3 - flyOff - 2, 3, 2, birdColor);
        } else {
            this.px(x, y + 5 - flyOff, 2, 3, birdColor);
        }
        // Tail
        this.px(x - 1, y + 5 - flyOff, 2, 2, birdColor);
        // Legs (only on ground)
        if (!f._flying) {
            this.px(x + 3, y + 9 - flyOff, 1, 3, '#e67e22');
            this.px(x + 5, y + 9 - flyOff, 1, 3, '#e67e22');
            this.px(x + 2, y + 11 - flyOff, 3, 1, '#e67e22');
            this.px(x + 4, y + 11 - flyOff, 3, 1, '#e67e22');
        }
    }

    drawAnimalCat(f) {
        const T = this.T;
        if (!f._animalInit) {
            f._animalInit = true;
            f._baseX = f.x; f._baseY = f.y;
            f._wanderX = f.x; f._wanderY = f.y;
            f._nextMove = this.elapsed + 60 + Math.random() * 120;
            f._sitting = Math.random() < 0.5;
        }
        if (this.elapsed > f._nextMove) {
            f._nextMove = this.elapsed + 80 + Math.random() * 150;
            let wx = f._baseX, wy = f._baseY;
            for (let a = 0; a < 5; a++) {
                const cx = f._baseX + (Math.random() - 0.5) * T * 2.5;
                const cy = f._baseY + (Math.random() - 0.5) * T * 1.5;
                if (this.isPositionWalkable(cx, cy)) { wx = cx; wy = cy; break; }
            }
            f._wanderX = wx; f._wanderY = wy;
            f._sitting = Math.random() < 0.4;
        }
        const dx = f._wanderX - f.x, dy = f._wanderY - f.y;
        const d = Math.sqrt(dx*dx + dy*dy);
        if (d > 1 && !f._sitting) {
            const nx = f.x + dx * 0.015 * this.deltaTime;
            const ny = f.y + dy * 0.015 * this.deltaTime;
            if (this.isPositionWalkable(nx, ny)) {
                f.x = nx; f.y = ny;
            } else {
                f._wanderX = f.x; f._wanderY = f.y;
                f._sitting = true;
                f._nextMove = this.elapsed + 30;
            }
        }
        const x = f.x, y = f.y;
        const catColor = f.catColor || '#f39c12';
        const stripe = f.stripeColor || '#d68910';
        const tailWag = Math.sin(this.elapsed * 0.05) * 3;

        // Shadow
        this.ctx.globalAlpha = 0.12;
        this.px(x + 1, y + T + 1, 10, 2, '#000');
        this.ctx.globalAlpha = 1;

        if (f._sitting) {
            // Sitting cat
            // Body (round)
            this.px(x + 2, y + 4, 7, 8, catColor);
            this.px(x + 3, y + 5, 5, 6, catColor);
            // Stripes
            this.px(x + 3, y + 5, 1, 5, stripe);
            this.px(x + 6, y + 5, 1, 5, stripe);
            // Head
            this.px(x + 3, y, 6, 5, catColor);
            this.px(x + 4, y + 1, 4, 3, catColor);
            // Ears
            this.px(x + 3, y - 2, 2, 3, catColor);
            this.px(x + 7, y - 2, 2, 3, catColor);
            this.px(x + 3, y - 1, 1, 2, '#ffb6c1');
            this.px(x + 8, y - 1, 1, 2, '#ffb6c1');
            // Eyes
            const blink = Math.sin(this.elapsed * 0.02) > 0.95;
            if (!blink) {
                this.px(x + 4, y + 2, 2, 1, '#2ecc71');
                this.px(x + 7, y + 2, 2, 1, '#2ecc71');
                this.px(x + 5, y + 2, 1, 1, '#1a1a1a');
                this.px(x + 7, y + 2, 1, 1, '#1a1a1a');
            }
            // Nose
            this.px(x + 6, y + 3, 1, 1, '#ffb6c1');
            // Tail (curled)
            this.px(x + 8, y + 8 + tailWag * 0.3, 3, 2, catColor);
            this.px(x + 10, y + 7 + tailWag * 0.5, 2, 2, catColor);
        } else {
            // Walking cat
            const walkFrame = Math.floor(this.elapsed * 0.1) % 2;
            // Body
            this.px(x + 2, y + 4, 9, 5, catColor);
            this.px(x + 3, y + 5, 7, 3, catColor);
            // Stripes
            this.px(x + 4, y + 4, 1, 4, stripe);
            this.px(x + 7, y + 4, 1, 4, stripe);
            // Head
            this.px(x, y + 1, 5, 5, catColor);
            // Ears
            this.px(x, y - 1, 2, 2, catColor);
            this.px(x + 3, y - 1, 2, 2, catColor);
            this.px(x + 1, y - 1, 1, 1, '#ffb6c1');
            this.px(x + 3, y - 1, 1, 1, '#ffb6c1');
            // Eyes
            this.px(x + 1, y + 2, 1, 1, '#2ecc71');
            this.px(x + 3, y + 2, 1, 1, '#2ecc71');
            // Nose
            this.px(x + 2, y + 3, 1, 1, '#ffb6c1');
            // Legs (animated walk)
            const legOff = walkFrame * 2;
            this.px(x + 3, y + 9 + legOff, 2, 3 - legOff, catColor);
            this.px(x + 7, y + 9 - legOff, 2, 3 + legOff, catColor);
            // Paws
            this.px(x + 3, y + 11, 2, 1, '#ecf0f1');
            this.px(x + 7, y + 11, 2, 1, '#ecf0f1');
            // Tail
            this.px(x + 10, y + 3 + tailWag, 2, 2, catColor);
            this.px(x + 11, y + 2 + tailWag, 2, 2, catColor);
        }
    }

    drawAnimalDog(f) {
        const T = this.T;
        if (!f._animalInit) {
            f._animalInit = true;
            f._baseX = f.x; f._baseY = f.y;
            f._wanderX = f.x; f._wanderY = f.y;
            f._nextMove = this.elapsed + 40 + Math.random() * 80;
            f._sitting = false;
        }
        if (this.elapsed > f._nextMove) {
            f._nextMove = this.elapsed + 50 + Math.random() * 100;
            // Try walkable targets
            let wx = f._baseX, wy = f._baseY;
            for (let a = 0; a < 5; a++) {
                const cx = f._baseX + (Math.random() - 0.5) * T * 3;
                const cy = f._baseY + (Math.random() - 0.5) * T * 1.5;
                if (this.isPositionWalkable(cx, cy)) { wx = cx; wy = cy; break; }
            }
            f._wanderX = wx; f._wanderY = wy;
            f._sitting = Math.random() < 0.3;
        }
        const dx = f._wanderX - f.x, dy = f._wanderY - f.y;
        const d = Math.sqrt(dx*dx + dy*dy);
        if (d > 1 && !f._sitting) {
            const nx = f.x + dx * 0.018 * this.deltaTime;
            const ny = f.y + dy * 0.018 * this.deltaTime;
            if (this.isPositionWalkable(nx, ny)) {
                f.x = nx; f.y = ny;
            } else {
                f._wanderX = f.x; f._wanderY = f.y;
                f._sitting = true;
                f._nextMove = this.elapsed + 20;
            }
        }
        const x = f.x, y = f.y;
        const dogColor = f.dogColor || '#8B4513';
        const lightColor = f.lightColor || '#d4a76a';
        const tailWag = Math.sin(this.elapsed * 0.15) * 4;
        const pant = Math.sin(this.elapsed * 0.1) > 0;

        // Shadow
        this.ctx.globalAlpha = 0.12;
        this.px(x, y + T + 2, 12, 3, '#000');
        this.ctx.globalAlpha = 1;

        if (f._sitting) {
            // Sitting dog
            // Body
            this.px(x + 2, y + 3, 8, 9, dogColor);
            this.px(x + 3, y + 6, 6, 5, lightColor);
            // Head
            this.px(x + 1, y - 2, 7, 6, dogColor);
            this.px(x + 2, y - 1, 5, 4, dogColor);
            // Snout
            this.px(x + 3, y + 2, 3, 3, lightColor);
            // Nose
            this.px(x + 4, y + 2, 2, 1, '#1a1a1a');
            // Mouth (pant animation)
            if (pant) {
                this.px(x + 4, y + 4, 2, 1, '#e74c3c');
                this.px(x + 4, y + 5, 1, 1, '#e74c3c');
            }
            // Eyes
            this.px(x + 2, y, 2, 2, '#ecf0f1');
            this.px(x + 5, y, 2, 2, '#ecf0f1');
            this.px(x + 3, y + 1, 1, 1, '#2c3e50');
            this.px(x + 5, y + 1, 1, 1, '#2c3e50');
            // Ears (floppy)
            this.px(x, y - 1, 2, 4, dogColor);
            this.px(x + 7, y - 1, 2, 4, dogColor);
            // Tail (wagging!)
            this.px(x + 9, y + 5 + tailWag * 0.5, 3, 2, dogColor);
            // Front paws
            this.px(x + 3, y + 11, 2, 2, lightColor);
            this.px(x + 6, y + 11, 2, 2, lightColor);
        } else {
            // Walking dog
            const walkFrame = Math.floor(this.elapsed * 0.12) % 2;
            // Body
            this.px(x + 2, y + 2, 10, 7, dogColor);
            this.px(x + 3, y + 4, 8, 4, lightColor);
            // Head
            this.px(x - 1, y - 1, 6, 5, dogColor);
            this.px(x, y, 4, 3, dogColor);
            // Snout
            this.px(x - 2, y + 1, 3, 2, lightColor);
            // Nose
            this.px(x - 2, y + 1, 1, 1, '#1a1a1a');
            // Tongue (pant)
            if (pant) {
                this.px(x - 1, y + 3, 1, 2, '#e74c3c');
            }
            // Eyes
            this.px(x, y, 1, 1, '#ecf0f1');
            this.px(x + 2, y, 1, 1, '#ecf0f1');
            this.px(x + 1, y, 1, 1, '#2c3e50');
            this.px(x + 3, y, 1, 1, '#2c3e50');
            // Ears
            this.px(x - 1, y - 2, 2, 3, dogColor);
            this.px(x + 3, y - 2, 2, 3, dogColor);
            // Legs (animated)
            const lo = walkFrame * 2;
            this.px(x + 3, y + 9 + lo, 2, 4 - lo, dogColor);
            this.px(x + 9, y + 9 - lo, 2, 4 + lo, dogColor);
            this.px(x + 5, y + 9 - lo, 2, 4 + lo, dogColor);
            this.px(x + 7, y + 9 + lo, 2, 4 - lo, dogColor);
            // Paws
            this.px(x + 3, y + 12, 2, 1, lightColor);
            this.px(x + 9, y + 12, 2, 1, lightColor);
            // Tail (wagging!!)
            this.px(x + 11, y + 1 + tailWag, 2, 2, dogColor);
            this.px(x + 12, y + tailWag, 2, 2, dogColor);
        }
    }

    // === NPC CHARACTERS (Non-Player Characters wandering in areas) ===
    drawNpc(f) {
        const T = this.T;
        // Initialize NPC wandering state
        if (!f._npcInit) {
            f._npcInit = true;
            f._baseX = f.x; f._baseY = f.y;
            f._wanderX = f.x; f._wanderY = f.y;
            f._nextMove = this.elapsed + 30 + Math.random() * 60;
            f._idle = Math.random() < 0.4;
            f._dir = 'down';
            f._speechTimer = this.elapsed + 100 + Math.random() * 200;
            f._showSpeech = false;
            f._speechText = '';
        }

        // Wander logic
        if (this.elapsed > f._nextMove) {
            f._nextMove = this.elapsed + 60 + Math.random() * 120;
            const range = (f.wanderRange || 3) * T;
            // Try up to 5 random targets to find a walkable one
            let wx = f._baseX, wy = f._baseY;
            for (let attempt = 0; attempt < 5; attempt++) {
                const cx = f._baseX + (Math.random() - 0.5) * range;
                const cy = f._baseY + (Math.random() - 0.5) * range * 0.6;
                if (this.isPositionWalkable(cx, cy)) {
                    wx = cx; wy = cy; break;
                }
            }
            f._wanderX = wx;
            f._wanderY = wy;
            f._idle = Math.random() < 0.35;
        }

        // Speech bubble logic
        if (this.elapsed > f._speechTimer && f.speeches && f.speeches.length) {
            f._speechTimer = this.elapsed + 200 + Math.random() * 300;
            f._showSpeech = true;
            f._speechText = f.speeches[Math.floor(Math.random() * f.speeches.length)];
            f._speechEnd = this.elapsed + 80;
        }
        if (f._showSpeech && this.elapsed > f._speechEnd) f._showSpeech = false;

        // Move toward target with collision
        const dx = f._wanderX - f.x, dy = f._wanderY - f.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const isWalking = dist > 1 && !f._idle;
        if (isWalking) {
            const stepX = dx * 0.02 * this.deltaTime;
            const stepY = dy * 0.02 * this.deltaTime;
            const nextX = f.x + stepX;
            const nextY = f.y + stepY;
            // Check collision at next position
            if (this.isPositionWalkable(nextX, nextY)) {
                f.x = nextX;
                f.y = nextY;
            } else {
                // Blocked — stop and pick new target next tick
                f._wanderX = f.x;
                f._wanderY = f.y;
                f._idle = true;
                f._nextMove = this.elapsed + 20 + Math.random() * 40;
            }
            // Determine facing direction
            if (Math.abs(dx) > Math.abs(dy)) f._dir = dx > 0 ? 'right' : 'left';
            else f._dir = dy > 0 ? 'down' : 'up';
        }

        const x = f.x, y = f.y;
        const charIdx = f.charIndex || 0;
        const img = this.charImages[charIdx % this.charImages.length];

        if (img && img.complete) {
            // Use sprite sheet: row 0=down, 1=up, 2=side; frames [0,1,2,1] walk cycle
            const row = (f._dir === 'down') ? 0 : (f._dir === 'up') ? 1 : 2;
            const walkCycle = [0, 1, 2, 1];
            const frame = isWalking ? walkCycle[Math.floor(this.elapsed * 0.12) % 4] : 1;

            // Shadow
            this.ctx.globalAlpha = 0.15;
            this.px(x - 4, y + 15, 12, 3, '#000');
            this.ctx.globalAlpha = 1;

            this.ctx.save();
            if (f._dir === 'left') {
                this.ctx.translate(Math.floor((x + 8) * this.scale + this.camera.x), Math.floor((y - 15) * this.scale + this.camera.y));
                this.ctx.scale(-1, 1);
                this.ctx.drawImage(img, frame * 16, row * 32, 16, 32, Math.floor(-8 * this.scale), 0, Math.ceil(16 * this.scale), Math.ceil(32 * this.scale));
            } else {
                this.ctx.translate(Math.floor((x - 8) * this.scale + this.camera.x), Math.floor((y - 15) * this.scale + this.camera.y));
                this.ctx.drawImage(img, frame * 16, row * 32, 16, 32, 0, 0, Math.ceil(16 * this.scale), Math.ceil(32 * this.scale));
            }
            this.ctx.restore();
        } else {
            // Fallback: procedural pixel character
            const skinColor = f.skinColor || '#fdebd0';
            const shirtColor = f.shirtColor || '#3498db';
            const hairColor = f.hairColor || '#5d4037';
            const bob = isWalking ? Math.sin(this.elapsed * 0.2) * 1 : 0;
            const walkFrame = isWalking ? Math.floor(this.elapsed * 0.12) % 2 : 0;

            // Shadow
            this.ctx.globalAlpha = 0.15;
            this.px(x - 3, y + 14, 10, 3, '#000');
            this.ctx.globalAlpha = 1;
            // Hair
            this.px(x, y - 2 + bob, 6, 3, hairColor);
            // Head
            this.px(x + 1, y + 1 + bob, 4, 4, skinColor);
            // Eyes
            this.px(x + 1, y + 2 + bob, 1, 1, '#1a1a1a');
            this.px(x + 4, y + 2 + bob, 1, 1, '#1a1a1a');
            // Body
            this.px(x - 1, y + 5 + bob, 8, 6, shirtColor);
            this.px(x, y + 6 + bob, 6, 4, this.li(shirtColor, 15));
            // Legs
            const lo = walkFrame * 2;
            this.px(x, y + 11 + lo, 3, 4 - lo, '#2c3e50');
            this.px(x + 3, y + 11 - lo, 3, 4 + lo, '#2c3e50');
            // Shoes
            this.px(x, y + 14, 3, 1, '#1a1a2e');
            this.px(x + 3, y + 14, 3, 1, '#1a1a2e');
        }

        // Role emoji above head
        if (f.emoji) {
            const ex = x * this.scale + this.camera.x;
            const ey = (y - 22) * this.scale + this.camera.y;
            this.ctx.font = `${Math.max(6, 8 * this.scale * 0.5)}px sans-serif`;
            this.ctx.fillText(f.emoji, ex, ey);
        }

        // Speech bubble
        if (f._showSpeech && f._speechText) {
            const bx = x - 8, by = y - 30;
            const bw = Math.min(f._speechText.length * 3 + 10, 70);
            this.px(bx, by, bw, 10, 'rgba(21,29,48,0.9)');
            this.px(bx, by, bw, 1, '#4ecdc4');
            this.px(bx, by + 9, bw, 1, '#4ecdc4');
            this.px(bx + 4, by + 10, 2, 2, '#4ecdc4');
            this.ctx.fillStyle = '#e8eaf6';
            this.ctx.font = `${Math.max(3, 4 * this.scale * 0.5)}px "Press Start 2P"`;
            const txt = f._speechText.length > 14 ? f._speechText.substring(0, 14) + '..' : f._speechText;
            this.ctx.fillText(txt, (bx + 3) * this.scale + this.camera.x, (by + 7) * this.scale + this.camera.y);
        }
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
    getFurnSize(type) {
        const sizes = {
            'desk': {w:3, h:2}, 'mtable': {w:3, h:4}, 'table_small': {w:2, h:2}, 'table_low': {w:2, h:1}, 'mchair': {w:1, h:1}, 'chair': {w:1, h:2}, 'sofa': {w:2, h:1}, 'armchair': {w:1, h:1}, 'bench': {w:1, h:1}, 'bed_single': {w:2, h:3}, 'bed_double': {w:3, h:3}, 'rug': {w:3, h:2}, 'pillow': {w:1, h:1}, 'bookshelf': {w:2, h:1}, 'cabinet': {w:2, h:1}, 'shelf': {w:2, h:1}, 'boxes': {w:1, h:1}, 'pc': {w:1, h:2}, 'whiteboard': {w:2, h:2}, 'vending': {w:1, h:2}, 'coffee': {w:1, h:1}, 'fridge': {w:1, h:2}, 'billiard_table': {w:3, h:2}, 'counter': {w:3, h:1}, 'plant': {w:1, h:2}, 'large_plant': {w:2, h:3}, 'plant2': {w:1, h:1}, 'hanging_plant': {w:1, h:1}, 'cactus': {w:1, h:2}, 'pot': {w:1, h:1}, 'painting': {w:2, h:1}, 'painting2': {w:1, h:1}, 'lamp': {w:1, h:2}, 'clock': {w:1, h:1}, 'pictureframe': {w:1, h:1}, 'poker_table': {w:3, h:2}, 'slot_machine': {w:2, h:3}, 'gold_terminal': {w:3, h:3}, 'treadmill': {w:2, h:1}, 'dumbbell': {w:1, h:1}, 'yoga_mat': {w:2, h:1}, 'server_rack': {w:2, h:1}, 'microscope': {w:1, h:1}, 'flask': {w:1, h:1}, 'tree': {w:2, h:2}, 'fountain': {w:3, h:3}, 'parasol': {w:3, h:3}, 'bbq_grill': {w:2, h:1}, 'pond': {w:4, h:3}, 'elevator_door': {w:2, h:1}, 'elevator_panel': {w:1, h:1}, 'telescope': {w:1, h:1}, 'antenna': {w:2, h:2}, 'helipad': {w:5, h:5},
            // Themed plants
            'bamboo': {w:1, h:2}, 'succulent': {w:1, h:1}, 'bonsai': {w:1, h:2}, 'palm_indoor': {w:1, h:2}, 'fern': {w:1, h:2}, 'orchid': {w:1, h:2}, 'vine_wall': {w:1, h:2}, 'money_tree': {w:1, h:2}
        };
        return sizes[type] || {w:1, h:1};
    }

    // === COLLISION CHECK (for NPCs, animals, wandering entities) ===
    // Checks if a pixel position (px, py) is walkable: not blocked by walls, map edges, or solid furniture.
    isPositionWalkable(px, py) {
        const T = this.T;
        const tx = Math.floor(px / T);
        const ty = Math.floor(py / T);

        // Out of bounds
        if (tx < 0 || ty < 0 || tx >= this.MW || ty >= this.MH) return false;

        // No floor tile or wall
        const tile = this.map[ty] && this.map[ty][tx];
        if (!tile || tile === 'wall') return false;

        // Check furniture collisions
        const passthrough = ['rug', 'yoga_mat', 'painting', 'painting2', 'pictureframe', 'clock', 'whiteboard', 'shelf', 'pillow', 'npc', 'animal_bird', 'animal_cat', 'animal_dog', 'farm_plot', 'flower_bed', 'hanging_plant'];
        for (let i = 0; i < this.furniture.length; i++) {
            const f = this.furniture[i];
            if (passthrough.includes(f.t)) continue;

            const size = this.getFurnSize(f.t);
            const fx = f.x;
            const fy = f.y;
            const fw = (f.w || size.w) * T;
            const fh = (f.h || size.h) * T;

            // AABB collision (pixel-level, with small margin for character width)
            if (px + 4 > fx && px - 4 < fx + fw && py + 8 > fy && py - 2 < fy + fh) {
                return false;
            }
        }
        return true;
    }

    findPath(startX, startY, endX, endY) {
        const heuristic = (x1, y1, x2, y2) => Math.abs(x1 - x2) + Math.abs(y1 - y2);
        const open = [{ x: startX, y: startY, g: 0, f: heuristic(startX, startY, endX, endY), parent: null }];
        const closed = new Set();
        
        const walkableItems = ['rug', 'yoga_mat', 'painting', 'painting2', 'pictureframe', 'clock', 'whiteboard', 'shelf', 'pillow', 'npc', 'animal_bird', 'animal_cat', 'animal_dog'];
        const getCost = (x, y) => {
            if (x < 0 || y < 0 || x >= this.MW || y >= this.MH) return Infinity; // out of bounds
            if (!this.map[y][x] || this.map[y][x] === 'wall') return Infinity; // null or wall tiles block movement
            
            // Allow stepping onto the target exact tile (for interacting with items / sitting on chairs)
            if (x === endX && y === endY) return 1;

            // Check item box colliders
            for (let i = 0; i < this.furniture.length; i++) {
                const f = this.furniture[i];
                if (walkableItems.includes(f.t)) continue;
                
                const size = this.getFurnSize(f.t);
                const tx = Math.floor(f.x / this.T);
                const ty = Math.floor(f.y / this.T);
                const fw = f.w || size.w;
                const fh = f.h || size.h;
                
                if (x >= tx && x < tx + fw && y >= ty && y < ty + fh) {
                    return Infinity; // Tile is blocked by furniture
                }
            }
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
        
        let startTx = 5, startTy = 10;
        let pTargetX = slot ? (slot.tx + 0.5) * doorT : 5 * doorT;
        let pTargetY = slot ? (slot.ty + 1) * doorT : 5 * doorT;
        let targetTx = Math.floor(pTargetX / doorT);
        let targetTy = Math.floor(pTargetY / doorT);
        
        let path = this.findPath(startTx, startTy, targetTx, targetTy);

        this.agentSprites.set(agent.id, {
            id: agent.id, name: agent.name, color: agent.color, role: agent.role, status: 'idle',
            desk: slot, hairColor: hairs[Math.floor(Math.random() * hairs.length)],
            charIndex: agent.charIndex || 0, dir: 'down',
            scene: this.activeScene,
            x: startTx * doorT + doorT/2, y: startTy * doorT + doorT/2,
            targetX: pTargetX,
            targetY: pTargetY,
            path: path,
            pathIndex: 0,
            isWalking: path.length > 0, blink: false, blinkT: 60 + Math.random() * 120,
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
        if (path.length === 0) return false;

        sp.targetX = slot.x;
        sp.targetY = slot.y;
        sp.path = path;
        sp.pathIndex = 0;
        sp.isWalking = true;
        sp.isRoaming = false;
        sp.onArrive = null;
        return true;
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
        const floorCols = { wood: '#8c6838', tile: '#d5d0c0', carpet: '#456585', grass: '#4a7c3f', metal: '#6a6a7a', concrete: '#7a7a7a', wall: '#1a2035' };
        for (let y = 0; y < this.MH; y++) for (let x = 0; x < this.MW; x++) {
            if (this.map[y][x]) { c.fillStyle = floorCols[this.map[y][x]] || '#666'; c.fillRect(x * this.T * sx, y * this.T * sy, this.T * sx + 1, this.T * sy + 1); }
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

        // Update scene transition
        this._updateSceneTransition();

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#0d1117';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawGrid();
        this.drawFloors();
        this.drawWalls();
        this._drawRoomLabels();

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
        this.agentSprites.forEach(sp => { if ((sp.isWalking || sp.isRoaming) && sp.scene === this.activeScene) items.push({ y: sp.y + 18, type: 'a', data: sp }); });
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
            if (sp.isRoaming && !sp.isWalking && sp.scene === this.activeScene) {
                this.drawCharWalking(sp);
            }
        });

        // Overlays (only for agents in current scene)
        this.agentSprites.forEach(sp => { if (sp.scene === this.activeScene) this.drawOverlays(sp); });
        this.drawMinimap();

        // Scene transition overlay
        this._drawSceneTransition();
        
        if (this._postRender) this._postRender();
        if (!this._destroyed) requestAnimationFrame((t) => this.render(t));
    }
    // ============================
    // === FARM DRAW METHODS ===
    // ============================

    drawFarmPlot(f) {
        const T = this.T, x = f.x, y = f.y;
        const w = (f.w || 3) * T, h = (f.h || 2) * T;

        // Soil base
        this.px(x, y, w, h, '#5a3e28');
        this.px(x+1, y+1, w-2, h-2, '#6b4a30');

        // Soil rows (furrows)
        for (let i = 0; i < 4; i++) {
            const fy = y + 3 + i * (h / 5);
            this.px(x + 2, fy, w - 4, 2, '#4a3020');
            this.px(x + 2, fy + 2, w - 4, 1, '#7a5a3a');
        }

        // Small fence around plot
        this.px(x, y, w, 1, '#8B6914');
        this.px(x, y+h-1, w, 1, '#8B6914');
        this.px(x, y, 1, h, '#8B6914');
        this.px(x+w-1, y, 1, h, '#8B6914');
        // Fence posts
        this.px(x, y-2, 2, 3, '#5c3d2e');
        this.px(x+w-2, y-2, 2, 3, '#5c3d2e');

        // Get farm data from window._farmManager if available
        const fm = window._farmManager;
        if (fm && f.plotId !== undefined) {
            const plot = fm.plots[f.plotId];
            if (plot && plot.state !== 'empty') {
                const seed = fm.seedCatalog.find(s => s.id === plot.seedId);
                const color = seed?.color || '#27ae60';
                const cx = x + w/2;
                const cy = y + h/2;

                switch (plot.growthStage) {
                    case 0: // Seed - small dots
                        for (let i = 0; i < 3; i++) {
                            this.px(x + 8 + i * 10, y + h/2, 3, 2, '#8B6914');
                        }
                        break;
                    case 1: // Sprout - small green shoots
                        for (let i = 0; i < 3; i++) {
                            const sx = x + 8 + i * 10;
                            const sy = y + h/2;
                            this.px(sx+1, sy-4, 1, 4, '#2ecc71');
                            this.px(sx, sy-5, 3, 2, '#27ae60');
                        }
                        break;
                    case 2: // Growing - medium plants
                        for (let i = 0; i < 3; i++) {
                            const sx = x + 7 + i * 10;
                            const sy = y + h/2;
                            this.px(sx+1, sy-8, 2, 8, '#1a8c3a');
                            this.px(sx-1, sy-8, 5, 3, color);
                            this.px(sx, sy-6, 4, 2, '#2ecc71');
                        }
                        break;
                    case 3: // Ready - full grown with fruit (animated)
                        const sway = Math.sin(this.elapsed * 0.02 + f.plotId) * 1;
                        for (let i = 0; i < 3; i++) {
                            const sx = x + 7 + i * 10;
                            const sy = y + h/2;
                            this.px(sx+1, sy-10, 2, 10, '#1a6b2a');
                            this.px(sx-1 + sway, sy-12, 6, 4, color);
                            this.px(sx + sway, sy-10, 4, 3, '#2ecc71');
                            // Fruit/flower dot
                            this.px(sx+1 + sway, sy-13, 3, 3, seed?.color || '#e74c3c');
                            this.px(sx+2 + sway, sy-14, 1, 1, '#fff');
                        }
                        // Ready glow
                        if (Math.floor(this.elapsed * 0.04) % 2) {
                            this.px(x+1, y+h-3, w-2, 2, 'rgba(255,217,61,0.25)');
                        }
                        break;
                }

                // Watered indicator
                if (plot.watered) {
                    this.px(x+2, y+2, 4, 2, 'rgba(52,152,219,0.5)');
                    this.px(x+4, y+1, 2, 1, 'rgba(52,152,219,0.3)');
                }
            }
        }
    }

    drawFarmSign(x, y) {
        const T = this.T;
        // Wooden post
        this.px(x + 5, y + 4, 3, T - 4, '#5c3d2e');
        this.px(x + 6, y + 4, 1, T - 4, '#7a5a3a');
        // Sign board
        this.px(x, y, T, 6, '#8B6914');
        this.px(x+1, y+1, T-2, 4, '#a0794a');
        // "FARM" text (pixel dots)
        // F
        this.px(x+2, y+2, 1, 3, '#1a1a2e');
        this.px(x+3, y+2, 2, 1, '#1a1a2e');
        this.px(x+3, y+3, 1, 1, '#1a1a2e');
        // A
        this.px(x+6, y+2, 1, 3, '#1a1a2e');
        this.px(x+8, y+2, 1, 3, '#1a1a2e');
        this.px(x+7, y+2, 1, 1, '#1a1a2e');
        this.px(x+7, y+3, 1, 1, '#1a1a2e');
        // R
        this.px(x+10, y+2, 1, 3, '#1a1a2e');
        this.px(x+11, y+2, 1, 1, '#1a1a2e');
        this.px(x+11, y+3, 1, 1, '#1a1a2e');
        this.px(x+12, y+4, 1, 1, '#1a1a2e');
        // Plant emoji decoration
        const sway = Math.sin(this.elapsed * 0.015) * 0.5;
        this.px(x - 2 + sway, y - 2, 3, 3, '#27ae60');
        this.px(x + T + sway, y - 2, 3, 3, '#2ecc71');
    }

    drawScarecrow(x, y) {
        const T = this.T;
        const sway = Math.sin(this.elapsed * 0.01 + 1) * 1.5;
        // Pole
        this.px(x + 6, y + 5, 2, T - 5, '#5c3d2e');
        // Cross bar
        this.px(x + 1, y + 6 + sway * 0.3, 12, 2, '#6b4f3a');
        // Head (hat + face)
        this.px(x + 3, y + 1, 8, 2, '#d4a76a'); // hat brim
        this.px(x + 4, y - 1, 6, 2, '#8B6914'); // hat top
        this.px(x + 5, y + 3, 4, 3, '#fdebd0'); // face
        this.px(x + 5, y + 3, 1, 1, '#1a1a2e'); // left eye
        this.px(x + 8, y + 3, 1, 1, '#1a1a2e'); // right eye
        this.px(x + 6, y + 5, 2, 1, '#e74c3c'); // mouth
        // Shirt
        this.px(x + 4, y + 8, 6, 4, '#3498db');
        this.px(x + 5, y + 9, 4, 2, '#2980b9');
        // Arms (fabric hanging) with sway
        this.px(x + sway, y + 7, 4, 3, '#e67e22');
        this.px(x + 10 - sway, y + 7, 4, 3, '#e67e22');
        // Straw poking out
        this.px(x + 1 + sway, y + 9, 2, 1, '#f1c40f');
        this.px(x + 11 - sway, y + 9, 2, 1, '#f1c40f');
    }

    drawWaterWell(x, y) {
        const T = this.T;
        // Stone base (circular-ish)
        this.px(x + 1, y + T - 8, T - 2, 8, '#7f8c8d');
        this.px(x + 2, y + T - 9, T - 4, 1, '#95a5a6');
        this.px(x, y + T - 7, T, 6, '#6b7b8d');
        // Water inside
        const waterShimmer = Math.sin(this.elapsed * 0.03) * 0.5;
        this.px(x + 3, y + T - 6, T - 6, 4, '#2980b9');
        this.px(x + 4 + waterShimmer, y + T - 5, T - 8, 2, '#3498db');
        // Wooden frame above
        this.px(x + 1, y + T - 12, 2, 5, '#5c3d2e');
        this.px(x + T - 3, y + T - 12, 2, 5, '#5c3d2e');
        // Roof beam
        this.px(x, y + T - 13, T, 2, '#8B6914');
        this.px(x + 2, y + T - 14, T - 4, 1, '#a0794a');
        // Bucket (hanging)
        const bucketY = y + T - 10 + Math.sin(this.elapsed * 0.02) * 1;
        this.px(x + T/2 - 2, y + T - 12, 1, 3, '#4a3020'); // rope
        this.px(x + T/2 - 3, bucketY, 4, 3, '#7a5a3a');
    }

    drawCompostBin(x, y) {
        const T = this.T;
        // Wooden bin
        this.px(x, y + 2, T, T - 2, '#5c3d2e');
        this.px(x + 1, y + 3, T - 2, T - 4, '#6b4f3a');
        // Slats
        for (let i = 0; i < 3; i++) {
            this.px(x, y + 4 + i * 4, T, 1, '#4a3020');
        }
        // Compost inside (visible from top)
        this.px(x + 2, y + 1, T - 4, 3, '#3d2610');
        this.px(x + 3, y + 1, 2, 1, '#27ae60'); // green bits
        this.px(x + 7, y + 2, 2, 1, '#8B6914'); // brown bits
        // Steam/decomposition particles
        if (Math.floor(this.elapsed * 0.02) % 3 === 0) {
            this.px(x + 4, y - 1, 2, 1, 'rgba(255,255,255,0.2)');
            this.px(x + 8, y - 2, 1, 1, 'rgba(255,255,255,0.15)');
        }
    }

    drawCafeCounter(x, y, tw) {
        const T = this.T;
        const w = (tw || 6) * T;
        const h = 2 * T;
        // Counter body (dark wood)
        this.px(x, y + 4, w, h - 4, '#4a2c17');
        this.px(x + 1, y + 5, w - 2, h - 6, '#5c3a22');
        // Counter top (polished wood with highlight)
        this.px(x - 1, y + 2, w + 2, 3, '#8B6914');
        this.px(x, y + 2, w, 1, '#c4a035'); // top shine
        this.px(x, y + 3, w, 1, '#a07828');
        // Front panel details (vertical slats)
        for (let i = 0; i < Math.floor(w / 6); i++) {
            this.px(x + 2 + i * 6, y + 6, 1, h - 8, '#3a1e0f');
        }
        // Espresso machine (left side)
        this.px(x + 3, y - 2, 8, 6, '#555');
        this.px(x + 4, y - 1, 6, 4, '#666');
        this.px(x + 5, y, 2, 2, '#4ecdc4'); // buttons
        this.px(x + 8, y, 1, 2, '#e74c3c'); // power light
        this.px(x + 4, y - 3, 6, 1, '#777'); // top
        // Steam animation
        if (Math.floor(this.elapsed * 0.03) % 2 === 0) {
            this.px(x + 6, y - 5, 1, 2, 'rgba(255,255,255,0.25)');
            this.px(x + 7, y - 6, 1, 1, 'rgba(255,255,255,0.15)');
        }
        // Menu board (right side above counter)
        this.px(x + w - 20, y - 8, 18, 10, '#1a1a2e');
        this.px(x + w - 19, y - 7, 16, 8, '#2a2a4e');
        // Menu text lines
        this.px(x + w - 17, y - 5, 8, 1, '#4ecdc4');
        this.px(x + w - 17, y - 3, 10, 1, '#ffd93d');
        this.px(x + w - 17, y - 1, 6, 1, '#78e08f');
        // Coffee cups on counter
        this.px(x + 16, y, 3, 3, '#fff');
        this.px(x + 17, y - 1, 1, 1, '#fff');
        this.px(x + 16, y, 3, 1, '#d4a76a'); // coffee inside
        this.px(x + 22, y, 3, 3, '#fff');
        this.px(x + 23, y - 1, 1, 1, '#fff');
        this.px(x + 22, y, 3, 1, '#6b4226'); // dark coffee
    }

    // ============ CLEANUP ============
    destroy() {
        this._destroyed = true;
        console.log('[PixelEngine] Destroyed');
    }
}

window.PixelEngine = PixelEngine;
