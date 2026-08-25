import type { Page } from "playwright";

export interface EgasLoginOptions {
    page: Page;
    baseUrl: string;
    username: string;
    password: string;
}

const clickLoginButton = async (page: Page): Promise<void> => {
    const imageButton = page.locator("img[src='img/go.gif']");
    if (await imageButton.count() > 0) return imageButton.first().click();
    const textButton = page.getByText("Đăng nhập", { exact: true });
    if (await textButton.count() === 0) throw new Error("Không tìm thấy nút đăng nhập EGAS.");
    await textButton.first().click();
};

export const loginEgas = async ({ page, baseUrl, username, password }: EgasLoginOptions): Promise<void> => {
    if (!baseUrl) throw new Error("Thiếu EGAS_BASE_URL.");
    if (!username) throw new Error("Thiếu EGAS_USERNAME.");
    if (!password) throw new Error("Thiếu EGAS_PASSWORD.");
    const loginUrl = `${baseUrl.replace(/\/+$/, "")}/login.aspx`;
    await page.goto(loginUrl, { waitUntil: "domcontentloaded", timeout: 15_000 });
    await page.locator("input[name='UserID']").fill(username);
    await page.locator("input[name='UserPassword']").fill(password);
    await clickLoginButton(page);
    try {
        await page.waitForURL(/(?:errcode=203|\/UHome\/)/i, { timeout: 15_000 });
    } catch {
        throw new Error(`Không xác định được kết quả đăng nhập EGAS. URL: ${page.url()}`);
    }
    if (page.url().toLowerCase().includes("errcode=203") || await page.getByText("Thông tin đăng nhập không hợp lệ.", { exact: true }).count() > 0) {
        throw new Error("Sai tài khoản hoặc mật khẩu EGAS.");
    }
};
