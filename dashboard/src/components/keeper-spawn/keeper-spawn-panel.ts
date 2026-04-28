import { html } from 'htm/preact'
import { signal } from '@preact/signals'
import { ActionButton } from '../common/button'
import { PersonaBrowser } from './persona-browser'
import { PersonaGenerator } from './persona-generator'
import { showSpawnPanel } from './keeper-spawn-state'

type SpawnMode = 'persona' | 'generate' | 'direct'
const spawnMode = signal<SpawnMode>('persona')

const tabs: { id: SpawnMode; label: string }[] = [
  { id: 'persona', label: '페르소나에서 생성' },
  { id: 'generate', label: '새 페르소나' },
  { id: 'direct', label: '직접 생성' },
]

export function KeeperSpawnPanel() {
  if (!showSpawnPanel.value) {
    return html`<div class="mb-4">
      <${ActionButton} variant="primary" size="md" onClick=${() => { showSpawnPanel.value = true }}>+ 키퍼 생성<//>
    </div>`
  }
  return html`
    <div class="mb-4 rounded border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm text-[var(--color-fg-secondary)] font-medium">키퍼 생성</h3>
        <${ActionButton} variant="subtle" size="sm" onClick=${() => { showSpawnPanel.value = false }}>닫기<//>
      </div>
      <div class="flex gap-2 mb-3" role="tablist" aria-label="키퍼 생성 모드">
        ${tabs.map(tab => html`
          <${ActionButton}
            key=${tab.id}
            variant=${spawnMode.value === tab.id ? 'primary' : 'ghost'}
            size="sm"
            role="tab"
            ariaSelected=${spawnMode.value === tab.id}
            onClick=${() => { spawnMode.value = tab.id }}
          >${tab.label}<//>
        `)}
      </div>
      <div role="tabpanel" aria-label=${tabs.find(t => t.id === spawnMode.value)?.label}>
        ${spawnMode.value === 'persona'
          ? html`<${PersonaBrowser} />`
          : spawnMode.value === 'generate'
            ? html`<${PersonaGenerator} />`
          : html`<p class="text-xs text-[var(--color-fg-muted)]">직접 생성은 도구 실행기에서 <code class="text-[var(--color-accent-fg)]">masc_keeper_up</code>을 사용하세요.</p>`}
      </div>
    </div>
  `
}
