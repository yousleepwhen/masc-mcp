// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'

describe('cursor-store', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('cursorPosition starts as null', async () => {
    const { cursorPosition } = await import('./cursor-store')
    expect(cursorPosition.value).toBeNull()
  })

  it('setCursorFromEvent computes ts and pct from mouse position', async () => {
    const { cursorPosition, setCursorFromEvent } = await import('./cursor-store')
    const trackEl = document.createElement('div')
    Object.defineProperty(trackEl, 'getBoundingClientRect', {
      value: () => ({ left: 100, width: 200 }),
    })
    const event = new MouseEvent('mousemove', { clientX: 150 })
    setCursorFromEvent(event, trackEl, 1000, 3000)
    expect(cursorPosition.value).not.toBeNull()
    expect(cursorPosition.value.pct).toBe(0.25)
    expect(cursorPosition.value.ts).toBe(1500)
  })

  it('setCursorFromEvent clamps pct to [0,1]', async () => {
    const { cursorPosition, setCursorFromEvent } = await import('./cursor-store')
    const trackEl = document.createElement('div')
    Object.defineProperty(trackEl, 'getBoundingClientRect', {
      value: () => ({ left: 100, width: 200 }),
    })
    setCursorFromEvent(
      new MouseEvent('mousemove', { clientX: 50 }),
      trackEl,
      0,
      100,
    )
    expect(cursorPosition.value!.pct).toBe(0)
    setCursorFromEvent(
      new MouseEvent('mousemove', { clientX: 350 }),
      trackEl,
      0,
      100,
    )
    expect(cursorPosition.value!.pct).toBe(1)
  })

  it('clearCursor resets cursorPosition to null', async () => {
    const { cursorPosition, setCursorFromEvent, clearCursor } = await import(
      './cursor-store'
    )
    const trackEl = document.createElement('div')
    Object.defineProperty(trackEl, 'getBoundingClientRect', {
      value: () => ({ left: 0, width: 100 }),
    })
    setCursorFromEvent(
      new MouseEvent('mousemove', { clientX: 50 }),
      trackEl,
      0,
      100,
    )
    expect(cursorPosition.value).not.toBeNull()
    clearCursor()
    expect(cursorPosition.value).toBeNull()
  })
})
