import { relative, resolve } from "node:path";
import {
  REPO_ROOT,
  createValidator,
  defaultValidatePaths,
  loadDocument,
  resolveSchemaName,
  validateAgainst,
  type SchemaName,
  type ValidationFailure,
} from "@glt/contracts";
import { ExitCode, usageError, type CoverageReport } from "@glt/domain";
import { structuralCoverage } from "./coverage-scan.ts";
import type { Writer } from "./output.ts";

export interface DocumentFailure {
  readonly path: string;
  readonly schema: SchemaName;
  readonly errors: readonly ValidationFailure[];
}

export interface ValidateReport {
  readonly checked: number;
  readonly failures: readonly DocumentFailure[];
  readonly coverage: CoverageReport;
}

export function validateDocuments(paths: readonly string[]): ValidateReport {
  const ajv = createValidator();
  const failures: DocumentFailure[] = [];
  const targets = paths.length > 0 ? paths.map((p) => resolve(p)) : defaultValidatePaths();

  for (const absolutePath of targets) {
    const doc = loadDocument(absolutePath);
    const schema = resolveSchemaName(absolutePath, doc);
    if (schema === undefined) {
      throw usageError(`cannot infer schema for ${displayPath(absolutePath)}`, [absolutePath]);
    }
    const errors = validateAgainst(ajv, schema, doc);
    if (errors.length > 0) {
      failures.push({ path: displayPath(absolutePath), schema, errors });
    }
  }

  return {
    checked: targets.length,
    failures,
    coverage: structuralCoverage(),
  };
}

export function runValidate(writer: Writer, paths: readonly string[]): number {
  const report = validateDocuments(paths);
  writer.artifact(report, renderValidateReport);
  return report.failures.length > 0 ? ExitCode.ContractInvalid : ExitCode.Success;
}

export function renderValidateReport(report: ValidateReport): string {
  const { coverage } = report;
  const lines = [
    `проверено документов: ${String(report.checked)}`,
    `замечаний: ${String(report.failures.length)}`,
    `glt_structural_coverage: ${String(coverage.value)} (${String(coverage.covered)}/${String(coverage.total)})`,
  ];
  for (const failure of report.failures) {
    const detail = failure.errors.map((e) => `${e.path} ${e.message}`).join("; ");
    lines.push(`  ${failure.path} [${failure.schema}]: ${detail}`);
  }
  if (coverage.deferred.length > 0) {
    lines.push(
      `отложено: ${coverage.deferred.map((d) => `${d.id}@${d.until}`).join(", ")}`,
    );
  }
  if (coverage.uncovered.length > 0) {
    lines.push(`не покрыто: ${coverage.uncovered.join(", ")}`);
  }
  return lines.join("\n");
}

function displayPath(absolutePath: string): string {
  return relative(REPO_ROOT, absolutePath).replaceAll("\\", "/");
}
