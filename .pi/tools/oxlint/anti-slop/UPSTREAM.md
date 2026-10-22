# Vendored anti-slop Oxlint plugins

Source: [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop), `skills/install-anti-slop/assets/anti-slop/`.

- Copied from commit `13909c9e07590f5a85d93c62712259fe14a883f7` (repository HEAD at install time).
- Last upstream commit touching the copied assets: `d2a9aea3b896ffcb291a85f2c1301aa2543ad8c8`.
- Installed with the skill's `scripts/install.mjs`; `diff -r` against the source assets showed no differences at install time.

Installed plugin paths (registered under `lint.jsPlugins` in `../../../vite.config.ts`; run via `vp check`):

- `./tools/oxlint/anti-slop/index.ts` (generic rules, plugin name `anti-slop`)
- `./tools/oxlint/anti-slop/effect/index.ts` (Effect rules, plugin name `anti-slop-effect`; enabled because `effect` is a direct dependency)

The nested `vendor/eslint-stylistic/` directory keeps its own `LICENSE` and `UPSTREAM.md`.

## Intentional deviations

None to the vendored files. All generic rules, the native `oxc/no-accumulating-spread` companion rule, and all Effect rules are enabled at `"error"`.

## Dependencies

`vite-plus` is pinned to `1.3.0`, which bundles `oxlint` `=1.88.0`. `@oxlint/plugins` is pinned exactly to `1.88.0` to match. When upgrading `vite-plus`, move `@oxlint/plugins` to its bundled `oxlint` version.
