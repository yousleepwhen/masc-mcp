// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { h, render } from 'preact'

vi.mock('./ide-explorer', () => ({
  IdeExplorer: () => h('div', { className: 'ide-explorer' }, 'Explorer'),
}))

vi.mock('./ide-editor-mock', () => ({
  IdeEditorMock: () => h('div', { className: 'ide-editor' }, 'Editor'),
}))

vi.mock('./ide-conversation-rail-mock', () => ({
  IdeConversationRailMock: () => h('div', { className: 'ide-conversation' }, 'Conversation'),
}))

vi.mock('./ide-activity-mock', () => ({
  IdeActivityMock: () => h('div', { className: 'ide-activity' }, 'Activity'),
}))

vi.mock('./ide-interject-mock', () => ({
  IdeInterjectMock: () => h('div', { className: 'ide-interject' }, 'Interject'),
}))

vi.mock('./ide-toolbar', () => ({
  IdeToolbar: ({ activeView, onViewChange }) =>
    h('div', { className: 'ide-toolbar' }, `Toolbar:${activeView}`),
}))

describe('ide-shell', () => {
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

  it('renders header with title', async () => {
    const { IdeShell } = await import('./ide-shell')
    render(h(IdeShell), container)
    expect(container.textContent).toContain('코드 IDE')
  })

  it('renders toolbar', async () => {
    const { IdeShell } = await import('./ide-shell')
    render(h(IdeShell), container)
    expect(container.textContent).toContain('Toolbar:source')
  })

  it('renders explorer', async () => {
    const { IdeShell } = await import('./ide-shell')
    render(h(IdeShell), container)
    expect(container.textContent).toContain('Explorer')
  })

  it('renders editor', async () => {
    const { IdeShell } = await import('./ide-shell')
    render(h(IdeShell), container)
    expect(container.textContent).toContain('Editor')
  })

  it('renders conversation rail', async () => {
    const { IdeShell } = await import('./ide-shell')
    render(h(IdeShell), container)
    expect(container.textContent).toContain('Conversation')
  })

  it('renders activity', async () => {
    const { IdeShell } = await import('./ide-shell')
    render(h(IdeShell), container)
    expect(container.textContent).toContain('Activity')
  })

  it('renders interject', async () => {
    const { IdeShell } = await import('./ide-shell')
    render(h(IdeShell), container)
    expect(container.textContent).toContain('Interject')
  })

  it('shows connected status', async () => {
    const { IdeShell } = await import('./ide-shell')
    render(h(IdeShell), container)
    expect(container.textContent).toContain('connected')
  })
})
