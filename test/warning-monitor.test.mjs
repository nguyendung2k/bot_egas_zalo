import test from "node:test";
import assert from "node:assert/strict";
import { formatWarningChanges, snapshotsEqual } from "../dist/bot/warning-monitor.js";

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
