// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { h } from 'preact'
import { render } from 'preact'
import { KeeperHealthStrip } from './keeper-health-strip'
import { keepers } from '../../store'
import { setContextThresholds } from '../../config/context-thresholds'

describe('KeeperHealthStrip', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    keepers.value = []
    setContextThresholds({ warn: 0.7, critical: 0.9, compacting: 0.5 })
  })

  afterEach(() => {
    render(null, container)
    container.remove()
  })

  it('returns null when no keepers', () => {
    render(h(KeeperHealthStrip, null), container)
    expect(container.innerHTML).toBe('')
  })

  it('renders active count', () => {
    keepers.value = [
      { name: 'k1', keeper_id: '1', keepalive_running: true, context_ratio: 0.3, pipeline_stage: 'idle' },
    ]
    render(h(KeeperHealthStrip, null), container)
    expect(container.textContent).toContain('1 활성')
    expect(container.textContent).toContain('/ 1')
  })

  it('shows 정상 when no alerts', () => {
    keepers.value = [
      { name: 'k1', keeper_id: '1', keepalive_running: true, context_ratio: 0.3, pipeline_stage: 'idle' },
    ]
    render(h(KeeperHealthStrip, null), container)
    expect(container.textContent).toContain('정상')
  })

  it('shows warning count for warn ratio', () => {
    keepers.value = [
      { name: 'k1', keeper_id: '1', keepalive_running: true, context_ratio: 0.75, pipeline_stage: 'idle' },
    ]
    render(h(KeeperHealthStrip, null), container)
    expect(container.textContent).toContain('1 주의')
  })

  it('shows critical count for critical ratio', () => {
    keepers.value = [
      { name: 'k1', keeper_id: '1', keepalive_running: true, context_ratio: 0.95, pipeline_stage: 'idle' },
    ]
    render(h(KeeperHealthStrip, null), container)
    expect(container.textContent).toContain('1 위험')
  })

  it('renders context bars for active keepers', () => {
    keepers.value = [
      { name: 'k1', keeper_id: '1', keepalive_running: true, context_ratio: 0.5, pipeline_stage: 'thinking' },
    ]
    render(h(KeeperHealthStrip, null), container)
    const bars = container.querySelectorAll('[title^="k1: ctx"]')
    expect(bars.length).toBe(1)
  })

  it('counts only keepalive_running as active', () => {
    keepers.value = [
      { name: 'k1', keeper_id: '1', keepalive_running: true, context_ratio: 0.3, pipeline_stage: 'idle' },
      { name: 'k2', keeper_id: '2', keepalive_running: false, context_ratio: 0.3, pipeline_stage: 'idle' },
    ]
    render(h(KeeperHealthStrip, null), container)
    expect(container.textContent).toContain('1 활성')
    expect(container.textContent).toContain('/ 2')
  })
})
