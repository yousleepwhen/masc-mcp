// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { h } from 'preact'
import { render } from 'preact'

vi.mock('./tools', () => ({
  Tools: () => h('div', { 'data-testid': 'tools' }, 'Tools'),
}))

vi.mock('./autoresearch', () => ({
  Autoresearch: () => h('div', { 'data-testid': 'autoresearch' }, 'Autoresearch'),
}))

vi.mock('./harness-health', () => ({
  HarnessHealth: () => h('div', { 'data-testid': 'harness-health' }, 'HarnessHealth'),
}))

import { Lab } from './lab'
import { route } from '../router'

describe('Lab', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    route.value = { tab: 'lab', params: {}, postId: null }
  })

  afterEach(() => {
    render(null, container)
    container.remove()
  })

  it('renders Tools by default', () => {
    render(h(Lab, null), container)
    expect(container.querySelector('[data-testid="tools"]')).not.toBeNull()
  })

  it('renders Autoresearch when section is autoresearch', () => {
    route.value = { tab: 'lab', params: { section: 'autoresearch' }, postId: null }
    render(h(Lab, null), container)
    expect(container.querySelector('[data-testid="autoresearch"]')).not.toBeNull()
  })

  it('renders HarnessHealth when section is harness', () => {
    route.value = { tab: 'lab', params: { section: 'harness' }, postId: null }
    render(h(Lab, null), container)
    expect(container.querySelector('[data-testid="harness-health"]')).not.toBeNull()
  })
})
