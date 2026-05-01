// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { h, render } from 'preact'
import { act } from 'preact/test-utils'

vi.mock('./session-trace-state', () => ({
  getTraceLoading: vi.fn(),
  getTraceError: vi.fn(),
  getFilteredEvents: vi.fn(),
  getTraceSummary: vi.fn(),
  getTraceSearchQuery: vi.fn(),
  loadSessionTrace: vi.fn(),
  closeSessionTrace: vi.fn(),
  _traceSlots: { value: {} },
}))

vi.mock('./session-trace-entry', () => ({
  SessionTraceEntry: ({ event }: any) => h('div', { className: 'trace-entry' }, event.summary),
}))

vi.mock('./session-trace-filter', () => ({
  SessionTraceFilter: ({ agentName }: any) => h('div', { className: 'trace-filter' }, agentName),
}))

vi.mock('../common/button', () => ({
  ActionButton: ({ children, onClick, disabled }: any) =>
    h('button', { onClick, disabled }, children),
}))

vi.mock('../common/feedback-state', () => ({
  LoadingState: ({ children }: any) => h('div', { className: 'loading' }, children),
  ErrorState: ({ message }: any) => h('div', { className: 'error' }, message),
  EmptyState: ({ message }: any) => h('div', { className: 'empty' }, message),
}))

describe('session-trace-view', () => {
  let container: HTMLDivElement

  beforeEach(async () => {
    vi.resetModules()
    const state = await import('./session-trace-state')
    state.getTraceLoading.mockReturnValue(false)
    state.getTraceError.mockReturnValue(null)
    state.getFilteredEvents.mockReturnValue([])
    state.getTraceSummary.mockReturnValue({
      tool_call_count: 0,
      oas_tool_count: 0,
      oas_turn_count: 0,
      oas_context_count: 0,
      broadcast_count: 0,
      task_completed_count: 0,
      task_claimed_count: 0,
      heartbeat_count: 0,
      lifecycle_count: 0,
      thinking_count: 0,
      total_cost_usd: 0,
      oas_input_tokens: 0,
      oas_output_tokens: 0,
      oas_llm_call_count: 0,
      oas_error_count: 0,
      oas_tokens_saved: 0,
    })
    state.getTraceSearchQuery.mockReturnValue('')
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    render(null, container)
    container.remove()
    vi.clearAllMocks()
  })

  it('calls loadSessionTrace on mount', async () => {
    const state = await import('./session-trace-state')
    const { SessionTraceView } = await import('./session-trace-view')
    await act(async () => {
      render(h(SessionTraceView, { agentName: 'agent-a', isKeeper: false }), container)
    })
    expect(state.loadSessionTrace).toHaveBeenCalledWith('agent-a', false)
  })

  it('renders loading state when loading and no events', async () => {
    const state = await import('./session-trace-state')
    state.getTraceLoading.mockReturnValue(true)
    state.getFilteredEvents.mockReturnValue([])

    const { SessionTraceView } = await import('./session-trace-view')
    await act(async () => {
      render(h(SessionTraceView, { agentName: 'agent-a', isKeeper: false }), container)
    })
    expect(container.textContent).toContain('활동 추적 불러오는 중')
  })

  it('renders error state with retry button', async () => {
    const state = await import('./session-trace-state')
    state.getTraceError.mockReturnValue('fetch failed')
    state.getTraceLoading.mockReturnValue(false)

    const { SessionTraceView } = await import('./session-trace-view')
    await act(async () => {
      render(h(SessionTraceView, { agentName: 'agent-a', isKeeper: false }), container)
    })
    expect(container.textContent).toContain('fetch failed')
    expect(container.textContent).toContain('재시도')
  })

  it('renders empty state for offline keeper', async () => {
    const state = await import('./session-trace-state')
    state.getTraceLoading.mockReturnValue(false)
    state.getFilteredEvents.mockReturnValue([])

    const { SessionTraceView } = await import('./session-trace-view')
    await act(async () => {
      render(h(SessionTraceView, { agentName: 'agent-a', isKeeper: true, keeperStatus: 'dead' }), container)
    })
    expect(container.textContent).toContain('오프라인')
  })

  it('renders empty state for unstarted keeper', async () => {
    const state = await import('./session-trace-state')
    state.getTraceLoading.mockReturnValue(false)
    state.getFilteredEvents.mockReturnValue([])

    const { SessionTraceView } = await import('./session-trace-view')
    await act(async () => {
      render(h(SessionTraceView, { agentName: 'agent-a', isKeeper: true, keeperStatus: 'active', keeperGeneration: 0 }), container)
    })
    expect(container.textContent).toContain('아직 시작되지 않은')
  })

  it('renders event list and summary when events exist', async () => {
    const state = await import('./session-trace-state')
    state.getTraceLoading.mockReturnValue(false)
    state.getFilteredEvents.mockReturnValue([
      { id: 'e1', ts: Date.now(), summary: 'event-one', kind: 'tool_call' },
    ])
    state.getTraceSummary.mockReturnValue({
      tool_call_count: 1,
      oas_tool_count: 0,
      oas_turn_count: 0,
      oas_context_count: 0,
      broadcast_count: 0,
      task_completed_count: 0,
      task_claimed_count: 0,
      heartbeat_count: 0,
      lifecycle_count: 0,
      thinking_count: 0,
      total_cost_usd: 0,
      oas_input_tokens: 0,
      oas_output_tokens: 0,
      oas_llm_call_count: 0,
      oas_error_count: 0,
      oas_tokens_saved: 0,
    })

    const { SessionTraceView } = await import('./session-trace-view')
    await act(async () => {
      render(h(SessionTraceView, { agentName: 'agent-a', isKeeper: false }), container)
    })
    expect(container.textContent).toContain('event-one')
    expect(container.textContent).toContain('도구 1회')
  })

  it('renders live indicator for recent events', async () => {
    const state = await import('./session-trace-state')
    state.getTraceLoading.mockReturnValue(false)
    state.getFilteredEvents.mockReturnValue([
      { id: 'e1', ts: Date.now() - 1000, summary: 'recent', kind: 'tool_call' },
    ])

    const { SessionTraceView } = await import('./session-trace-view')
    await act(async () => {
      render(h(SessionTraceView, { agentName: 'agent-a', isKeeper: false }), container)
    })
    expect(container.textContent).toContain('작업 중')
  })

  it('calls loadSessionTrace on refresh click', async () => {
    const state = await import('./session-trace-state')
    state.getTraceLoading.mockReturnValue(false)
    state.getFilteredEvents.mockReturnValue([
      { id: 'e1', ts: Date.now(), summary: 'evt', kind: 'tool_call' },
    ])

    const { SessionTraceView } = await import('./session-trace-view')
    await act(async () => {
      render(h(SessionTraceView, { agentName: 'agent-a', isKeeper: false }), container)
    })
    const btn = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('새로고침'))
    expect(btn).toBeTruthy()
    btn!.click()
    expect(state.loadSessionTrace).toHaveBeenCalledTimes(2)
  })
})
