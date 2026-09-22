# @intertexe/brand

Shared **visual brand primitives only** (color + type tokens).

This package is **not** a domain model for fashion designers or SaaS organizations.
See `docs/brand-domain-naming-audit.md` for consumer vs enterprise naming.

Not a component library. Consumer marketplace and enterprise marketing may diverge in UX;
only import this package for true visual brand constants.

## Tokens

| Token | Hex |
|-------|-----|
| `--itx-gold` | `#c9a962` |
| `--itx-accent` | `#c4a574` |
| `--itx-accent-soft` | `#e8dcc8` |
| `--itx-accent-muted` | `#d9c9a8` |

## Usage

```css
@import "@intertexe/brand/tokens.css";
```

Or relative from the Next app:

```css
@import "../../../packages/brand/tokens.css";
```
