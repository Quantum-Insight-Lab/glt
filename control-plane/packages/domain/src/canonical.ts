/**
 * RFC 8785 JSON Canonicalization Scheme, no third-party dependency.
 *
 * The bootstrap verifier hashes and signs this form. A second canonicalizer
 * would give PROTO-03 two answers; this file is the only one (S-4).
 *
 * Snapshots.md additionally requires Unicode NFC before serialization. That is
 * applied here so digest and signature see the same bytes.
 */

const JSON_ESCAPE: Record<string, string> = {
  "\b": "\\b",
  "\t": "\\t",
  "\n": "\\n",
  "\f": "\\f",
  "\r": "\\r",
  '"': '\\"',
  "\\": "\\\\",
};

export function canonicalize(value: unknown): string {
  return writeJson(nfcValue(value));
}

/** NFC on every string, recursively. Arrays stay arrays; object identity is not preserved. */
function nfcValue(value: unknown): unknown {
  if (typeof value === "string") return value.normalize("NFC");
  if (Array.isArray(value)) return value.map(nfcValue);
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k.normalize("NFC")] = nfcValue(v);
    return out;
  }
  return value;
}

function writeJson(value: unknown): string {
  if (value === null) return "null";
  if (value === true) return "true";
  if (value === false) return "false";
  if (typeof value === "number") return writeNumber(value);
  if (typeof value === "string") return writeString(value);
  if (Array.isArray(value)) {
    return `[${value.map(writeJson).join(",")}]`;
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${writeString(k)}:${writeJson(value[k])}`).join(",")}}`;
  }
  throw new TypeError(`canonicalize: value is not JSON (${describe(value)})`);
}

function writeNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new TypeError("canonicalize: non-finite numbers are not JSON");
  }
  // ES NumberToString, which RFC 8785 requires. JSON.stringify on a finite
  // number is that function in this runtime.
  return JSON.stringify(value);
}

function writeString(value: string): string {
  let out = '"';
  for (const char of value) {
    const escaped = JSON_ESCAPE[char];
    if (escaped !== undefined) {
      out += escaped;
      continue;
    }
    const code = char.charCodeAt(0);
    if (code < 0x20) {
      out += `\\u${code.toString(16).padStart(4, "0")}`;
      continue;
    }
    out += char;
  }
  return `${out}"`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function describe(value: unknown): string {
  if (typeof value === "object" && value !== null) return value.constructor.name;
  return typeof value;
}
