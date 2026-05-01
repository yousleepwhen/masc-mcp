// @ts-nocheck
import { describe, expect, it, beforeEach, vi } from 'vitest'

describe('task-detail-selection', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('exports selectedTask with initial null', async () => {
    const { selectedTask } = await import('./task-detail-selection')
    expect(selectedTask.value).toBeNull()
  })

  it('selectedTask accepts a Task object', async () => {
    const { selectedTask } = await import('./task-detail-selection')
    const task = { id: 't1', title: 'Test task', status: 'todo' }
    selectedTask.value = task
    expect(selectedTask.value).toEqual(task)
  })
})
