// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { h } from 'preact'
import { render } from 'preact'
import { AgentWorkerBrief } from './agent-detail-worker'
import { executionWorkerSupportBriefs } from '../store'

describe('AgentWorkerBrief', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    executionWorkerSupportBriefs.value = []
  })

  afterEach(() => {
    render(null, container)
    container.remove()
  })

  it('returns null when no worker for agent', () => {
    render(h(AgentWorkerBrief, { agentName: 'Alpha' }), container)
    expect(container.innerHTML).toBe('')
  })

  it('renders worker state badge', () => {
    executionWorkerSupportBriefs.value = [
      { name: 'Alpha', state: 'working', note: 'active', focus: 'task-1' },
    ]
    render(h(AgentWorkerBrief, { agentName: 'Alpha' }), container)
    expect(container.textContent).toContain('작업 중')
  })

  it('renders focus when present', () => {
    executionWorkerSupportBriefs.value = [
      { name: 'Alpha', state: 'working', note: 'active', focus: 'important task' },
    ]
    render(h(AgentWorkerBrief, { agentName: 'Alpha' }), container)
    expect(container.textContent).toContain('important task')
  })

  it('renders output preview when present', () => {
    executionWorkerSupportBriefs.value = [
      { name: 'Alpha', state: 'working', note: 'active', focus: 'task', recent_output_preview: 'output result' },
    ]
    render(h(AgentWorkerBrief, { agentName: 'Alpha' }), container)
    expect(container.textContent).toContain('output result')
  })

  it('renders session id when present', () => {
    executionWorkerSupportBriefs.value = [
      { name: 'Alpha', state: 'working', note: 'active', focus: 'task', related_session_id: 'sess-123' },
    ]
    render(h(AgentWorkerBrief, { agentName: 'Alpha' }), container)
    expect(container.textContent).toContain('sess-123')
  })

  it('renders signal section when last_signal_at present', () => {
    executionWorkerSupportBriefs.value = [
      { name: 'Alpha', state: 'working', note: 'active', focus: 'task', last_signal_at: '2026-04-30T12:00:00Z' },
    ]
    render(h(AgentWorkerBrief, { agentName: 'Alpha' }), container)
    expect(container.textContent).toContain('시그널')
  })

  it('renders signal truth when present', () => {
    executionWorkerSupportBriefs.value = [
      { name: 'Alpha', state: 'working', note: 'active', focus: 'task', last_signal_at: '2026-04-30T12:00:00Z', signal_truth: 'live' },
    ]
    render(h(AgentWorkerBrief, { agentName: 'Alpha' }), container)
    expect(container.textContent).toContain('live')
  })
})
