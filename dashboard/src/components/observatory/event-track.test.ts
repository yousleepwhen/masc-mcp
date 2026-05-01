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

describe('event-track', () => {
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
    const { EventTrack } = await import('./event-track')
    const events = [{ source: 'agent_event', timestamp: 1 }]
    render(
      h(EventTrack, { events, windowStart: 100, windowEnd: 100 }),
      container,
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders event markers for given events', async () => {
    const { EventTrack } = await import('./event-track')
    const events = [
      { source: 'agent_event', event_type: 'start', timestamp: 5 },
      { source: 'tool_call_io', tool_name: 'search', timestamp: 7 },
    ]
    render(
      h(EventTrack, { events, windowStart: 0, windowEnd: 10 }),
      container,
    )
    const markers = container.querySelectorAll('span.absolute')
    expect(markers.length).toBeGreaterThan(0)
  })

  it('renders labels for events', async () => {
    const { EventTrack } = await import('./event-track')
    const events = [{ source: 'agent_event', event_type: 'start', timestamp: 5 }]
    render(
      h(EventTrack, { events, windowStart: 0, windowEnd: 10 }),
      container,
    )
    expect(container.textContent).toContain('이벤트 (1)')
  })

  it('calls selectEntity on click', async () => {
    const detailStore = await import('./detail-selection-store')
    const { EventTrack } = await import('./event-track')
    const events = [{ source: 'agent_event', event_type: 'start', timestamp: 5 }]
    render(
      h(EventTrack, { events, windowStart: 0, windowEnd: 10 }),
      container,
    )
    const marker = container.querySelector('span.absolute') as HTMLElement
    expect(marker).toBeTruthy()
    marker.click()
    await Promise.resolve()
    expect(detailStore.selectEntity).toHaveBeenCalled()
  })

  it('sets cursor on mousemove', async () => {
    const { EventTrack } = await import('./event-track')
    const events = [{ source: 'agent_event', event_type: 'start', timestamp: 5 }]
    render(
      h(EventTrack, { events, windowStart: 0, windowEnd: 10 }),
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
    const { EventTrack } = await import('./event-track')
    const events = [{ source: 'agent_event', event_type: 'start', timestamp: 5 }]
    render(
      h(EventTrack, { events, windowStart: 0, windowEnd: 10 }),
      container,
    )
    const track = container.querySelector('[role="group"]') as HTMLElement
    expect(track).toBeTruthy()
    track.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    await Promise.resolve()
  })
})
