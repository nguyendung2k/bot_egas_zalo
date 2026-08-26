import "dotenv/config";

// Windows Service chạy dưới SYSTEM nên Playwright mặc định tìm browser trong systemprofile.
// Đặt browser cache vào project để CLI và service dùng chung.
process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || "0";
