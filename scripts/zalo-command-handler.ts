import { runTuoiNoReport, normalizeSearchText } from "./tuoi-no-service.js";
import { WARNING_LIMIT, customerGroup, type Customer } from "./domain.js";
import { sendZaloText } from "./zalo-sender.js";

export const HELP_TEXT = [
    "🤖 HƯỚNG DẪN SỬ DỤNG BOT CÔNG NỢ EGAS",
    "",
    "1) Kiểm tra công nợ tổng:",
    "• check",
    "• công nợ",
    "• tồn bao nhiêu",
    "",
    "2) Kiểm tra khách cụ thể:",
    "• check vạn phúc",
    "• check 221.342",
    "• tồn bao nhiêu ams",
    "",
    "3) Xem cảnh báo công nợ nhỏ:",
    "• cảnh báo",
    "• cảnh báo ams",
    "",
    "4) Trong nhóm, hãy tag bot trước lệnh:",
    "• @Bot Dũng NB check",
    "• @Bot Dũng NB check vạn phúc",
    "• @Bot Dũng NB hướng dẫn",
    "",
    "5) Gọi hướng dẫn:",
    "• help",
    "• hướng dẫn",
    "• trợ giúp",
].join("\n");

const inFlight = new Set<string>();

type CommandIntent = "report" | "warning" | "help" | "unknown";

const normalize = (value: string): string => value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ");

const COMMAND_KEYWORDS = [
    "/tuoi-no", "tuoi no", "check", "cong no", "ton bao nhieu", "ton",
    "bao cao", "/canh-bao", "canh bao", "/help", "help", "huong dan", "tro giup", "warning",
];

const REPORT_EXACT = new Set(["/tuoi-no", "tuoi no", "check", "cong no", "ton bao nhieu", "ton", "bao cao"].map(normalize));
const WARNING_EXACT = new Set(["/canh-bao", "canh bao", "warning"].map(normalize));
const HELP_EXACT = new Set(["/help", "help", "huong dan", "tro giup"].map(normalize));

interface ParsedCommand {
    intent: CommandIntent;
    query?: string;
}

export const unwrapMessageEvent = (body: unknown): unknown => {
    if (!body || typeof body !== "object") return body;
    const event = body as { result?: unknown; message?: unknown };
    if (event.result && typeof event.result === "object") {
        const result = event.result as { message?: unknown };
        if (result.message && typeof result.message === "object") return result.message;
    }
    return body;
};

export const stripBotMention = (text: string): string => {
    const trimmed = text.trim();
    if (!trimmed.startsWith("@")) return trimmed;
    const normalized = normalize(trimmed);
    let bestIndex = -1;
    for (const keyword of COMMAND_KEYWORDS) {
        const index = normalized.indexOf(keyword);
        if (index >= 0 && (bestIndex === -1 || index < bestIndex)) bestIndex = index;
    }
    return bestIndex >= 0 ? trimmed.slice(bestIndex).trim() : trimmed;
};

const stripIntent = (cleanText: string, keywords: string[]): string => {
    const trimmed = cleanText.trim();
    const normalized = normalize(trimmed);
    for (const keyword of [...keywords].sort((a, b) => b.length - a.length)) {
        const normalizedKeyword = normalize(keyword);
        if (normalized.startsWith(normalizedKeyword)) {
            return trimmed.slice(normalizedKeyword.length).trim();
        }
        const pattern = new RegExp(`(^|\\s)${normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`, "i");
        const match = normalized.match(pattern);
        if (match && match.index !== undefined) {
            const start = match.index + (match[1]?.length ?? 0);
            const end = start + normalizedKeyword.length;
            return `${trimmed.slice(0, start)} ${trimmed.slice(end)}`.replace(/\s+/g, " ").trim();
        }
    }
    return trimmed;
};

const parseCommand = (rawText: string): ParsedCommand => {
    const cleanText = stripBotMention(rawText);
    const normalized = normalize(cleanText);
    if (HELP_EXACT.has(normalized)) return { intent: "help" };
    if (WARNING_EXACT.has(normalized)) return { intent: "warning" };
    if (REPORT_EXACT.has(normalized)) return { intent: "report" };

    if (normalized.includes("canh bao") || normalized.startsWith("/canh-bao")) {
        const query = stripIntent(cleanText, ["canh bao", "/canh-bao", "cảnh báo"]);
        return query ? { intent: "warning", query } : { intent: "warning" };
    }
    if (
        normalized.startsWith("check")
        || normalized.includes("cong no")
        || normalized.includes("ton bao nhieu")
        || normalized.includes("tuoi no")
        || normalized.includes("ton ")
        || normalized.endsWith(" ton")
        || normalized.startsWith("/tuoi-no")
    ) {
        const query = stripIntent(cleanText, [
            "check", "cong no", "công nợ", "ton bao nhieu", "tồn bao nhiêu",
            "tuoi no", "tuổi nợ", "/tuoi-no", "ton", "tồn", "bao cao", "báo cáo",
        ]);
        return query ? { intent: "report", query } : { intent: "report" };
    }
    return { intent: "unknown" };
};

const formatCustomerLine = (customer: Customer): string => {
    const group = customerGroup(customer.maKhach);
    if (group === "other") {
        return [
            `🏢 ${customer.tenKhach} (${customer.maKhach})`,
            `Tồn còn lại: ${customer.tonCuoiCo}`,
        ].join("\n");
    }
    const label = group === "special" ? "Đặc biệt" : group === "hawee" ? "Hawee" : "Khác";
    return [
        `🏢 ${customer.tenKhach} (${customer.maKhach})`,
        `Nhóm: ${label}`,
        `Tồn đầu Nợ/Có: ${customer.tonDauNo} / ${customer.tonDauCo}`,
        `Phát sinh Nợ/Có: ${customer.psNo} / ${customer.psCo}`,
        `Tồn cuối Nợ/Có: ${customer.tonCuoiNo} / ${customer.tonCuoiCo}`,
        `Định mức: ${customer.dinhMuc} | Vượt ĐM: ${customer.vuotDinhMuc}`,
    ].join("\n");
};

const sendCustomerMatches = async (
    botToken: string,
    chatId: string,
    customers: Customer[],
    query: string,
): Promise<void> => {
    if (!customers.length) {
        await sendZaloText(botToken, chatId, `Không tìm thấy khách nào khớp "${query}".`);
        return;
    }
    await sendZaloText(botToken, chatId, `🔎 Tìm thấy ${customers.length} khách khớp "${query}":`);
    for (const customer of customers.slice(0, 10)) {
        await sendZaloText(botToken, chatId, formatCustomerLine(customer));
    }
};

export const extractChatId = (body: unknown): string | null => {
    const messageBody = unwrapMessageEvent(body);
    if (!messageBody || typeof messageBody !== "object") return null;
    const event = messageBody as { chat?: { id?: unknown }; chat_id?: unknown };
    const id = typeof event.chat?.id === "string" ? event.chat.id
        : typeof event.chat_id === "string" ? event.chat_id : null;
    return id && id.trim() ? id.trim() : null;
};

export const extractText = (body: unknown): string | null => {
    const messageBody = unwrapMessageEvent(body);
    if (!messageBody || typeof messageBody !== "object") return null;
    const event = messageBody as { text?: unknown };
    const rawText = typeof event.text === "string" ? event.text : "";
    if (!rawText.trim()) return null;
    const stripped = stripBotMention(rawText);
    return stripped.trim() ? stripped.trim() : null;
};

// Timeout wrapper
const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout ${label}: ${ms}ms`)), ms)),
    ]);
};

export const handleZaloCommand = async (botToken: string, chatId: string, text: string): Promise<void> => {
    const parsed = parseCommand(text);
    console.log(`[CMD] Lệnh: intent=${parsed.intent}, query=${parsed.query ?? "none"}, text="${text}"`);

    if (parsed.intent === "unknown") {
        await sendZaloText(botToken, chatId, `Mình chưa hiểu yêu cầu.\n\n${HELP_TEXT}`);
        return;
    }
    if (parsed.intent === "help") {
        await sendZaloText(botToken, chatId, HELP_TEXT);
        return;
    }

    if (inFlight.has(chatId)) {
        await sendZaloText(botToken, chatId, "⏳ Đang xử lý yêu cầu trước. Vui lòng đợi.");
        return;
    }

    inFlight.add(chatId);
    try {
        await sendZaloText(botToken, chatId, "⏳ Đang lấy báo cáo EGAS, vui lòng đợi...");
        console.log(`[CMD] Bắt đầu lấy báo cáo...`);

        const result = await withTimeout(
            runTuoiNoReport(new Date(), parsed.intent === "warning" ? undefined : parsed.query),
            60_000,
            "lấy báo cáo EGAS",
        );

        console.log(`[CMD] Báo cáo thành công: ${result.customers?.length ?? 0} khách`);

        if (!result.success || !result.customers || !result.counts || !result.report || !result.warning) {
            await sendZaloText(botToken, chatId, `❌ Không lấy được báo cáo:\n${result.error ?? "Lỗi không xác định."}`);
            return;
        }

        if (parsed.query && normalizeSearchText(parsed.query)) {
            if (parsed.intent === "warning") {
                const warningOnly = result.warning.count > 0
                    ? result.customers.filter((customer) => {
                        const value = customerGroup(customer.maKhach) === "special" || customerGroup(customer.maKhach) === "hawee"
                            ? customer.tonCuoiNoValue : customer.tonCuoiCoValue;
                        return value > 0 && value <= WARNING_LIMIT;
                    })
                    : [];
                if (!warningOnly.length) {
                    await sendZaloText(botToken, chatId, `Không có cảnh báo nào cho khách khớp "${parsed.query}".`);
                } else {
                    await sendCustomerMatches(botToken, chatId, warningOnly, parsed.query);
                }
                return;
            }
            await sendCustomerMatches(botToken, chatId, result.customers, parsed.query);
            return;
        }
        if (parsed.intent === "warning") {
            await sendZaloText(botToken, chatId, result.warning.message);
            return;
        }

        // Gửi kết quả
        await sendZaloText(botToken, chatId, [
            `📊 Tổng quan: ${result.counts.total} khách còn nợ`,
            `🔹 Đặc biệt: ${result.counts.special}`,
            `🔹 Hawee: ${result.counts.hawee}`,
            `🔹 Khác: ${result.counts.other}`,
        ].join("\n"));
        await sendZaloText(botToken, chatId, result.report.special);
        await sendZaloText(botToken, chatId, result.report.hawee);
        await sendZaloText(botToken, chatId, result.report.other);
        await sendZaloText(botToken, chatId, result.warning.message);
        console.log(`[CMD] Đã gửi kết quả`);
    } catch (error: unknown) {
        const detail = error instanceof Error ? error.message : String(error);
        console.error(`[CMD] Lỗi: ${detail}`);
        try {
            await sendZaloText(botToken, chatId, `❌ Lỗi khi lấy báo cáo:\n${detail}`);
        } catch { /* ignore */ }
    } finally {
        inFlight.delete(chatId);
    }
};
