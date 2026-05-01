// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { h, render } from 'preact'

describe('ide-conversation-rail-mock', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    render(null, container)
    container.remove()
  })

  it('renders CONVERSATION header', async () => {
    const { IdeConversationRailMock } = await import('./ide-conversation-rail-mock')
    render(h(IdeConversationRailMock), container)
    expect(container.textContent).toContain('CONVERSATION')
  })

  it('renders thread count', async () => {
    const { IdeConversationRailMock } = await import('./ide-conversation-rail-mock')
    render(h(IdeConversationRailMock), container)
    expect(container.textContent).toContain('5')
  })

  it('renders mock thread cards', async () => {
    const { IdeConversationRailMock } = await import('./ide-conversation-rail-mock')
    render(h(IdeConversationRailMock), container)
    const items = container.querySelectorAll('li')
    expect(items.length).toBeGreaterThan(0)
  })

  it('has region role and aria-label', async () => {
    const { IdeConversationRailMock } = await import('./ide-conversation-rail-mock')
    render(h(IdeConversationRailMock), container)
    const region = container.querySelector('[role="region"]')
    expect(region).toBeTruthy()
    expect(region?.getAttribute('aria-label')).toContain('CONVERSATION')
  })
})
