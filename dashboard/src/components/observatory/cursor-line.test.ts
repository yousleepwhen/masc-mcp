// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { h } from 'preact'
import { render } from 'preact'

import { CursorLine } from './cursor-line'
import { cursorPosition } from './cursor-store'

describe('CursorLine', () => {
  let container: HTMLDivElement

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
    render(h(CursorLine, null), container)
    expect(container.innerHTML).toBe('')
  })

  it('renders vertical line when cursorPosition is set', () => {
    cursorPosition.value = { ts: Date.now(), pct: 0.5 }
    render(h(CursorLine, null), container)
    const span = container.querySelector('span')
    expect(span).not.toBeNull()
    expect(span!.getAttribute('aria-hidden')).toBe('true')
    expect(span!.className).toContain('pointer-events-none')
  })

  it('sets left style based on pct', () => {
    cursorPosition.value = { ts: Date.now(), pct: 0.333 }
    render(h(CursorLine, null), container)
    const span = container.querySelector('span')
    expect(span!.style.left).toBe('33.300%')
  })

  it('updates when cursorPosition changes', () => {
    cursorPosition.value = { ts: Date.now(), pct: 0.1 }
    render(h(CursorLine, null), container)
    let span = container.querySelector('span')
    expect(span!.style.left).toBe('10.000%')

    cursorPosition.value = { ts: Date.now(), pct: 0.9 }
    render(h(CursorLine, null), container)
    span = container.querySelector('span')
    expect(span!.style.left).toBe('90.000%')
  })

  it('hides when cursorPosition is cleared', () => {
    cursorPosition.value = { ts: Date.now(), pct: 0.5 }
    render(h(CursorLine, null), container)
    expect(container.querySelector('span')).not.toBeNull()

    cursorPosition.value = null
    render(h(CursorLine, null), container)
    expect(container.querySelector('span')).toBeNull()
  })
})
