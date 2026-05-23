# CSS Tokens Reference

All CSS custom properties are defined in `src/styles/deferred/variables.css` (full palette) and `src/styles/critical/variables.css` (above-fold tokens only).

## Base Palette — `[data-palette="atlantic"]` (default)

| Token | Value | Usage |
|---|---|---|
| `--app-ink` | `#07111f` | Page background |
| `--app-paper` | `#f6f8fb` | Body text, headings |
| `--app-silver` | `#8ba3b4` | Secondary text, descriptions |
| `--app-copper` | `#d8bd78` | Accent color, CTAs, highlights |
| `--app-slate` | `#6f8faf` | Mid-tone UI elements |
| `--app-glow` | `rgba(111,143,175,0.3)` | Card glows, aurora tints |
| `--app-border` | `rgba(246,248,251,0.14)` | Card borders |
| `--app-card-bg` | `rgba(14,27,45,0.78)` | Semi-transparent card backgrounds |

## Alternate Palettes

Swap by setting `data-palette` on `.app-shell`. Implemented in `src/hooks/usePaletteSync.ts` + controlled from `App.tsx`.

| Palette | `data-palette` value | Mood |
|---|---|---|
| Atlantic (default) | `atlantic` | Deep navy + gold |
| Tropical | `tropical` | Teal + lime |
| Sunset | `sunset` | Warm amber + coral |
| Sand | `sand` | Warm beige + dark brown |
| Current (portrait) | `current` | Mirrors the portrait image colors |

Each palette overrides the same token names, so all components automatically recolor.

## Shell / Performance Tokens

| Token | Usage |
|---|---|
| `--services-shell-height` | `content-visibility` intrinsic size for Services section |
| `--projects-shell-height` | `content-visibility` intrinsic size for Projects section |
| `--faq-shell-height` | `content-visibility` intrinsic size for FAQ section |
| `--article-body-shell-height` | `content-visibility` intrinsic size for article body |

These are set in `@media (max-width: 920px)` inside `src/styles/critical/sections.css`.

## Usage Example

```css
/* Reference a token anywhere in your CSS */
.my-card {
  background: var(--app-card-bg);
  border: 1px solid var(--app-border);
  color: var(--app-paper);
}

.my-cta {
  background: var(--app-copper);
  color: var(--app-ink);
}
```
