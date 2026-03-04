# Cleanup Audit Candidates

This file tracks candidates that appear to be temporary or non-runtime artifacts.
Each candidate was validated against all import, build, and runtime paths -- zero references found outside this audit doc.

## Candidate Files

- `content.b64`
  - Reason: standalone base64 artifact; no runtime references found.
  - Validation: grep across entire repo returned zero hits.
  - Status: **approved for deletion**
- `gen_file.py`
  - Reason: ad-hoc helper script that writes directly to a backend service file.
  - Validation: grep across entire repo returned zero hits.
  - Status: **approved for deletion**
- `write_file.py`
  - Reason: temporary stdin-to-file write helper.
  - Validation: grep across entire repo returned zero hits.
  - Status: **approved for deletion**
- `create_skill_index.py`
  - Reason: one-off generator targeting backend service file.
  - Validation: grep across entire repo returned zero hits.
  - Status: **approved for deletion**
- `router_changes.patch`
  - Reason: patch artifact, not imported by runtime or build flow.
  - Validation: grep across entire repo returned zero hits.
  - Status: **approved for deletion**
- `skill_providers_original.py`
  - Reason: backup/original copy superseded by current router/service code.
  - Validation: grep across entire repo returned zero hits.
  - Status: **approved for deletion**
- `backend/ccm/services/test_check.py`
  - Reason: placeholder file (12 bytes) with no runtime references.
  - Validation: grep across entire repo returned zero hits.
  - Status: **approved for deletion**
- `dashboard-initial.png`
  - Reason: screenshot artifact not referenced by README or any code.
  - Validation: grep across entire repo returned zero hits (only .npmignore).
  - Status: **approved for deletion**
- `claudeboard-1.6.0.tgz`
  - Reason: generated tarball from npm pack, should not be committed.
  - Status: **approved for deletion**
