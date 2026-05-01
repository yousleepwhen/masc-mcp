// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { h, render } from 'preact'
import { act } from 'preact/test-utils'

const mockStore = {
  seed: vi.fn(),
  subscribe: vi.fn(() => vi.fn()),
  visibleNodes: vi.fn(() => []),
  isExpanded: vi.fn(() => false),
  toggle: vi.fn(),
}

vi.mock('./file-tree-store', () => ({
  createFileTreeStore: vi.fn(() => mockStore),
}))

describe('ide-explorer', () => {
  let container: HTMLDivElement

  beforeEach(async () => {
    vi.resetModules()
    mockStore.seed.mockClear()
    mockStore.subscribe.mockClear()
    mockStore.visibleNodes.mockClear()
    mockStore.isExpanded.mockClear()
    mockStore.toggle.mockClear()
    mockStore.visibleNodes.mockReturnValue([])
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    render(null, container)
    container.remove()
    vi.restoreAllMocks()
  })

  const makeNodes = () => [
    { path: 'a.ts', label: 'a.ts', depth: 0, parent: null, hasChildren: false, diff: '+1', keeperId: 'k1', hueIndex: 1 },
    { path: 'b', label: 'b', depth: 0, parent: null, hasChildren: true, diff: null, keeperId: null, hueIndex: null },
    { path: 'b/c.ts', label: 'c.ts', depth: 1, parent: 'b', hasChildren: false, diff: null, keeperId: null, hueIndex: null },
  ]

  it('renders EXPLORER header', async () => {
    const { IdeExplorer } = await import('./ide-explorer')
    render(h(IdeExplorer), container)
    expect(container.textContent).toContain('EXPLORER')
  })

  it('seeds store on mount', async () => {
    const store = await import('./file-tree-store')
    const { IdeExplorer } = await import('./ide-explorer')
    render(h(IdeExplorer), container)
    expect(store.createFileTreeStore).toHaveBeenCalled()
    expect(mockStore.seed).toHaveBeenCalled()
  })

  it('subscribes to store', async () => {
    const { IdeExplorer } = await import('./ide-explorer')
    await act(async () => {
      render(h(IdeExplorer), container)
    })
    expect(mockStore.subscribe).toHaveBeenCalled()
  })

  it('renders visible nodes', async () => {
    mockStore.visibleNodes.mockReturnValue(makeNodes())
    const { IdeExplorer } = await import('./ide-explorer')
    render(h(IdeExplorer), container)
    expect(container.textContent).toContain('a.ts')
    expect(container.textContent).toContain('b')
    expect(container.textContent).toContain('c.ts')
  })

  it('shows file count in header', async () => {
    mockStore.visibleNodes.mockReturnValue(makeNodes())
    const { IdeExplorer } = await import('./ide-explorer')
    render(h(IdeExplorer), container)
    expect(container.textContent).toContain('1 FILES')
  })

  it('shows diff indicator for changed files', async () => {
    mockStore.visibleNodes.mockReturnValue(makeNodes())
    const { IdeExplorer } = await import('./ide-explorer')
    render(h(IdeExplorer), container)
    expect(container.textContent).toContain('+1')
  })

  it('shows chevron for expandable nodes', async () => {
    mockStore.visibleNodes.mockReturnValue(makeNodes())
    mockStore.isExpanded.mockReturnValue(false)
    const { IdeExplorer } = await import('./ide-explorer')
    render(h(IdeExplorer), container)
    expect(container.textContent).toContain('▸')
  })

  it('shows expanded chevron when expanded', async () => {
    mockStore.visibleNodes.mockReturnValue(makeNodes())
    mockStore.isExpanded.mockReturnValue(true)
    const { IdeExplorer } = await import('./ide-explorer')
    render(h(IdeExplorer), container)
    expect(container.textContent).toContain('▾')
  })

  it('toggles node on click', async () => {
    mockStore.visibleNodes.mockReturnValue(makeNodes())
    const { IdeExplorer } = await import('./ide-explorer')
    render(h(IdeExplorer), container)
    const items = container.querySelectorAll('li[role="treeitem"]')
    expect(items.length).toBeGreaterThan(0)
    // Click the expandable node (b, hasChildren: true)
    const expandable = Array.from(items).find(li => li.textContent?.includes('b') && !li.textContent?.includes('.ts'))
    expect(expandable).toBeTruthy()
    expandable!.click()
    expect(mockStore.toggle).toHaveBeenCalledWith('b')
  })
})
