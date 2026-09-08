import { describe, expect, it } from "vitest";
import { canonicalize } from "./canonical.ts";

describe("RFC 8785 canonicalization", () => {
  it("sorts object members by UTF-16 code unit", () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it("omits insignificant whitespace", () => {
    expect(canonicalize({ a: [1, 2] })).toBe('{"a":[1,2]}');
  });

  it("normalizes strings to NFC before encoding", () => {
    const nfd = "e\u0301";
    const nfc = "é";
    expect(canonicalize(nfd)).toBe(canonicalize(nfc));
  });
});
