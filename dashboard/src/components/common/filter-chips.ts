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

  // WAI-ARIA Tabs: arrow keys move focus + activate; Home/End jump to
  // first/last. Activation on focus is the natural pattern for filter
  // chips — the user expects the filtered content to update immediately.
  function handleTabKeyDown(e: KeyboardEvent) {
    const tablist = (e.target as HTMLElement).closest('[role="tablist"]')
    if (!tablist) return
    const tabs = Array.from(tablist.querySelectorAll<HTMLElement>('[role="tab"]'))
    const idx = tabs.indexOf(e.target as HTMLElement)
    if (idx < 0) return

    let next = -1
    if (e.key === 'ArrowRight') next = (idx + 1) % tabs.length
    else if (e.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = tabs.length - 1
    else return

    e.preventDefault()
    tabs[next].focus()
    activateChip(chips[next].key)
  }

  return html`
    <div class="flex flex-wrap gap-1.5 ${cx ?? ''}" role="tablist" aria-orientation="horizontal" aria-label=${ariaLabel}>
      ${chips.map(chip => html`
        <button type="button"
          key=${chip.key}
          title=${chip.title}
          role="tab"
          aria-selected=${activeKey === chip.key}
          tabIndex=${activeKey === chip.key ? 0 : -1}
          class="${chipClass} cursor-pointer transition-all duration-150 ${activeKey === chip.key
            ? activeToneClass
            : idleToneClass}"
          onClick=${() => activateChip(chip.key)}
          onKeyDown=${handleTabKeyDown}
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
