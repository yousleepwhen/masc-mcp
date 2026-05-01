// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { h } from 'preact'
import { render } from 'preact'
import { KeeperMultiSelect } from './keeper-multi-select'
import { keepers, selectedKeeperFilter } from '../store'

describe('KeeperMultiSelect', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    keepers.value = []
    selectedKeeperFilter.value = new Set()
  })

  afterEach(() => {
    render(null, container)
    container.remove()
  })

  it('renders label and total count when no selection', () => {
    keepers.value = [
      { name: 'alpha', emoji: '🟢', koreanName: '알파' },
      { name: 'beta', emoji: '🔵', koreanName: '베타' },
    ]
    render(h(KeeperMultiSelect, { label: '필터' }), container)
    expect(container.textContent).toContain('필터')
    expect(container.textContent).toContain('전체 (2명)')
  })

  it('shows empty state when no keepers', () => {
    render(h(KeeperMultiSelect, null), container)
    expect(container.textContent).toContain('아직 등록된 keeper 가 없습니다')
  })

  it('renders chips with emoji and displayName', () => {
    keepers.value = [
      { name: 'alpha', emoji: '🟢', koreanName: '알파' },
      { name: 'beta', emoji: '🔵' },
    ]
    render(h(KeeperMultiSelect, null), container)
    expect(container.textContent).toContain('🟢')
    expect(container.textContent).toContain('알파')
    expect(container.textContent).toContain('🔵')
    expect(container.textContent).toContain('beta')
  })

  it('toggles keeper selection on click', () => {
    keepers.value = [{ name: 'alpha', emoji: '🟢', koreanName: '알파' }]
    render(h(KeeperMultiSelect, null), container)
    const btn = container.querySelector('button[aria-label="alpha"]')
    expect(btn).not.toBeNull()
    expect(btn!.getAttribute('aria-checked')).toBe('false')
    btn!.click()
    render(h(KeeperMultiSelect, null), container)
    const btn2 = container.querySelector('button[aria-label="alpha"]')
    expect(btn2!.getAttribute('aria-checked')).toBe('true')
  })

  it('shows selected count when some keepers selected', () => {
    keepers.value = [
      { name: 'alpha', emoji: '🟢' },
      { name: 'beta', emoji: '🔵' },
    ]
    selectedKeeperFilter.value = new Set(['alpha'])
    render(h(KeeperMultiSelect, null), container)
    expect(container.textContent).toContain('1 / 2 선택')
  })

  it('clear button resets selection', () => {
    keepers.value = [{ name: 'alpha', emoji: '🟢' }]
    selectedKeeperFilter.value = new Set(['alpha'])
    render(h(KeeperMultiSelect, null), container)
    const clearBtn = Array.from(container.querySelectorAll('button')).find(
      b => b.textContent?.includes('clear'),
    )
    expect(clearBtn).not.toBeUndefined()
    clearBtn!.click()
    expect(selectedKeeperFilter.value.size).toBe(0)
  })

  it('all button selects all keepers', () => {
    keepers.value = [
      { name: 'alpha', emoji: '🟢' },
      { name: 'beta', emoji: '🔵' },
    ]
    render(h(KeeperMultiSelect, null), container)
    const allBtn = Array.from(container.querySelectorAll('button')).find(
      b => b.textContent?.includes('all'),
    )
    expect(allBtn).not.toBeUndefined()
    allBtn!.click()
    expect(selectedKeeperFilter.value.size).toBe(2)
    expect(selectedKeeperFilter.value.has('alpha')).toBe(true)
    expect(selectedKeeperFilter.value.has('beta')).toBe(true)
  })

  it('disables clear button when no selection', () => {
    keepers.value = [{ name: 'alpha', emoji: '🟢' }]
    render(h(KeeperMultiSelect, null), container)
    const clearBtn = Array.from(container.querySelectorAll('button')).find(
      b => b.textContent?.includes('clear'),
    )
    expect(clearBtn!.disabled).toBe(true)
  })

  it('renders hint when provided', () => {
    keepers.value = [{ name: 'alpha', emoji: '🟢' }]
    render(h(KeeperMultiSelect, { hint: '힌트 텍스트' }), container)
    expect(container.textContent).toContain('힌트 텍스트')
  })
})
