import { signal } from '@preact/signals'
import { callMcpTool } from '../../api/mcp'
import { showToast } from '../common/toast'
import { refreshExecution } from '../../store'

export const showTaskCreate = signal(false)
export const taskCreating = signal(false)

interface TaskCreateInput {
  title: string
  description: string
  priority?: number
  goal_id?: string | null
}

interface TaskCreateContractInput {
  strict: boolean
  completion_contract: string[]
  required_evidence: string[]
  verify_gate_evidence: string[]
}

function buildDefaultTaskContract(): TaskCreateContractInput {
  return {
    // Keep dashboard-created tasks advisory so CDAL gate does not hard-block
    // completion in rooms that enforce verdict lookup, while still engaging
    // the verification FSM once completion_contract/evidence are present.
    strict: false,
    completion_contract: ['deliverable-ready'],
    required_evidence: ['completion_notes', 'run_deliverable'],
    verify_gate_evidence: ['completion_notes', 'run_deliverable'],
  }
}

export async function createTask(input: TaskCreateInput): Promise<boolean> {
  if (!input.title.trim()) { showToast('제목을 입력하세요', 'error'); return false }
  taskCreating.value = true
  try {
    const args: Record<string, unknown> = {
      title: input.title.trim(),
      description: input.description.trim(),
      contract: buildDefaultTaskContract(),
    }
    if (input.priority) args.priority = input.priority
    if (input.goal_id?.trim()) args.goal_id = input.goal_id.trim()
    await callMcpTool('masc_add_task', args)
    showToast('태스크 생성 완료', 'success')
    showTaskCreate.value = false
    await refreshExecution({ force: true })
    return true
  } catch (err) {
    showToast(`태스크 생성 실패: ${err instanceof Error ? err.message : String(err)}`, 'error')
    return false
  } finally {
    taskCreating.value = false
  }
}
