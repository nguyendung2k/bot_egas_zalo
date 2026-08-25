import "./env.js";
import { runTuoiNoReport } from "./tuoi-no-service.js";
import { WARNING_LIMIT, customerGroup, type Customer, warningValue } from "./domain.js";
import { formatDateTime, formatMoney } from "./formatting.js";
import { sendZaloText } from "./zalo-sender.js";
import { loadZaloConfig } from "./zalo-config.js";

const chatId = process.env.ZALO_MONITOR_CHAT_ID?.trim();
if (!chatId) throw new Error("Thiếu ZALO_MONITOR_CHAT_ID.");

const config = loadZaloConfig();
const intervalMs = Math.max(30_000, Number(process.env.ZALO_MONITOR_INTERVAL_MS ?? 60_000));
const dailyHour = Number(process.env.ZALO_MONITOR_DAILY_HOUR ?? 5);
const dailyMinuteWindow = Number(process.env.ZALO_MONITOR_DAILY_WINDOW_MIN ?? 2);

interface WarningEntry {
    maKhach: string;
    tenKhach: string;
    value: number;
    group: "special" | "hawee" | "other" | "untracked";
}

type WarningSnapshot = Map<string, WarningEntry>;

const buildWarningSnapshot = (customers: Customer[]): WarningSnapshot => {
    const snapshot: WarningSnapshot = new Map();
    for (const customer of customers) {
        const value = warningValue(customer);
        if (value > 0 && value <= WARNING_LIMIT) {
            snapshot.set(customer.maKhach, {
                maKhach: customer.maKhach,
                tenKhach: customer.tenKhach,
                value,
                group: customerGroup(customer.maKhach),
            });
        }
    }
    return snapshot;
};

const snapshotsEqual = (a: WarningSnapshot, b: WarningSnapshot): boolean => {
    if (a.size !== b.size) return false;
    for (const [key, entry] of a) {
        const other = b.get(key);
        if (!other || other.value !== entry.value) return false;
    }
    return true;
};

const formatEntry = (entry: WarningEntry): string =>
    `• ${entry.tenKhach} (${entry.maKhach}): ${formatMoney(entry.value)} đ`;

const formatChanges = (old: WarningSnapshot, current: WarningSnapshot): string[] => {
    const lines: string[] = [];
    for (const [key, entry] of current) {
        const prev = old.get(key);
        if (!prev) lines.push(`🆕 ${formatEntry(entry)}`);
        else if (prev.value !== entry.value) lines.push(`🔁 ${entry.tenKhach} (${entry.maKhach}): ${formatMoney(prev.value)} → ${formatMoney(entry.value)} đ`);
    }
    for (const [key, entry] of old) {
        if (!current.has(key)) lines.push(`${entry.tenKhach} (${entry.maKhach}): ${formatMoney(entry.value)} đ`);
    }
    return lines;
};

const formatFullSnapshot = (title: string, snapshot: WarningSnapshot): string => {
    const lines = [title, ""];
    if (!snapshot.size) {
        lines.push("Không có khách nào có công nợ nhỏ hơn hoặc bằng 2.000.000 đồng.");
    } else {
        for (const entry of snapshot.values()) {
            lines.push(formatEntry(entry));
        }
    }
    return lines.join("\n");
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

let baseline: WarningSnapshot | null = null;
let lastDailyDate = "";

const main = async (): Promise<void> => {
    console.log(`[MONITOR] Theo dõi toàn bộ cảnh báo công nợ <= ${formatMoney(WARNING_LIMIT)} đ mỗi ${Math.round(intervalMs / 1000)}s, chat=${chatId}.`);

    while (true) {
        try {
            const result = await runTuoiNoReport(new Date());
            if (!result.success || !result.customers) {
                console.error(`[MONITOR] Lỗi lấy báo cáo: ${result.error ?? "không xác định"}`);
            } else {
                const now = new Date();
                const snapshot = buildWarningSnapshot(result.customers);

                const dateKey = now.toDateString();
                const isDailyWindow = now.getHours() === dailyHour && now.getMinutes() < dailyMinuteWindow;
                if (isDailyWindow && lastDailyDate !== dateKey) {
                    await sendZaloText(config.botToken, chatId, formatFullSnapshot(
                        `🌅 Báo cáo sáng ${formatDateTime(now)} - cảnh báo công nợ <= ${formatMoney(WARNING_LIMIT)} đ`,
                        snapshot,
                    ));
                    lastDailyDate = dateKey;
                    baseline = snapshot;
                }

                if (!baseline) {
                    baseline = snapshot;
                    console.log(`[MONITOR] Đã ghi mốc ban đầu: ${snapshot.size} khách cảnh báo.`);
                } else if (!snapshotsEqual(baseline, snapshot)) {
                    const changes = formatChanges(baseline, snapshot);
                    if (changes.length > 0) {
                        await sendZaloText(config.botToken, chatId, [
                            `⚠️ Thay đổi cảnh báo lúc ${formatDateTime(now)}`,
                            "",
                            ...changes,
                            "",
                            formatFullSnapshot(`📊 Danh sách cảnh báo hiện tại (${snapshot.size} khách)`, snapshot),
                        ].join("\n"));
                    }
                    baseline = snapshot;
                }
            }
        } catch (error: unknown) {
            const detail = error instanceof Error ? error.message : String(error);
            console.error(`[MONITOR] Lỗi vòng lặp: ${detail}`);
        }
        await sleep(intervalMs);
    }
};

await main();
