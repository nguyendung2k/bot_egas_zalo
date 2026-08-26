import type { AppConfig } from "./config.js";
import type { Customer } from "./domain.js";
import { pad } from "../shared/formatting.js";
import { loginEgas } from "./authenticator.js";
import { getBrowser } from "./browser-pool.js";

const FALLBACK_URL = "https://egas.petrolimex.com.vn";
const PAGE_TIMEOUT = 15_000;

let lastWorkingUrl: string | null = null;
let primaryFailedCount = 0;
const MAX_PRIMARY_FAILS = 3;

const parseMoney = (value: string): number => {
    const normalized = value.trim();
    if (!normalized) return 0;
    const parsed = Number(normalized.replace(/\./g, "").replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
};

const buildReportUrl = (baseUrl: string, fromDate: Date, toDate: Date): string => {
    const from = `${pad(fromDate.getDate())}/${pad(fromDate.getMonth() + 1)}/${fromDate.getFullYear()}`;
    const to = `${pad(toDate.getDate())}/${pad(toDate.getMonth() + 1)}/${toDate.getFullYear()} 23:59`;
    const params = new URLSearchParams({
        id: "ARAgedPOS_S1", FRMNOPRINT1: "", FROMDATE: from, TODATE: to,
        PREFIN: "1", CREDITAREA: "2", ACCTS: "", outputformat: "1",
        noheader: "", formison: "1", rpttype: "",
    });
    return `${baseUrl}/RPT/RPT.aspx?${params.toString()}`;
};

const readCustomersFromFrame = async (frame: import("playwright").Frame): Promise<Customer[]> => {
    const result = await frame.evaluate(() => {
        const tables = document.querySelectorAll("table");
        let targetTable: HTMLTableElement | null = null;
        for (const t of tables) {
            if (t.getAttribute("cellpadding") === "3" &&
                t.getAttribute("cellspacing") === "0" &&
                t.getAttribute("border") === "1" &&
                t.getAttribute("bordercolor") === "#cccccc") {
                targetTable = t as HTMLTableElement;
                break;
            }
        }
        if (!targetTable) return { error: `Không tìm thấy table. Có ${tables.length} table.`, customers: [] };
        const tbody = targetTable.querySelector("tbody");
        if (!tbody) return { error: "Không tìm thấy tbody", customers: [] };
        const rows = Array.from(tbody.querySelectorAll("tr"));
        const cell = (cells: Element[], i: number): string => cells[i]?.textContent?.trim() || "0";
        const parseMoney = (v: string): number => {
            const n = v.trim();
            if (!n) return 0;
            const p = Number(n.replace(/\./g, "").replace(/,/g, ""));
            return Number.isFinite(p) ? p : 0;
        };
        const customers: Array<{
            maKhach: string; tenKhach: string;
            tonDauNo: string; tonDauCo: string;
            psNo: string; psCo: string;
            tonCuoiNo: string; tonCuoiCo: string;
            dinhMuc: string; vuotDinhMuc: string; dinhMucValue: number;
            tonCuoiNoValue: number; tonCuoiCoValue: number;
        }> = [];
        for (const row of rows) {
            const cells = Array.from(row.querySelectorAll("td"));
            if (cells.length !== 12) continue;
            const maKhachLink = cells[1]?.querySelector("a");
            const maKhach = maKhachLink?.textContent?.trim() || cell(cells, 1);
            const tenKhach = cell(cells, 2);
            const upper = tenKhach.toUpperCase();
            if (!maKhach || upper.includes("TỔNG CỘNG") || upper.includes("TỔNG NỢ/CÓ")) continue;
            const tonCuoiNoValue = parseMoney(cell(cells, 7));
            const tonCuoiCoValue = parseMoney(cell(cells, 8));
            const dinhMucValue = parseMoney(cell(cells, 9));
            if (tonCuoiNoValue !== 0 || tonCuoiCoValue !== 0) {
                customers.push({
                    maKhach, tenKhach,
                    tonDauNo: cell(cells, 3), tonDauCo: cell(cells, 4),
                    psNo: cell(cells, 5), psCo: cell(cells, 6),
                    tonCuoiNo: cell(cells, 7), tonCuoiCo: cell(cells, 8),
                    dinhMuc: cell(cells, 9), vuotDinhMuc: cell(cells, 10),
                    tonCuoiNoValue, tonCuoiCoValue, dinhMucValue,
                });
            }
        }
        return { error: null, customers };
    });
    if (result.error) throw new Error(result.error);
    console.log(`[EGAS] Đọc được ${result.customers.length} khách hàng`);
    return result.customers;
};

const tryFetchFromUrl = async (baseUrl: string, username: string, password: string, fromDate: Date, toDate: Date, browser: import("playwright").Browser): Promise<Customer[] | null> => {
    let page: import("playwright").Page | null = null;
    try {
        page = await browser.newPage();
        page.setDefaultTimeout(PAGE_TIMEOUT);
        await loginEgas({ page, baseUrl, username, password });
        const reportUrl = buildReportUrl(baseUrl, fromDate, toDate);
        await page.goto(reportUrl, { waitUntil: "domcontentloaded", timeout: PAGE_TIMEOUT });
        try { await page.waitForSelector('table[border="1"] tbody tr', { timeout: 12_000 }); } catch { /* fallback */ }
        await page.waitForTimeout(1_500);
        for (const frame of page.frames()) {
            try {
                if (!frame.url() || frame.url() === "about:blank") continue;
                const customers = await readCustomersFromFrame(frame);
                if (customers.length > 0) return customers;
            } catch { /* skip */ }
        }
        return null;
    } catch (error: unknown) {
        const detail = error instanceof Error ? error.message : String(error);
        console.error(`[EGAS] Lỗi ${baseUrl}: ${detail}`);
        return null;
    } finally {
        await page?.close().catch(() => {});
    }
};

export const fetchCustomers = async (config: AppConfig, fromDate: Date, toDate: Date): Promise<Customer[]> => {
    const browser = await getBrowser(config.headless, config.slowMo);
    const tryPrimary = primaryFailedCount < MAX_PRIMARY_FAILS;
    const urls = lastWorkingUrl
        ? [lastWorkingUrl, lastWorkingUrl === config.baseUrl ? FALLBACK_URL : config.baseUrl]
        : tryPrimary
            ? [config.baseUrl, FALLBACK_URL]
            : [FALLBACK_URL];

    for (const url of urls) {
        const result = await tryFetchFromUrl(url, config.username, config.password, fromDate, toDate, browser);
        if (result && result.length > 0) {
            if (url === config.baseUrl) primaryFailedCount = 0;
            else primaryFailedCount++;
            lastWorkingUrl = url;
            return result;
        }
    }
    primaryFailedCount++;
    throw new Error("Không thể truy cập EGAS.");
};
