# Design Tokens

Token reference for **TransPerfect I Element**. Use utility classes and CSS variables — never raw values.

## Colors

Apply with any color utility: `bg-<name>`, `text-<name>`, `border-<name>`, `ring-<name>`, `divide-<name>`, etc.

| Name | CSS variable |
|---|---|
| `background` | `--background` |
| `foreground` | `--foreground` |
| `card` | `--card` |
| `card-foreground` | `--card-foreground` |
| `primary` | `--primary` |
| `primary-foreground` | `--primary-foreground` |
| `secondary` | `--secondary` |
| `secondary-foreground` | `--secondary-foreground` |
| `muted` | `--muted` |
| `muted-foreground` | `--muted-foreground` |
| `accent` | `--accent` |
| `accent-foreground` | `--accent-foreground` |
| `destructive` | `--destructive` |
| `destructive-foreground` | `--destructive-foreground` |
| `border` | `--border` |
| `input` | `--input` |
| `chart-1` | `--chart-1` |
| `chart-2` | `--chart-2` |
| `chart-3` | `--chart-3` |
| `chart-4` | `--chart-4` |
| `chart-5` | `--chart-5` |
| `sidebar` | `--sidebar` |
| `sidebar-foreground` | `--sidebar-foreground` |
| `sidebar-primary` | `--sidebar-primary` |
| `sidebar-primary-foreground` | `--sidebar-primary-foreground` |
| `sidebar-accent` | `--sidebar-accent` |
| `sidebar-accent-foreground` | `--sidebar-accent-foreground` |
| `sidebar-border` | `--sidebar-border` |
| `sidebar-ring` | `--sidebar-ring` |
| `icon-muted` | `--icon-muted` |
| `icon-inverse` | `--icon-inverse` |
| `icon-inverse-muted` | `--icon-inverse-muted` |
| `icon-inverse-subtle` | `--icon-inverse-subtle` |
| `ring` | `--ring` |

## Typography

Typography classes (`font-*` for families, `text-*` for sizes):

| Class | CSS variable |
|---|---|
| `font-sans` | `--font-sans` |
| `font-mono` | `--font-mono` |

## Border Radius

Border-radius classes:

| Class | CSS variable |
|---|---|
| `rounded-sm` | `--radius-sm` |
| `rounded-md` | `--radius-md` |
| `rounded` | `--radius` |

## Other

Reference via `var(--name)` in inline styles or CSS.

| CSS variable |
|---|
| `--icon` |
| `--icon-subtle` |

