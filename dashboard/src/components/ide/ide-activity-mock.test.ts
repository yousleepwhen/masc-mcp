// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { h, render } from 'preact'

describe('ide-activity-mock', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    render(null, container)
    container.remove()
  })

  it('renders ACTIVITY header', async () => {
    const { IdeActivityMock } = await import('./ide-activity-mock')
    render(h(IdeActivityMock), container)
    expect(container.textContent).toContain('ACTIVITY')
    expect(container.textContent).toContain('THIS RUN')
  })

  it('renders mock activity rows', async () => {
    const { IdeActivityMock } = await import('./ide-activity-mock')
    render(h(IdeActivityMock), container)
    const items = container.querySelectorAll('li')
    expect(items.length).toBeGreaterThan(0)
  })

  it('has region role and aria-label', async () => {
    const { IdeActivityMock } = await import('./ide-activity-mock')
    render(h(IdeActivityMock), container)
    const region = container.querySelector('[role="region"]')
    expect(region).toBeTruthy()
    expect(region?.getAttribute('aria-label')).toContain('ACTIVITY')
  })
})
