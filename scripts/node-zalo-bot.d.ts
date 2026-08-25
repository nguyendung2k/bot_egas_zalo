declare module "node-zalo-bot" {
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

    type OnTextHandler = (msg: ZaloMessage, match: RegExpExecArray | null) => void | Promise<void>;
    type MessageHandler = (msg: ZaloMessage) => void | Promise<void>;
    type PollingErrorHandler = (error: ZaloPollingError) => void | Promise<void>;

    class ZaloBot {
        constructor(token: string, options?: { polling?: boolean });
        onText(regexp: RegExp, callback: OnTextHandler): void;
        on(event: "message", callback: MessageHandler): void;
        on(event: "polling_error", callback: PollingErrorHandler): void;
        sendMessage(chatId: string, text: string): Promise<unknown>;
    }

    export = ZaloBot;
}
