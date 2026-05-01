// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { h } from 'preact'
import { render } from 'preact'

vi.mock('../../lib/format-time', () => ({
  formatTimeAgo: () => '2m ago',
}))
vi.mock('../../api/tool-blob', () => ({
  fetchToolBlob: vi.fn(),
}))
vi.mock('../common/badge', () => ({
  CountBadge: ({ children, tone }) =>
    h('span', { 'data-testid': 'count-badge', 'data-tone': tone }, children),
}))
vi.mock('../common/button', () => ({
  ActionButton: ({ children, onClick, disabled }) =>
    h('button', { onClick, disabled }, children),
}))
vi.mock('../common/json-viewer', () => ({
  JsonViewer: ({ data }) =>
    h('pre', { 'data-testid': 'json-viewer' }, JSON.stringify(data)),
}))

import { ToolResultDisplay } from './tool-result-display'
import { fetchToolBlob } from '../../api/tool-blob'

describe('ToolResultDisplay', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    vi.clearAllMocks()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn() },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    render(null, container)
    container.remove()
  })

  it('renders OK badge for success', () => {
    render(
      h(ToolResultDisplay, { success: true, text: 'hello', toolName: 'search', timestamp: Date.now() }),
      container,
    )
    const badge = container.querySelector('[data-testid="count-badge"]')
    expect(badge).not.toBeNull()
    expect(badge!.textContent).toBe('OK')
    expect(badge!.getAttribute('data-tone')).toBe('ok')
  })

  it('renders ERR badge for failure', () => {
    render(
      h(ToolResultDisplay, { success: false, text: 'error', toolName: 'search', timestamp: Date.now() }),
      container,
    )
    const badge = container.querySelector('[data-testid="count-badge"]')
    expect(badge!.textContent).toBe('ERR')
    expect(badge!.getAttribute('data-tone')).toBe('bad')
  })

  it('renders JSON via JsonViewer when text is JSON', () => {
    render(
      h(ToolResultDisplay, {
        success: true,
        text: '{"key":"val"}',
        toolName: 'search',
        timestamp: Date.now(),
      }),
      container,
    )
    expect(container.querySelector('[data-testid="json-viewer"]')).not.toBeNull()
  })

  it('renders plain text in pre when text is not JSON', () => {
    render(
      h(ToolResultDisplay, { success: true, text: 'plain text', toolName: 'search', timestamp: Date.now() }),
      container,
    )
    const pre = container.querySelector('pre')
    expect(pre).not.toBeNull()
    expect(pre!.textContent).toContain('plain text')
  })

  it('toggles expand/collapse', () => {
    render(
      h(ToolResultDisplay, { success: true, text: 'line1\nline2', toolName: 'search', timestamp: Date.now() }),
      container,
    )
    const pre = container.querySelector('pre')
    expect(pre).not.toBeNull()

    const toggleBtn = Array.from(container.querySelectorAll('button')).find(b =>
      b.textContent?.includes('접기'),
    )
    expect(toggleBtn).not.toBeUndefined()
    toggleBtn!.click()
    render(
      h(ToolResultDisplay, { success: true, text: 'line1\nline2', toolName: 'search', timestamp: Date.now() }),
      container,
    )
    expect(container.querySelector('pre')).toBeNull()

    const expandBtn = Array.from(container.querySelectorAll('button')).find(b =>
      b.textContent?.includes('펼치기'),
    )
    expect(expandBtn).not.toBeUndefined()
    expandBtn!.click()
    render(
      h(ToolResultDisplay, { success: true, text: 'line1\nline2', toolName: 'search', timestamp: Date.now() }),
      container,
    )
    expect(container.querySelector('pre')).not.toBeNull()
  })

  it('calls navigator.clipboard.writeText on copy click', () => {
    render(
      h(ToolResultDisplay, { success: true, text: 'copy-me', toolName: 'search', timestamp: Date.now() }),
      container,
    )
    const copyBtn = Array.from(container.querySelectorAll('button')).find(b =>
      b.textContent?.includes('복사'),
    )
    expect(copyBtn).not.toBeUndefined()
    copyBtn!.click()
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('copy-me')
  })

  it('detects blob marker and renders StoredBlobView', () => {
    const marker = `[masc:blob sha256=${'a'.repeat(64)} bytes=1024 mime=text/plain preview="preview text"]`
    render(
      h(ToolResultDisplay, { success: true, text: marker, toolName: 'search', timestamp: Date.now() }),
      container,
    )
    expect(container.querySelector('[data-testid="tool-blob-marker"]')).not.toBeNull()
    expect(container.textContent).toContain('preview text')
    expect(container.textContent).toContain('1,024B')
  })

  it('fetches blob on load click and shows full text', async () => {
    fetchToolBlob.mockResolvedValue({ content: 'full blob content' })

    const marker = `[masc:blob sha256=${'a'.repeat(64)} bytes=1024 mime=text/plain preview="preview"]`
    render(
      h(ToolResultDisplay, { success: true, text: marker, toolName: 'search', timestamp: Date.now() }),
      container,
    )

    const loadBtn = Array.from(container.querySelectorAll('button')).find(b =>
      b.textContent?.includes('전체 출력 열기'),
    )
    expect(loadBtn).not.toBeUndefined()
    loadBtn!.click()

    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    render(
      h(ToolResultDisplay, { success: true, text: marker, toolName: 'search', timestamp: Date.now() }),
      container,
    )

    expect(fetchToolBlob).toHaveBeenCalledWith('a'.repeat(64))
    expect(container.textContent).toContain('full blob content')
  })

  it('shows error when fetch fails', async () => {
    fetchToolBlob.mockRejectedValue(new Error('network error'))

    const marker = `[masc:blob sha256=${'b'.repeat(64)} bytes=512 mime=text/plain preview="p"]`
    render(
      h(ToolResultDisplay, { success: true, text: marker, toolName: 'search', timestamp: Date.now() }),
      container,
    )

    const loadBtn = Array.from(container.querySelectorAll('button')).find(b =>
      b.textContent?.includes('전체 출력 열기'),
    )
    loadBtn!.click()

    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    render(
      h(ToolResultDisplay, { success: true, text: marker, toolName: 'search', timestamp: Date.now() }),
      container,
    )

    expect(container.textContent).toContain('network error')
  })

  it('toggles expand after blob load', async () => {
    fetchToolBlob.mockResolvedValue({ content: 'loaded' })

    const marker = `[masc:blob sha256=${'c'.repeat(64)} bytes=100 mime=text/plain preview="pv"]`
    render(
      h(ToolResultDisplay, { success: true, text: marker, toolName: 'search', timestamp: Date.now() }),
      container,
    )

    const loadBtn = Array.from(container.querySelectorAll('button')).find(b =>
      b.textContent?.includes('전체 출력 열기'),
    )
    loadBtn!.click()

    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    render(
      h(ToolResultDisplay, { success: true, text: marker, toolName: 'search', timestamp: Date.now() }),
      container,
    )

    expect(container.textContent).toContain('loaded')

    const collapseBtn = Array.from(container.querySelectorAll('button')).find(b =>
      b.textContent?.includes('접기'),
    )
    expect(collapseBtn).not.toBeUndefined()
    collapseBtn!.click()

    render(
      h(ToolResultDisplay, { success: true, text: marker, toolName: 'search', timestamp: Date.now() }),
      container,
    )

    expect(container.textContent).not.toContain('loaded')
  })
})
