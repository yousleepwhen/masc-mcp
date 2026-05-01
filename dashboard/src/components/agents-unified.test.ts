// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { h } from 'preact'
import { render } from 'preact'
vi.mock('./keeper-detail', () => ({
  KeeperDetailPage: () => h('div', { 'data-testid': 'keeper-detail-page' }, 'KeeperDetailPage'),
}))
vi.mock('./agent-profile', () => ({
  AgentProfile: ({ name }) => h('div', { 'data-testid': 'agent-profile', 'data-name': name }, 'AgentProfile'),
}))
vi.mock('./keeper-spawn/keeper-spawn-panel', () => ({
  KeeperSpawnPanel: () => h('div', { 'data-testid': 'keeper-spawn-panel' }, 'KeeperSpawnPanel'),
}))
vi.mock('./keeper-token-stats', () => ({
  KeeperTokenStats: () => h('div', { 'data-testid': 'keeper-token-stats' }, 'KeeperTokenStats'),
}))
vi.mock('./keeper-multi-select', () => ({
  KeeperMultiSelect: ({ hint }) => h('div', { 'data-testid': 'keeper-multi-select', 'data-hint': hint }, 'KeeperMultiSelect'),
}))
vi.mock('./fsm-hub', () => ({
  FsmHub: ({ selectedName }) => h('div', { 'data-testid': 'fsm-hub', 'data-selected': selectedName }, 'FsmHub'),
}))
vi.mock('./fleet-fsm-matrix', () => ({
  FleetFsmMatrix: ({ onSelectKeeper }) => h('div', { 'data-testid': 'fleet-fsm-matrix' }, 'FleetFsmMatrix'),
}))
vi.mock('./handoff-timeline', () => ({
  HandoffTimeline: ({ selectedKeeper }) => h('div', { 'data-testid': 'handoff-timeline', 'data-selected': selectedKeeper }, 'HandoffTimeline'),
}))
vi.mock('./composite-fsm-flowchart', () => ({
  CompositeFsmFlowchart: () => h('div', { 'data-testid': 'composite-fsm-flowchart' }, 'CompositeFsmFlowchart'),
}))
vi.mock('./common/filter-chips', () => ({
  FilterChips: ({ chips, value, onChange }) =>
    h('div', { 'data-testid': 'filter-chips', 'data-value': value },
      chips.map((chip) => h('button', { key: chip.key, onClick: () => onChange(chip.key) }, chip.label))
    ),
}))
vi.mock('./common/route-link', () => ({
  RouteLink: ({ children }) => h('a', null, children),
}))
vi.mock('./agent-roster', () => ({
  AgentRoster: ({ keeperFilter }) => h('div', { 'data-testid': 'agent-roster', 'data-filter': keeperFilter }, 'AgentRoster'),
  countRuntimeKinds: vi.fn(() => ({ agents: 0, keepers: 0 })),
}))

vi.mock('../store', () => ({
  agents: { value: [] },
  keepers: { value: [] },
  executionLoaded: { value: false },
  shellCounts: { value: null },
}))
vi.mock('../namespace-truth-store', () => ({
  namespaceTruth: { value: null },
}))
vi.mock('../runtime-counts', () => ({
  resolveRuntimeCounts: vi.fn(() => ({
    totalRuntimes: 0,
    keepers: 0,
    agents: 0,
    configuredKeepers: 0,
  })),
}))

import { AgentsUnified } from './agents-unified'
import { route } from '../router'
import { resolveRuntimeCounts } from '../runtime-counts'

describe('AgentsUnified', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    window.location.hash = ''
    route.value = { tab: 'monitoring', params: {} }
    vi.clearAllMocks()
  })

  afterEach(() => {
    render(null, container)
    container.remove()
    window.location.hash = ''
  })

  it('renders keeper detail page when keeper param is present', () => {
    route.value = { tab: 'monitoring', params: { keeper: 'alpha' } }
    render(h(AgentsUnified, null), container)
    expect(container.querySelector('[data-testid="keeper-detail-page"]')).not.toBeNull()
  })

  it('renders agent profile when agent param is present', () => {
    route.value = { tab: 'monitoring', params: { agent: 'beta' } }
    render(h(AgentsUnified, null), container)
    const el = container.querySelector('[data-testid="agent-profile"]')
    expect(el).not.toBeNull()
    expect(el!.getAttribute('data-name')).toBe('beta')
  })

  it('defaults to all view and shows roster', () => {
    render(h(AgentsUnified, null), container)
    const roster = container.querySelector('[data-testid="agent-roster"]')
    expect(roster).not.toBeNull()
    expect(roster!.getAttribute('data-filter')).toBe('all')
    expect(container.querySelector('[data-testid="keeper-spawn-panel"]')).not.toBeNull()
  })

  it('switches to agents view via filter chips', () => {
    render(h(AgentsUnified, null), container)
    const btn = Array.from(container.querySelectorAll('button')).find(
      b => b.textContent?.includes('에이전트'),
    )
    expect(btn).not.toBeUndefined()
    btn!.click()
    render(h(AgentsUnified, null), container)
    const roster = container.querySelector('[data-testid="agent-roster"]')
    expect(roster!.getAttribute('data-filter')).toBe('agent-only')
  })

  it('renders keepers view with multi-select and token stats', () => {
    route.value = { tab: 'monitoring', params: { view: 'keepers' } }
    render(h(AgentsUnified, null), container)
    expect(container.querySelector('[data-testid="keeper-spawn-panel"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="keeper-multi-select"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="keeper-token-stats"]')).not.toBeNull()
    const roster = container.querySelector('[data-testid="agent-roster"]')
    expect(roster!.getAttribute('data-filter')).toBe('keeper-only')
  })

  it('renders FSM hub panel when view is fsm', () => {
    route.value = { tab: 'monitoring', params: { view: 'fsm' } }
    render(h(AgentsUnified, null), container)
    expect(container.querySelector('[data-testid="fleet-fsm-matrix"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="handoff-timeline"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="composite-fsm-flowchart"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="fsm-hub"]')).not.toBeNull()
  })

  it('shows runtime truth banner when configuredKeeperDelta > 0', () => {
    resolveRuntimeCounts.mockReturnValue({
      totalRuntimes: 5,
      keepers: 2,
      agents: 3,
      configuredKeepers: 4,
    })
    render(h(AgentsUnified, null), container)
    expect(container.textContent).toContain('runtime truth')
  })

  it('does not show runtime truth banner when configuredKeeperDelta is 0', () => {
    resolveRuntimeCounts.mockReturnValue({
      totalRuntimes: 5,
      keepers: 2,
      agents: 3,
      configuredKeepers: 2,
    })
    render(h(AgentsUnified, null), container)
    expect(container.textContent).not.toContain('runtime truth')
  })
})
