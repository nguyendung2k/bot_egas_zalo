export const SPECIAL_CODES: ReadonlySet<string> = new Set([
    "221.003", "221.2247", "221.342", "221.965",
]);

export const HAWEE_CODES: ReadonlySet<string> = new Set([
    "221.2306", "221.2376", "221.3181", "221.3183",
]);

export const EXCLUDED_CODE = "221.802";
export const WARNING_LIMIT = 2_000_000;

export interface Customer {
    maKhach: string;
    tenKhach: string;
    tonDauNo: string;
    tonDauCo: string;
    psNo: string;
    psCo: string;
    tonCuoiNo: string;
    tonCuoiCo: string;
    dinhMuc: string;
    vuotDinhMuc: string;
    tonCuoiNoValue: number;
    tonCuoiCoValue: number;
    dinhMucValue: number;
}

export interface ReportCounts { total: number; special: number; hawee: number; other: number; }
export interface Report { special: string; hawee: string; other: string; counts: ReportCounts; }
export interface WarningResult { count: number; message: string; }

export const customerGroup = (code: string): "special" | "hawee" | "other" | "untracked" => {
    const normalized = code.trim();
    if (SPECIAL_CODES.has(normalized)) return "special";
    if (HAWEE_CODES.has(normalized)) return "hawee";
    if (normalized.includes("221.")) return "other";
    return "untracked";
};

export const warningValue = (customer: Customer): number => {
    const group = customerGroup(customer.maKhach);
    if (group === "hawee") return customer.dinhMucValue - customer.tonCuoiNoValue;
    if (group === "special") return customer.tonCuoiNoValue;
    return customer.tonCuoiCoValue;
};
