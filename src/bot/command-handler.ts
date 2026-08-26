import { runTuoiNoReport, normalizeSearchText } from "../egas/report-service.js";
import { WARNING_LIMIT, customerGroup, type Customer } from "../egas/domain.js";
import { sendZaloText } from "./sender.js";

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
    const obj = body as { result?: unknown; message?: unknown };
    // { result: { message: {...} } } — full API response
    if (obj.result && typeof obj.result === "object") {
        const result = obj.result as { message?: unknown };
        if (result.message && typeof result.message === "object") return result.message;
    }
    // { message: {...}, event_name: "..." } — single update/event object
    if (obj.message && typeof obj.message === "object") return obj.message;
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

/** Gộp tat ca khach hang match thanh 1 tin nhan duy nhat */
const buildCustomerMatchesText = (customers: Customer[], query: string): string => {
    if (!customers.length) return `Không tìm thấy khách nào khớp "${query}".`;
    const lines = [`🔎 Tìm thấy ${customers.length} khách khớp "${query}":`, ""];
    const display = customers.slice(0, 10);
    for (const customer of display) {
        lines.push(formatCustomerLine(customer));
        lines.push("");
    }
    if (customers.length > 10) lines.push(`… và ${customers.length - 10} khách nữa.`);
    return lines.join("\n").trim();
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

const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout ${label}: ${ms}ms`)), ms)),
    ]);
};

export const handleZaloCommand = async (botToken: string, chatId: string, text: string): Promise<void> => {
    const parsed = parseCommand(text);
    console.log(`[CMD] Lenh: intent=${parsed.intent}, query=${parsed.query ?? "none"}, text="${text}"`);

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
        const result = await withTimeout(
            runTuoiNoReport(new Date(), parsed.intent === "warning" ? undefined : parsed.query),
            60_000,
            "lay bao cao EGAS",
        );

        console.log(`[CMD] Bao cao thanh cong: ${result.customers?.length ?? 0} khach`);

        if (!result.success || !result.customers || !result.counts || !result.report || !result.warning) {
            await sendZaloText(botToken, chatId, `❌ Không lấy được báo cáo:\n${result.error ?? "Lỗi không xác định."}`);
            return;
        }

        let responseText: string;

        if (parsed.query && normalizeSearchText(parsed.query)) {
            if (parsed.intent === "warning") {
                const warningOnly = result.warning.count > 0
                    ? result.customers.filter((customer) => {
                        const value = customerGroup(customer.maKhach) === "special" || customerGroup(customer.maKhach) === "hawee"
                            ? customer.tonCuoiNoValue : customer.tonCuoiCoValue;
                        return value > 0 && value <= WARNING_LIMIT;
                    })
                    : [];
                responseText = buildCustomerMatchesText(warningOnly, parsed.query);
            } else {
                responseText = buildCustomerMatchesText(result.customers, parsed.query);
            }
        } else if (parsed.intent === "warning") {
            responseText = result.warning.message;
        } else {
            // Gop tat ca thanh 1 tin nhan
            const parts: string[] = [];
            parts.push(`📊 Tổng quan: ${result.counts.total} khách còn nợ`);
            parts.push(`🔹 Đặc biệt: ${result.counts.special}`);
            parts.push(`🔹 Hawee: ${result.counts.hawee}`);
            parts.push(`🔹 Khác: ${result.counts.other}`);
            parts.push("");
            parts.push(result.report.special);
            parts.push("");
            parts.push(result.report.hawee);
            parts.push("");
            parts.push(result.report.other);
            parts.push("");
            parts.push(result.warning.message);
            responseText = parts.join("\n");
        }

        await sendZaloText(botToken, chatId, responseText);
        console.log(`[CMD] Da gui ket qua`);
    } catch (error: unknown) {
        const detail = error instanceof Error ? error.message : String(error);
        console.error(`[CMD] Loi: ${detail}`);
        try {
            await sendZaloText(botToken, chatId, `❌ Lỗi khi lấy báo cáo:\n${detail}`);
        } catch { /* ignore */ }
    } finally {
        inFlight.delete(chatId);
    }
};
