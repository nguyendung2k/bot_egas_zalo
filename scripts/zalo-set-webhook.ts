import "./env.js";
import { loadZaloConfig } from "./zalo-config.js";
import { callBotApi } from "./zalo-sender.js";

const webhookUrl = process.argv[2]?.trim() ?? process.env.ZALO_WEBHOOK_URL?.trim();
if (!webhookUrl) {
    console.error("Thiếu webhook URL. Dùng: npm run set-webhook -- https://your-domain/webhook/zalo");
    process.exit(1);
}
if (!webhookUrl.startsWith("https://")) {
    console.error("Webhook URL phải là HTTPS và truy cập được từ Internet.");
    process.exit(1);
}

const config = loadZaloConfig();
const result = await callBotApi(config.botToken, "setWebhook", {
    url: webhookUrl,
    secret_token: config.webhookSecret,
});
console.log(JSON.stringify(result, null, 2));
