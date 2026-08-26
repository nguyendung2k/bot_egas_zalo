import { Service } from "node-windows";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const [mode] = process.argv.slice(2);
if (mode !== "polling" && mode !== "monitor") {
    console.error("Usage: node install-service.js <polling|monitor>");
    process.exit(1);
}

const isMonitor = mode === "monitor";
const scriptPath = path.resolve(__dirname, `../bot/${isMonitor ? "monitor" : "polling"}.js`);
const projectRoot = path.resolve(__dirname, "../..");
const serviceName = isMonitor ? "ZaloBot EGAS AMS Monitor" : "ZaloBot EGAS Polling";

const svc = new Service({
    name: serviceName,
    description: `${serviceName} service`,
    script: scriptPath,
    workingDirectory: projectRoot,
    wait: 2,
    grow: 0.5,
    maxRestarts: 10,
    env: [
        { name: "NODE_ENV", value: process.env.NODE_ENV ?? "production" },
        { name: "DOTENV_CONFIG_PATH", value: path.join(projectRoot, ".env") },
        { name: "PLAYWRIGHT_BROWSERS_PATH", value: "0" },
    ],
});

svc.on("install", () => {
    svc.start();
    console.log(`Service "${serviceName}" installed and started.`);
});
svc.on("alreadyinstalled", () => {
    console.log(`Service "${serviceName}" already installed. Starting...`);
    svc.start();
});
svc.on("start", () => console.log(`Service "${serviceName}" started.`));
svc.on("error", (err: Error) => console.error(`Service error:`, err));
svc.install();
