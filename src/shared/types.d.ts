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
declare module "node-windows" {
    import { EventEmitter } from "node:events";

    interface ServiceOptions {
        name: string;
        description?: string;
        script: string;
        workingDirectory?: string;
        nodeOptions?: string[];
        env?: Array<{ name: string; value: string }>;
        wait?: number;
        grow?: number;
        maxRestarts?: number;
    }

    export class Service extends EventEmitter {
        constructor(options: ServiceOptions);
        install(dir?: string): void;
        uninstall(waitTime?: number): void;
        start(): void;
        stop(): void;
    }
}
