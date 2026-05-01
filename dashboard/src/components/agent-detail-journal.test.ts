// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { h } from 'preact'
import { render } from 'preact'
import { AgentJournalStream } from './agent-detail-journal'
import { journal } from '../sse'

describe('AgentJournalStream', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    journal.value = []
  })

  afterEach(() => {
    render(null, container)
    container.remove()
  })

  it('renders empty state when no entries', () => {
    render(h(AgentJournalStream, { agentName: 'Alpha' }), container)
    expect(container.textContent).toContain('아직 활동 기록이 없습니다')
  })

  it('renders journal entries for matching agent', () => {
    journal.value = [
      { agent: 'Alpha', text: 'task started', timestamp: Date.now(), kind: 'tasks', eventType: 'task_update' },
      { agent: 'Beta', text: 'other task', timestamp: Date.now(), kind: 'tasks', eventType: 'task_update' },
    ]
    render(h(AgentJournalStream, { agentName: 'Alpha' }), container)
    expect(container.textContent).toContain('task started')
    expect(container.textContent).not.toContain('other task')
  })

  it('matches agent by text mention', () => {
    journal.value = [
      { agent: 'Gamma', text: 'hey @alpha check this', timestamp: Date.now(), kind: 'board', eventType: 'broadcast' },
    ]
    render(h(AgentJournalStream, { agentName: 'Alpha' }), container)
    expect(container.textContent).toContain('hey @alpha check this')
  })

  it('trims long text', () => {
    const longText = 'a'.repeat(200)
    journal.value = [
      { agent: 'Alpha', text: longText, timestamp: Date.now(), kind: 'tasks', eventType: 'task_update' },
    ]
    render(h(AgentJournalStream, { agentName: 'Alpha' }), container)
    const textEl = container.querySelector('.agent-journal-text')
    expect(textEl).not.toBeNull()
    expect(textEl.textContent!.length).toBeLessThan(200)
  })

  it('shows event type', () => {
    journal.value = [
      { agent: 'Alpha', text: 'msg', timestamp: Date.now(), kind: 'tasks', eventType: 'task_update' },
    ]
    render(h(AgentJournalStream, { agentName: 'Alpha' }), container)
    expect(container.textContent).toContain('task_update')
  })

  it('shows empty state for null agentName', () => {
    render(h(AgentJournalStream, { agentName: null as any }), container)
    expect(container.textContent).toContain('아직 활동 기록이 없습니다')
  })
})
