import "../shared/env.js";

const required = (name: string): string => {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`Thiếu ${name}.`);
    return value;
};

export interface ZaloConfig {
    readonly botToken: string;
    readonly port: number;
}

export const loadZaloConfig = (): ZaloConfig => ({
    botToken: required("ZALO_BOT_TOKEN"),
    port: Number(process.env.PORT ?? 3000),
});
