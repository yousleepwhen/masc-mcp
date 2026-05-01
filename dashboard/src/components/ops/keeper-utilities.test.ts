// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { h } from 'preact'
import { render } from 'preact'

vi.mock('../common/select', () => ({
  Select: ({ value, disabled, options, onInput, ariaLabel }) =>
    h('select', { value, disabled, 'aria-label': ariaLabel, onChange: (e: Event) => onInput((e.target as HTMLSelectElement).value) },
      options.map((opt: { value: string; label: string }) => h('option', { value: opt.value }, opt.label))
    ),
}))
vi.mock('../common/button', () => ({
  ActionButton: ({ children, disabled, onClick }) =>
    h('button', { disabled, onClick }, children),
}))
vi.mock('../../operator-store', () => ({
  operatorSnapshot: { value: null },
  operatorActionBusy: { value: false },
}))
vi.mock('./helpers', () => ({
  actionTypeLabel: (type: string) => type,
  executeAction: vi.fn(),
  normalizeStatus: (status: string) => status,
}))

import { KeeperUtilitiesPanel } from './keeper-utilities'
import { operatorSnapshot, operatorActionBusy } from '../../operator-store'
import { executeAction } from './helpers'

describe('KeeperUtilitiesPanel', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    operatorSnapshot.value = null
    operatorActionBusy.value = false
    vi.clearAllMocks()
  })

  afterEach(() => {
    render(null, container)
    container.remove()
  })

  it('renders nothing when no actions', () => {
    operatorSnapshot.value = { available_actions: [], keepers: [] }
    render(h(KeeperUtilitiesPanel, null), container)
    expect(container.innerHTML).toBe('')
  })

  it('renders panel with select and actions', () => {
    operatorSnapshot.value = {
      available_actions: [
        { action_type: 'keeper_probe', target_type: 'keeper', description: '' },
        { action_type: 'unknown_action', target_type: 'keeper', description: '' },
      ],
      keepers: [{ name: 'alpha', status: 'online' }],
    }
    render(h(KeeperUtilitiesPanel, null), container)
    expect(container.querySelector('[data-testid="keeper-utilities-panel"]')).not.toBeNull()
    expect(container.querySelector('select')).not.toBeNull()
    expect(container.querySelectorAll('[data-testid="keeper-utility-action"]').length).toBe(2)
  })

  it('disables action buttons when busy', () => {
    operatorSnapshot.value = {
      available_actions: [
        { action_type: 'keeper_probe', target_type: 'keeper', description: '' },
      ],
      keepers: [{ name: 'alpha', status: 'online' }],
    }
    operatorActionBusy.value = true
    render(h(KeeperUtilitiesPanel, null), container)
    const btn = container.querySelector('button')
    expect(btn!.disabled).toBe(true)
  })

  it('shows adapted vs pending actions', () => {
    operatorSnapshot.value = {
      available_actions: [
        { action_type: 'keeper_probe', target_type: 'keeper', description: '' },
        { action_type: 'some_new_action', target_type: 'keeper', description: '' },
      ],
      keepers: [{ name: 'alpha', status: 'online' }],
    }
    render(h(KeeperUtilitiesPanel, null), container)
    const actions = container.querySelectorAll('[data-testid="keeper-utility-action"]')
    expect(actions.length).toBe(2)
    expect(actions[0]!.textContent).toContain('실행')
    expect(actions[1]!.textContent).toContain('대기')
    expect(actions[1]!.textContent).toContain('UI adapter pending')
  })

  it('calls executeAction when adapted action clicked', async () => {
    operatorSnapshot.value = {
      available_actions: [
        { action_type: 'keeper_probe', target_type: 'keeper', description: '' },
      ],
      keepers: [{ name: 'alpha', status: 'online' }],
    }
    render(h(KeeperUtilitiesPanel, null), container)
    const btn = container.querySelector('button')
    expect(btn!.textContent).toContain('실행')
    btn!.click()
    await Promise.resolve()
    expect(executeAction).toHaveBeenCalled()
  })

  it('shows empty keeper message when no online keepers', () => {
    operatorSnapshot.value = {
      available_actions: [
        { action_type: 'keeper_probe', target_type: 'keeper', description: '' },
      ],
      keepers: [{ name: 'alpha', status: 'offline' }],
    }
    render(h(KeeperUtilitiesPanel, null), container)
    const select = container.querySelector('select')
    expect(select!.disabled).toBe(true)
    expect(container.textContent).toContain('온라인 keeper 없음')
  })
})
