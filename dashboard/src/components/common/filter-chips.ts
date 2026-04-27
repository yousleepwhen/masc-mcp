// FilterChips — reusable filter chip bar
// Replaces 15+ inline filter implementations across the dashboard.

import { html } from 'htm/preact'
import type { Signal } from '@preact/signals'
import { CountBadge } from './badge'

interface FilterChip<T extends string> {
  key: T
  label: string
  count?: number | string | null
  title?: string
}

interface FilterChipsProps<T extends string> {
  chips: FilterChip<T>[]
  active?: Signal<T>
  value?: T
  onChange?: (key: T) => void
  ariaLabel?: string
  class?: string
  size?: 'sm' | 'md'
  tone?: 'gold' | 'accent'
}

export function FilterChips<T extends string>({
  chips,
  active,
  value,
  onChange,
  ariaLabel,
  class: cx,
  size = 'sm',
  tone = 'gold',
}: FilterChipsProps<T>) {
  const activeKey = active?.value ?? value
  const chipClass = size === 'md'
    ? 'inline-flex min-h-9 items-center gap-1.5 rounded border px-3 py-2 text-2xs font-medium'
    : 'inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[length:var(--fs-xs)]'
  const activeToneClass = tone === 'accent'
    ? 'border-[var(--border-slate-22)] bg-[var(--accent-soft)] text-[var(--color-fg-secondary)]'
    : 'border-[var(--warn-20)] bg-[var(--warn-10)] text-[var(--warn-bright)]'
  const idleToneClass = tone === 'accent'
    ? 'border-[var(--white-10)] bg-[var(--white-4)] text-[var(--color-fg-disabled)] hover:bg-[var(--white-8)] hover:border-[var(--border-slate-22)] hover:text-[var(--color-fg-primary)]'
    : 'border-[var(--white-10)] bg-[var(--white-4)] text-[var(--color-fg-disabled)] hover:bg-[var(--white-8)] hover:border-[rgba(200,168,78,0.4)]'

  function activateChip(key: T) {
    if (active) active.value = key
    onChange?.(key)
  }

  // WAI-ARIA Radiogroup: arrow keys move focus + activate; Home/End jump to
  // first/last. Filter chips select one option from a set, which maps to
  // the radiogroup pattern rather than tabs (no tabpanel needed).
  function handleRadioKeyDown(e: KeyboardEvent) {
    const group = (e.target as HTMLElement).closest('[role="radiogroup"]')
    if (!group) return
    const radios = Array.from(group.querySelectorAll<HTMLElement>('[role="radio"]'))
    const idx = radios.indexOf(e.target as HTMLElement)
    if (idx < 0) return

    let next = -1
    if (e.key === 'ArrowRight') next = (idx + 1) % radios.length
    else if (e.key === 'ArrowLeft') next = (idx - 1 + radios.length) % radios.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = radios.length - 1
    else return

    e.preventDefault()
    radios[next].focus()
    activateChip(chips[next].key)
  }

  return html`
    <div class="flex flex-wrap gap-1.5 ${cx ?? ''}" role="radiogroup" aria-label=${ariaLabel}>
      ${chips.map(chip => html`
        <button type="button"
          key=${chip.key}
          title=${chip.title}
          role="radio"
          aria-checked=${activeKey === chip.key}
          tabIndex=${activeKey === chip.key ? 0 : -1}
          class="${chipClass} cursor-pointer transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-fg)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-bg-page)] ${activeKey === chip.key
            ? activeToneClass
            : idleToneClass}"
          onClick=${() => activateChip(chip.key)}
          onKeyDown=${handleRadioKeyDown}
        >
          ${chip.label}
          ${chip.count != null ? html`
            <${CountBadge} class=${activeKey === chip.key
              ? 'bg-[rgba(255,255,255,0.12)] text-current'
              : ''}>${chip.count}<//>
          ` : null}
        </button>
      `)}
    </div>
  `
}
