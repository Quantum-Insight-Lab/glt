import { describe, expect, it } from "vitest";
import { ExitCode, GltError } from "./errors.ts";
import {
  SELF_TOPOLOGY_NAMESPACE,
  SELF_TOPOLOGY_STEP,
  assertObservationDoesNotApprove,
  observeSelfTopology,
  requireSeededDriftDetected,
} from "./self-topology.ts";

const BUILD = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const DEPLOY = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const IDS = ["glt.controlplane.compiler", "glt.controlplane.registry.entry"] as const;

describe("DEV-27 self-topology observation", () => {
  it("is the DEV-27 step", () => {
    expect(SELF_TOPOLOGY_STEP).toBe("glt.dev.27");
    expect(SELF_TOPOLOGY_NAMESPACE).toBe("glt.controlplane");
  });

  it("PROTO-12 E05 a seeded hash mismatch is drift and records detect_seconds", () => {
    const observation = observeSelfTopology({
      namespace: SELF_TOPOLOGY_NAMESPACE,
      registryIds: IDS,
      pin: { buildHash: BUILD, deploymentHash: DEPLOY },
      detectSeconds: 0,
    });
    expect(observation.drift).toBe("drift");
    expect(observation.detect_seconds).toBe(0);
    expect(observation.grants_approve).toBe(false);
    requireSeededDriftDetected(observation);
  });

  it("PROTO-12 E05 an aligned pin is not a detection", () => {
    const observation = observeSelfTopology({
      namespace: SELF_TOPOLOGY_NAMESPACE,
      registryIds: IDS,
      pin: { buildHash: BUILD, deploymentHash: BUILD },
      detectSeconds: 0,
    });
    expect(observation.drift).toBe("aligned");
    expect(() => requireSeededDriftDetected(observation)).toThrow(GltError);
    try {
      requireSeededDriftDetected(observation);
    } catch (error) {
      expect(error).toBeInstanceOf(GltError);
      expect((error as GltError).code).toBe(ExitCode.EvidenceInsufficient);
    }
  });

  it("INV-09 observation never grants approve", () => {
    const observation = observeSelfTopology({
      namespace: SELF_TOPOLOGY_NAMESPACE,
      registryIds: IDS,
      pin: { buildHash: BUILD, deploymentHash: DEPLOY },
      detectSeconds: 0,
    });
    expect(observation.grants_approve).toBe(false);
    assertObservationDoesNotApprove(observation);
  });

  it("INV-09 a grants_approve observation is rejected", () => {
    expect(() => assertObservationDoesNotApprove({ grants_approve: true })).toThrow(GltError);
    try {
      assertObservationDoesNotApprove({ grants_approve: true });
    } catch (error) {
      expect(error).toBeInstanceOf(GltError);
      expect((error as GltError).invariant).toBe("INV-09");
    }
  });

  it("a foreign namespace is not self-topology", () => {
    expect(() =>
      observeSelfTopology({
        namespace: "other.plane",
        registryIds: IDS,
        pin: { buildHash: BUILD, deploymentHash: DEPLOY },
        detectSeconds: 0,
      }),
    ).toThrow(GltError);
  });
});
