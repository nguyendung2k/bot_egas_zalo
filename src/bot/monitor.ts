import "../shared/env.js";
import { runTuoiNoReport } from "../egas/report-service.js";
import { WARNING_LIMIT } from "../egas/domain.js";
import { formatDateTime, formatMoney } from "../shared/formatting.js";
import { sendZaloText } from "./sender.js";
import { loadZaloConfig } from "./config.js";
import { buildWarningSnapshot, formatWarningChanges, formatWarningEntry, snapshotsEqual, type WarningSnapshot } from "./warning-monitor.js";

const chatId = process.env.ZALO_MONITOR_CHAT_ID?.trim();
if (!chatId) throw new Error("Thiếu ZALO_MONITOR_CHAT_ID.");

const config = loadZaloConfig();
const intervalMs = Math.max(30_000, Number(process.env.ZALO_MONITOR_INTERVAL_MS ?? 60_000));
const dailyHour = Number(process.env.ZALO_MONITOR_DAILY_HOUR ?? 5);
const dailyMinuteWindow = Number(process.env.ZALO_MONITOR_DAILY_WINDOW_MIN ?? 2);

const formatFullSnapshot = (title: string, snapshot: WarningSnapshot): string => {
    const lines = [title, ""];
    if (!snapshot.size) {
        lines.push("Không có khách nào có công nợ nhỏ hơn hoặc bằng 2.000.000 đồng.");
    } else {
        for (const entry of snapshot.values()) {
            lines.push(formatWarningEntry(entry));
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
                const snapshot = buildWarningSnapshot(result.customers, WARNING_LIMIT);

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
                    const changes = formatWarningChanges(baseline, snapshot);
                    await sendZaloText(config.botToken, chatId, [
                        `⚠️ Thay đổi cảnh báo lúc ${formatDateTime(now)}`,
                        ...(changes.length > 0 ? ["", ...changes] : []),
                        "",
                        formatFullSnapshot(`📊 Danh sách cảnh báo hiện tại (${snapshot.size} khách)`, snapshot),
                    ].join("\n"));
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
