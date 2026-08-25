import type { Customer, Report, ReportCounts, WarningResult } from "./domain.js";
import { WARNING_LIMIT, customerGroup, warningValue } from "./domain.js";

export const pad = (value: number): string => String(value).padStart(2, "0");
export const formatDateTime = (date: Date): string =>
    `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
export const formatDateForEgas = (date: Date): string =>
    `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
export const formatDateTimeForEgas = (date: Date): string => `${formatDateForEgas(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
export const formatMoney = (value: number): string => Math.round(value).toLocaleString("vi-VN");

const specialCustomer = (customer: Customer): string => [
    `${customer.tenKhach} (${customer.maKhach})`,
    `Phát sinh: ${customer.psNo} / ${customer.psCo}`,
    `Tồn cuối: ${customer.tonCuoiNo} / ${customer.dinhMuc}`,
].join("\n");
const otherCustomer = (customer: Customer): string => [
    `${customer.tenKhach} (${customer.maKhach})`,
    `Tồn cuối: ${customer.tonCuoiCo}`,
].join("\n");

const section = (title: string, period: string, entries: string[], empty: string): string => entries.length
    ? [`📊 Tuổi nợ - ${period}`, "", title, "", entries.join("\n\n")].join("\n")
    : empty;

export const createReport = (customers: Customer[], fromDate: Date, toDate: Date): Report => {
    const groups: Record<"special" | "hawee" | "other", string[]> = { special: [], hawee: [], other: [] };
    for (const customer of customers) {
        const group = customerGroup(customer.maKhach);
        if (group === "special" || group === "hawee") groups[group].push(specialCustomer(customer));
        else if (group === "other") groups.other.push(otherCustomer(customer));
    }
    const period = `${formatDateTime(fromDate)} - ${formatDateTime(toDate)}`;
    const counts: ReportCounts = { total: customers.length, special: groups.special.length, hawee: groups.hawee.length, other: groups.other.length };
    return {
        counts,
        special: section("🔹 NHÓM ĐẶC BIỆT", period, groups.special, "Không có khách hàng trong nhóm đặc biệt còn công nợ."),
        hawee: section("🔹 HAWEE", period, groups.hawee, "Không có khách hàng Hawee còn công nợ."),
        other: section("🔹 CÁC MÃ CÒN LẠI", period, groups.other, "Không có khách hàng còn công nợ (nhóm còn lại)."),
    };
};

export const createWarning = (customers: Customer[], fromDate: Date, toDate: Date): WarningResult => {
    const warnings = customers.filter((customer) => {
        const value = warningValue(customer);
        return value > 0 && value <= WARNING_LIMIT;
    });
    if (!warnings.length) return { count: 0, message: ["⚠️ CẢNH BÁO CÔNG NỢ", "", "Không có khách hàng có công nợ", `≤ ${formatMoney(WARNING_LIMIT)} đồng.`].join("\n") };
    const lines = ["⚠️ CẢNH BÁO CÔNG NỢ", `📅 ${formatDateTime(fromDate)} - ${formatDateTime(toDate)}`, `💰 Ngưỡng: ≤ ${formatMoney(WARNING_LIMIT)} đồng`, ""];
    for (const customer of warnings) lines.push(`🏢 ${customer.tenKhach}`, `🔢 Mã: ${customer.maKhach}`, `💰 Tồn cuối: ${formatMoney(warningValue(customer))}`, "");
    return { count: warnings.length, message: lines.join("\n").trim() };
};
