// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { h, render } from 'preact'

const mockSetState = vi.fn()
const mockDispose = vi.fn()

vi.mock('solid-js/web', () => ({
  render: vi.fn(() => mockDispose),
}))

vi.mock('./kpi-strip-island-solid.solid', () => ({
  createKpiStripIsland: vi.fn((props) => ({
    jsx: () => null,
    setState: mockSetState,
  })),
}))

describe('kpi-strip-island-sync', () => {
  let container: HTMLDivElement

  beforeEach(async () => {
    vi.resetModules()
    mockSetState.mockClear()
    mockDispose.mockClear()
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    render(null, container)
    container.remove()
    vi.restoreAllMocks()
  })

  it('renders container div', async () => {
    const { KpiStripIslandSync } = await import('./kpi-strip-island-sync')
    render(h(KpiStripIslandSync, { ariaLabel: 'test', variant: 'standard', cells: [] }), container)
    expect(container.querySelector('div')).toBeTruthy()
  })

  it('calls createKpiStripIsland on mount', async () => {
    const solid = await import('./kpi-strip-island-solid.solid')
    const { KpiStripIslandSync } = await import('./kpi-strip-island-sync')
    render(h(KpiStripIslandSync, { ariaLabel: 'test', variant: 'standard', cells: [] }), container)
    expect(solid.createKpiStripIsland).toHaveBeenCalled()
  })

  it('calls solid render on mount', async () => {
    const solidWeb = await import('solid-js/web')
    const { KpiStripIslandSync } = await import('./kpi-strip-island-sync')
    render(h(KpiStripIslandSync, { ariaLabel: 'test', variant: 'standard', cells: [] }), container)
    expect(solidWeb.render).toHaveBeenCalled()
  })

  it('calls setState on prop update', async () => {
    const { KpiStripIslandSync } = await import('./kpi-strip-island-sync')
    render(h(KpiStripIslandSync, { ariaLabel: 'test', variant: 'standard', cells: [{ variant: 'stacked', label: 'A', value: 1 }] }), container)
    mockSetState.mockClear()
    render(h(KpiStripIslandSync, { ariaLabel: 'test', variant: 'standard', cells: [{ variant: 'stacked', label: 'B', value: 2 }] }), container)
    expect(mockSetState).toHaveBeenCalled()
  })

  it('passes props to createKpiStripIsland', async () => {
    const solid = await import('./kpi-strip-island-solid.solid')
    const props = { ariaLabel: 'summary', variant: 'standard', cells: [{ variant: 'stacked', label: 'X', value: 5 }] }
    const { KpiStripIslandSync } = await import('./kpi-strip-island-sync')
    render(h(KpiStripIslandSync, props), container)
    expect(solid.createKpiStripIsland).toHaveBeenCalledWith(expect.objectContaining(props))
  })

  it('disposes solid root on unmount', async () => {
    const { KpiStripIslandSync } = await import('./kpi-strip-island-sync')
    render(h(KpiStripIslandSync, { ariaLabel: 'test', variant: 'standard', cells: [] }), container)
    render(null, container)
    expect(mockDispose).toHaveBeenCalled()
  })
})
