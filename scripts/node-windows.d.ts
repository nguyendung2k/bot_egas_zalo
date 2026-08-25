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
        install(): void;
        uninstall(): void;
        start(): void;
        stop(): void;
    }
}
