# Windows Service cho ZaloBot EGAS

## 1. Build

```powershell
npm run build
```

## 2. Cài service

Mở PowerShell bằng quyền Administrator tại thư mục project rồi chạy:

```powershell
npm run service:install:polling
npm run service:install:monitor
```

- `polling`: nhận lệnh từ Zalo (`check`, `check vạn phúc`, `cảnh báo`, `hướng dẫn`).
- `monitor`: kiểm tra khách `ams` định kỳ và gửi thông báo vào nhóm.

## 3. Kiểm tra service

Mở `services.msc`, tìm:

- `ZaloBot EGAS Polling`
- `ZaloBot EGAS AMS Monitor`

Hoặc dùng PowerShell:

```powershell
Get-Service "ZaloBot EGAS*"
```

## 4. Gỡ service

Mở PowerShell bằng quyền Administrator:

```powershell
npm run service:uninstall:polling
npm run service:uninstall:monitor
```

## 5. Cấu hình .env

Service đọc file `.env` trong thư mục project. Nếu thay đổi `.env`, hãy restart service trong `services.msc`.

Các biến quan trọng:

```env
EGAS_BASE_URL=http://192.168.1.101
EGAS_USERNAME=...
EGAS_PASSWORD=...
EGAS_HEADLESS=true

ZALO_BOT_TOKEN=...
ZALO_MONITOR_CHAT_ID=zgr-...
ZALO_MONITOR_QUERY=ams
ZALO_MONITOR_INTERVAL_MS=60000
ZALO_MONITOR_DAILY_HOUR=5
```
