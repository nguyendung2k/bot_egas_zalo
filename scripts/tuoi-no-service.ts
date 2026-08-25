import { loadConfig } from "./config.js";
import type { Customer, ReportCounts, WarningResult } from "./domain.js";
import { fetchCustomers } from "./egas-report-client.js";
import { createReport, createWarning, formatDateTime } from "./formatting.js";

export interface TuoiNoResult {
    success: boolean;
    command: "tuoi-no";
    fromDate?: string;
    toDate?: string;
    counts?: ReportCounts;
    customers?: Customer[];
    report?: { special: string; hawee: string; other: string };
    warning?: WarningResult;
    error?: string;
}

export const normalizeSearchText = (value: string): string => value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ");

export const getMonthRange = (date: Date = new Date()): { from: Date; to: Date } => {
    const from = new Date(date.getFullYear(), date.getMonth(), 1);
    const to = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
    return { from, to };
};

const filterCustomers = (customers: Customer[], query?: string): Customer[] => {
    const normalizedQuery = normalizeSearchText(query ?? "");
    if (!normalizedQuery) return customers;
    return customers.filter((customer) => {
        const code = normalizeSearchText(customer.maKhach);
        const name = normalizeSearchText(customer.tenKhach);
        return code.includes(normalizedQuery) || name.includes(normalizedQuery);
    });
};

export const runTuoiNoReport = async (date: Date = new Date(), query?: string): Promise<TuoiNoResult> => {
    const config = loadConfig();
    const { from, to } = getMonthRange(date);
    const allCustomers = await fetchCustomers(config, from, to);
    const customers = filterCustomers(allCustomers, query);
    const report = createReport(customers, from, to);
    return {
        success: true,
        command: "tuoi-no",
        fromDate: formatDateTime(from),
        toDate: formatDateTime(to),
        counts: report.counts,
        customers,
        report: { special: report.special, hawee: report.hawee, other: report.other },
        warning: createWarning(customers, from, to),
    };
};
