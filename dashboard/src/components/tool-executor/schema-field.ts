import { html } from 'htm/preact'
import { TextInput, TextArea } from '../common/input'
import { Select } from '../common/select'
import { NumberInput } from '../common/number-input'
import { Checkbox } from '../common/checkbox'
import type { JsonSchemaProperty } from '../../types/json-schema'

const LONG_TEXT_PATTERN = /body|content|description|message|text|reason|prompt|query|markdown/i

interface SchemaFieldProps {
  name: string
  schema: JsonSchemaProperty
  value: unknown
  required: boolean
  onChange: (name: string, value: unknown) => void
}

export function SchemaField({ name, schema, value, required, onChange }: SchemaFieldProps) {
  const fieldId = `sf-${name}`
  const requiredMark = required
    ? html`<span class="text-[var(--color-status-err)] ml-0.5" aria-hidden="true">*</span>`
    : null

  const hintId = schema.description ? `${fieldId}-hint` : undefined
  const hint = schema.description
    ? html`<span id=${hintId} class="text-3xs text-[var(--color-fg-muted)] mt-0.5">${schema.description}</span>`
    : null

  if (schema.type === 'string' && schema.enum) {
    return html`
      <div class="flex flex-col gap-1">
        <label for=${fieldId} class="text-2xs text-[var(--color-fg-muted)] font-medium">${name}${requiredMark}</label>
        ${hint}
        <${Select} id=${fieldId} value=${(value as string) ?? ''} options=${schema.enum} placeholder="-- 선택 --"
          required=${required} ariaDescribedby=${hintId} onInput=${(v: string) => onChange(name, v)} />
      </div>
    `
  }

  if (schema.type === 'string') {
    const isLong = LONG_TEXT_PATTERN.test(name)
    if (isLong) {
      return html`
        <div class="flex flex-col gap-1">
          <label for=${fieldId} class="text-2xs text-[var(--color-fg-muted)] font-medium">${name}${requiredMark}</label>
          ${hint}
          <${TextArea} id=${fieldId} value=${(value as string) ?? (schema.default as string) ?? ''} placeholder=${name} rows=${3}
            required=${required} ariaDescribedby=${hintId} onInput=${(e: Event) => onChange(name, (e.target as HTMLTextAreaElement).value)} />
        </div>
      `
    }
    return html`
      <div class="flex flex-col gap-1">
        <label for=${fieldId} class="text-2xs text-[var(--color-fg-muted)] font-medium">${name}${requiredMark}</label>
        ${hint}
        <${TextInput} id=${fieldId} value=${(value as string) ?? (schema.default as string) ?? ''} placeholder=${name}
          required=${required} ariaDescribedby=${hintId} onInput=${(e: Event) => onChange(name, (e.target as HTMLInputElement).value)} />
      </div>
    `
  }

  if (schema.type === 'integer' || schema.type === 'number') {
    return html`
      <div class="flex flex-col gap-1">
        <label for=${fieldId} class="text-2xs text-[var(--color-fg-muted)] font-medium">${name}${requiredMark}</label>
        ${hint}
        <${NumberInput} id=${fieldId} value=${(value as number) ?? (schema.default as number) ?? ''} placeholder=${name}
          step=${schema.type === 'integer' ? 1 : 'any'} ariaDescribedby=${hintId}
          onInput=${(v: number | undefined) => onChange(name, v)} />
      </div>
    `
  }

  if (schema.type === 'boolean') {
    return html`
      <div class="flex items-center gap-2 py-1">
        <${Checkbox} id=${fieldId} checked=${(value as boolean) ?? (schema.default as boolean) ?? false}
          ariaLabel=${name} onChange=${(v: boolean) => onChange(name, v)} />
        <label for=${fieldId} class="text-xs text-[var(--color-fg-primary)]">${name}${requiredMark}</label>
        ${schema.description ? html`<span class="text-3xs text-[var(--color-fg-muted)]">- ${schema.description}</span>` : null}
      </div>
    `
  }

  if (schema.type === 'array' && schema.items?.type === 'string') {
    const strValue = Array.isArray(value) ? (value as string[]).join('\n') : ''
    return html`
      <div class="flex flex-col gap-1">
        <label for=${fieldId} class="text-2xs text-[var(--color-fg-muted)] font-medium">${name}${requiredMark}
          <span class="font-normal"> (줄바꿈으로 구분)</span></label>
        ${hint}
        <${TextArea} id=${fieldId} value=${strValue} placeholder=${name} rows=${3}
          ariaDescribedby=${hintId} onInput=${(e: Event) => {
            const lines = (e.target as HTMLTextAreaElement).value.split('\n').filter(Boolean)
            onChange(name, lines)
          }} />
      </div>
    `
  }

  const rawValue = value === undefined || value === null ? ''
    : typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  return html`
    <div class="flex flex-col gap-1">
      <label for=${fieldId} class="text-2xs text-[var(--color-fg-muted)] font-medium">${name}${requiredMark}
        <span class="font-normal"> (JSON)</span></label>
      ${hint}
      <${TextArea} id=${fieldId} value=${rawValue} placeholder=${'{ ... }'} rows=${4} class="font-mono text-xs"
        ariaDescribedby=${hintId} onInput=${(e: Event) => {
          const raw = (e.target as HTMLTextAreaElement).value
          try { onChange(name, JSON.parse(raw)) } catch { /* typing */ }
        }} />
    </div>
  `
}
