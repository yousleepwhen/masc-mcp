// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { h, render } from 'preact'

describe('ide-interject-mock', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    render(null, container)
    container.remove()
  })

  it('renders INTERJECT label', async () => {
    const { IdeInterjectMock } = await import('./ide-interject-mock')
    render(h(IdeInterjectMock), container)
    expect(container.textContent).toContain('INTERJECT')
  })

  it('renders action buttons', async () => {
    const { IdeInterjectMock } = await import('./ide-interject-mock')
    render(h(IdeInterjectMock), container)
    expect(container.textContent).toContain('Send')
    expect(container.textContent).toContain('Approve')
    expect(container.textContent).toContain('Pause')
    expect(container.textContent).toContain('Drain')
  })

  it('renders read-only input', async () => {
    const { IdeInterjectMock } = await import('./ide-interject-mock')
    render(h(IdeInterjectMock), container)
    const input = container.querySelector('input')
    expect(input).toBeTruthy()
    expect(input?.getAttribute('readOnly')).not.toBeNull()
  })

  it('has region role and aria-label', async () => {
    const { IdeInterjectMock } = await import('./ide-interject-mock')
    render(h(IdeInterjectMock), container)
    const region = container.querySelector('[role="region"]')
    expect(region).toBeTruthy()
    expect(region?.getAttribute('aria-label')).toContain('INTERJECT')
  })
})
