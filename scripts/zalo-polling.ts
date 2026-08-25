import "./env.js";
import { extractChatId, extractText, handleZaloCommand } from "./zalo-command-handler.js";
import { loadZaloConfig } from "./zalo-config.js";
import { callBotApi } from "./zalo-sender.js";

type UpdateObject = Record<string, unknown>;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const asUpdates = (result: unknown): UpdateObject[] => {
    if (Array.isArray(result)) return result.filter((item): item is UpdateObject => typeof item === "object" && item !== null);
    if (result && typeof result === "object") {
        const object = result as { updates?: unknown; data?: unknown };
        if (Array.isArray(object.updates)) return object.updates.filter((item): item is UpdateObject => typeof item === "object" && item !== null);
        if (Array.isArray(object.data)) return object.data.filter((item): item is UpdateObject => typeof item === "object" && item !== null);
    }
    return [];
};

const updateKey = (update: UpdateObject): string => {
    const id = update.update_id ?? update.event_id ?? update.message_id ?? JSON.stringify(update);
    return String(id);
};

const isPollingTimeout = (error: unknown): boolean => {
    const detail = error instanceof Error ? error.message : String(error);
    return detail.includes("Request timeout") || detail.includes('"error_code":408');
};

const main = async (): Promise<void> => {
    const config = loadZaloConfig();
    const timeoutSeconds = Number(process.env.ZALO_POLL_TIMEOUT ?? 30);
    const idleDelayMs = Number(process.env.ZALO_POLL_DELAY_MS ?? 1000);
    const seen = new Set<string>();

    console.log("[ZALOBOT] Polling đang chạy. Nhắn /help, /tuoi-no hoặc /canh-bao vào bot.");
    while (true) {
        try {
            const response = await callBotApi(config.botToken, "getUpdates", { timeout: String(timeoutSeconds) });
            const updates = asUpdates(response.result);
            for (const update of updates) {
                const key = updateKey(update);
                if (seen.has(key)) continue;
                seen.add(key);
                if (seen.size > 1000) seen.delete(seen.values().next().value as string);

                const chatId = extractChatId(update);
                const text = extractText(update);
                if (!chatId || !text) continue;
                console.log(`[ZALOBOT] ${chatId}: ${text}`);
                await handleZaloCommand(config.botToken, chatId, text);
            }
        } catch (error: unknown) {
            if (!isPollingTimeout(error)) {
                const detail = error instanceof Error ? error.message : String(error);
                console.error(`[ZALOBOT] Polling lỗi: ${detail}`);
                await sleep(5000);
            }
        }
        await sleep(idleDelayMs);
    }
};

await main();
