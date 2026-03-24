import { html } from 'htm/preact'
import type { SafeWrapperFamily } from '../../api'

function WrapperBadge({
  label,
  tone = 'default',
}: {
  label: string
  tone?: 'default' | 'ok' | 'warn'
}) {
  const className =
    tone === 'ok'
      ? 'text-[#7dd3fc] bg-[rgba(14,165,233,0.18)]'
      : tone === 'warn'
        ? 'text-[var(--warn)] bg-[var(--warn-12)]'
        : 'text-[var(--text-muted)] bg-[var(--white-8)]'
  return html`<span class="text-[11px] rounded-full px-2 py-0.5 ${className}">${label}</span>`
}

export function SafeWrapperCatalog({
  families,
}: {
  families: SafeWrapperFamily[]
}) {
  if (families.length === 0) return null

  return html`
    <div class="mb-4">
      <div class="text-[12px] text-[var(--text-muted)] mb-3 leading-relaxed">
        inspect-first wrapper family입니다. execute는 명시적으로 요청해야 하고, planned 항목은 현재 비활성 상태를 그대로 보여줍니다.
      </div>
      <div class="grid gap-3">
        ${families.map(family => html`
          <div class="rounded-xl border border-[var(--card-border)] bg-[var(--white-3)] p-4">
            <div class="flex flex-wrap items-start justify-between gap-2 mb-2">
              <div>
                <div class="text-[14px] font-semibold text-[var(--text-body)]">${family.label}</div>
                <div class="text-[12px] text-[var(--text-muted)] mt-1">${family.description}</div>
              </div>
              <div class="flex flex-wrap gap-1.5">
                <${WrapperBadge} label=${family.status} tone=${family.status === 'active' ? 'ok' : 'warn'} />
                <${WrapperBadge} label=${`default:${family.default_mode}`} />
                ${family.mutating ? html`<${WrapperBadge} label="mutating" tone="warn" />` : html`<${WrapperBadge} label="read-only" tone="ok" />`}
                ${family.confirm_required ? html`<${WrapperBadge} label="confirm" tone="warn" />` : null}
              </div>
            </div>
            <div class="flex flex-wrap gap-x-3 gap-y-2 text-[12px] text-[var(--text-muted)] mb-2">
              <span>tools ${family.tool_count}</span>
              <span>surfaces ${family.surfaces.join(', ') || '--'}</span>
            </div>
            ${family.tool_names.length > 0
              ? html`<div class="flex flex-wrap gap-1.5 mb-2">
                  ${family.tool_names.map(name => html`<code class="text-[11px] px-2 py-1 rounded-lg bg-[var(--white-8)] text-[var(--text-body)]">${name}</code>`)}
                </div>`
              : null}
            ${family.disabled_reason
              ? html`<div class="text-[12px] text-[var(--warn)] leading-relaxed">${family.disabled_reason}</div>`
              : null}
          </div>
        `)}
      </div>
    </div>
  `
}

