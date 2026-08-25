import "./env.js";
import ZaloBot = require("node-zalo-bot");
import { HELP_TEXT, handleZaloCommand } from "./zalo-command-handler.js";
import { loadZaloConfig } from "./zalo-config.js";

type ZaloMessage = {
    chat: { id: string };
    from?: { display_name?: string };
    text?: string;
    [key: string]: unknown;
};

type ZaloPollingError = {
    code?: string;
    message?: string;
    [key: string]: unknown;
};

const config = loadZaloConfig();
const bot = new ZaloBot(config.botToken, { polling: true });
const processedMessages = new Set<string>();

const isPollingTimeout = (error: ZaloPollingError): boolean =>
    error.code === "EZALO" && typeof error.message === "string" && error.message.includes("408 Request timeout");

const messageKey = (msg: ZaloMessage): string => String(msg.message_id ?? `${msg.chat.id}:${msg.text ?? ""}`);

bot.onText(/\/start/, async (msg) => {
    const name = msg.from?.display_name ?? "bạn";
    await bot.sendMessage(msg.chat.id, `Chào ${name}! Tôi là ZaloBot EGAS.\n\n${HELP_TEXT}`);
});

bot.on("message", async (msg) => {
    if (!msg.text) return;
    console.log("[ZALOBOT] Tin nhắn mới", JSON.stringify(msg));
    const key = messageKey(msg);
    if (processedMessages.has(key)) return;
    processedMessages.add(key);
    if (processedMessages.size > 1000) processedMessages.delete(processedMessages.values().next().value as string);
    if (msg.text.trim().toLowerCase() === "/start") return;
    try {
        console.log(`[ZALOBOT] Bắt đầu xử lý: "${msg.text}" cho chat ${msg.chat.id}`);
        await handleZaloCommand(config.botToken, msg.chat.id, msg.text);
        console.log(`[ZALOBOT] Xử lý xong: "${msg.text}"`);
    } catch (error: unknown) {
        console.error("[ZALOBOT] Xử lý lệnh lỗi:", error);
    }
});

bot.on("polling_error", (error) => {
    if (isPollingTimeout(error)) return;
    console.error("[ZALOBOT] Polling lỗi", JSON.stringify(error));
});

console.log("[ZALOBOT] node-zalo-bot polling đang chạy. Nhắn: check | tồn bao nhiêu | công nợ | cảnh báo | help");
