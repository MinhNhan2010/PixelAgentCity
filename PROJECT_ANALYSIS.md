# Project Analysis: PixelAgent City

## 1. Overview

**Project name:** PixelAgent City

**Suggested report title:** Xây dựng game mô phỏng quản lý studio AI trên nền tảng web

PixelAgent City là một game web mô phỏng quản lý theo phong cách pixel-art. Người chơi vào vai nhà quản lý một studio AI, thực hiện các hoạt động chính như tuyển agent, nhận contract, phân chia công việc, quan sát hiệu suất làm việc, bố trí văn phòng và phát triển công ty qua nhiều cấp độ.

Về bản chất, đề tài kết hợp ba hướng chính:

- Game mô phỏng quản lý
- Giao diện tương tác trực quan 2D
- Giả lập hành vi cộng tác của các AI agents

Đây là một đề tài phù hợp để làm đồ án hoặc sản phẩm showcase vì có gameplay rõ ràng, giao diện dễ demo và logic hệ thống được tách thành các module khá hợp lý.

## 2. Main Goal And Meaning

Mục tiêu của đề tài là xây dựng một ứng dụng web có khả năng mô phỏng quy trình vận hành của một studio AI ở mức độ đơn giản nhưng trực quan. Thông qua đó, dự án thể hiện các nội dung kỹ thuật và ý tưởng sản phẩm sau:

- Mô phỏng luồng vận hành "tuyển người -> nhận việc -> xử lý task -> nhận tiền -> nâng cấp"
- Xây dựng hệ thống game state có tính tiến trình, thắng thua và mở khóa nội dung
- Trình bày văn phòng AI dưới dạng không gian 2D pixel để tăng tính nhập vai
- Giả lập hành vi agent theo role như coder, tester, reviewer, designer, devops
- Tạo trải nghiệm tương tác thêm thông qua chatbox và layout editor

Về ý nghĩa học thuật, đề tài cho thấy khả năng phân tách bài toán thành các thành phần rõ ràng: quản lý trạng thái, mô phỏng agent, render bản đồ, xử lý giao diện và lưu dữ liệu cục bộ.

## 3. Core Modules

### 3.1. `GameState` in `game.js`

Module này là trung tâm điều phối gameplay. Thành phần này quản lý:

- Hệ thống kinh tế: coins, tổng thu, tổng chi, chi phí tuyển dụng, lương hằng ngày
- Chu kỳ ngày đêm và tốc độ game
- Reputation, company level, XP và điều kiện chiến thắng
- Contract có các thuộc tính reward, deadline, roles bắt buộc, số task cần hoàn thành
- Save/load trạng thái bằng `localStorage`

Có thể xem đây là lớp điều khiển tiến trình game và các quy tắc kinh doanh của studio AI.

### 3.2. `AgentManager` in `agents.js`

Module này phụ trách logic agent và task. Các chức năng nổi bật gồm:

- Tạo và quản lý danh sách agents
- Tạo task, gán task, đánh dấu hoàn thành task
- Mô phỏng quá trình làm việc dựa trên skill, mood, energy và role
- Hỗ trợ review flow, pair programming, mentoring
- Phát sinh sự kiện ngẫu nhiên trong văn phòng
- Ghi nhật ký hoạt động và thống kê hiệu suất

Đây là phần thể hiện rõ nhất ý tưởng "AI office simulation", dù AI hiện tại mới được giả lập theo rule-based logic.

### 3.3. `PixelEngine` in `pixel-engine.js`

Module này đảm nhiệm việc hiển thị không gian văn phòng 2D:

- Vẽ bản đồ văn phòng theo tile
- Điều khiển camera, zoom, minimap
- Quản lý furniture, vị trí agent và sprite
- Hiển thị hiệu ứng tương tác trong không gian
- Hỗ trợ click agent trên canvas

Thành phần này giúp đề tài có tính trực quan cao và tạo điểm nhấn rõ cho sản phẩm.

### 3.4. `LayoutEditor` in `layout-editor.js`

Layout editor cho phép người chơi:

- Đặt nội thất
- Xóa vật thể
- Tô màu sàn
- Lưu và tải bố cục
- Undo/redo thao tác

Tính năng này làm đề tài vượt qua mức demo game đơn giản, vì người dùng có thêm quyền tùy biến môi trường làm việc.

### 3.5. `AgentChatbox` in `chatbox.js`

Chatbox là thành phần mô phỏng giao tiếp với agent:

- Kéo thả agent vào khung chat
- Gửi tin nhắn cho agent
- Nhận phản hồi theo role và trạng thái công việc
- Tạo cảm giác tương tác với một đội ngũ AI trong văn phòng

Mặc dù chưa kết nối AI thật, module này vẫn tăng giá trị trình bày và trải nghiệm người dùng.

### 3.6. `app.js` and `index.html`

Hai thành phần này phối hợp để:

- Khởi tạo game
- Điều phối start screen, HUD, modal, tab giao diện
- Kết nối callback giữa `GameState`, `AgentManager`, `PixelEngine`, `LayoutEditor` và `AgentChatbox`
- Xử lý tuyển agent, nhận contract, refresh danh sách task, logs và thống kê

## 4. Main User Flow

Lượt chơi có thể mô tả ngắn gọn như sau:

1. Người chơi bắt đầu game mới.
2. Hệ thống tạo studio ban đầu với một số starter agents.
3. Người chơi mở bảng contract và nhận hợp đồng phù hợp.
4. Mỗi contract sinh ra nhiều task cần được hoàn thành.
5. Agent thực hiện task theo role, mood, energy và có thể phát sinh review hoặc sự kiện ngẫu nhiên.
6. Khi contract hoàn thành, người chơi nhận tiền, uy tín và XP công ty.
7. Khi lên level, người chơi mở khóa role mới và contract khó hơn.
8. Nếu hết tiền thì game over; nếu đạt mốc cao nhất thì chiến thắng.

Đây là gameplay loop khá đầy đủ cho một game mô phỏng quản lý mini.

## 5. Strengths Of The Topic

Những điểm mạnh nổi bật của đề tài:

- Có ý tưởng sáng tạo: đưa mô hình văn phòng AI vào một game pixel-art
- Cấu trúc code tách module khá rõ, dễ phân tích trong báo cáo
- Có kết hợp gameplay, UI, mô phỏng agent và tùy biến không gian
- Chạy bằng front-end thuần, dễ demo nhanh mà không cần backend
- Có cơ chế progression gồm contract, reputation, level và unlock role
- Có thêm chatbox và layout editor, giúp sản phẩm phong phú hơn một game mẫu đơn giản

## 6. Technical Limitations

Bên cạnh điểm mạnh, dự án vẫn có những hạn chế kỹ thuật cần nêu trung thực trong báo cáo:

- Agent hiện tại là mô phỏng logic, chưa tích hợp AI thời gian thực hoặc mô hình ngôn ngữ thật
- Dữ liệu đang lưu bằng `localStorage`, nên chỉ phù hợp cho sử dụng cá nhân trên một trình duyệt
- Chưa có backend, database hoặc đồng bộ nhiều người dùng
- Một số chuỗi giao diện đang bị lỗi encoding tiếng Việt và cần được chuẩn hóa trước khi nộp chính thức
- Giao diện HTML hiện có dấu hiệu lặp `id` như `footerBar` và `btnClearLogs`, có thể gây xung đột DOM

Những hạn chế này không làm mất giá trị đề tài, nhưng là các điểm nên nêu rõ để tăng tính thực tế và tính học thuật cho báo cáo.

## 7. Academic And Practical Value

### Giá trị học thuật

Đề tài phù hợp để trình bày các nội dung:

- Phân tích và thiết kế hệ thống
- Quản lý trạng thái trong ứng dụng tương tác
- Mô phỏng đối tượng và quy trình công việc
- Thiết kế giao diện web có tính trực quan và khả năng thao tác
- Tích hợp gameplay với thành phần quản trị và thống kê

### Giá trị thực tiễn

Đề tài có thể phát triển tiếp theo các hướng:

- Tích hợp AI thật cho chat agent
- Bổ sung backend và tài khoản người dùng
- Đồng bộ save game trên cloud
- Mở rộng contract, furniture, bản đồ và role
- Thêm bảng xếp hạng, achievement hoặc hệ thống nhiệm vụ

## 8. Conclusion

PixelAgent City là một đề tài tốt vì kết hợp được tính sáng tạo, tính thực hành và khả năng demo. Sản phẩm không chỉ là một giao diện đẹp mà còn có vòng chơi rõ ràng, cấu trúc logic tương đối đầy đủ và nhiều thành phần mô phỏng có giá trị trình bày.

Nếu viết kết luận ngắn cho báo cáo, có thể dùng ý sau:

> Đề tài PixelAgent City đã xây dựng một hệ thống game web mô phỏng quản lý studio AI theo phong cách pixel-art, trong đó người chơi có thể tuyển agent, nhận contract, bố trí văn phòng và phát triển công ty qua từng giai đoạn. Đề tài có giá trị cả về mặt học thuật lẫn sản phẩm, đồng thời mở ra khả năng mở rộng thành một hệ thống quản lý agent thông minh trong tương lai.

## 9. Suggested Presentation Script

Nếu cần trình bày nhanh, có thể tóm tắt bằng bốn ý:

- PixelAgent City là game web mô phỏng quản lý một studio AI
- Hệ thống gồm các module quản lý game state, agent, văn phòng, chatbox và layout editor
- Điểm nổi bật là gameplay loop rõ ràng và giao diện pixel trực quan
- Hạn chế hiện tại là chưa có AI thật, backend thật và cần sửa một số vấn đề giao diện/encoding
