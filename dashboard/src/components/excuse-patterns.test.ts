// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { h } from 'preact'
import { render } from 'preact'

vi.mock('./common/card', () => ({
  Card: ({ title, children }) =>
    h('div', { 'data-testid': 'card', 'data-title': title }, title, children),
}))
vi.mock('./common/feedback-state', () => ({
  LoadingState: ({ children }) => h('div', { 'data-testid': 'loading-state' }, children),
  ErrorState: ({ message }) => h('div', { 'data-testid': 'error-state' }, message),
  EmptyState: ({ message }) => h('div', { 'data-testid': 'empty-state' }, message),
}))

vi.mock('../api/dashboard', () => ({
  fetchExcusePatterns: vi.fn(),
  updateExcusePatterns: vi.fn(),
}))

describe('ExcusePatterns', () => {
  let container: HTMLDivElement
  let ExcusePatterns: any

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    const mod = await import('./excuse-patterns')
    ExcusePatterns = mod.ExcusePatterns
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    render(null, container)
    container.remove()
  })

  it('renders loading state on initial idle', async () => {
    const { fetchExcusePatterns } = await import('../api/dashboard')
    fetchExcusePatterns.mockImplementation(() => new Promise(() => {}))
    render(h(ExcusePatterns, null), container)
    await Promise.resolve()
    render(h(ExcusePatterns, null), container)
    expect(container.querySelector('[data-testid="loading-state"]')).not.toBeNull()
    expect(container.textContent).toContain('핑계 패턴 불러오는 중...')
  })

  it('renders error state when fetch fails', async () => {
    const { fetchExcusePatterns } = await import('../api/dashboard')
    fetchExcusePatterns.mockRejectedValue(new Error('network down'))
    render(h(ExcusePatterns, null), container)
    await Promise.resolve()
    await Promise.resolve()
    render(h(ExcusePatterns, null), container)
    expect(container.textContent).toContain('패턴 로드 실패')
    expect(container.textContent).toContain('network down')
  })

  it('renders loaded state with textarea and save button', async () => {
    const { fetchExcusePatterns } = await import('../api/dashboard')
    fetchExcusePatterns.mockResolvedValue([
      ['pattern-a', 'reason-a'],
      ['pattern-b', 'reason-b'],
    ])
    render(h(ExcusePatterns, null), container)
    await Promise.resolve()
    await Promise.resolve()
    render(h(ExcusePatterns, null), container)
    const textarea = container.querySelector('textarea')
    expect(textarea).not.toBeNull()
    expect(textarea!.value).toContain('pattern-a')
    expect(container.textContent).toContain('패턴 저장')
  })

  it('shows save success message after valid submit', async () => {
    const { fetchExcusePatterns, updateExcusePatterns } = await import('../api/dashboard')
    fetchExcusePatterns.mockResolvedValue([['p1', 'r1']])
    render(h(ExcusePatterns, null), container)
    await Promise.resolve()
    await Promise.resolve()
    render(h(ExcusePatterns, null), container)

    updateExcusePatterns.mockResolvedValue(undefined)
    const form = container.querySelector('form')
    const textarea = container.querySelector('textarea')
    textarea!.value = '[["p1", "r1"]]'
    form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

    await Promise.resolve()
    await Promise.resolve()
    render(h(ExcusePatterns, null), container)
    expect(container.textContent).toContain('저장 완료.')
  })

  it('shows format error for invalid JSON submit', async () => {
    const { fetchExcusePatterns } = await import('../api/dashboard')
    fetchExcusePatterns.mockResolvedValue([['p1', 'r1']])
    render(h(ExcusePatterns, null), container)
    await Promise.resolve()
    await Promise.resolve()
    render(h(ExcusePatterns, null), container)

    const form = container.querySelector('form')
    const textarea = container.querySelector('textarea')
    textarea!.value = 'not-json'
    form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

    await Promise.resolve()
    render(h(ExcusePatterns, null), container)
    expect(container.textContent).toContain('잘못된 형식')
  })

  it('shows save error when updateExcusePatterns rejects', async () => {
    const { fetchExcusePatterns, updateExcusePatterns } = await import('../api/dashboard')
    fetchExcusePatterns.mockResolvedValue([['p1', 'r1']])
    render(h(ExcusePatterns, null), container)
    await Promise.resolve()
    await Promise.resolve()
    render(h(ExcusePatterns, null), container)

    updateExcusePatterns.mockRejectedValue(new Error('server 500'))
    const form = container.querySelector('form')
    const textarea = container.querySelector('textarea')
    textarea!.value = '[["p1", "r1"]]'
    form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

    await Promise.resolve()
    await Promise.resolve()
    render(h(ExcusePatterns, null), container)
    expect(container.textContent).toContain('저장 실패')
    expect(container.textContent).toContain('server 500')
  })
})
