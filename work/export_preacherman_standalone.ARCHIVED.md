# Archived standalone exporter

`work/export_preacherman_standalone.mjs` is preserved only to document the old
export approach. It is intentionally disabled and is not part of `npm run dev`
or `npm run build`.

The exporter originally depended on a different checkout outside this
repository and expected assets that are not present in `work/site-edit`.
Running that workflow could overwrite the canonical page with an older,
incomplete version. The executable now fails immediately with an ARCHIVED
message and contains no workstation-specific absolute path dependency.

Use `npm run build` from the repository root instead.
