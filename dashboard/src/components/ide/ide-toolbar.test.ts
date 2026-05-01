// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { h, render } from 'preact'

const mockController = { id: 'ctrl' }
const mockToggle = vi.fn()
const mockIsActive = vi.fn(() => false)

vi.mock('../../../design-system/headless-core/layered-overlay', () => ({
  createLayeredOverlay: vi.fn(() => mockController),
}))

vi.mock('../../../design-system/headless-preact/use-layered-overlay', () => ({
  useLayeredOverlay: vi.fn(() => ({
    active: new Set(),
    toggle: mockToggle,
    isActive: mockIsActive,
  })),
}))

describe('ide-toolbar', () => {
  let container: HTMLDivElement

  beforeEach(async () => {
    vi.resetModules()
    mockToggle.mockClear()
    mockIsActive.mockReturnValue(false)
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    render(null, container)
    container.remove()
    vi.restoreAllMocks()
  })

  it('renders all view tabs', async () => {
    const { IdeToolbar } = await import('./ide-toolbar')
    render(h(IdeToolbar, { activeView: 'source', onViewChange: vi.fn() }), container)
    expect(container.textContent).toContain('SOURCE')
    expect(container.textContent).toContain('SPLIT DIFF')
    expect(container.textContent).toContain('UNIFIED')
    expect(container.textContent).toContain('BLAME')
  })

  it('renders LAYERS section', async () => {
    const { IdeToolbar } = await import('./ide-toolbar')
    render(h(IdeToolbar, { activeView: 'source', onViewChange: vi.fn() }), container)
    expect(container.textContent).toContain('LAYERS')
  })

  it('renders layer buttons', async () => {
    const { IdeToolbar } = await import('./ide-toolbar')
    render(h(IdeToolbar, { activeView: 'source', onViewChange: vi.fn() }), container)
    expect(container.textContent).toContain('Time')
    expect(container.textContent).toContain('Parallel')
    expect(container.textContent).toContain('Tools')
    expect(container.textContent).toContain('Approve')
    expect(container.textContent).toContain('Notes')
    expect(container.textContent).toContain('EXPLODE')
  })

  it('marks active view tab with aria-selected', async () => {
    const { IdeToolbar } = await import('./ide-toolbar')
    render(h(IdeToolbar, { activeView: 'split-diff', onViewChange: vi.fn() }), container)
    const tabs = container.querySelectorAll('[role="tab"]')
    const activeTab = Array.from(tabs).find(t => t.textContent === 'SPLIT DIFF')
    expect(activeTab?.getAttribute('aria-selected')).toBe('true')
  })

  it('calls onViewChange when tab clicked', async () => {
    const onViewChange = vi.fn()
    const { IdeToolbar } = await import('./ide-toolbar')
    render(h(IdeToolbar, { activeView: 'source', onViewChange }), container)
    const tabs = container.querySelectorAll('[role="tab"]')
    const blameTab = Array.from(tabs).find(t => t.textContent === 'BLAME')
    blameTab?.click()
    expect(onViewChange).toHaveBeenCalledWith('blame')
  })

  it('calls toggle when layer button clicked', async () => {
    const { IdeToolbar } = await import('./ide-toolbar')
    render(h(IdeToolbar, { activeView: 'source', onViewChange: vi.fn() }), container)
    const layerBtns = container.querySelectorAll('button[title]')
    expect(layerBtns.length).toBeGreaterThan(0)
    layerBtns[0].click()
    expect(mockToggle).toHaveBeenCalled()
  })

  it('shows active layer count when layers active', async () => {
    vi.mocked((await import('../../../design-system/headless-preact/use-layered-overlay')).useLayeredOverlay)
      ?.mockReturnValue?.({
        active: new Set(['time', 'tools']),
        toggle: mockToggle,
        isActive: (k) => ['time', 'tools'].includes(k),
      })
    // Re-import to pick up new mock
    vi.resetModules()
    const { IdeToolbar } = await import('./ide-toolbar')
    render(h(IdeToolbar, { activeView: 'source', onViewChange: vi.fn() }), container)
    expect(container.textContent).toContain('2 active')
  })
})
