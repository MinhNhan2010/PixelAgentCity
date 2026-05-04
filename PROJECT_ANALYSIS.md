# Phân Tích Đề Tài: PixelAgent City

## 1. Tổng Quan

**Tên đề tài:** PixelAgent City — Xây dựng game mô phỏng quản lý studio AI trên nền tảng web

**Quy mô dự án:**

| Thống kê | Giá trị |
|---|---|
| Tổng số file mã nguồn | 21 file |
| Tổng dung lượng code | ~610 KB |
| File lớn nhất | `styles.css` (213 KB), `pixel-engine.js` (134 KB), `app.js` (103 KB) |
| Số module chính | 13 module |
| Ngôn ngữ | JavaScript ES6+, HTML5, CSS3 |
| Công nghệ render | HTML5 Canvas API |
| Âm thanh | Web Audio API (chiptune) |
| Lưu trữ | localStorage |

PixelAgent City là một game web mô phỏng quản lý theo phong cách pixel-art. Người chơi vào vai nhà quản lý một studio AI, thực hiện tuyển agent, nhận contract, phân chia công việc, bố trí văn phòng, nghiên cứu công nghệ, trồng trọt và tham gia các hoạt động giải trí.

Đề tài kết hợp **bốn hướng chính:**
1. Game mô phỏng quản lý (Simulation/Tycoon)
2. Giao diện tương tác trực quan 2D pixel-art
3. Giả lập hành vi cộng tác của các AI agents
4. Hệ thống mini-game và hoạt động phụ trợ

---

## 2. Mục Tiêu Và Ý Nghĩa

### Mục tiêu kỹ thuật
- Mô phỏng luồng vận hành: tuyển người → nhận việc → xử lý task → nhận tiền → nâng cấp
- Xây dựng game state có tính tiến trình, thắng/thua và mở khóa nội dung
- Trình bày văn phòng AI dưới dạng không gian 2D pixel tăng tính nhập vai
- Giả lập hành vi agent theo 11 role khác nhau (coder, tester, reviewer, designer, devops, researcher, analyst, security, backend, mobile, writer)
- Tích hợp nhiều hệ thống phụ trợ: nghiên cứu công nghệ, nông trại, giao dịch vàng, mini-game

### Ý nghĩa học thuật
- Phân tích và thiết kế hệ thống phần mềm theo module
- Quản lý trạng thái (State Management) trong ứng dụng tương tác
- Mô phỏng đối tượng và quy trình công việc (Agent-based Simulation)
- Thiết kế giao diện web có tính trực quan và khả năng thao tác
- Áp dụng các mô hình toán học: Geometric Brownian Motion (giá vàng), Weighted Random (thời tiết, slot machine), Hand Evaluation (poker)

---

## 3. Kiến Trúc Hệ Thống

```
┌─────────────────────────────────────────────────────┐
│                    index.html                        │
│              (Cấu trúc DOM + Modal)                  │
├─────────────────────────────────────────────────────┤
│                     app.js                           │
│        (Điều phối tổng, kết nối callback)            │
├───────┬───────┬──────────┬──────────┬───────────────┤
│GameSt.│Agent  │PixelEng. │LayoutEd. │  AgentChat.   │
│game.js│agents │pixel-eng │layout-ed │  chatbox.js   │
├───────┴───────┴──────────┴──────────┴───────────────┤
│    TechTree  │  FarmMgr  │ GoldTrading │ Achievem.   │
│  tech-tree   │  farm.js  │ gold-trad.  │ achievem.   │
├──────────────┴──────────┴─────────────┴─────────────┤
│  PokerGame  │ BilliardGame │ SlotMachine             │
│  poker.js   │ billiards.js │ slot-machine.js         │
│  poker-ui   │ billiards-ui │ slot-machine-ui         │
├─────────────┴──────────────┴────────────────────────┤
│                   styles.css                         │
│              (Toàn bộ giao diện)                     │
└─────────────────────────────────────────────────────┘
```

---

## 4. Các Module Cốt Lõi

### 4.1. GameState (`game.js` — 31 KB, 694 dòng)

Module trung tâm điều phối gameplay:
- **Kinh tế:** coins, tổng thu/chi, chi phí tuyển dụng, lương hằng ngày
- **Chu kỳ thời gian:** ngày đêm, tốc độ game (1x–4x)
- **Tiến trình:** reputation, company level, XP, điều kiện chiến thắng (IPO)
- **Contract:** reward, deadline, roles bắt buộc, số task cần hoàn thành
- **Persistence:** save/load toàn bộ trạng thái bằng `localStorage`

### 4.2. AgentManager (`agents.js` — 52 KB, ~1500 dòng)

Module phụ trách logic agent và task:
- Quản lý danh sách 11 loại agent với skill, mood, energy, level
- Tạo task, gán task, theo dõi tiến độ và đánh dấu hoàn thành
- Mô phỏng quy trình: working → review → pair programming → mentoring
- Phát sinh sự kiện ngẫu nhiên (random events) trong văn phòng
- Ghi nhật ký hoạt động và thống kê hiệu suất

### 4.3. PixelEngine (`pixel-engine.js` — 134 KB, ~3500 dòng)

Module render engine 2D — lớn nhất dự án:
- Vẽ bản đồ văn phòng theo tile system
- Camera: pan, zoom, minimap
- Quản lý furniture, sprite, vị trí agent
- Hỗ trợ 3 scene: indoor (văn phòng), outdoor (sân), rooftop
- Hiệu ứng tương tác: speech bubble, animation, particle
- Click agent trên canvas để mở chatbox

### 4.4. LayoutEditor (`layout-editor.js` — 39 KB, 845 dòng)

Cho phép người chơi tùy biến không gian văn phòng:
- 5 công cụ: Select, Furniture, Erase, Floor Paint, Wall
- Catalog nội thất 30+ loại chia 5 nhóm (Bàn Ghế, Sofa, Tủ Kệ, Thiết Bị, Trang Trí)
- Hệ thống collision detection (AABB)
- Undo/Redo stack (tối đa 100 bước)
- Auto-save, Export/Import JSON

### 4.5. AgentChatbox (`chatbox.js` — 35 KB, 770 dòng)

Mô phỏng giao tiếp với agent:
- Drag-drop agent vào khung chat hoặc click trên bản đồ
- Quick Ask theo role (4 nút mỗi role)
- Phản hồi tự động theo role, trạng thái và context
- Lịch sử chat per-agent, typing indicator
- Panel có thể drag, minimize, resize

---

## 5. Các Module Mở Rộng

### 5.1. TechTree (`tech-tree.js` — 11 KB, 299 dòng)

Hệ thống nghiên cứu công nghệ 3 nhánh × 4 tầng = **12 công nghệ:**

| Nhánh | Tier 1–4 | Hiệu ứng |
|---|---|---|
| Engineering | Fast Compile → Code Review Bot → CI/CD → Quantum Computing | Task speed +15%→+50% |
| AI Research | Smart Assign → Mood Prediction → Neural Optimizer → AGI Prototype | Quality, mood, XP bonus |
| Management | Overtime → Remote Work → Team Building → IPO Express | Teamwork, XP reduction |

- Mỗi tech có cost, thời gian nghiên cứu, điều kiện tiên quyết
- Researcher agent tăng tốc nghiên cứu (+25%/agent)
- Hệ thống bonus tích lũy ảnh hưởng toàn bộ gameplay

### 5.2. FarmManager (`farm.js` — 22 KB, 532 dòng)

Hệ thống nông trại hoàn chỉnh:
- **12 loại cây** chia 4 nhóm: Rau củ, Trái cây, Hoa, Thảo dược
- **8 công thức nấu ăn** tạo buff cho agent (energy, mood, XP)
- **12 ô đất** với chu trình: trồng → tưới → thu hoạch → bán/nấu
- **5 loại thời tiết** (sunny, rainy, cloudy, stormy, hot) ảnh hưởng tăng trưởng
- Agent có thể được gán nhiệm vụ tưới nước tự động

### 5.3. GoldTrading (`gold-trading.js` — 14 KB, 373 dòng)

Hệ thống giao dịch vàng mô phỏng thị trường tài chính:
- **Real-time price fetch** từ API thực (fawazahmed0, Frankfurter)
- **Geometric Brownian Motion** cho biến động giá mô phỏng
- Biểu đồ nến (Candlestick chart), 60 candles tối đa
- Hệ thống Buy/Sell với P&L tracking (realized + unrealized)
- **14 sự kiện thị trường** ngẫu nhiên ảnh hưởng giá (bull/bear)
- Mean reversion và trend momentum

### 5.4. AchievementManager (`achievements.js` — 7 KB, 129 dòng)

Hệ thống thành tựu **22 achievement** chia 5 nhóm:
- Economy (4): từ 100Ⓒ đến 50,000Ⓒ
- Contracts (5): từ 1 đến 30 contract, bao gồm "Hoàn Hảo" (0 fail)
- Agents (5): từ 3 đến 10 agent, level 5, đa dạng role
- Company (6): level 3→10, reputation 5.0, 30 ngày
- Minigames (4): chơi poker, billiards, slot, gold trading

### 5.5. PokerGame (`poker.js` — 24 KB, 662 dòng)

Texas Hold'em Poker hoàn chỉnh:
- Deck 52 lá, hand evaluation đầy đủ 10 loại (High Card → Royal Flush)
- Combinatorial evaluation: chọn best 5 từ 7 lá
- **AI betting personality** theo role: aggression, bluffRate, tightness
- Phase flow: preflop → flop → turn → river → showdown
- Blind system, pot management, all-in logic
- Tối đa 6 người chơi (agent)

### 5.6. BilliardGame (`billiards.js` — 21 KB, 609 dòng)

8-Ball Pool với physics engine:
- **2D physics:** velocity, friction, cushion bounce, ball-ball collision
- 15 bi + cue ball, 6 pocket, standard rack
- **AI aiming:** tìm target tốt nhất, tính góc tiếp xúc, error range theo personality
- Luật 8-ball: solids/stripes assignment, foul detection
- 11 personality theo role: accuracy, power, style

### 5.7. SlotMachine (`slot-machine.js` — 7 KB, 197 dòng)

Máy đánh bạc 3 reel:
- 7 symbol với weighted distribution (Cherry 25% → Jackpot 2%)
- Bảng thưởng: Triple match (3x–50x), Two-of-a-kind (1.5x–5x)
- 4 mức cược: 10, 25, 50, 100 coins
- Staggered reveal animation, auto-spin mode

---

## 6. Luồng Chơi Chính (Gameplay Loop)

```
Bắt đầu → Tuyển Agent → Nhận Contract → Gán Task → Agent làm việc
    ↓                                                      ↓
Nâng level ← Nhận XP + Tiền ← Hoàn thành Contract ← Review/Complete
    ↓
Mở khóa: Role mới, Contract khó hơn, Tech Tree, Farm, Mini-games
    ↓
Mục tiêu cuối: Company Level 10 → IPO → Chiến thắng!
```

**Các hoạt động song song:**
- Nghiên cứu công nghệ (Tech Tree) → bonus vĩnh viễn
- Trồng trọt (Farm) → thu nhập phụ + buff agent
- Giao dịch vàng → đầu cơ kiếm lợi nhuận
- Mini-games (Poker, Billiards, Slot) → giải trí + achievement
- Tùy biến văn phòng (Layout Editor) → tăng mood/energy agent

---

## 7. Các Kỹ Thuật Nổi Bật

### 7.1. Mô phỏng Agent (Rule-based AI)
- Mỗi agent có: mood, energy, skill, level, role → ảnh hưởng hiệu suất
- Hành vi: working → resting → socializing → playing games
- Random events: bug outbreak, coffee break, pair programming

### 7.2. Physics Engine (Billiards)
- Euler integration cho vị trí bi
- AABB + circle collision detection
- Elastic collision response (equal mass)
- Friction decay, cushion bounce coefficient

### 7.3. Financial Simulation (Gold Trading)
- Geometric Brownian Motion: `price = price × (drift + noise)`
- Mean reversion towards equilibrium price
- Trend momentum, market event influence
- Candlestick data aggregation

### 7.4. Combinatorial Algorithm (Poker)
- C(7,5) = 21 combinations per hand evaluation
- Backtracking algorithm cho combination generation
- Hand ranking: flush/straight detection, group counting

### 7.5. Tile-based Rendering (PixelEngine)
- Isometric-style 2D rendering trên HTML5 Canvas
- Camera system: pan/zoom/minimap
- Sprite-based furniture và character rendering
- Layered rendering: floor → furniture → agents → effects

---

## 8. Điểm Mạnh

1. **Ý tưởng sáng tạo:** Kết hợp mô hình văn phòng AI với game pixel-art tycoon
2. **Quy mô lớn:** 13 module, 610KB code, nhiều hệ thống đan xen
3. **Cấu trúc module rõ ràng:** Mỗi class có trách nhiệm riêng, dễ phân tích
4. **Gameplay phong phú:** Không chỉ quản lý mà còn có farm, trading, mini-games
5. **Front-end thuần:** Chạy trực tiếp trên trình duyệt, dễ demo
6. **Persistence hoàn chỉnh:** Save/load tất cả module qua localStorage
7. **Kỹ thuật đa dạng:** Canvas 2D, physics, financial modeling, AI decision
8. **Tính tương tác cao:** Chatbox, layout editor, drag-drop, keyboard shortcuts
9. **Achievement system:** Tạo động lực khám phá toàn bộ nội dung

---

## 9. Hạn Chế Kỹ Thuật

1. **AI mô phỏng:** Agent hoạt động theo rule-based logic, chưa tích hợp LLM thực tế
2. **Lưu trữ cục bộ:** localStorage không đồng bộ đa thiết bị, giới hạn ~5MB
3. **Không có backend:** Không có database, authentication hay multiplayer
4. **CSS monolithic:** 1 file `styles.css` 213KB, khó bảo trì
5. **Không có bundler:** Load nhiều script riêng lẻ, không tree-shaking
6. **Không có test:** Chưa có unit test hoặc integration test
7. **Encoding:** Một số chuỗi tiếng Việt cần chuẩn hóa

---

## 10. Hướng Phát Triển

| Hướng | Mô tả |
|---|---|
| Tích hợp AI thật | Kết nối API LLM (Gemini/GPT) vào AgentChatbox |
| Backend | Node.js/Express + MongoDB cho save game cloud |
| Multiplayer | So sánh thành tích, bảng xếp hạng |
| Module hóa CSS | Tách styles.css thành component-level CSS |
| Bundler | Vite/Webpack để tối ưu loading |
| Testing | Jest cho unit test các module logic |
| Mobile responsive | Tối ưu touch controls cho tablet |

---

## 11. Kết Luận

PixelAgent City là một đề tài có quy mô lớn và chiều sâu kỹ thuật đáng kể. Với 13 module, 610KB mã nguồn và nhiều hệ thống game mechanics đan xen, dự án thể hiện khả năng phân tích bài toán, thiết kế kiến trúc phần mềm và triển khai các thuật toán đa dạng (từ physics simulation đến financial modeling). Sản phẩm chạy hoàn toàn trên front-end, dễ demo và có gameplay loop rõ ràng từ startup đến IPO.

> **Tóm tắt 1 câu:** PixelAgent City là game web mô phỏng quản lý studio AI phong cách pixel-art, tích hợp 13 module bao gồm quản lý agent, nghiên cứu công nghệ, nông trại, giao dịch vàng và mini-games, chạy hoàn toàn trên trình duyệt với HTML5 Canvas.

## 12. Gợi Ý Trình Bày

**4 ý chính khi thuyết trình:**
1. PixelAgent City là game web mô phỏng quản lý studio AI với 13 module
2. Kỹ thuật: Canvas 2D rendering, physics engine, financial simulation, combinatorial algorithms
3. Điểm nổi bật: gameplay loop rõ ràng, nhiều hệ thống phụ trợ, giao diện pixel trực quan
4. Hạn chế: chưa có AI thật, backend, và cần tối ưu codebase
