export interface AppConfig {
    readonly baseUrl: string;
    readonly username: string;
    readonly password: string;
    readonly headless: boolean;
    readonly slowMo: number;
}

const required = (name: string): string => {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`Thiếu ${name}.`);
    return value;
};

export const loadConfig = (): AppConfig => ({
    baseUrl: (process.env.EGAS_BASE_URL ?? "http://192.168.1.101").replace(/\/+$/, ""),
    username: required("EGAS_USERNAME"),
    password: required("EGAS_PASSWORD"),
    headless: process.env.EGAS_HEADLESS !== "false",
    slowMo: Number(process.env.EGAS_SLOW_MO ?? 0),
});
