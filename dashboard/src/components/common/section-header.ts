// SectionHeader — consistent section labels across dashboard
// Replaces 34+ inline patterns: `text-3xs uppercase tracking-1 text-[var(--color-fg-muted)] font-medium`

import { html } from 'htm/preact'
import type { ComponentChildren } from 'preact'

type HeaderSize = 'xs' | 'sm' | 'md'
type HeadingLevel = 'h2' | 'h3' | 'h4'

const SIZE_CLASSES: Record<HeaderSize, string> = {
  xs: 'text-3xs',
  sm: 'text-2xs',
  md: 'text-sm',
}

interface SectionHeaderProps {
  size?: HeaderSize
  /** Heading element to render. Default 'h2' (top-level card sections). Use 'h3' for sub-sections. */
  as?: HeadingLevel
  class?: string
  /** Right-side slot (counts, actions) */
  right?: ComponentChildren
  children: ComponentChildren
}

/** Uppercase tracked section label — the dashboard's standard heading pattern */
export function SectionHeader({
  size = 'sm',
  as: Tag = 'h2',
  class: cx,
  right,
  children,
}: SectionHeaderProps) {
  return html`
    <div class="flex items-center justify-between gap-2 ${cx ?? ''}">
      <${Tag} class="m-0 ${SIZE_CLASSES[size]} uppercase tracking-[0.06em] text-[var(--color-fg-muted)] font-medium">${children}<//>
      ${right ?? null}
    </div>
  `
}
