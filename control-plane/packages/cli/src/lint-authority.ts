import { PACK, loadPackDocs, loadYaml } from "@glt/contracts";
import {
  ExitCode,
  enforceAuthorityMap,
  factClassesFromMap,
  type AuthorityReport,
  type FactClass,
  type NormativeDocOwner,
} from "@glt/domain";
import type { Writer } from "./output.ts";

/**
 * `glt lint authority` — INV-01 as a command.
 *
 * Same-class conflict is reported as `source_conflict` and blocks actions
 * above read. The command never selects a "correct" source.
 */

interface AuthorityIo {
  loadClasses: () => readonly FactClass[];
  loadNormativeDocs: () => readonly NormativeDocOwner[];
}

const defaultIo: AuthorityIo = {
  loadClasses: () => factClassesFromMap(loadYaml(PACK.authorityMap)),
  loadNormativeDocs: () =>
    loadPackDocs().flatMap((doc) => {
      const owner = doc.frontmatter?.owner;
      if (doc.frontmatter?.normativity !== "normative" || typeof owner !== "string") return [];
      return [{ path: doc.path, owner }];
    }),
};

export function lintAuthority(io: AuthorityIo = defaultIo): AuthorityReport {
  return enforceAuthorityMap({
    classes: io.loadClasses(),
    normativeDocs: io.loadNormativeDocs(),
  });
}

export function runLintAuthority(writer: Writer, io: AuthorityIo = defaultIo): number {
  const report = lintAuthority(io);
  writer.artifact(report, renderAuthorityReport);
  return report.blocked ? ExitCode.SourceConflict : ExitCode.Success;
}

export function renderAuthorityReport(report: AuthorityReport): string {
  if (!report.blocked) {
    return `authority: none, classes: ${String(report.classes)}, blocked above read: no`;
  }
  const lines = [
    `authority: ${report.conflict}`,
    `blocked above: ${report.actions_above}`,
    `замечаний: ${String(report.findings.length)}`,
  ];
  for (const finding of report.findings) {
    const inv = finding.invariant ? `${finding.invariant} ` : "";
    lines.push(`  ${inv}${finding.kind}  ${finding.detail}`);
  }
  return lines.join("\n");
}
