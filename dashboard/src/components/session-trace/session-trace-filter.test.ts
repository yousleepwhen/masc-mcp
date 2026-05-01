// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { h, render } from 'preact'

vi.mock('../common/filter-chips', () => ({
  FilterChips: ({ chips, value, onChange }: any) =>
    h('div', { className: 'filter-chips', 'data-value': value },
      chips.map((c: any) => h('button', { key: c.key, onClick: () => onChange?.(c.key) }, c.label)),
    ),
}))

vi.mock('../common/input', () => ({
  TextInput: ({ value, placeholder, onInput, ariaLabel, class: cx }: any) =>
    h('input', {
      type: 'text',
      value,
      placeholder,
      'aria-label': ariaLabel,
      class: cx,
      onInput,
    }),
}))

vi.mock('./session-trace-state', () => ({
  getKindCounts: vi.fn(() => ({ all: 3, tool_call: 1, oas_tool: 0, oas_turn: 0, oas_context: 0, thinking: 0, broadcast: 1, task: 1, heartbeat: 0, lifecycle: 0 })),
  getTraceFilter: vi.fn(() => 'all'),
  setTraceFilter: vi.fn(),
  getStatusCounts: vi.fn(() => ({ all: 2, success: 1, failure: 1, gate_rejected: 0 })),
  getTraceStatusFilter: vi.fn(() => 'all'),
  setTraceStatusFilter: vi.fn(),
  getTraceSearchQuery: vi.fn(() => ''),
  setTraceSearchQuery: vi.fn(),
  _traceSlots: { value: {} },
}))

describe('session-trace-filter', () => {
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

  it('renders search input', async () => {
    const { SessionTraceFilter } = await import('./session-trace-filter')
    render(h(SessionTraceFilter, { agentName: 'agent-a' }), container)
    const input = container.querySelector('input[aria-label="세션 이벤트 검색"]')
    expect(input).toBeTruthy()
  })

  it('renders category chips', async () => {
    const { SessionTraceFilter } = await import('./session-trace-filter')
    render(h(SessionTraceFilter, { agentName: 'agent-a' }), container)
    const chips = container.querySelector('.filter-chips')
    expect(chips).toBeTruthy()
    expect(container.textContent).toContain('도구 호출')
  })

  it('calls setTraceSearchQuery on input', async () => {
    const state = await import('./session-trace-state')
    const { SessionTraceFilter } = await import('./session-trace-filter')
    render(h(SessionTraceFilter, { agentName: 'agent-a' }), container)
    const input = container.querySelector('input') as HTMLInputElement
    input.value = 'search-term'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(state.setTraceSearchQuery).toHaveBeenCalledWith('agent-a', 'search-term')
  })

  it('calls setTraceFilter on chip click', async () => {
    const state = await import('./session-trace-state')
    const { SessionTraceFilter } = await import('./session-trace-filter')
    render(h(SessionTraceFilter, { agentName: 'agent-a' }), container)
    const buttons = container.querySelectorAll('button')
    expect(buttons.length).toBeGreaterThan(0)
    buttons[0].click()
    expect(state.setTraceFilter).toHaveBeenCalled()
  })

  it('renders status section when status counts exist', async () => {
    const state = await import('./session-trace-state')
    state.getStatusCounts.mockReturnValue({ all: 2, success: 1, failure: 1, gate_rejected: 0 })
    const { SessionTraceFilter } = await import('./session-trace-filter')
    render(h(SessionTraceFilter, { agentName: 'agent-a' }), container)
    expect(container.textContent).toContain('상태')
  })
})
