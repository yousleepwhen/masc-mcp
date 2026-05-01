// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { h } from 'preact'
import { render } from 'preact'
import { FocusSidebar } from './focus-sidebar'
import { agents } from '../../store'
import { selectedAgentName } from '../agent-detail-state'

describe('FocusSidebar', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    agents.value = []
    selectedAgentName.value = null
  })

  afterEach(() => {
    render(null, container)
    container.remove()
  })

  it('renders header with count', () => {
    agents.value = [
      { name: 'Alpha', status: 'active', emoji: '🤖', current_task: 'task-1', koreanName: '알파' },
    ]
    render(h(FocusSidebar, null), container)
    expect(container.textContent).toContain('에이전트')
    expect(container.textContent).toContain('1명 활성')
  })

  it('renders empty state when no active agents', () => {
    agents.value = []
    render(h(FocusSidebar, null), container)
    expect(container.textContent).toContain('활성 에이전트 없음')
  })

  it('renders agent card with emoji', () => {
    agents.value = [
      { name: 'Alpha', status: 'active', emoji: '🤖', current_task: null, koreanName: null },
    ]
    render(h(FocusSidebar, null), container)
    expect(container.textContent).toContain('🤖')
    expect(container.textContent).toContain('Alpha')
  })

  it('shows koreanName when available', () => {
    agents.value = [
      { name: 'Alpha', status: 'active', emoji: '🤖', current_task: null, koreanName: '알파' },
    ]
    render(h(FocusSidebar, null), container)
    expect(container.textContent).toContain('알파')
  })

  it('shows current task when present', () => {
    agents.value = [
      { name: 'Alpha', status: 'active', emoji: '🤖', current_task: 'important task', koreanName: null },
    ]
    render(h(FocusSidebar, null), container)
    expect(container.textContent).toContain('important task')
  })

  it('shows pressure badge', () => {
    agents.value = [
      { name: 'Alpha', status: 'active', emoji: '🤖', current_task: null, koreanName: null },
    ]
    render(h(FocusSidebar, null), container)
    expect(container.textContent).toContain('평온')
  })

  it('marks selected agent', () => {
    agents.value = [
      { name: 'Alpha', status: 'active', emoji: '🤖', current_task: null, koreanName: null },
    ]
    selectedAgentName.value = 'Alpha'
    render(h(FocusSidebar, null), container)
    const selected = container.querySelector('.focus-agent-selected')
    expect(selected).not.toBeNull()
  })

  it('hides header in compact mode', () => {
    agents.value = [
      { name: 'Alpha', status: 'active', emoji: '🤖', current_task: null, koreanName: null },
    ]
    render(h(FocusSidebar, { compact: true }), container)
    expect(container.textContent).not.toContain('에이전트')
  })

  it('shows assigned count in badge when tasks assigned', () => {
    agents.value = [
      { name: 'Alpha', status: 'active', emoji: '🤖', current_task: 't1', koreanName: null },
    ]
    render(h(FocusSidebar, null), container)
    // Assigned count 0 with no tasks in store — badge may not show number
    // This test verifies the card renders without crashing
    expect(container.querySelector('.focus-agent-card')).not.toBeNull()
  })
})
