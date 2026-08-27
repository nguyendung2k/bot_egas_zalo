import test from "node:test";
import assert from "node:assert/strict";
import { formatWarningChanges, formatWarningEntry, snapshotsEqual } from "../../dist/bot/warning-monitor.js";

const entry = (maKhach, tenKhach, value) => ({
    maKhach,
    tenKhach,
    value,
    group: "other",
});

test("khong hien thi khach da vuot nguong 2 trieu", () => {
    const oldSnapshot = new Map([
        ["221.001", entry("221.001", "Khach vuot nguong", 1_500_000)],
        ["221.002", entry("221.002", "Khach con lai", 900_000)],
    ]);
    const currentSnapshot = new Map([
        ["221.002", entry("221.002", "Khach con lai", 800_000)],
    ]);

    const changes = formatWarningChanges(oldSnapshot, currentSnapshot);

    assert.equal(snapshotsEqual(oldSnapshot, currentSnapshot), false);
    assert.equal(changes.length, 1);
    assert.match(changes[0], /Khach con lai/);
    assert.doesNotMatch(changes.join("\n"), /Khach vuot nguong/);
});

test("chi co khach vuot nguong van duoc nhan dien la thay doi", () => {
    const oldSnapshot = new Map([
        ["221.001", entry("221.001", "Khach vuot nguong", 1_500_000)],
        ["221.002", entry("221.002", "Khach con lai", 900_000)],
    ]);
    const currentSnapshot = new Map([
        ["221.002", entry("221.002", "Khach con lai", 900_000)],
    ]);

    assert.equal(snapshotsEqual(oldSnapshot, currentSnapshot), false);
    assert.deepEqual(formatWarningChanges(oldSnapshot, currentSnapshot), []);
});

test("hien thi khach moi vao nguong canh bao", () => {
    const currentSnapshot = new Map([
        ["221.003", entry("221.003", "Khach moi", 1_200_000)],
    ]);

    const changes = formatWarningChanges(new Map(), currentSnapshot);

    assert.equal(changes.length, 1);
    assert.match(changes[0], /Khach moi/);
});

test("bao dung cap hang khi cong no <= 150k", () => {
    assert.match(formatWarningEntry(entry("221.004", "Khach can kiet", 99_000)), /DỪNG CẤP HÀNG/);
    assert.match(formatWarningEntry(entry("221.005", "Khach dung nguong", 150_000)), /DỪNG CẤP HÀNG/);
    assert.doesNotMatch(formatWarningEntry(entry("221.006", "Khach du han muc", 150_001)), /DỪNG CẤP HÀNG/);
});

test("canh bao dung cap hang khi cong no tut xuong <= 150k", () => {
    const changes = formatWarningChanges(
        new Map([["221.004", entry("221.004", "Khach tut", 250_000)]]),
        new Map([["221.004", entry("221.004", "Khach tut", 150_000)]]),
    );

    assert.equal(changes.length, 1);
    assert.match(changes[0], /DỪNG CẤP HÀNG/);
});
