import { describe, expect, it } from "vitest";
import { COMMANDS, FORBIDDEN_COMMANDS } from "@glt/cli";
import { collectGitFromRepo } from "@glt/collectors";
import { REPO_ROOT } from "@glt/contracts";
import {
  Capability,
  ExitCode,
  GltError,
  RUNTIME_IDENTITY,
  Role,
  SELF_TOPOLOGY_NAMESPACE,
  SELF_TOPOLOGY_STEP,
  assertObservationDoesNotApprove,
  authorize,
  comparePlanes,
  observeSelfTopology,
  planeNodesFromGitModules,
  planeNodesFromRegistryEntries,
  requireSeededDriftDetected,
} from "@glt/domain";
import { compileRegistryFromPaths } from "@glt/registry";
import { compileSnapshotFromPaths } from "@glt/snapshot";

const AS_OF = "2026-08-14T10:00:00Z";
const REPO_URL = "https://github.com/Quantum-Insight-Lab/glt.git";
const SEEDED_DEPLOY = "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

describe("DEV-27 dogfood of this repository", () => {
  it("is the DEV-27 step", () => {
    expect(SELF_TOPOLOGY_STEP).toBe("glt.dev.27");
  });

  it("describes this repo through registry/glt-controlplane.yaml", () => {
    const compiled = compileRegistryFromPaths();
    expect(compiled.namespace).toBe(SELF_TOPOLOGY_NAMESPACE);
    expect(compiled.boundary).toBe("glt.bootstrap-slice@1");
    expect(compiled.entries.map((entry) => entry.id).sort()).toEqual([
      "glt.controlplane.check",
      "glt.controlplane.compiler",
      "glt.controlplane.gate.bootstrap",
      "glt.controlplane.registry.entry",
    ]);

    const snapshot = compileSnapshotFromPaths({ asOf: AS_OF });
    expect(snapshot.boundary_id).toBe(compiled.boundary);
    expect(snapshot.nodes).toHaveLength(4);

    const git = collectGitFromRepo({
      repoRoot: REPO_ROOT,
      commit: "HEAD",
      repositoryUrl: REPO_URL,
    });
    expect(git.commit).toMatch(/^[0-9a-f]{7,40}$/);
    expect(git.module_graph.nodes.length).toBeGreaterThan(0);

    const planes = comparePlanes({
      intended: planeNodesFromRegistryEntries(compiled.entries),
      materialized: planeNodesFromGitModules(git.module_graph.nodes),
    });
    expect(planes.intended_ids).toEqual(compiled.entries.map((entry) => entry.id).sort());
    expect(planes.materialized_ids.length).toBeGreaterThan(0);
    expect(planes.intended_ids).not.toEqual(planes.materialized_ids);
  });

  it("PROTO-12 E05 seeded deploy drift on the live registry is timed", () => {
    const injectedAt = Date.now();
    const compiled = compileRegistryFromPaths();
    const git = collectGitFromRepo({
      repoRoot: REPO_ROOT,
      commit: "HEAD",
      repositoryUrl: REPO_URL,
    });
    const buildHash =
      git.commit !== null && git.commit.length > 0 ? git.commit : SEEDED_DEPLOY;
    const observation = observeSelfTopology({
      namespace: compiled.namespace,
      registryIds: compiled.entries.map((entry) => entry.id),
      pin: { buildHash, deploymentHash: SEEDED_DEPLOY },
      detectSeconds: (Date.now() - injectedAt) / 1000,
    });
    requireSeededDriftDetected(observation);
    expect(observation.detect_seconds).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(observation.detect_seconds)).toBe(true);
  });

  it("INV-09 watching own topology does not let the runtime approve a release", () => {
    const compiled = compileRegistryFromPaths();
    const observation = observeSelfTopology({
      namespace: compiled.namespace,
      registryIds: compiled.entries.map((entry) => entry.id),
      pin: { buildHash: SEEDED_DEPLOY, deploymentHash: "" },
      detectSeconds: 0,
    });
    expect(observation.grants_approve).toBe(false);
    assertObservationDoesNotApprove(observation);
    requireSeededDriftDetected(observation);

    let caught: unknown;
    try {
      authorize({
        principal: { actor: RUNTIME_IDENTITY, role: Role.Approver },
        capability: Capability.Approve,
        plan: { authored_by: "dogfood", affects_control_plane_release: true },
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(GltError);
    expect((caught as GltError).code).toBe(ExitCode.PolicyDenied);
    expect((caught as GltError).invariant).toBe("INV-09");
  });

  it("S-10 glt dogfood is not a command", () => {
    const names = COMMANDS.map((command) => command.name);
    expect(names).not.toContain("dogfood");
    expect(names).not.toContain("observe");
    expect(FORBIDDEN_COMMANDS).not.toContain("dogfood");
  });
});
