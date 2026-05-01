import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { h } from 'preact'
import { render } from 'preact'
import { tasks } from '../../store'
import { TaskWall } from './task-wall'

const navigateMock = vi.fn()
vi.mock('../../router', () => ({
  navigate: (...args: any[]) => navigateMock(...args),
}))

describe('TaskWall', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    tasks.value = []
    navigateMock.mockClear()
  })

  afterEach(() => {
    render(null, container)
    container.remove()
    tasks.value = []
  })

  it('returns null when there are no tasks', () => {
    tasks.value = []
    render(h(TaskWall), container)
    expect(container.querySelector('section')).toBeNull()
  })

  it('excludes done and cancelled tasks', () => {
    tasks.value = [
      { id: 't1', title: 'Done', status: 'done', assignee: 'keeper-a' } as any,
      { id: 't2', title: 'Cancelled', status: 'cancelled', assignee: 'keeper-a' } as any,
    ]
    render(h(TaskWall), container)
    expect(container.querySelector('section')).toBeNull()
  })

  it('groups tasks by keeper and shows counts', () => {
    tasks.value = [
      { id: 't1', title: 'A', status: 'claimed', assignee: 'keeper-a' } as any,
      { id: 't2', title: 'B', status: 'in_progress', assignee: 'keeper-b' } as any,
      { id: 't3', title: 'C', status: 'todo', assignee: 'keeper-a' } as any,
    ]
    render(h(TaskWall), container)

    const section = container.querySelector('section')
    expect(section).not.toBeNull()
    expect(section?.getAttribute('aria-label')).toBe('키퍼별 태스크 월')

    const cols = container.querySelectorAll('.flex.flex-col.gap-1.rounded-sm.border')
    expect(cols.length).toBe(2)

    expect(container.textContent).toContain('keeper-a')
    expect(container.textContent).toContain('keeper-b')
    expect(container.textContent).toContain('2')
    expect(container.textContent).toContain('1')
  })

  it('shows unassigned column for tasks without assignee', () => {
    tasks.value = [
      { id: 't1', title: 'Unassigned', status: 'claimed' } as any,
    ]
    render(h(TaskWall), container)

    expect(container.textContent).toContain('미할당')
  })

  it('sorts columns by task count descending with unassigned last', () => {
    tasks.value = [
      { id: 't1', title: 'A', status: 'claimed', assignee: 'keeper-a' } as any,
      { id: 't2', title: 'B', status: 'claimed', assignee: 'keeper-a' } as any,
      { id: 't3', title: 'C', status: 'claimed', assignee: 'keeper-b' } as any,
      { id: 't4', title: 'D', status: 'claimed' } as any,
    ]
    render(h(TaskWall), container)

    const headers = container.querySelectorAll('.items-baseline.justify-between > .font-mono')
    const texts = Array.from(headers).map(h => h.textContent?.trim())
    expect(texts[0]).toBe('keeper-a')
    expect(texts[1]).toBe('keeper-b')
    expect(texts[texts.length - 1]).toBe('미할당')
  })

  it('sorts tasks inside a column by priority ascending', () => {
    tasks.value = [
      { id: 't1', title: 'Low', status: 'claimed', assignee: 'k', priority: 3 } as any,
      { id: 't2', title: 'High', status: 'claimed', assignee: 'k', priority: 1 } as any,
      { id: 't3', title: 'Medium', status: 'claimed', assignee: 'k', priority: 2 } as any,
    ]
    render(h(TaskWall), container)

    const buttons = container.querySelectorAll('button')
    const texts = Array.from(buttons).map(b => b.textContent?.trim())
    expect(texts[0]).toContain('High')
    expect(texts[1]).toContain('Medium')
    expect(texts[2]).toContain('Low')
  })

  it('renders status glyphs', () => {
    tasks.value = [
      { id: 't1', title: 'Todo', status: 'todo', assignee: 'k' } as any,
      { id: 't2', title: 'Claimed', status: 'claimed', assignee: 'k' } as any,
      { id: 't3', title: 'In Progress', status: 'in_progress', assignee: 'k' } as any,
      { id: 't4', title: 'Awaiting', status: 'awaiting_verification', assignee: 'k' } as any,
    ]
    render(h(TaskWall), container)

    const glyphs = container.querySelectorAll('[aria-hidden="true"]')
    expect(glyphs.length).toBe(4)
    expect(glyphs[0].textContent).toBe('·')
    expect(glyphs[1].textContent).toBe('◔')
    expect(glyphs[2].textContent).toBe('◑')
    expect(glyphs[3].textContent).toBe('⋯')
  })

  it('truncates task id to 6 chars', () => {
    tasks.value = [
      { id: 'very-long-id-12345', title: 'Long', status: 'claimed', assignee: 'k' } as any,
    ]
    render(h(TaskWall), container)

    const button = container.querySelector('button')
    expect(button?.textContent).toContain('very-l')
  })

  it('navigates to workspace on task click', () => {
    tasks.value = [
      { id: 'task-99', title: 'Click me', status: 'claimed', assignee: 'k' } as any,
    ]
    render(h(TaskWall), container)

    const button = container.querySelector('button')
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(navigateMock).toHaveBeenCalledTimes(1)
    expect(navigateMock).toHaveBeenCalledWith('workspace', {
      section: 'planning',
      task: 'task-99',
    })
  })
})
