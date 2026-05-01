// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { h, render } from 'preact'

vi.mock('./observatory-utils', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useTrackBucketCount: vi.fn(() => 10),
  }
})

vi.mock('./cursor-line', () => ({
  CursorLine: () => null,
}))

vi.mock('../ui/overlay', () => ({
  Overlay: () => null,
}))

vi.mock('../ui/card', () => ({
  Card: ({ children }: any) => h('div', { className: 'card' }, children),
}))

vi.mock('./detail-selection-store', async () => {
  const { signal } = await import('@preact/signals')
  return {
    detailSelection: signal(null),
    selectEntity: vi.fn(),
    clearSelection: vi.fn(),
  }
})

describe('tool-call-track', () => {
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

  it('returns null when span <= 0', async () => {
    const { ToolCallTrack } = await import('./tool-call-track')
    const events = [{ source: 'tool_call_io', tool_name: 'search', timestamp: 1 }]
    render(
      h(ToolCallTrack, { events, windowStart: 100, windowEnd: 100 }),
      container,
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders tool call markers', async () => {
    const { ToolCallTrack } = await import('./tool-call-track')
    const events = [
      { source: 'tool_call_io', tool_name: 'search', timestamp: 5, success: true },
      { source: 'tool_usage', tool_name: 'fetch', timestamp: 7, success: false },
    ]
    render(
      h(ToolCallTrack, { events, windowStart: 0, windowEnd: 10 }),
      container,
    )
    const markers = container.querySelectorAll('span.absolute')
    expect(markers.length).toBeGreaterThan(0)
  })

  it('renders tool name labels', async () => {
    const { ToolCallTrack } = await import('./tool-call-track')
    const events = [
      { source: 'tool_call_io', tool_name: 'search', timestamp: 5, success: true },
    ]
    render(
      h(ToolCallTrack, { events, windowStart: 0, windowEnd: 10 }),
      container,
    )
    expect(container.textContent).toContain('도구 호출')
  })

  it('calls selectEntity on click', async () => {
    const detailStore = await import('./detail-selection-store')
    const { ToolCallTrack } = await import('./tool-call-track')
    const events = [
      { source: 'tool_call_io', tool_name: 'search', timestamp: 5, success: true },
    ]
    render(
      h(ToolCallTrack, { events, windowStart: 0, windowEnd: 10 }),
      container,
    )
    const marker = container.querySelector('span.absolute') as HTMLElement
    expect(marker).toBeTruthy()
    marker.click()
    await Promise.resolve()
    expect(detailStore.selectEntity).toHaveBeenCalled()
  })

  it('sets cursor on mousemove', async () => {
    const { ToolCallTrack } = await import('./tool-call-track')
    const events = [
      { source: 'tool_call_io', tool_name: 'search', timestamp: 5, success: true },
    ]
    render(
      h(ToolCallTrack, { events, windowStart: 0, windowEnd: 10 }),
      container,
    )
    const track = container.querySelector('[role="group"]') as HTMLElement
    expect(track).toBeTruthy()
    track.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 50, bubbles: true }),
    )
    await Promise.resolve()
  })

  it('clears cursor on mouseleave', async () => {
    const { ToolCallTrack } = await import('./tool-call-track')
    const events = [
      { source: 'tool_call_io', tool_name: 'search', timestamp: 5, success: true },
    ]
    render(
      h(ToolCallTrack, { events, windowStart: 0, windowEnd: 10 }),
      container,
    )
    const track = container.querySelector('[role="group"]') as HTMLElement
    expect(track).toBeTruthy()
    track.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    await Promise.resolve()
  })
})
