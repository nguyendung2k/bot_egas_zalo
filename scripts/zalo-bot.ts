import "./env.js";
import express from "express";
import type { Request, Response } from "express";
import { extractChatId, extractText, handleZaloCommand } from "./zalo-command-handler.js";
import { loadZaloConfig } from "./zalo-config.js";

const app = express();
app.use(express.json());

const verifySecretToken = (req: Request, secret: string): boolean => req.header("x-bot-api-secret-token") === secret;

app.get("/health", (_req: Request, res: Response) => {
    res.json({ ok: true, service: "zalobot-egas", time: new Date().toISOString() });
});

app.post("/webhook/zalo", (req: Request, res: Response) => {
    const config = loadZaloConfig();
    if (!verifySecretToken(req, config.webhookSecret)) {
        res.status(401).json({ error: "Secret token webhook không hợp lệ." });
        return;
    }

    // Trả 200 ngay, xử lý nền
    res.json({ ok: true });

    const chatId = extractChatId(req.body);
    const commandRaw = extractText(req.body);
    if (chatId && commandRaw) {
        handleZaloCommand(config.botToken, chatId, commandRaw).catch((error) => {
            console.error("[ZALOBOT] Xử lý lệnh lỗi:", error);
        });
    }
});

const config = loadZaloConfig();
app.listen(config.port, () => console.log(`[ZALOBOT] Webhook server đang chạy tại cổng ${config.port}`));
