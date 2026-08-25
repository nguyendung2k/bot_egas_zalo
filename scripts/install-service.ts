import { createWindowsService, serviceKind } from "./windows-service.js";

const service = createWindowsService(serviceKind);
service.on("install", () => {
    console.log(`[SERVICE] Đã cài: ${serviceKind}. Đang start...`);
    service.start();
});
service.on("alreadyinstalled", () => console.log(`[SERVICE] Service đã tồn tại: ${serviceKind}`));
service.on("start", () => console.log(`[SERVICE] Đã start: ${serviceKind}`));
service.on("error", (error) => {
    console.error("[SERVICE] Lỗi cài service:", error);
    process.exitCode = 1;
});
service.install();
