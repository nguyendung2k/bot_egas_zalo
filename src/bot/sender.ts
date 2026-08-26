const API_BASE = "https://bot-api.zaloplatforms.com";
const MAX_TEXT_LENGTH = 2000;

export const chunkText = (text: string, maxLength: number = MAX_TEXT_LENGTH): string[] => {
    if (text.length <= maxLength) return [text];
    const chunks: string[] = [];
    let remaining = text;
    while (remaining.length > 0) {
        if (remaining.length <= maxLength) {
            chunks.push(remaining);
            break;
        }
        let cut = remaining.lastIndexOf("\n", maxLength);
        if (cut <= 0) cut = maxLength;
        chunks.push(remaining.slice(0, cut).trimEnd());
        remaining = remaining.slice(cut).trimStart();
    }
    return chunks.length > 0 ? chunks : [""];
};

export interface ZaloApiResponse {
    ok: boolean;
    result?: unknown;
    error?: unknown;
}

export const callBotApi = async (botToken: string, method: string, payload: unknown): Promise<ZaloApiResponse> => {
    const response = await fetch(`${API_BASE}/bot${botToken}/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null) as ZaloApiResponse | null;
    if (!response.ok || !data?.ok) {
        throw new Error(`Zalo Bot API ${method} that bai (${response.status}): ${JSON.stringify(data ?? {})}`);
    }
    return data;
};

/** Gui 1 tin nhan. Neu vuot 2000 ky tu se tu dong chunk. */
export const sendZaloText = async (botToken: string, chatId: string, text: string): Promise<void> => {
    for (const chunk of chunkText(text)) {
        await callBotApi(botToken, "sendMessage", { chat_id: chatId, text: chunk });
    }
};
