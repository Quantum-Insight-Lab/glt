---
id: glt.doc.security.sandbox
owner: security
normativity: normative
status: accepted
depends_on:
  - glt.doc.spec.runner
source_refs: []
---

# Runner sandbox

## Isolation checklist

- [ ] Disposable VM or rootless container per run
- [ ] Immutable git checkout at pinned commit
- [ ] Read-only source mount
- [ ] Writable scratch only (size cap)
- [ ] Empty/minimal environment
- [ ] No Docker socket, no host `/var/run`
- [ ] seccomp + cgroups limits
- [ ] Pinned signed executor image (digest in plan envelope)
- [ ] Network default OFF
- [ ] Egress allowlist via policy broker only
- [ ] Short-lived scoped credentials
- [ ] Output schema allowlist + redaction before persist

## Escape test scenarios (E06)

1. Mount host path attempt
2. Fork bomb / resource exhaustion
3. Egress to metadata service
4. Write outside scratch
5. Credential exfil in logs
6. Docker socket probe

All must **block** or **deny** with audit record.
