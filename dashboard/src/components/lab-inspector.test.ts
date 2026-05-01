// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { h } from 'preact'
import { render } from 'preact'

vi.mock('./doctor-panel', () => ({
  DoctorPanel: () => h('div', { 'data-testid': 'doctor-panel' }, 'DoctorPanel'),
}))
vi.mock('./feature-health', () => ({
  FeatureHealth: () => h('div', { 'data-testid': 'feature-health' }, 'FeatureHealth'),
}))
vi.mock('./server-config', () => ({
  ServerConfig: () => h('div', { 'data-testid': 'server-config' }, 'ServerConfig'),
}))
vi.mock('./excuse-patterns', () => ({
  ExcusePatterns: () => h('div', { 'data-testid': 'excuse-patterns' }, 'ExcusePatterns'),
}))
vi.mock('./common/card', () => ({
  Card: ({ title, children }) => h('div', { 'data-testid': 'card', 'data-title': title }, title, children),
}))
vi.mock('../router', () => ({
  navigate: vi.fn(),
}))

import { LabInspector } from './lab-inspector'

describe('LabInspector', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    // Reset module-level inspectorSection signal to 'overview' by clicking the tab
    const temp = document.createElement('div')
    document.body.appendChild(temp)
    render(h(LabInspector, null), temp)
    const btn = Array.from(temp.querySelectorAll('button')).find(
      b => b.textContent?.includes('개요'),
    )
    if (btn) btn.click()
    render(null, temp)
    temp.remove()
  })

  afterEach(() => {
    render(null, container)
    container.remove()
  })

  it('renders overview tab by default', () => {
    render(h(LabInspector, null), container)
    expect(container.textContent).toContain('운영 인스펙터')
    expect(container.textContent).toContain('개요')
    expect(container.textContent).toContain('Agent 와 Keeper')
  })

  it('switches to features tab on click', () => {
    render(h(LabInspector, null), container)
    const btn = Array.from(container.querySelectorAll('button')).find(
      b => b.textContent?.includes('피처 플래그'),
    )
    expect(btn).not.toBeUndefined()
    btn!.click()
    render(h(LabInspector, null), container)
    expect(container.querySelector('[data-testid="feature-health"]')).not.toBeNull()
  })

  it('switches to config tab on click', () => {
    render(h(LabInspector, null), container)
    const btn = Array.from(container.querySelectorAll('button')).find(
      b => b.textContent?.includes('서버 설정'),
    )
    expect(btn).not.toBeUndefined()
    btn!.click()
    render(h(LabInspector, null), container)
    expect(container.querySelector('[data-testid="server-config"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="excuse-patterns"]')).not.toBeNull()
  })

  it('switches to doctor tab on click', () => {
    render(h(LabInspector, null), container)
    const btn = Array.from(container.querySelectorAll('button')).find(
      b => b.textContent?.includes('진단'),
    )
    expect(btn).not.toBeUndefined()
    btn!.click()
    render(h(LabInspector, null), container)
    expect(container.querySelector('[data-testid="doctor-panel"]')).not.toBeNull()
  })

  it('shows correct aria-pressed state for active tab', () => {
    render(h(LabInspector, null), container)
    const overviewBtn = Array.from(container.querySelectorAll('button')).find(
      b => b.textContent?.includes('개요'),
    )
    expect(overviewBtn!.getAttribute('aria-pressed')).toBe('true')
  })
})
