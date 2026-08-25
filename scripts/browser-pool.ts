import { chromium } from "playwright";

let sharedBrowser: import("playwright").Browser | null = null;
let launchOptions: { headless: boolean; slowMo: number } = { headless: true, slowMo: 0 };

export const getBrowser = async (headless: boolean, slowMo: number): Promise<import("playwright").Browser> => {
    launchOptions = { headless, slowMo: Math.max(0, slowMo) };
    // Nếu browser đang sống và chưa crash thì dùng lại
    if (sharedBrowser && sharedBrowser.isConnected()) return sharedBrowser;
    // Tạo mới
    sharedBrowser = await chromium.launch({ headless, slowMo: launchOptions.slowMo });
    sharedBrowser.on("disconnected", () => {
        console.log("[BROWSER] Browser disconnected, sẽ tạo mới lần sau.");
        sharedBrowser = null;
    });
    return sharedBrowser;
};

export const closeBrowser = async (): Promise<void> => {
    if (sharedBrowser) {
        await sharedBrowser.close().catch(() => {});
        sharedBrowser = null;
    }
};
