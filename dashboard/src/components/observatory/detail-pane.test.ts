// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { h } from 'preact'
import { render } from 'preact'

import { DetailPane } from './detail-pane'
import { detailSelection } from './detail-selection-store'

describe('DetailPane', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    detailSelection.value = null
  })

  afterEach(() => {
    render(null, container)
    container.remove()
    detailSelection.value = null
  })

  it('renders nothing when selection is null', () => {
    render(h(DetailPane, null), container)
    expect(container.innerHTML).toBe('')
  })

  it('renders event selection with metadata', () => {
    detailSelection.value = {
      kind: 'event',
      entry: {
        source: 'keeper-alpha',
        event_type: 'heartbeat',
        success: true,
        keeper: 'alpha',
        session_id: 'sess-1',
        operation_id: 'op-1',
      },
      ts: Date.now(),
      bucketCount: 1,
    }
    render(h(DetailPane, null), container)
    expect(container.textContent).toContain('상세')
    expect(container.textContent).toContain('keeper-alpha:heartbeat')
    expect(container.textContent).toContain('success')
    expect(container.textContent).toContain('alpha')
    expect(container.textContent).toContain('sess-1')
    expect(container.textContent).toContain('op-1')
    expect(container.textContent).toContain('raw entry (JSON)')
  })

  it('renders tool_call selection with tool name', () => {
    detailSelection.value = {
      kind: 'tool_call',
      entry: {
        source: 'api',
        tool_name: 'search_files',
        success: false,
        error: 'not found',
      },
      ts: Date.now(),
      bucketCount: 1,
    }
    render(h(DetailPane, null), container)
    expect(container.textContent).toContain('도구 · search_files')
    expect(container.textContent).toContain('failure')
    expect(container.textContent).toContain('not found')
  })

  it('shows bucket count when > 1', () => {
    detailSelection.value = {
      kind: 'event',
      entry: { source: 'test' },
      ts: Date.now(),
      bucketCount: 5,
    }
    render(h(DetailPane, null), container)
    expect(container.textContent).toContain('5 events')
  })

  it('falls back to keeper_id when keeper is absent', () => {
    detailSelection.value = {
      kind: 'event',
      entry: { source: 'test', keeper_id: 'beta-1' },
      ts: Date.now(),
      bucketCount: 1,
    }
    render(h(DetailPane, null), container)
    expect(container.textContent).toContain('beta-1')
  })

  it('falls back to entry.name when tool_name is absent', () => {
    detailSelection.value = {
      kind: 'tool_call',
      entry: { source: 'api', name: 'legacy_tool' },
      ts: Date.now(),
      bucketCount: 1,
    }
    render(h(DetailPane, null), container)
    expect(container.textContent).toContain('도구 · legacy_tool')
  })

  it('shows error tone when error string is present', () => {
    detailSelection.value = {
      kind: 'event',
      entry: { source: 'x', success: undefined, error: 'boom' },
      ts: Date.now(),
      bucketCount: 1,
    }
    render(h(DetailPane, null), container)
    expect(container.textContent).toContain('error')
  })

  it('clears selection on close button click', () => {
    detailSelection.value = {
      kind: 'event',
      entry: { source: 'test' },
      ts: Date.now(),
      bucketCount: 1,
    }
    render(h(DetailPane, null), container)
    const closeBtn = container.querySelector('button[aria-label="상세 패널 닫기"]')
    expect(closeBtn).not.toBeNull()
    closeBtn!.click()
    expect(detailSelection.value).toBeNull()
  })

  it('shows neutral tone when no outcome info', () => {
    detailSelection.value = {
      kind: 'event',
      entry: { source: 'test' },
      ts: Date.now(),
      bucketCount: 1,
    }
    render(h(DetailPane, null), container)
    expect(container.textContent).not.toContain('success')
    expect(container.textContent).not.toContain('failure')
    expect(container.textContent).not.toContain('error')
  })
})
