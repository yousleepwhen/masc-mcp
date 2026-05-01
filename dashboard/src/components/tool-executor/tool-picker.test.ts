// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { h, render } from 'preact'
import { signal } from '@preact/signals'

const mockSearchQuery = signal('')
const mockTierFilter = signal('all')
const mockFilteredTools = signal<any[]>([])
const mockSelectedTool = signal<any>(null)

vi.mock('./tool-executor-state', () => ({
  searchQuery: mockSearchQuery,
  tierFilter: mockTierFilter,
  filteredTools: mockFilteredTools,
  selectedTool: mockSelectedTool,
  selectTool: (tool: any) => { mockSelectedTool.value = tool },
}))

vi.mock('../common/input', () => ({
  TextInput: ({ value, placeholder, onInput }: any) =>
    h('input', { type: 'text', value, placeholder, onInput }),
}))

vi.mock('../common/badge', () => ({
  CountBadge: ({ children }: any) => h('span', { className: 'badge' }, children),
}))

vi.mock('../common/button', () => ({
  ActionButton: ({ children, onClick, pressed }: any) =>
    h('button', { onClick, 'aria-pressed': pressed }, children),
}))

describe('tool-picker', () => {
  let container: HTMLDivElement

  beforeEach(async () => {
    vi.resetModules()
    mockSearchQuery.value = ''
    mockTierFilter.value = 'all'
    mockFilteredTools.value = []
    mockSelectedTool.value = null
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    render(null, container)
    container.remove()
    vi.restoreAllMocks()
  })

  it('renders search input and tier filters', async () => {
    const { ToolPicker } = await import('./tool-picker')
    render(h(ToolPicker), container)
    expect(container.querySelector('input')).toBeTruthy()
    expect(container.textContent).toContain('전체')
  })

  it('renders tool rows when tools exist', async () => {
    mockFilteredTools.value = [
      { name: 'search', description: 'Search tool', inputSchema: {} },
      { name: 'fetch', description: 'Fetch tool', inputSchema: {} },
    ]

    const { ToolPicker } = await import('./tool-picker')
    render(h(ToolPicker), container)
    expect(container.textContent).toContain('search')
    expect(container.textContent).toContain('fetch')
    expect(container.textContent).toContain('2개')
  })

  it('shows empty state when no tools match', async () => {
    mockSearchQuery.value = 'nomatch'
    mockFilteredTools.value = []

    const { ToolPicker } = await import('./tool-picker')
    render(h(ToolPicker), container)
    expect(container.textContent).toContain('결과 없음')
  })

  it('calls selectTool on tool row click', async () => {
    mockFilteredTools.value = [
      { name: 'search', description: 'Search tool', inputSchema: {} },
    ]

    const { ToolPicker } = await import('./tool-picker')
    render(h(ToolPicker), container)
    const buttons = container.querySelectorAll('button')
    const toolButton = Array.from(buttons).find(b => b.textContent?.includes('search'))
    expect(toolButton).toBeTruthy()
    toolButton!.click()
    expect(mockSelectedTool.value).toEqual(mockFilteredTools.value[0])
  })

  it('updates tier filter on tier button click', async () => {
    mockFilteredTools.value = []

    const { ToolPicker } = await import('./tool-picker')
    render(h(ToolPicker), container)
    const buttons = container.querySelectorAll('button')
    const essentialBtn = Array.from(buttons).find(b => b.textContent === 'Essential')
    expect(essentialBtn).toBeTruthy()
    essentialBtn!.click()
    expect(mockTierFilter.value).toBe('essential')
  })
})
