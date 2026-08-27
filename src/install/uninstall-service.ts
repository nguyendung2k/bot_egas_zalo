import { Service } from "node-windows";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const [mode] = process.argv.slice(2);
if (mode !== "polling" && mode !== "monitor") {
    console.error("Usage: node uninstall-service.js <polling|monitor>");
    process.exit(1);
}

const isMonitor = mode === "monitor";
const serviceName = isMonitor ? "ZaloBot EGAS AMS Monitor" : "ZaloBot EGAS Polling";

// Matches daemonBase used in install-service.ts; node-windows appends "daemon"
// to the script's dirname, so point the script at .daemon/ to resolve .daemon/daemon/
const projectRoot = path.resolve(__dirname, "../..");
const daemonBase = path.join(projectRoot, ".daemon");
const scriptPath = path.join(daemonBase, "x.js");

const svc = new Service({
    name: serviceName,
    script: scriptPath,
});

svc.on("uninstall", () => console.log(`Service "${serviceName}" uninstalled.`));
svc.on("alreadyuninstalled", () => console.log(`Service "${serviceName}" already uninstalled.`));
svc.on("error", (err: Error) => console.error(`Service error:`, err));
svc.uninstall();
