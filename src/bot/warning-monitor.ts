import { type Customer, customerGroup, warningValue } from "../egas/domain.js";
import { formatMoney } from "../shared/formatting.js";

export interface WarningEntry {
    maKhach: string;
    tenKhach: string;
    value: number;
    group: "special" | "hawee" | "other" | "untracked";
}

export type WarningSnapshot = Map<string, WarningEntry>;

export const buildWarningSnapshot = (customers: Customer[], warningLimit: number): WarningSnapshot => {
    const snapshot: WarningSnapshot = new Map();
    for (const customer of customers) {
        const value = warningValue(customer);
        if (value > 0 && value <= warningLimit) {
            snapshot.set(customer.maKhach, {
                maKhach: customer.maKhach,
                tenKhach: customer.tenKhach,
                value,
                group: customerGroup(customer.maKhach),
            });
        }
    }
    return snapshot;
};

export const snapshotsEqual = (a: WarningSnapshot, b: WarningSnapshot): boolean => {
    if (a.size !== b.size) return false;
    for (const [key, entry] of a) {
        const other = b.get(key);
        if (!other || other.value !== entry.value) return false;
    }
    return true;
};

export const formatWarningEntry = (entry: WarningEntry): string =>
    `• ${entry.tenKhach} (${entry.maKhach}): ${formatMoney(entry.value)} đ`;

export const formatWarningChanges = (old: WarningSnapshot, current: WarningSnapshot): string[] => {
    const lines: string[] = [];
    for (const [key, entry] of current) {
        const prev = old.get(key);
        if (!prev) lines.push(`🆕 ${formatWarningEntry(entry)}`);
        else if (prev.value !== entry.value) {
            lines.push(`🔁 ${entry.tenKhach} (${entry.maKhach}): ${formatMoney(prev.value)} → ${formatMoney(entry.value)} đ`);
        }
    }
    return lines;
};
