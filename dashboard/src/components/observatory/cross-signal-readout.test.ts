// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { h } from 'preact'
import { render } from 'preact'

import { CrossSignalReadout } from './cross-signal-readout'
import { cursorPosition } from './cursor-store'

describe('CrossSignalReadout', () => {
  let container: HTMLDivElement
  const now = Date.now()

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    cursorPosition.value = null
  })

  afterEach(() => {
    render(null, container)
    container.remove()
    cursorPosition.value = null
  })

  it('renders nothing when cursorPosition is null', () => {
    render(
      h(CrossSignalReadout, { events: [], hourlyTrend: [], eventWindowMs: 10_000 }),
      container,
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders cursor card with time when cursor is active', () => {
    cursorPosition.value = { ts: now, pct: 0.5 }
    render(
      h(CrossSignalReadout, { events: [], hourlyTrend: [], eventWindowMs: 10_000 }),
      container,
    )
    expect(container.textContent).toContain('cursor')
    expect(container.textContent).toContain(new Date(now).toLocaleTimeString())
  })

  it('counts total events near cursor', () => {
    cursorPosition.value = { ts: now, pct: 0.5 }
    const events = [
      { ts: Math.floor(now / 1000) - 1 },
      { ts: Math.floor(now / 1000) + 1 },
      { ts: Math.floor(now / 1000) + 10 },
    ]
    render(
      h(CrossSignalReadout, { events, hourlyTrend: [], eventWindowMs: 10_000 }),
      container,
    )
    expect(container.textContent).toContain('2')
  })

  it('counts tool calls near cursor', () => {
    cursorPosition.value = { ts: now, pct: 0.5 }
    const events = [
      { source: 'tool_call_io', ts: Math.floor(now / 1000) - 1 },
      { source: 'other', ts: Math.floor(now / 1000) + 1 },
      { source: 'tool_usage', ts: Math.floor(now / 1000) + 2 },
    ]
    render(
      h(CrossSignalReadout, { events, hourlyTrend: [], eventWindowMs: 10_000 }),
      container,
    )
    expect(container.textContent).toContain('2')
  })

  it('counts tool failures near cursor', () => {
    cursorPosition.value = { ts: now, pct: 0.5 }
    const events = [
      { source: 'tool_call_io', success: false, ts: Math.floor(now / 1000) - 1 },
      { source: 'tool_call_io', success: true, ts: Math.floor(now / 1000) + 1 },
      { source: 'tool_call_io', error: 'boom', ts: Math.floor(now / 1000) + 2 },
    ]
    render(
      h(CrossSignalReadout, { events, hourlyTrend: [], eventWindowMs: 10_000 }),
      container,
    )
    expect(container.textContent).toContain('3 / 2')
  })

  it('shows success rate tone ok when >= 97', () => {
    cursorPosition.value = { ts: now, pct: 0.5 }
    const hourlyTrend = [{ hour: new Date(now).toISOString(), success_rate: 99, calls: 10 }]
    render(
      h(CrossSignalReadout, { events: [], hourlyTrend, eventWindowMs: 10_000 }),
      container,
    )
    expect(container.textContent).toContain('99.0%')
  })

  it('shows success rate tone bad when < 90', () => {
    cursorPosition.value = { ts: now, pct: 0.5 }
    const hourlyTrend = [{ hour: new Date(now).toISOString(), success_rate: 80, calls: 5 }]
    render(
      h(CrossSignalReadout, { events: [], hourlyTrend, eventWindowMs: 10_000 }),
      container,
    )
    expect(container.textContent).toContain('80.0%')
  })

  it('shows window label in minutes when >= 60s', () => {
    cursorPosition.value = { ts: now, pct: 0.5 }
    render(
      h(CrossSignalReadout, { events: [], hourlyTrend: [], eventWindowMs: 120_000 }),
      container,
    )
    expect(container.textContent).toContain('±1m')
  })

  it('shows window label in seconds when < 60s', () => {
    cursorPosition.value = { ts: now, pct: 0.5 }
    render(
      h(CrossSignalReadout, { events: [], hourlyTrend: [], eventWindowMs: 10_000 }),
      container,
    )
    expect(container.textContent).toContain('±5s')
  })

  it('shows dash when no trend point', () => {
    cursorPosition.value = { ts: now, pct: 0.5 }
    render(
      h(CrossSignalReadout, { events: [], hourlyTrend: [], eventWindowMs: 10_000 }),
      container,
    )
    expect(container.textContent).toContain('-')
  })
})
