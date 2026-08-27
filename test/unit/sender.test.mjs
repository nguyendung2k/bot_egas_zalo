import test from "node:test";
import assert from "node:assert/strict";
import { chunkText } from "../../dist/bot/sender.js";

// API sendMessage chi nhan text 1..2000 ky tu
const assertValid = (chunks) => {
    for (const chunk of chunks) {
        assert.ok(chunk.length >= 1 && chunk.length <= 2000, `chunk dai ${chunk.length} ngoai khoang 1..2000`);
        const last = chunk.charCodeAt(chunk.length - 1);
        assert.ok(!(last >= 0xd800 && last <= 0xdbff), "chunk ket thuc bang lone surrogate");
    }
};

test("text rong hoac toan whitespace khong sinh chunk", () => {
    assert.deepEqual(chunkText(""), []);
    assert.deepEqual(chunkText("   "), []);
    assert.deepEqual(chunkText("\n".repeat(2500)), []);
});

test("khong sinh chunk rong khi newline nam dung diem cat", () => {
    const chunks = chunkText("\n".repeat(2100) + "hello");
    assertValid(chunks);
    assert.deepEqual(chunks, ["hello"]);
});

test("cat text dai thanh nhieu chunk trong gioi han", () => {
    const chunks = chunkText("a".repeat(4500));
    assertValid(chunks);
    assert.equal(chunks.length, 3);
});

test("khong cat giua cap surrogate cua emoji", () => {
    assertValid(chunkText("x".repeat(1999) + "\u{1f6d1}".repeat(50)));
    assertValid(chunkText("\u{1f6d1}".repeat(1500)));
});

test("text ngan giu nguyen", () => {
    assert.deepEqual(chunkText("line1\nline2"), ["line1\nline2"]);
});
