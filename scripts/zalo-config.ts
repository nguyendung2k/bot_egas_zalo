import "./env.js";
import { loadConfig } from "./config.js";
import type { AppConfig } from "./config.js";

const required = (name: string): string => {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`Thiếu ${name}.`);
    return value;
};

export interface ZaloConfig {
    readonly botToken: string;
    readonly webhookSecret: string;
    readonly port: number;
}

export const loadZaloConfig = (): ZaloConfig & { egas: AppConfig } => ({
    botToken: required("ZALO_BOT_TOKEN"),
    webhookSecret: required("ZALO_WEBHOOK_SECRET"),
    port: Number(process.env.PORT ?? 3000),
    egas: loadConfig(),
});
