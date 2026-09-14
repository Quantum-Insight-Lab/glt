import { describe, expect, it } from "vitest";
import {
  DRIFT_STEP,
  classifyDeployDrift,
  classifyIncidentPath,
} from "./drift.ts";

describe("DEV-26 drift and incident classifiers", () => {
  it("is the DEV-26 step", () => {
    expect(DRIFT_STEP).toBe("glt.dev.26");
  });

  it("INV-04 a materialized path is a candidate, not a confirmation", () => {
    expect(
      classifyIncidentPath({ plane: "materialized", traceParentage: false }),
    ).toBe("candidate");
    expect(
      classifyIncidentPath({ plane: "materialized", traceParentage: true }),
    ).toBe("candidate");
    expect(classifyIncidentPath({ plane: "intended", traceParentage: true })).toBe(
      "candidate",
    );
  });

  it("INV-04 observed trace-parentage confirms; observation without it does not", () => {
    expect(classifyIncidentPath({ plane: "observed", traceParentage: true })).toBe(
      "confirmed",
    );
    expect(classifyIncidentPath({ plane: "observed", traceParentage: false })).toBe(
      "candidate",
    );
  });

  it("PROTO-12 a deploy/build hash mismatch is drift, not silence", () => {
    expect(
      classifyDeployDrift({
        buildHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        deploymentHash: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      }),
    ).toBe("drift");
  });

  it("PROTO-12 a missing hash is drift, not aligned", () => {
    expect(classifyDeployDrift({ buildHash: "sha256:aa", deploymentHash: "" })).toBe(
      "drift",
    );
    expect(classifyDeployDrift({ buildHash: "", deploymentHash: "sha256:bb" })).toBe(
      "drift",
    );
    expect(classifyDeployDrift({ buildHash: "  ", deploymentHash: "  " })).toBe("drift");
  });

  it("equal present hashes are aligned", () => {
    const hash = "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
    expect(classifyDeployDrift({ buildHash: hash, deploymentHash: hash })).toBe(
      "aligned",
    );
  });
});
