import { html } from 'htm/preact'
import { signal } from '@preact/signals'
import { useEffect } from 'preact/hooks'
import {
  fetchDashboardPlatform,
  type DashboardPlatformResponse,
  type DashboardPlatformProviderCard,
  type DashboardPlatformProviderProbe,
} from '../api'
import { Card } from './common/card'
import { EmptyState } from './common/empty-state'
import { formatParamValue } from './governance-utils'

type PlatformState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; data: DashboardPlatformResponse }
  | { status: 'error'; message: string }

const platformState = signal<PlatformState>({ status: 'idle' })

async function loadPlatform(force = false) {
  if (!force && platformState.value.status === 'loading') return
  platformState.value = { status: 'loading' }
  try {
    const data = await fetchDashboardPlatform()
    platformState.value = { status: 'loaded', data }
  } catch (err) {
    platformState.value = {
      status: 'error',
      message: err instanceof Error ? err.message : '플랫폼 데이터를 불러오지 못했습니다',
    }
  }
}

function toneForProvider(card: DashboardPlatformProviderCard): 'ok' | 'warn' {
  const probe = card.current_probe
  return card.available && !probe.error && !probe.runtime_blocker ? 'ok' : 'warn'
}

function Pill({
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

function SampleRow({ sample }: { sample: DashboardPlatformProviderProbe }) {
  return html`
    <div class="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-[var(--white-3)]">
      <div class="min-w-0">
        <div class="text-[12px] font-medium text-[var(--text-body)]">${sample.provider}</div>
        <div class="text-[11px] text-[var(--text-muted)] truncate">
          ${sample.sample_source}
          ${sample.error ? ` · ${sample.error}` : sample.runtime_blocker ? ` · ${sample.runtime_blocker}` : ''}
        </div>
      </div>
      <div class="text-right shrink-0">
        <div class="text-[12px] text-[var(--text-body)]">${sample.status}</div>
        <div class="text-[11px] text-[var(--text-muted)]">
          ${sample.latency_ms == null ? '--' : `${sample.latency_ms}ms`} · ${sample.sampled_at}
        </div>
      </div>
    </div>
  `
}

function ProviderCard({ card }: { card: DashboardPlatformProviderCard }) {
  const tone = toneForProvider(card)
  return html`
    <div class="rounded-xl border border-[var(--card-border)] bg-[var(--white-3)] p-4">
      <div class="flex flex-wrap items-start justify-between gap-2 mb-2">
        <div>
          <div class="text-[14px] font-semibold text-[var(--text-body)]">${card.provider}</div>
          <div class="text-[12px] text-[var(--text-muted)] mt-1">
            ${card.kind} · ${card.runtime_kind} · ${card.auth_kind}
          </div>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <${Pill} label=${card.status} tone=${tone} />
          ${card.available ? html`<${Pill} label="available" tone="ok" />` : html`<${Pill} label="blocked" tone="warn" />`}
          ${card.current_probe.runtime_blocker ? html`<${Pill} label=${card.current_probe.runtime_blocker} tone="warn" />` : null}
        </div>
      </div>
      <div class="grid gap-1.5 text-[12px] text-[var(--text-muted)]">
        <div>endpoint: <span class="text-[var(--text-body)]">${card.endpoint_url ?? '--'}</span></div>
        <div>default model: <span class="text-[var(--text-body)]">${card.default_model ?? '--'}</span></div>
        <div>models: <span class="text-[var(--text-body)]">${card.models.length}</span></div>
        <div>latest probe: <span class="text-[var(--text-body)]">${card.current_probe.sampled_at}</span></div>
        <div>avg latency: <span class="text-[var(--text-body)]">${card.history_summary.avg_latency_ms == null ? '--' : `${card.history_summary.avg_latency_ms.toFixed(1)}ms`}</span></div>
        <div>samples: <span class="text-[var(--text-body)]">${card.history_summary.sample_count}</span></div>
      </div>
      ${card.note ? html`<div class="mt-2 text-[12px] text-[var(--warn)] leading-relaxed">${card.note}</div>` : null}
      ${card.current_probe.error ? html`<div class="mt-2 text-[12px] text-[var(--warn)] leading-relaxed">${card.current_probe.error}</div>` : null}
    </div>
  `
}

export function Platform() {
  const state = platformState.value

  useEffect(() => {
    if (platformState.value.status === 'idle') {
      void loadPlatform()
    }
  }, [])

  if (state.status === 'loading' || state.status === 'idle') {
    return html`
      <${Card} title="Platform" class="section">
        <div class="text-[12px] text-[var(--text-muted)]">플랫폼 상태 로딩 중...</div>
      <//>
    `
  }

  if (state.status === 'error') {
    return html`<${EmptyState} message=${state.message} />`
  }

  const { data } = state
  const runtimeParamSurfaces = data.runtime_params.surfaces ?? []
  const runtimeParams = data.runtime_params.parameters ?? []
  const providerCards = data.providers.providers ?? []
  const recentSamples = data.providers.recent_samples ?? []
  const wrapperFamilies = data.notes.families ?? []

  return html`
    <section class="flex flex-col gap-4">
      <${Card} title="Platform" class="section">
        <div class="flex items-center justify-between gap-3 flex-wrap mb-3">
          <div class="text-[12px] text-[var(--text-muted)]">
            생성 시각: ${data.generated_at ?? '--'}
          </div>
          <button type="button"
            class="px-3 py-1.5 rounded-lg text-[13px] font-medium border border-[var(--card-border)] bg-[var(--white-4)] hover:bg-[var(--white-8)] transition-colors cursor-pointer text-[var(--text-body)]"
            onClick=${() => { void loadPlatform(true) }}
          >
            새로고침
          </button>
        </div>
        <div class="grid gap-2">
          ${data.paths.map(entry => html`
            <div class="rounded-lg bg-[var(--white-3)] px-3 py-2">
              <div class="text-[12px] font-medium text-[var(--text-body)]">${entry.label}</div>
              <div class="text-[11px] text-[var(--text-muted)] break-all">${entry.path}</div>
              <div class="text-[11px] text-[var(--text-muted)] mt-1">
                ${entry.exists ? 'exists' : 'missing'}
                ${entry.is_directory ? ' · dir' : ''}
                ${entry.size_bytes == null ? '' : ` · ${entry.size_bytes} bytes`}
                ${entry.modified_at ? ` · ${entry.modified_at}` : ''}
              </div>
            </div>
          `)}
        </div>
      <//>

      <${Card} title="Config Inventory" class="section">
        <div class="text-[12px] text-[var(--text-muted)] mb-3">.masc/config JSON 파일 ${data.config_inventory.count}개</div>
        <div class="grid gap-2">
          ${data.config_inventory.files.length === 0
            ? html`<div class="text-[12px] text-[var(--text-muted)]">현재 기록된 config file이 없습니다.</div>`
            : data.config_inventory.files.map(entry => html`
                <div class="rounded-lg bg-[var(--white-3)] px-3 py-2">
                  <div class="text-[12px] font-medium text-[var(--text-body)]">${entry.label}</div>
                  <div class="text-[11px] text-[var(--text-muted)] break-all">${entry.path}</div>
                </div>
              `)}
        </div>
      <//>

      <${Card} title="Runtime Parameters" class="section">
        <div class="grid gap-3">
          ${runtimeParamSurfaces.map(surface => {
            const surfaceParams = runtimeParams.filter(param => surface.param_keys.includes(param.key))
            return html`
              <div class="rounded-xl border border-[var(--card-border)] bg-[var(--white-3)] p-4">
                <div class="flex flex-wrap gap-2 items-center mb-2">
                  <div class="text-[13px] font-semibold text-[var(--text-body)]">${surface.id}</div>
                  <${Pill} label=${surface.risk} tone=${surface.risk === 'high' ? 'warn' : 'default'} />
                </div>
                <div class="text-[12px] text-[var(--text-muted)] mb-3">${surface.description}</div>
                <div class="grid gap-1.5">
                  ${surfaceParams.map(param => html`
                    <div class="rounded-lg bg-[var(--white-4)] px-3 py-2 flex items-center justify-between gap-3">
                      <span class="text-[12px] font-mono text-[var(--text-muted)]">${param.key}</span>
                      <span class="text-[12px] text-[var(--text-body)]">${formatParamValue(param.current)}</span>
                    </div>
                  `)}
                </div>
              </div>
            `
          })}
        </div>
      <//>

      <${Card} title="Providers" class="section">
        <div class="grid gap-3">
          ${providerCards.map(card => html`<${ProviderCard} card=${card} />`)}
        </div>
      <//>

      <${Card} title="Recent Probes" class="section">
        <div class="grid gap-2">
          ${recentSamples.length === 0
            ? html`<div class="text-[12px] text-[var(--text-muted)]">아직 probe sample이 없습니다.</div>`
            : recentSamples.slice(-12).reverse().map(sample => html`<${SampleRow} sample=${sample} />`)}
        </div>
      <//>

      <${Card} title="Wrapper Notes" class="section">
        <div class="grid gap-2">
          ${wrapperFamilies.map(family => html`
            <div class="rounded-lg bg-[var(--white-3)] px-3 py-2">
              <div class="flex flex-wrap gap-2 items-center mb-1">
                <span class="text-[13px] font-medium text-[var(--text-body)]">${family.label}</span>
                <${Pill} label=${family.status} tone=${family.status === 'planned' ? 'warn' : 'ok'} />
              </div>
              <div class="text-[12px] text-[var(--text-muted)]">${family.description}</div>
              ${family.disabled_reason ? html`<div class="text-[12px] text-[var(--warn)] mt-1">${family.disabled_reason}</div>` : null}
            </div>
          `)}
        </div>
      <//>
    </section>
  `
}
