import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { h } from 'preact'
import { render } from 'preact'
import { tasks } from '../../store'
import { TaskStaleAlert } from './task-stale-alert'

describe('TaskStaleAlert', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    tasks.value = []
  })

  afterEach(() => {
    render(null, container)
    container.remove()
    tasks.value = []
  })

  it('renders nothing when there are no stale tasks', () => {
    tasks.value = [
      {
        id: 'task-1',
        title: 'Fresh task',
        status: 'claimed',
        updated_at: new Date().toISOString(),
      } as any,
    ]
    render(h(TaskStaleAlert), container)
    expect(container.querySelector('section')).toBeNull()
  })

  it('renders nothing when tasks are done or cancelled', () => {
    const oldDate = new Date(Date.now() - 3600 * 1000).toISOString()
    tasks.value = [
      { id: 'task-1', title: 'Done', status: 'done', updated_at: oldDate } as any,
      { id: 'task-2', title: 'Cancelled', status: 'cancelled', updated_at: oldDate } as any,
    ]
    render(h(TaskStaleAlert), container)
    expect(container.querySelector('section')).toBeNull()
  })

  it('renders stale tasks with age label and assignee', () => {
    const oldDate = new Date(Date.now() - 3600 * 1000).toISOString()
    tasks.value = [
      {
        id: 'task-stale-1',
        title: 'Stale task',
        status: 'claimed',
        updated_at: oldDate,
        assignee: 'keeper-a',
      } as any,
    ]
    render(h(TaskStaleAlert), container)

    const section = container.querySelector('section')
    expect(section).not.toBeNull()
    expect(section?.getAttribute('aria-label')).toBe('오래된 태스크 점유')

    expect(container.textContent).toContain('오래 점유 중인 태스크')
    expect(container.textContent).toContain('Stale task')
    expect(container.textContent).toContain('keeper-a')
    expect(container.textContent).toContain('nudge')
    expect(container.textContent).toContain('상세')
  })

  it('renders multiple stale tasks sorted by age descending', () => {
    const twoHoursAgo = new Date(Date.now() - 7200 * 1000).toISOString()
    const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString()
    tasks.value = [
      {
        id: 'task-1',
        title: 'One hour',
        status: 'in_progress',
        updated_at: oneHourAgo,
      } as any,
      {
        id: 'task-2',
        title: 'Two hours',
        status: 'claimed',
        updated_at: twoHoursAgo,
      } as any,
    ]
    render(h(TaskStaleAlert), container)

    const listItems = container.querySelectorAll('li')
    expect(listItems.length).toBe(2)
    expect(listItems[0].textContent).toContain('Two hours')
    expect(listItems[1].textContent).toContain('One hour')
  })

  it('truncates task id to 12 chars', () => {
    const oldDate = new Date(Date.now() - 3600 * 1000).toISOString()
    tasks.value = [
      {
        id: 'very-long-task-id-12345',
        title: 'Long id task',
        status: 'claimed',
        updated_at: oldDate,
      } as any,
    ]
    render(h(TaskStaleAlert), container)

    const button = container.querySelector('button[title="very-long-task-id-12345"]')
    expect(button).not.toBeNull()
    expect(button?.textContent?.trim()).toBe('very-long-ta')
  })
})
