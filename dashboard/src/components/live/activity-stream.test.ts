// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { h } from 'preact'
import { render } from 'preact'
import { ActivityStream } from './activity-stream'
import { journal, connected, eventCount } from '../../sse'
import { liveFilters } from '../../live-store'

describe('ActivityStream', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    journal.value = []
    eventCount.value = 0
    connected.value = true
    liveFilters.value = new Set(['broadcast', 'tasks', 'keepers', 'system'])
  })

  afterEach(() => {
    render(null, container)
    container.remove()
  })

  it('renders header with counts', () => {
    eventCount.value = 5
    render(h(ActivityStream, null), container)
    expect(container.textContent).toContain('활동 스트림')
    expect(container.textContent).toContain('5 수신')
    expect(container.textContent).toContain('0 표시')
  })

  it('renders filter buttons', () => {
    render(h(ActivityStream, null), container)
    expect(container.textContent).toContain('브로드캐스트')
    expect(container.textContent).toContain('작업')
    expect(container.textContent).toContain('Keeper')
    expect(container.textContent).toContain('시스템')
  })

  it('shows empty state when no events and no filters', () => {
    liveFilters.value = new Set()
    render(h(ActivityStream, null), container)
    expect(container.textContent).toContain('아직 수신된 이벤트가 없습니다')
  })

  it('shows disconnected state', () => {
    connected.value = false
    render(h(ActivityStream, null), container)
    expect(container.textContent).toContain('실시간 연결이 끊겨있습니다')
  })

  it('shows filter empty state when filters exclude all', () => {
    journal.value = [
      { agent: 'A', text: 'hello', timestamp: Date.now(), kind: 'board', eventType: 'board_post' },
    ]
    liveFilters.value = new Set(['tasks'])
    render(h(ActivityStream, null), container)
    expect(container.textContent).toContain('선택한 필터에 맞는 이벤트가 없습니다')
  })

  it('renders journal entries', () => {
    journal.value = [
      { agent: 'Alpha', text: 'task update', timestamp: Date.now(), kind: 'tasks', eventType: 'task_update' },
      { agent: 'Beta', text: 'broadcast msg', timestamp: Date.now(), kind: 'board', eventType: 'broadcast' },
    ]
    render(h(ActivityStream, null), container)
    const items = container.querySelectorAll('.activity-item')
    expect(items.length).toBe(2)
    expect(container.textContent).toContain('task update')
    expect(container.textContent).toContain('broadcast msg')
  })

  it('marks first entry as new', () => {
    journal.value = [
      { agent: 'Alpha', text: 'first', timestamp: Date.now(), kind: 'tasks', eventType: 'task_update' },
      { agent: 'Beta', text: 'second', timestamp: Date.now() - 1000, kind: 'tasks', eventType: 'task_update' },
    ]
    render(h(ActivityStream, null), container)
    const first = container.querySelector('.activity-item-new')
    expect(first).not.toBeNull()
  })

  it('shows agent name in entry header', () => {
    journal.value = [
      { agent: 'Alpha', text: 'msg', timestamp: Date.now(), kind: 'tasks', eventType: 'task_update' },
    ]
    render(h(ActivityStream, null), container)
    expect(container.textContent).toContain('Alpha')
  })

  it('applies kind color class to entries', () => {
    journal.value = [
      { agent: 'A', text: 'broadcast', timestamp: Date.now(), kind: 'board', eventType: 'broadcast' },
    ]
    render(h(ActivityStream, null), container)
    const item = container.querySelector('.activity-item')
    expect(item?.classList.contains('live-event-broadcast')).toBe(true)
  })

  it('shows kind chip label', () => {
    journal.value = [
      { agent: 'A', text: 'task', timestamp: Date.now(), kind: 'tasks', eventType: 'task_update' },
    ]
    render(h(ActivityStream, null), container)
    expect(container.textContent).toContain('task')
  })
})
