import { createWindowsService, serviceKind } from "./windows-service.js";

const service = createWindowsService(serviceKind);
service.on("uninstall", () => console.log(`[SERVICE] Đã gỡ: ${serviceKind}`));
service.on("error", (error) => {
    console.error("[SERVICE] Lỗi gỡ service:", error);
    process.exitCode = 1;
});
service.uninstall();
