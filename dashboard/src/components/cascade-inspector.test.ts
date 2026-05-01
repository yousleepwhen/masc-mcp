// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { h, render } from 'preact'
import { act } from 'preact/test-utils'

vi.mock('../api/dashboard-cascade', () => ({
  fetchCascadeStrategyTrace: vi.fn().mockResolvedValue({ events: [], updated_at: '2024-01-01T00:00:00Z' }),
  fetchCascadeHealth: vi.fn().mockResolvedValue({ providers: [] }),
}))

vi.mock('./common/feedback-state', () => ({
  LoadingState: ({ children }: any) => h('div', { className: 'loading' }, children),
  ErrorState: ({ message }: any) => h('div', { className: 'error' }, message),
  EmptyState: ({ message }: any) => h('div', { className: 'empty' }, message),
}))

vi.mock('./common/filter-chips', () => ({
  FilterChips: ({ chips, value, onChange }: any) =>
    h('div', { className: 'filter-chips' },
      chips.map((c: any) => h('button', { key: c.key, onClick: () => onChange?.(c.key) }, c.label)),
    ),
}))

vi.mock('./common/status-badge', () => ({
  StatusBadge: ({ children }: any) => h('span', { className: 'badge' }, children),
}))

vi.mock('./common/time-ago', () => ({
  TimeAgo: ({ timestamp }: any) => h('span', null, String(timestamp)),
}))

describe('cascade-inspector', () => {
  let container: HTMLDivElement

  beforeEach(async () => {
    vi.resetModules()
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    render(null, container)
    container.remove()
    vi.restoreAllMocks()
  })

  it('renders header sections', async () => {
    const { CascadeInspector } = await import('./cascade-inspector')
    render(h(CascadeInspector), container)
    expect(container.textContent).toContain('Cascade 검사기')
    expect(container.textContent).toContain('전략 추적')
    expect(container.textContent).toContain('건강도 스냅숏')
  })

  it('shows loading state initially then data', async () => {
    const api = await import('../api/dashboard-cascade')
    api.fetchCascadeStrategyTrace.mockResolvedValue({
      events: [
        { ts: 1000, cascade_name: 'c1', strategy: 'round_robin', cycle: 1, candidates_in: 3, candidates_out: 2, backoff_ms: 0, kind: 'ordered' },
      ],
      updated_at: '2024-01-01T00:00:00Z',
    })
    api.fetchCascadeHealth.mockResolvedValue({
      providers: [
        { provider_key: 'p1', success_rate: 0.95, consecutive_failures: 0, in_cooldown: false, cooldown_expires_at: null, events_in_window: 10, avg_latency_ms: 100 },
      ],
    })

    const { CascadeInspector } = await import('./cascade-inspector')
    await act(async () => {
      render(h(CascadeInspector), container)
    })
    await act(() => new Promise(r => setTimeout(r, 10)))

    expect(container.textContent).toContain('c1')
    expect(container.textContent).toContain('p1')
  })

  it('shows error state when trace fetch fails', async () => {
    const api = await import('../api/dashboard-cascade')
    api.fetchCascadeStrategyTrace.mockRejectedValue(new Error('trace fail'))
    api.fetchCascadeHealth.mockResolvedValue({ providers: [] })

    const { CascadeInspector } = await import('./cascade-inspector')
    await act(async () => {
      render(h(CascadeInspector), container)
    })
    await act(() => new Promise(r => setTimeout(r, 10)))

    expect(container.textContent).toContain('trace fail')
  })

  it('shows empty state when no trace events', async () => {
    const api = await import('../api/dashboard-cascade')
    api.fetchCascadeStrategyTrace.mockResolvedValue({ events: [], updated_at: '' })
    api.fetchCascadeHealth.mockResolvedValue({ providers: [] })

    const { CascadeInspector } = await import('./cascade-inspector')
    await act(async () => {
      render(h(CascadeInspector), container)
    })
    await act(() => new Promise(r => setTimeout(r, 10)))

    expect(container.textContent).toContain('전략 추적 이벤트가 없습니다')
  })

  it('shows empty state when no health providers', async () => {
    const api = await import('../api/dashboard-cascade')
    api.fetchCascadeStrategyTrace.mockResolvedValue({ events: [], updated_at: '' })
    api.fetchCascadeHealth.mockResolvedValue({ providers: [] })

    const { CascadeInspector } = await import('./cascade-inspector')
    await act(async () => {
      render(h(CascadeInspector), container)
    })
    await act(() => new Promise(r => setTimeout(r, 10)))

    expect(container.textContent).toContain('프로바이더 건강 데이터가 없습니다')
  })

  it('filters events by cascade name', async () => {
    const api = await import('../api/dashboard-cascade')
    api.fetchCascadeStrategyTrace.mockResolvedValue({
      events: [
        { ts: 1000, cascade_name: 'c1', strategy: 'rr', cycle: 1, candidates_in: 3, candidates_out: 2, backoff_ms: 0, kind: 'ordered' },
        { ts: 2000, cascade_name: 'c2', strategy: 'rr', cycle: 1, candidates_in: 2, candidates_out: 1, backoff_ms: 0, kind: 'ordered' },
      ],
      updated_at: '2024-01-01T00:00:00Z',
    })
    api.fetchCascadeHealth.mockResolvedValue({ providers: [] })

    const { CascadeInspector } = await import('./cascade-inspector')
    await act(async () => {
      render(h(CascadeInspector), container)
    })
    await act(() => new Promise(r => setTimeout(r, 10)))

    expect(container.textContent).toContain('c1')
    expect(container.textContent).toContain('c2')
  })
})
