// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { h, render } from 'preact'

vi.mock('./keeper-supervisor-helpers', () => ({
  groupCrashCohorts: vi.fn((log: any[]) => {
    const cohorts: Record<string, number> = {}
    log.forEach((e: any) => {
      const cat = e.category ?? 'other'
      cohorts[cat] = (cohorts[cat] ?? 0) + 1
    })
    return cohorts
  }),
  filterCrashLog: vi.fn((log: any[], filter: string) =>
    filter === 'all' ? log : log.filter((e: any) => e.category === filter),
  ),
  CRASH_CATEGORY_KEYS: ['heartbeat', 'turn', 'fiber', 'exception', 'other'],
}))

vi.mock('../lib/format-time', () => ({
  formatTimeAgo: vi.fn((ts: number) => `${ts}s ago`),
}))

vi.mock('./common/filter-chips', () => ({
  FilterChips: ({ chips, active, onChange }: any) =>
    h('div', { className: 'filter-chips' },
      chips.map((c: any) => h('button', { key: c.key, onClick: () => onChange?.(c.key) }, `${c.label} ${c.count}`)),
    ),
}))

describe('keeper-supervisor-diagnostics', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    render(null, container)
    container.remove()
    vi.restoreAllMocks()
  })

  const makeKeeper = (diagOverrides: any = {}, topOverrides: any = {}) => ({
    name: 'keeper-a',
    registry_state: 'Running',
    supervisor_diagnostics: {
      restart_count: 2,
      max_restarts: 5,
      health_score: 85,
      crash_log: [
        { ts: 1000, reason: 'timeout', category: 'heartbeat' },
        { ts: 2000, reason: 'panic', category: 'exception' },
      ],
      sp_events: [{ ts: 500, suppressed_count: 3, total: 5, dominant_cohort: 'heartbeat' }],
      ...diagOverrides,
    },
    ...topOverrides,
  })

  it('returns null when no diagnostics', async () => {
    const { SupervisorDiagnosticsPanel } = await import('./keeper-supervisor-diagnostics')
    const keeper = makeKeeper({}, { supervisor_diagnostics: null })
    render(h(SupervisorDiagnosticsPanel, { keeper }), container)
    expect(container.innerHTML).toBe('')
  })

  it('renders health score and restart budget', async () => {
    const { SupervisorDiagnosticsPanel } = await import('./keeper-supervisor-diagnostics')
    render(h(SupervisorDiagnosticsPanel, { keeper: makeKeeper() }), container)
    expect(container.textContent).toContain('85')
    expect(container.textContent).toContain('2/5')
  })

  it('renders crash cohort bar when crash log exists', async () => {
    const { SupervisorDiagnosticsPanel } = await import('./keeper-supervisor-diagnostics')
    render(h(SupervisorDiagnosticsPanel, { keeper: makeKeeper() }), container)
    expect(container.textContent).toContain('장애 유형 분포')
  })

  it('renders sp events panel when sp_events exist', async () => {
    const { SupervisorDiagnosticsPanel } = await import('./keeper-supervisor-diagnostics')
    render(h(SupervisorDiagnosticsPanel, { keeper: makeKeeper() }), container)
    expect(container.textContent).toContain('자기 보호 발동 이력')
    expect(container.textContent).toContain('3/5')
  })

  it('shows dead state banner when dead_since is present', async () => {
    const { SupervisorDiagnosticsPanel } = await import('./keeper-supervisor-diagnostics')
    const keeper = makeKeeper({ dead_since: 3000 })
    render(h(SupervisorDiagnosticsPanel, { keeper }), container)
    expect(container.textContent).toContain('중단됨')
  })

  it('shows last failure reason when present', async () => {
    const { SupervisorDiagnosticsPanel } = await import('./keeper-supervisor-diagnostics')
    const keeper = makeKeeper({ last_failure_reason: 'OOM' })
    render(h(SupervisorDiagnosticsPanel, { keeper }), container)
    expect(container.textContent).toContain('OOM')
  })

  it('renders registry state badge', async () => {
    const { SupervisorDiagnosticsPanel } = await import('./keeper-supervisor-diagnostics')
    render(h(SupervisorDiagnosticsPanel, { keeper: makeKeeper() }), container)
    expect(container.textContent).toContain('Running')
  })

  it('shows empty crash log gracefully', async () => {
    const { SupervisorDiagnosticsPanel } = await import('./keeper-supervisor-diagnostics')
    const keeper = makeKeeper({ crash_log: [], sp_events: [] })
    render(h(SupervisorDiagnosticsPanel, { keeper }), container)
    expect(container.textContent).toContain('감독 진단')
    expect(container.textContent).not.toContain('장애 이력')
  })
})
