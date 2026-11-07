# Windows-Compatible Project Packaging — v1

## Purpose

Keep complete releases (including historical documentation) extractable on Windows without silently skipping files. This is a **packaging-only** increment; mathematical code, browser behavior and tests are unchanged.

## Release layout

- The archive has one short root directory: `Manipulator/`.
- Older milestone notes remain included in `Developer Documentation/06_Historical_Records/Archive/` (the former `Milestone_and_Legacy_Documents/`). Their content is preserved.
- Relative Markdown references to that folder have been updated.
- `scripts/check_windows_paths.py` checks every ZIP entry, rejects unsafe traversal paths, and enforces a conservative path-length budget.

## Extraction instructions

Prefer extracting directly to `C:\Dev\` or `C:\Algebra\` with Windows Explorer or 7-Zip. Avoid extracting inside a deeply nested Downloads directory. **Do not choose Skip** if Windows reports a long-path error: doing so creates an incomplete project.

Windows tools vary in long-path support. The checker assumes up to 100 characters for the parent directory; it is not a guarantee for arbitrarily deep paths. For longer paths, shorten the extraction location.

## Future release checklist

1. Build from the latest browser-verified project baseline; do not package test artifacts or `node_modules`.
2. Keep one short archive root; prefer short historical folder names.
3. Update relative documentation links if any directory is renamed; preserve historical content.
4. Run `python scripts/check_windows_paths.py release.zip`.
5. Run `ZipFile.testzip()` or equivalent integrity verification and inspect file counts.
6. Confirm no source code changed during packaging. If source code does change, rerun relevant tests.
7. Update the current handover and living documentation, not another milestone note.

## Limitations

This check verifies ZIP member lengths under a documented parent-path budget, not actual extraction through every Windows shell or archiver. A real Windows extraction remains the final end-to-end check.
