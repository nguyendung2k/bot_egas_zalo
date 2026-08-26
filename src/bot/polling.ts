import { extractChatId, extractText, handleZaloCommand } from "./command-handler.js";
import { loadZaloConfig } from "./config.js";
import { callBotApi } from "./sender.js";

type UpdateObject = Record<string, unknown>;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const asUpdates = (result: unknown): UpdateObject[] => {
    if (Array.isArray(result)) return result.filter((item): item is UpdateObject => typeof item === "object" && item !== null);
    if (result && typeof result === "object") {
        const object = result as { updates?: unknown; data?: unknown; message?: unknown };
        if (Array.isArray(object.updates)) return object.updates.filter((item): item is UpdateObject => typeof item === "object" && item !== null);
        if (Array.isArray(object.data)) return object.data.filter((item): item is UpdateObject => typeof item === "object" && item !== null);
        if (object.message && typeof object.message === "object") return [object as unknown as UpdateObject];
    }
    return [];
};

const updateKey = (update: UpdateObject): string => {
    const messageObj = update.message as Record<string, unknown> | undefined;
    const id = messageObj?.message_id ?? update.update_id ?? update.event_id ?? JSON.stringify(update);
    return String(id);
};

const isPollingTimeout = (error: unknown): boolean => {
    const detail = error instanceof Error ? error.message : String(error);
    return detail.includes("Request timeout") || detail.includes(String.fromCharCode(34) + "error_code" + String.fromCharCode(34) + ":408");
};

let pollCount = 0;

const main = async (): Promise<void> => {
    const config = loadZaloConfig();
    const timeoutSeconds = Number(process.env.ZALO_POLL_TIMEOUT ?? 30);
    const idleDelayMs = Number(process.env.ZALO_POLL_DELAY_MS ?? 1000);
    const seen = new Set<string>();

    console.log("[ZALOBOT] Polling dang chay.");
    while (true) {
        try {
            const response = await callBotApi(config.botToken, "getUpdates", { timeout: String(timeoutSeconds) });
            pollCount++;
            const updates = asUpdates(response.result);
            console.log("[DEBUG] Poll #" + pollCount + ": updates=" + updates.length);
            if (updates.length > 0) {
                console.log("[DEBUG] Raw update: " + JSON.stringify(updates[0]).slice(0, 500));
            }
            for (const update of updates) {
                const key = updateKey(update);
                if (seen.has(key)) continue;
                seen.add(key);
                if (seen.size > 1000) seen.delete(seen.values().next().value as string);
                const chatId = extractChatId(update);
                const text = extractText(update);
                console.log("[DEBUG] key=" + key + ", chatId=" + chatId + ", text=" + text);
                if (!chatId || !text) continue;
                console.log("[ZALOBOT] " + chatId + ": " + text);
                await handleZaloCommand(config.botToken, chatId, text);
            }
        } catch (error: unknown) {
            if (!isPollingTimeout(error)) {
                const detail = error instanceof Error ? error.message : String(error);
                console.error("[ZALOBOT] Polling loi: " + detail);
                await sleep(5000);
            } else {
                pollCount++;
                if (pollCount % 5 === 0) {
                    console.log("[DEBUG] Poll #" + pollCount + ": timeout");
                }
            }
        }
        await sleep(idleDelayMs);
    }
};

await main();