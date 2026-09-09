import { describe, expect, it } from "vitest";
import { canonicalize } from "./canonical.ts";

/**
 * RFC 8785 §3.2.2 sample, parsed as JSON then re-serialized by JCS.
 * The expected string is the canonical form in §3.2.3 (whitespace removed).
 */
const RFC_8785_SAMPLE = `{
    "numbers": [333333333.33333329, 1E30, 4.50,
                2e-3, 0.000000000000000000000000001],
    "string": "\\u20ac$\\u000F\\u000aA'\\u0042\\u0022\\u005c\\\\\\"\\/",
    "literals": [null, true, false]
  }`;

describe("RFC 8785 canonicalization", () => {
  it("RFC 8785 §3.2.3 sample: object members sorted, arrays preserved, no whitespace", () => {
    const parsed = JSON.parse(RFC_8785_SAMPLE) as {
      literals: unknown;
      numbers: unknown;
      string: string;
    };
    const out = canonicalize(parsed);
    process.stdout.write(`RFC 8785 §3.2.3 vector: ${out}\n`);
    expect(out).toBe(
      '{"literals":[null,true,false],"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27],"string":' +
        JSON.stringify(parsed.string) +
        "}",
    );
  });

  it("RFC 8785 §3.2.3 arrays are not reordered", () => {
    expect(canonicalize({ z: [2, 1], a: 0 })).toBe('{"a":0,"z":[2,1]}');
  });

  it("RFC 8785 Appendix B: 0 and minus zero serialize as 0", () => {
    process.stdout.write("RFC 8785 Appendix B vector: 0 and -0 → 0\n");
    expect(canonicalize(0)).toBe("0");
    expect(canonicalize(-0)).toBe("0");
  });

  it("RFC 8785 Appendix B: 1e+23 boundary", () => {
    process.stdout.write("RFC 8785 Appendix B vector: 1e+23\n");
    expect(canonicalize(1e23)).toBe("1e+23");
  });

  it("RFC 8785 §3.2.2.3 NaN and Infinity are rejected", () => {
    expect(() => canonicalize(Number.NaN)).toThrow(/non-finite/);
    expect(() => canonicalize(Number.POSITIVE_INFINITY)).toThrow(/non-finite/);
  });

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
