# T0 Seed Public Keys

**External trust base — not part of the manifest under verification.**

## Usage

1. Bootstrap verifier loads keys from this directory **before** parsing `bootstrap-manifest.yaml`.
2. Manifest signature verified against the key id listed in manifest metadata; key material comes from here.
3. Rotating keys: add the new key, grace period, deprecate the old one — never only-in-manifest keys.

## Current state: dev-only root

```
seed-public-keys/
  README.md                  (this file)
  glt-dev-only-2026.pub      (real Ed25519 key, published private half)
```

`glt-dev-only-2026` is a **working** key whose private half is derived from a published seed:

```
seed = sha256("glt-dev-only-2026")
     = a315d1c30ece9a9df8e0ce22f070645b72291198020b610c9787c54b22fbc182
```

Anyone can reconstruct the private key, so it is not a secret and cannot be mistaken for a trust anchor. That is the point. A placeholder that merely looks unfinished invites someone to "just fill it in later" and ship it; a key that is provably public cannot be shipped by accident, and [`../release-policy.yaml`](../release-policy.yaml) rejects it explicitly.

CI and DEV-02 tests use this key to exercise the full path: load T0 → verify manifest signature → validate schemas → compile golden snapshot → compare digest.

## Production setup (operator)

```bash
# Run on a secure workstation, never in CI
openssl genpkey -algorithm ED25519 -out glt-root-2026.pem
openssl pkey -in glt-root-2026.pem -pubout -out glt-root-2026.pub
```

Then:

1. Commit only `glt-root-2026.pub`.
2. Store the private key in an HSM or org secret manager. **Never commit private keys** — enforced by `.gitignore`.
3. Add `glt-root-2026` to `release_trust_roots.allowed` in `release-policy.yaml`.
4. Re-sign `bootstrap-manifest.yaml` with the release identity.
5. Delete `glt-dev-only-2026.pub` or keep it for CI while the release policy keeps rejecting it.

Sealed release (DEV-35) fails while the dev-only root is the only key present.

## Sheet INV-10 — bootstrap trust termination

If the verifier accepts a manifest signed only by a key embedded in that same file, the test FAILS. Trust terminates at T0, outside the artifact being verified.
