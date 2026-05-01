// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { h, render } from 'preact'

vi.mock('./cursor-line', () => ({
  CursorLine: () => null,
}))

vi.mock('./cursor-store', () => ({
  setCursorFromEvent: vi.fn(),
  clearCursor: vi.fn(),
}))

vi.mock('./observatory-utils', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    hourToMs: vi.fn((hour: number) => hour * 3600000),
  }
})

vi.mock('./anomaly-utils', () => ({
  detectAnomalies: vi.fn((windowed: any[]) => windowed.map((w: any, i: number) => ({
    ...w,
    zScore: i === 1 ? -2.5 : 0,
    isAnomaly: i === 1,
  }))),
}))

describe('metric-track', () => {
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
    const { MetricTrack } = await import('./metric-track')
    const points = [{ hour: 1, success_rate: 95, calls: 10 }]
    render(
      h(MetricTrack, { points, windowStart: 100, windowEnd: 100 }),
      container,
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders empty state when no points in window', async () => {
    const { MetricTrack } = await import('./metric-track')
    const points = [{ hour: 100, success_rate: 95, calls: 10 }]
    render(
      h(MetricTrack, { points, windowStart: 0, windowEnd: 10 }),
      container,
    )
    expect(container.textContent).toContain('hourly_trend')
  })

  it('renders last rate and percentage label', async () => {
    const { MetricTrack } = await import('./metric-track')
    const points = [
      { hour: 1, success_rate: 95.5, calls: 10 },
      { hour: 2, success_rate: 97.2, calls: 12 },
    ]
    render(
      h(MetricTrack, { points, windowStart: 0, windowEnd: 3600000 * 3 }),
      container,
    )
    expect(container.textContent).toContain('도구 성공률')
    expect(container.textContent).toContain('97.2%')
  })

  it('renders SVG with polyline when points exist', async () => {
    const { MetricTrack } = await import('./metric-track')
    const points = [
      { hour: 1, success_rate: 95, calls: 10 },
      { hour: 2, success_rate: 97, calls: 12 },
    ]
    render(
      h(MetricTrack, { points, windowStart: 0, windowEnd: 3600000 * 3 }),
      container,
    )
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
    const polyline = container.querySelector('polyline')
    expect(polyline).toBeTruthy()
  })

  it('renders anomaly count when anomalies detected', async () => {
    const { MetricTrack } = await import('./metric-track')
    const points = [
      { hour: 1, success_rate: 95, calls: 10 },
      { hour: 2, success_rate: 50, calls: 2 },
      { hour: 3, success_rate: 96, calls: 10 },
    ]
    render(
      h(MetricTrack, { points, windowStart: 0, windowEnd: 3600000 * 4 }),
      container,
    )
    const text = container.textContent
    expect(text).toContain('anomaly')
  })

  it('sets cursor on mousemove', async () => {
    const cursorStore = await import('./cursor-store')
    const { MetricTrack } = await import('./metric-track')
    const points = [{ hour: 1, success_rate: 95, calls: 10 }]
    render(
      h(MetricTrack, { points, windowStart: 0, windowEnd: 3600000 * 2 }),
      container,
    )
    const track = container.querySelector('[role="group"]') as HTMLElement
    expect(track).toBeTruthy()
    track.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 50, bubbles: true }),
    )
    expect(cursorStore.setCursorFromEvent).toHaveBeenCalled()
  })

  it('clears cursor on mouseleave', async () => {
    const cursorStore = await import('./cursor-store')
    const { MetricTrack } = await import('./metric-track')
    const points = [{ hour: 1, success_rate: 95, calls: 10 }]
    render(
      h(MetricTrack, { points, windowStart: 0, windowEnd: 3600000 * 2 }),
      container,
    )
    const track = container.querySelector('[role="group"]') as HTMLElement
    expect(track).toBeTruthy()
    track.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    expect(cursorStore.clearCursor).toHaveBeenCalled()
  })
})
