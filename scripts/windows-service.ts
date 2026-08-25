import "./env.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Service } from "node-windows";

const __filename = fileURLToPath(import.meta.url);
const distScripts = path.dirname(__filename);
const projectRoot = path.resolve(distScripts, "..", "..");

type ServiceKind = "polling" | "monitor";

const kind = (process.argv[2] ?? "polling") as ServiceKind;
if (!["polling", "monitor"].includes(kind)) {
    console.error("Service kind không hợp lệ. Dùng: polling hoặc monitor");
    process.exit(1);
}

const serviceMap: Record<ServiceKind, { name: string; description: string; script: string }> = {
    polling: {
        name: "ZaloBot EGAS Polling",
        description: "Zalo Bot EGAS polling service - nhận lệnh check công nợ từ Zalo.",
        script: path.join(distScripts, "zalo-polling-lib.js"),
    },
    monitor: {
        name: "ZaloBot EGAS AMS Monitor",
        description: "Zalo Bot EGAS monitor service - kiểm tra AMS định kỳ và gửi báo cáo nhóm.",
        script: path.join(distScripts, "zalo-monitor.js"),
    },
};

export const createWindowsService = (serviceKind: ServiceKind): Service => {
    const item = serviceMap[serviceKind];
    return new Service({
        name: item.name,
        description: item.description,
        script: item.script,
        workingDirectory: projectRoot,
        nodeOptions: ["--enable-source-maps"],
        env: [
            { name: "NODE_ENV", value: process.env.NODE_ENV ?? "production" },
            { name: "DOTENV_CONFIG_PATH", value: path.join(projectRoot, ".env") },
        ],
        wait: 2,
        grow: 0.5,
        maxRestarts: 10,
    });
};

export const serviceKind = kind;
