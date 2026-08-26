import { Service } from "node-windows";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const [mode] = process.argv.slice(2);
if (mode !== "polling" && mode !== "monitor") {
    console.error("Usage: node reinstall-service.js <polling|monitor>");
    process.exit(1);
}

const isMonitor = mode === "monitor";
const scriptPath = path.resolve(__dirname, `../bot/${isMonitor ? "monitor" : "polling"}.js`);
const serviceName = isMonitor ? "ZaloBot EGAS AMS Monitor" : "ZaloBot EGAS Polling";

// Uninstall old service (trỏ vào daemon dir cũ để node-windows tìm được exe)
const daemonDir = path.resolve(__dirname, "../../dist/scripts/daemon");
const oldSvc = new Service({
    name: serviceName,
    script: path.join(daemonDir, "x.js"),
});

const doInstall = () => {
    console.log(`\nDang cai service "${serviceName}"...`);
    const svc = new Service({
        name: serviceName,
        description: `${serviceName} service`,
        script: scriptPath,
        wait: 2,
        grow: 0.5,
        maxRestarts: 10,
    });
    svc.on("install", () => {
        svc.start();
        console.log(`Service "${serviceName}" da cai va khoi dong.`);
    });
    svc.on("start", () => console.log(`Service "${serviceName}" da khoi dong.`));
    svc.on("alreadyinstalled", () => {
        console.log(`Service "${serviceName}" da ton tai. Dang restart...`);
        svc.start();
    });
    svc.on("error", (err: Error) => console.error(`Service error:`, err));
    svc.install();
};

console.log(`Giai phong service cu "${serviceName}"...`);
oldSvc.on("uninstall", () => {
    console.log(`Da go service cu.`);
    setTimeout(doInstall, 2000);
});
oldSvc.on("alreadyuninstalled", () => {
    console.log(`Service cu khong ton tai. Cai moi...`);
    doInstall();
});
oldSvc.on("error", () => {
    console.log(`Khong the go service cu, thu cai moi truc tiep...`);
    doInstall();
});
oldSvc.uninstall();
