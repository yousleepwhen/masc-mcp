import { beforeEach, describe, expect, it, vi } from 'vitest'

const { callMcpTool, showToast, refreshExecution } = vi.hoisted(() => ({
  callMcpTool: vi.fn(),
  showToast: vi.fn(),
  refreshExecution: vi.fn(async () => {}),
}))

vi.mock('../../api/mcp', () => ({
  callMcpTool,
}))

vi.mock('../common/toast', () => ({
  showToast,
}))

vi.mock('../../store', () => ({
  refreshExecution,
}))

import {
  createTask,
  showTaskCreate,
  taskCreating,
} from './task-manage-state'

describe('task-manage-state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    showTaskCreate.value = true
    taskCreating.value = false
  })

  it('adds the default advisory verification contract when creating a task', async () => {
    callMcpTool.mockResolvedValueOnce('{}')

    const ok = await createTask({
      title: '  tighten verification flow  ',
      description: '  keep done out of direct completion  ',
      priority: 2,
      goal_id: ' goal-123 ',
    })

    expect(ok).toBe(true)
    expect(callMcpTool).toHaveBeenCalledWith('masc_add_task', {
      title: 'tighten verification flow',
      description: 'keep done out of direct completion',
      priority: 2,
      goal_id: 'goal-123',
      contract: {
        strict: false,
        completion_contract: ['deliverable-ready'],
        required_evidence: ['completion_notes', 'run_deliverable'],
        verify_gate_evidence: ['completion_notes', 'run_deliverable'],
      },
    })
    expect(showToast).toHaveBeenCalledWith('태스크 생성 완료', 'success')
    expect(refreshExecution).toHaveBeenCalledWith({ force: true })
    expect(showTaskCreate.value).toBe(false)
    expect(taskCreating.value).toBe(false)
  })
})
