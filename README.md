<p align="center">
  <img src="https://img.shields.io/badge/🎮-PixelAgent%20City-blueviolet?style=for-the-badge&labelColor=0a0e1a" alt="PixelAgent City"/>
</p>

<h1 align="center">🏙️ PixelAgent City — AI Office Tycoon</h1>

<p align="center">
  <strong>Game web mô phỏng quản lý studio AI phong cách pixel-art</strong><br>
  <em>Tuyển agent • Nhận hợp đồng • Kiếm tiền • Xây đế chế!</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-3.0-00d2d3?style=flat-square" alt="Version"/>
  <img src="https://img.shields.io/badge/python-3.11+-3776ab?style=flat-square&logo=python&logoColor=white" alt="Python"/>
  <img src="https://img.shields.io/badge/flask-3.1-000000?style=flat-square&logo=flask&logoColor=white" alt="Flask"/>
  <img src="https://img.shields.io/badge/javascript-ES6+-f7df1e?style=flat-square&logo=javascript&logoColor=black" alt="JavaScript"/>
  <img src="https://img.shields.io/badge/canvas-HTML5-e34f26?style=flat-square&logo=html5&logoColor=white" alt="HTML5 Canvas"/>
  <img src="https://img.shields.io/badge/websocket-Socket.IO-010101?style=flat-square&logo=socketdotio&logoColor=white" alt="Socket.IO"/>
  <img src="https://img.shields.io/badge/docker-ready-2496ed?style=flat-square&logo=docker&logoColor=white" alt="Docker"/>
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License"/>
</p>

---

## 📖 Giới Thiệu

**PixelAgent City** là một game web mô phỏng quản lý (Simulation/Tycoon) nơi người chơi vào vai nhà quản lý của một studio AI. Bạn sẽ tuyển dụng các AI agent, nhận hợp đồng từ khách hàng, phân chia công việc, nghiên cứu công nghệ, trồng trọt và tham gia các hoạt động giải trí — tất cả trong một thế giới pixel-art đầy màu sắc.

### 🎯 Mục Tiêu Game
> Xây dựng studio AI từ **Startup Garage** (Level 1) đến **Global Empire** (Level 10) để IPO và chiến thắng!

---

## ✨ Tính Năng Nổi Bật

### 🏢 Quản Lý Studio AI
- **10 loại Agent** với vai trò đa dạng: Coder, Tester, Reviewer, Designer, DevOps, PM, Data Scientist, Security, AI Engineer, CTO
- **8 model AI** giả lập: Claude Opus 4, Claude Sonnet 4, Gemini 2.5 Pro/Flash, GPT-4o, DeepSeek V3, Llama 4
- Hệ thống **mood, energy, skill level** ảnh hưởng hiệu suất
- Tự động phân task theo vai trò (Auto-assign)

### 📋 Hệ Thống Hợp Đồng
- Nhận hợp đồng với nhiều cấp độ: Easy → Medium → Hard → Epic
- Deadline, reward, penalty tạo áp lực thực tế
- Hệ thống **Reputation** ảnh hưởng chất lượng hợp đồng

### 🎨 Pixel Engine 2D
- Render văn phòng bằng **HTML5 Canvas** theo tile system
- **6 khu vực**: Tòa Nhà, Tầng Thượng, Sân Ngoài Trời, Quán Cafe, PixelMart, Công Viên
- Camera: pan/zoom/minimap
- Hiệu ứng: speech bubble, particle, day/night cycle

### 🔬 Cây Công Nghệ (Tech Tree)
- 3 nhánh nghiên cứu × 4 tầng = **12 công nghệ**
  - **Engineering**: Fast Compile → Code Review Bot → CI/CD → Quantum Computing
  - **AI Research**: Smart Assign → Mood Prediction → Neural Optimizer → AGI Prototype
  - **Management**: Overtime → Remote Work → Team Building → IPO Express

### 🌾 Hệ Thống Nông Trại
- **12 loại cây** (Rau, Trái cây, Hoa, Thảo dược)
- **8 công thức nấu ăn** tạo buff cho agent
- **5 kiểu thời tiết** ảnh hưởng mùa vụ
- 12 ô đất với chu trình: trồng → tưới → thu hoạch → bán/nấu

### 🎮 Mini-Games
| Game | Mô tả |
|------|--------|
| 🃏 **Texas Hold'em Poker** | Poker đầy đủ 6 người, AI betting personality |
| 🎱 **8-Ball Billiards** | Physics engine 2D, 15 bi + cue ball |
| 🎰 **Slot Machine** | 7 symbol, weighted distribution, auto-spin |
| 🏎️ **Road Racer** | Đua xe pixel tốc độ cao |
| 🚁 **Flappy Heli** | Điều khiển trực thăng vượt chướng ngại vật |
| 🎣 **Fishing Game** | Câu cá thư giãn |
| 🥊 **Fighter Game** | Đối kháng giữa các agent |
| ☕ **Cafe Game** | Quản lý quán cà phê |
| 📈 **Gold Trading** | Mô phỏng thị trường vàng (Geometric Brownian Motion) |

### 🛍️ PixelMart & Inventory
- Cửa hàng vật phẩm đa dạng
- Inventory hotbar, drag-drop
- Buff items ảnh hưởng gameplay

### 🏗️ Layout Editor
- Tùy biến văn phòng với **30+ loại nội thất**
- 5 công cụ: Select, Furniture, Erase, Floor Paint, Wall
- Undo/Redo (100 bước), Auto-save, Export/Import JSON
- Collision detection (AABB)

### 🏆 Achievements & Stats
- **22 achievement** chia 5 nhóm: Economy, Contracts, Agents, Company, Minigames
- Dashboard thống kê hiệu suất
- Biểu đồ performance real-time

---

## 🏗️ Kiến Trúc Hệ Thống

```
┌────────────────────────────────────────────────────────────┐
│                     🌐 Browser (Client)                     │
│  ┌──────────┐ ┌────────────┐ ┌───────────┐ ┌────────────┐ │
│  │index.html│ │  styles.css │ │ mobile.css│ │  assets/   │ │
│  └────┬─────┘ └────────────┘ └───────────┘ └────────────┘ │
│       │                                                     │
│  ┌────▼──────────────────────────────────────────────────┐ │
│  │                    app.js (Orchestrator)                │ │
│  ├───────┬──────────┬──────────┬────────────┬────────────┤ │
│  │game.js│agents.js │pixel-eng.│layout-ed.js│ chatbox.js │ │
│  ├───────┼──────────┼──────────┼────────────┼────────────┤ │
│  │tech-  │ farm.js  │gold-     │achievements│ statistics │ │
│  │tree.js│          │trading.js│.js         │.js         │ │
│  ├───────┴──────────┴──────────┴────────────┴────────────┤ │
│  │  poker.js │ billiards.js │ slot-machine.js │ ...games │ │
│  └───────────┴──────────────┴─────────────────┴──────────┘ │
│                         │ REST + WebSocket                  │
├─────────────────────────┼──────────────────────────────────┤
│                     🐍 Python (Server)                      │
│  ┌──────────────────────▼───────────────────────────────┐  │
│  │               server.py (Flask + SocketIO)            │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │                    game_engine/                        │  │
│  │  ┌──────────┐ ┌──────────────┐ ┌─────────────────┐   │  │
│  │  │ models.py│ │agent_manager │ │contract_manager │   │  │
│  │  │(dataclass│ │  .py         │ │     .py         │   │  │
│  │  └──────────┘ └──────────────┘ └─────────────────┘   │  │
│  │  ┌──────────┐ ┌──────────────┐ ┌─────────────────┐   │  │
│  │  │economy.py│ │farm_manager  │ │ mini_games.py   │   │  │
│  │  │          │ │     .py      │ │                 │   │  │
│  │  └──────────┘ └──────────────┘ └─────────────────┘   │  │
│  │  ┌──────────────┐ ┌──────────────────┐                │  │
│  │  │save_manager.py│ │  analytics.py   │                │  │
│  │  └──────────────┘ └──────────────────┘                │  │
│  └───────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

---

## 🚀 Cài Đặt & Chạy

### Yêu Cầu
- **Python** 3.11+
- **pip** (Python package manager)
- Trình duyệt web hiện đại (Chrome, Firefox, Edge)

### Cách 1: Chạy Local

```bash
# 1. Clone repository
git clone https://github.com/MinhNhan2010/PixelAgentCity.git
cd PixelAgentCity

# 2. Cài đặt dependencies
pip install -r requirements.txt

# 3. Khởi động server
python server.py
```

Mở trình duyệt tại **http://localhost:5000** 🎮

### Cách 2: Docker

```bash
# Build image
docker build -t pixelagent-city .

# Chạy container
docker run -p 5000:5000 pixelagent-city
```

---

## 📡 API Reference

Server cung cấp REST API + WebSocket cho giao tiếp client-server:

### Game State
| Method | Endpoint | Mô tả |
|--------|----------|--------|
| `GET` | `/api/state` | Lấy toàn bộ game state |
| `GET` | `/api/state/summary` | Tóm tắt nhanh (coins, day, level) |
| `POST` | `/api/game/new` | Bắt đầu game mới |
| `POST` | `/api/game/tick` | Tiến hành 1 tick mô phỏng |
| `POST` | `/api/game/next_day` | Chuyển sang ngày mới |
| `POST` | `/api/game/speed` | Đổi tốc độ (1x–3x) |
| `POST` | `/api/game/pause` | Tạm dừng/Tiếp tục |

### Agents
| Method | Endpoint | Mô tả |
|--------|----------|--------|
| `GET` | `/api/agents` | Danh sách agents |
| `POST` | `/api/agents/hire` | Tuyển agent mới |
| `POST` | `/api/agents/:id/fire` | Sa thải agent |
| `GET` | `/api/agents/roles` | Roles hiện có |

### Contracts
| Method | Endpoint | Mô tả |
|--------|----------|--------|
| `GET` | `/api/contracts` | Danh sách hợp đồng |
| `POST` | `/api/contracts/generate` | Tạo hợp đồng mới |
| `POST` | `/api/contracts/:id/accept` | Chấp nhận hợp đồng |

### Economy & Farm
| Method | Endpoint | Mô tả |
|--------|----------|--------|
| `GET` | `/api/economy` | Báo cáo tài chính |
| `GET` | `/api/farm` | Trạng thái nông trại |
| `POST` | `/api/farm/plant` | Trồng cây |
| `POST` | `/api/farm/water` | Tưới nước |
| `POST` | `/api/farm/harvest` | Thu hoạch |
| `POST` | `/api/farm/cook` | Nấu ăn |

### Mini-Games & Save/Load
| Method | Endpoint | Mô tả |
|--------|----------|--------|
| `POST` | `/api/minigames/poker` | Chơi poker |
| `POST` | `/api/minigames/slots` | Chơi slot |
| `POST` | `/api/minigames/gold/buy` | Mua vàng |
| `POST` | `/api/save` | Lưu game |
| `POST` | `/api/load` | Tải game |
| `GET` | `/api/analytics` | Dashboard phân tích |

### WebSocket Events
| Event | Hướng | Mô tả |
|-------|-------|--------|
| `connect` | Client → Server | Kết nối |
| `connected` | Server → Client | Xác nhận kết nối |
| `sync_state` | Client → Server | Đồng bộ trạng thái |
| `agent_hired` | Server → Client | Agent mới được tuyển |
| `contract_accepted` | Server → Client | Hợp đồng được chấp nhận |
| `new_day` | Server → Client | Ngày mới bắt đầu |
| `game_loaded` | Server → Client | Game đã tải xong |

---

## 🎮 Hướng Dẫn Chơi

### Luồng Chơi Chính

```
🎮 Bắt đầu → 🤖 Tuyển Agent → 📋 Nhận Contract → 📝 Gán Task
                                                         ↓
🏆 IPO! ← 🏢 Lên Level ← ⭐ Nhận XP + Tiền ← ✅ Hoàn thành
```

### Phím Tắt

| Phím | Chức năng |
|------|-----------|
| `H` | Tuyển Agent mới |
| `C` | Mở Contract Board |
| `R` | Cây Công Nghệ |
| `F` | Nông Trại |
| `P` | PixelMart |
| `L` | Layout Editor |
| `S` | Panel Quản Lý |
| `Space` | Tạm dừng / Tiếp tục |
| `I` | Ẩn/Hiện Inventory |
| `A` | Thành Tựu |
| `N` | Thông Báo |

### Mẹo Chơi
> 💡 **Cân đối tài chính**: Mỗi agent tốn lương hàng ngày — tuyển quá nhiều sẽ phá sản!
> 
> 💡 **Reputation**: Hoàn thành đúng hạn tăng rep → mở khóa contract tốt hơn
>
> 💡 **Farm**: Nấu ăn tạo buff cho agent, tăng hiệu suất làm việc
>
> 💡 **Tech Tree**: Đầu tư nghiên cứu sớm để hưởng bonus lâu dài

---

## 📊 Thống Kê Dự Án

| Thống kê | Giá trị |
|----------|---------|
| Tổng file mã nguồn | **55+ file** |
| Frontend code | **~700 KB** (JS + CSS) |
| Backend modules | **8 module** Python |
| Pixel Engine | **~290 KB** (~7,500 dòng) |
| Mini-games | **9 game** |
| Agent roles | **10 loại** |
| AI models | **8 model** |
| Achievements | **22 thành tựu** |
| Tech tree nodes | **12 công nghệ** |
| Farm crops | **12 loại cây** |
| Cooking recipes | **8 công thức** |

---

## 🛠️ Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| **Frontend** | HTML5, CSS3, JavaScript ES6+ |
| **Render Engine** | HTML5 Canvas API |
| **Audio** | Web Audio API (Chiptune) |
| **Backend** | Python 3.11, Flask 3.1 |
| **Real-time** | Flask-SocketIO (WebSocket) |
| **Data Models** | Python dataclasses + Enum |
| **Persistence** | localStorage (client) + JSON file (server) |
| **Typography** | Press Start 2P (pixel), Inter (UI) |
| **Container** | Docker (python:3.11-slim) |
| **CORS** | Flask-CORS |

---

## 📁 Cấu Trúc Thư Mục

```
PixelAgentCity/
├── index.html              # Giao diện chính (1,061 dòng)
├── server.py               # Flask server + REST API + WebSocket
├── requirements.txt        # Python dependencies
├── Dockerfile              # Docker container config
│
├── app.js                  # Orchestrator — điều phối tổng (153 KB)
├── game.js                 # Game state, economy, level system
├── pixel-engine.js         # 2D render engine (290 KB)
├── agents.js               # Agent logic & UI (54 KB)
├── chatbox.js              # Agent chatbox system
├── layout-editor.js        # Office layout editor
│
├── tech-tree.js            # Tech tree (12 công nghệ)
├── farm.js                 # Farm system (12 cây, 8 công thức)
├── gold-trading.js         # Gold trading simulation
├── achievements.js         # 22 achievements
├── statistics.js           # Performance analytics
├── item-shop.js            # PixelMart shop
├── item-catalog.js         # Item database
│
├── poker.js / poker-ui.js          # Texas Hold'em Poker
├── billiards.js / billiards-ui.js  # 8-Ball Billiards
├── slot-machine.js / -ui.js        # Slot Machine
├── road-racer.js / -ui.js          # Road Racer
├── flappy-heli.js / -ui.js         # Flappy Helicopter
├── fishing-game.js / -ui.js        # Fishing Game
├── fighter-game.js / -ui.js        # Fighter Game
├── cafe-game.js / -ui.js           # Cafe Game
├── gold-trading-ui.js              # Gold Trading UI
│
├── styles.css              # Main styles (289 KB)
├── mobile.css              # Responsive mobile styles
├── styles-modular.css      # Modular CSS components
├── css/
│   ├── base.css            # Base design tokens
│   └── item-shop.css       # Shop-specific styles
│
├── game_engine/            # Python backend modules
│   ├── __init__.py
│   ├── models.py           # Data models (dataclass)
│   ├── agent_manager.py    # Agent lifecycle & AI
│   ├── contract_manager.py # Contract generation & tracking
│   ├── economy.py          # Financial management
│   ├── farm_manager.py     # Farm simulation
│   ├── mini_games.py       # Mini-game tracker
│   ├── save_manager.py     # Save/Load system
│   └── analytics.py        # Game analytics
│
├── assets/                 # Pixel art assets
│   ├── characters/         # Character sprites
│   ├── furniture/          # Furniture sprites  
│   ├── floors/             # Floor textures
│   └── walls/              # Wall textures
│
├── saves/                  # Game save files
├── unit-tests.html         # Unit tests
└── error-handler.js        # Global error handling
```

---

## 🔬 Kỹ Thuật Nổi Bật

### 1. Agent-based Simulation (Rule-based AI)
Mỗi agent có `mood`, `energy`, `skill`, `level` → ảnh hưởng hiệu suất làm việc. Hành vi chuyển đổi tự động: `working → resting → socializing → playing`.

### 2. 2D Physics Engine (Billiards)
Euler integration, AABB + circle collision detection, elastic collision response, friction decay, cushion bounce.

### 3. Financial Simulation (Gold Trading)
**Geometric Brownian Motion**: `price = price × (drift + noise)` với mean reversion, trend momentum và 14 sự kiện thị trường ngẫu nhiên.

### 4. Combinatorial Algorithm (Poker)
C(7,5) = 21 tổ hợp mỗi lượt đánh giá hand. Backtracking cho combination generation, hand ranking với flush/straight detection.

### 5. Tile-based Rendering (Pixel Engine)
Layered rendering: `floor → furniture → agents → effects`. Camera system với pan/zoom/minimap trên HTML5 Canvas.

---

## 🎓 Ý Nghĩa Học Thuật

| Lĩnh vực | Ứng dụng trong đề tài |
|-----------|----------------------|
| **Thiết kế phần mềm** | Kiến trúc module, tách biệt frontend/backend |
| **Quản lý trạng thái** | State management phức tạp với nhiều entity |
| **Mô phỏng** | Agent-based simulation, physics engine |
| **Thuật toán** | Combinatorial (Poker), Geometric Brownian Motion (Gold) |
| **Giao diện** | Canvas 2D, responsive design, micro-interactions |
| **Mạng** | REST API, WebSocket real-time communication |
| **Lưu trữ** | Serialization/Deserialization, save/load system |

---

## 🗺️ Roadmap

- [ ] 🤖 Tích hợp AI thật (Gemini/GPT API) vào AgentChatbox
- [ ] 🌐 Backend database (MongoDB/PostgreSQL)
- [ ] 👥 Multiplayer & Leaderboard
- [ ] 📱 Tối ưu touch controls cho mobile
- [ ] 📦 Build tool (Vite/Webpack)
- [ ] 🧪 Unit testing (Jest)
- [ ] 🎵 Thêm nhạc nền chiptune
- [ ] 🌍 Đa ngôn ngữ (i18n)

---

## 👨‍💻 Tác Giả

**Minh Nhân** — Sinh viên TDMU

- GitHub: [@MinhNhan2010](https://github.com/MinhNhan2010)

---

## 📜 License

Dự án này được phân phối theo giấy phép **MIT License**. Xem file [LICENSE](LICENSE) để biết thêm chi tiết.

---

<p align="center">
  <strong>Made with ❤️ & Pixels</strong><br>
  <em>v3.0 — PixelAgent City</em>
</p>
