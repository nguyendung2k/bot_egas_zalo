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

// Ten goc dung khi cai dat cu
const serviceName = isMonitor ? "ZaloBot EGAS AMS Monitor" : "ZaloBot EGAS Polling";

// node-windows: this.root = path.dirname(script), this._exe = name.replace(/[^\w]/gi,'').toLowerCase()
// Can trao script path vao thu muc daemon cu de node-windows tim duoc daemon exe
const daemonDir = path.resolve(__dirname, "../../dist/scripts/daemon");
const scriptPath = path.join(daemonDir, "x.js"); // bat ky file nao trong daemon dir

const svc = new Service({
    name: serviceName,
    script: scriptPath,
});

svc.on("uninstall", () => console.log(`Service "${serviceName}" uninstalled.`));
svc.on("alreadyuninstalled", () => console.log(`Service "${serviceName}" already uninstalled.`));
svc.on("error", (err: Error) => console.error(`Service error:`, err));
svc.uninstall();
