# 🐍 PixelAgent City — Python Hybrid Backend

## Kiến trúc Hybrid

```
┌─────────────────────────────────────────────────┐
│                   Browser (Client)               │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ HTML/CSS │  │ Game JS  │  │ python-bridge  │  │
│  │   UI     │  │  Engine  │  │     .js        │──┤──► WebSocket
│  └──────────┘  └──────────┘  └───────────────┘  │
│          Canvas Rendering / DOM UI               │
└──────────────────────┬──────────────────────────┘
                       │ REST API + WebSocket
┌──────────────────────▼──────────────────────────┐
│              Python Flask Server                 │
│  ┌──────────────────────────────────────────┐   │
│  │           game_engine/                    │   │
│  │  ├── models.py         (Data Models)      │   │
│  │  ├── agent_manager.py  (Agent AI)         │   │
│  │  ├── economy.py        (Economy System)   │   │
│  │  ├── contract_manager.py (Contracts)      │   │
│  │  ├── farm_manager.py   (Farm System)      │   │
│  │  ├── mini_games.py     (Poker/Slots/Gold) │   │
│  │  ├── save_manager.py   (Save/Load)        │   │
│  │  └── analytics.py      (Analytics)        │   │
│  └──────────────────────────────────────────┘   │
│              server.py (Flask + SocketIO)        │
└─────────────────────────────────────────────────┘
```

## Cài đặt & Chạy

### Bước 1: Cài Python packages
```bash
cd n:\PixelGame\PixelAgentCity
pip install -r requirements.txt
```

### Bước 2: Chạy server
```bash
python server.py
```

### Bước 3: Mở trình duyệt
```
http://localhost:5000
```

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/api/state` | Lấy toàn bộ game state |
| GET | `/api/state/summary` | Tóm tắt game state |
| GET | `/api/agents` | Danh sách agents |
| POST | `/api/agents/hire` | Tuyển agent mới |
| POST | `/api/agents/{id}/fire` | Sa thải agent |
| GET | `/api/agents/roles` | Các role khả dụng |
| GET | `/api/contracts` | Danh sách contracts |
| POST | `/api/contracts/generate` | Tạo contracts mới |
| POST | `/api/contracts/{id}/accept` | Nhận contract |
| GET | `/api/economy` | Thông tin tài chính |
| GET | `/api/farm` | Trạng thái nông trại |
| POST | `/api/farm/plant` | Trồng cây |
| POST | `/api/farm/water` | Tưới nước |
| POST | `/api/farm/harvest` | Thu hoạch |
| POST | `/api/farm/cook` | Nấu ăn |
| POST | `/api/farm/sell` | Bán sản phẩm |
| POST | `/api/minigames/poker` | Chơi poker |
| POST | `/api/minigames/slots` | Chơi slot machine |
| POST | `/api/minigames/gold/buy` | Mua vàng |
| POST | `/api/minigames/gold/sell` | Bán vàng |
| GET | `/api/minigames/scores` | Điểm mini-game |
| POST | `/api/save` | Lưu game |
| POST | `/api/load` | Tải game |
| GET | `/api/saves` | Danh sách saves |
| GET | `/api/analytics` | Dashboard analytics |
| POST | `/api/game/new` | Game mới |
| POST | `/api/game/tick` | Game tick |
| POST | `/api/game/next_day` | Ngày mới |

## Cấu trúc file Python

```
game_engine/
├── __init__.py          # Package init
├── models.py            # Data models (Agent, Contract, Task, etc.)
├── agent_manager.py     # Agent AI, hiring, task assignment
├── economy.py           # Coins, salary, XP, leveling
├── contract_manager.py  # Contract generation & tracking
├── farm_manager.py      # Crops, cooking, weather
├── mini_games.py        # Poker, Slots, Gold Trading
├── save_manager.py      # JSON save/load
└── analytics.py         # Game analytics & metrics

server.py                # Flask server (main entry)
python-bridge.js         # JS ↔ Python bridge
requirements.txt         # Python dependencies
```

## Hybrid Mode

Game hoạt động ở **2 chế độ**:

1. **🐍 Python Server Mode**: Khi `server.py` đang chạy
   - Badge "🐍 Python Server" hiện ở góc phải dưới
   - Save/Load qua Python (file JSON)
   - Analytics server-side
   - WebSocket real-time sync

2. **💻 Client Only Mode**: Khi không có server
   - Game vẫn chạy bình thường 100%
   - Badge "💻 Client Only" hiện lên
   - Dùng localStorage cho save/load
