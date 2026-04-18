import { describe, it, expect } from "vitest";
import { envFieldToRows, envFieldKeys } from "./normalizeSettingsEnv";

describe("envFieldToRows", () => {
  it("maps record env to rows", () => {
    expect(envFieldToRows({ A: "1", B: 2 })).toEqual([
      { key: "A", value: "1" },
      { key: "B", value: "2" },
    ]);
  });

  it("maps array env to rows", () => {
    expect(
      envFieldToRows([
        { key: "FOO", value: "bar" },
        { key: "EMPTY", value: null },
      ]),
    ).toEqual([
      { key: "FOO", value: "bar" },
      { key: "EMPTY", value: "" },
    ]);
  });

  it("does not treat array indices as env keys", () => {
    const rows = envFieldToRows([{ key: "X", value: "y" }]);
    expect(rows.some((r) => r.key === "0")).toBe(false);
    expect(rows).toEqual([{ key: "X", value: "y" }]);
  });

  it("returns empty for nullish", () => {
    expect(envFieldToRows(undefined)).toEqual([]);
    expect(envFieldToRows(null)).toEqual([]);
  });
});

describe("envFieldKeys", () => {
  it("returns keys from either shape", () => {
    expect(envFieldKeys({ a: "1" })).toEqual(["a"]);
    expect(envFieldKeys([{ key: "b", value: "2" }])).toEqual(["b"]);
  });
});
