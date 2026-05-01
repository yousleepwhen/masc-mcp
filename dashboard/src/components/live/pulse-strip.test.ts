// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { h } from 'preact'
import { render } from 'preact'
import { PulseStrip } from './pulse-strip'
import { agents } from '../../store'
import { selectedAgentName } from '../agent-detail-state'

describe('PulseStrip', () => {
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

  it('renders empty state when no agents', () => {
    render(h(PulseStrip, null), container)
    expect(container.textContent).toContain('연결된 에이전트 없음')
  })

  it('renders agent bubbles', () => {
    agents.value = [
      { name: 'Alpha', status: 'active', emoji: '🤖', current_task: 'task-1', koreanName: '알파' },
      { name: 'Beta', status: 'idle', emoji: '⚡', current_task: null, koreanName: null },
    ]
    render(h(PulseStrip, null), container)
    const bubbles = container.querySelectorAll('.pulse-bubble')
    expect(bubbles.length).toBe(2)
  })

  it('shows emoji in bubble', () => {
    agents.value = [{ name: 'Alpha', status: 'active', emoji: '🤖', current_task: null, koreanName: null }]
    render(h(PulseStrip, null), container)
    expect(container.textContent).toContain('🤖')
  })

  it('falls back to first char when no emoji', () => {
    agents.value = [{ name: 'Beta', status: 'idle', emoji: '', current_task: null, koreanName: null }]
    render(h(PulseStrip, null), container)
    expect(container.textContent).toContain('B')
  })

  it('marks selected agent', () => {
    agents.value = [{ name: 'Alpha', status: 'active', emoji: '🤖', current_task: null, koreanName: null }]
    selectedAgentName.value = 'Alpha'
    render(h(PulseStrip, null), container)
    const selected = container.querySelector('.pulse-selected')
    expect(selected).not.toBeNull()
  })

  it('shows koreanName when available', () => {
    agents.value = [{ name: 'Alpha', status: 'active', emoji: '🤖', current_task: null, koreanName: '알파' }]
    render(h(PulseStrip, null), container)
    expect(container.textContent).toContain('알파')
  })

  it('shows agent name when no koreanName', () => {
    agents.value = [{ name: 'Alpha', status: 'active', emoji: '🤖', current_task: null, koreanName: null }]
    render(h(PulseStrip, null), container)
    expect(container.textContent).toContain('Alpha')
  })
})
