// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { h, render } from 'preact'

describe('ide-editor-mock', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    render(null, container)
    container.remove()
  })

  it('renders breadcrumb header', async () => {
    const { IdeEditorMock } = await import('./ide-editor-mock')
    render(h(IdeEditorMock), container)
    expect(container.textContent).toContain('runtime / cascade / router.ts')
  })

  it('renders code lines', async () => {
    const { IdeEditorMock } = await import('./ide-editor-mock')
    render(h(IdeEditorMock), container)
    const lines = container.querySelectorAll('li')
    expect(lines.length).toBeGreaterThan(0)
  })

  it('has region role and aria-label', async () => {
    const { IdeEditorMock } = await import('./ide-editor-mock')
    render(h(IdeEditorMock), container)
    const region = container.querySelector('[role="region"]')
    expect(region).toBeTruthy()
    expect(region?.getAttribute('aria-label')).toContain('mock')
  })
})
