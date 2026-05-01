// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'

const mockFetchDashboardGovernance = vi.fn()
const mockFetchGovernanceCaseStatus = vi.fn()
const mockSubmitGovernancePetition = vi.fn()
const mockSubmitGovernanceCaseBrief = vi.fn()
const mockDecideGovernanceExecutionOrder = vi.fn()
const mockResolveGovernanceApproval = vi.fn()
const mockDeleteGovernanceApprovalRule = vi.fn()
const mockShowToast = vi.fn()
const mockRegisterGovernanceRefresh = vi.fn()

const mockResourceState = { value: { status: 'idle' } }
const mockLoad = vi.fn()
const mockReset = vi.fn()

vi.mock('../api', () => ({
  fetchDashboardGovernance: mockFetchDashboardGovernance,
  fetchGovernanceCaseStatus: mockFetchGovernanceCaseStatus,
  submitGovernancePetition: mockSubmitGovernancePetition,
  submitGovernanceCaseBrief: mockSubmitGovernanceCaseBrief,
  decideGovernanceExecutionOrder: mockDecideGovernanceExecutionOrder,
  resolveGovernanceApproval: mockResolveGovernanceApproval,
  deleteGovernanceApprovalRule: mockDeleteGovernanceApprovalRule,
}))

vi.mock('./common/toast', () => ({
  showToast: mockShowToast,
}))

vi.mock('../sse-store', () => ({
  registerGovernanceRefresh: mockRegisterGovernanceRefresh,
}))

vi.mock('../lib/async-state', () => ({
  createAsyncResource: vi.fn(() => ({
    state: mockResourceState,
    load: mockLoad,
    reset: mockReset,
  })),
  getData: vi.fn((s: any) => (s.status === 'loaded' ? s.data : null)),
}))

describe('governance-actions', () => {
  let actions: any
  let signals: any

  beforeEach(async () => {
    vi.resetModules()
    mockFetchDashboardGovernance.mockClear()
    mockFetchGovernanceCaseStatus.mockClear()
    mockSubmitGovernancePetition.mockClear()
    mockSubmitGovernanceCaseBrief.mockClear()
    mockDecideGovernanceExecutionOrder.mockClear()
    mockResolveGovernanceApproval.mockClear()
    mockDeleteGovernanceApprovalRule.mockClear()
    mockShowToast.mockClear()
    mockRegisterGovernanceRefresh.mockClear()
    mockLoad.mockClear()
    mockReset.mockClear()
    mockResourceState.value = { status: 'idle' }
    mockLoad.mockImplementation(async (fn: () => Promise<unknown>) => {
      try {
        const result = await fn()
        mockResourceState.value = { status: 'loaded', data: result }
        return result
      } catch (err) {
        mockResourceState.value = { status: 'error', message: err instanceof Error ? err.message : String(err) }
      }
    })
    actions = await import('./governance-actions')
    signals = await import('./governance-signals')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('registers refresh handler on module load', () => {
    expect(mockRegisterGovernanceRefresh).toHaveBeenCalledTimes(1)
    expect(mockRegisterGovernanceRefresh).toHaveBeenCalledWith(actions.refreshGovernance)
  })

  it('selectDecision sets key and loads detail', async () => {
    const detail = { id: 'c1', status: 'open' }
    mockFetchGovernanceCaseStatus.mockResolvedValue(detail)
    const item = { kind: 'case', id: 'c1', status: 'open' }
    await actions.selectDecision(item)
    expect(signals.selectedDecisionKey.value).toBe('case:c1')
    expect(signals.selectedCaseDetail.value).toEqual(detail)
    expect(signals.detailLoading.value).toBe(false)
  })

  it('refreshGovernance loads data and selects first item', async () => {
    const data = { items: [{ kind: 'case', id: 'c1', status: 'open' }] }
    const detail = { id: 'c1', case: { id: 'c1' } }
    mockFetchDashboardGovernance.mockResolvedValue(data)
    mockFetchGovernanceCaseStatus.mockResolvedValue(detail)
    await actions.refreshGovernance()
    expect(mockFetchDashboardGovernance).toHaveBeenCalledTimes(1)
    expect(signals.selectedDecisionKey.value).toBe('case:c1')
    expect(signals.selectedCaseDetail.value).toEqual(detail)
    expect(signals.governanceError.value).toBe('')
  })

  it('refreshGovernance preserves current selection when still present', async () => {
    const data = {
      items: [
        { kind: 'case', id: 'c1', status: 'open' },
        { kind: 'case', id: 'c2', status: 'open' },
      ],
    }
    const detail = { id: 'c2' }
    mockFetchDashboardGovernance.mockResolvedValue(data)
    mockFetchGovernanceCaseStatus.mockResolvedValue(detail)
    signals.selectedDecisionKey.value = 'case:c2'
    await actions.refreshGovernance()
    expect(signals.selectedDecisionKey.value).toBe('case:c2')
    expect(signals.selectedCaseDetail.value).toEqual(detail)
  })

  it('refreshGovernance sets error on load failure', async () => {
    mockFetchDashboardGovernance.mockRejectedValue(new Error('network fail'))
    await actions.refreshGovernance()
    expect(signals.governanceError.value).toBe('network fail')
  })

  it('submitPetition submits and refreshes', async () => {
    signals.governanceTopicInput.value = 'test petition'
    const created = { case: { id: 'p1' } }
    mockSubmitGovernancePetition.mockResolvedValue(created)
    mockFetchDashboardGovernance.mockResolvedValue({ items: [] })
    await actions.submitPetition()
    expect(mockSubmitGovernancePetition).toHaveBeenCalledWith('test petition')
    expect(signals.governanceTopicInput.value).toBe('')
    expect(mockShowToast).toHaveBeenCalledWith('청원을 접수했습니다: p1', 'success')
    expect(signals.governanceStarting.value).toBe(false)
  })

  it('submitPetition skips empty title', async () => {
    signals.governanceTopicInput.value = '   '
    await actions.submitPetition()
    expect(mockSubmitGovernancePetition).not.toHaveBeenCalled()
    expect(signals.governanceStarting.value).toBe(false)
  })

  it('submitPetition sets error on failure', async () => {
    signals.governanceTopicInput.value = 'fail'
    mockSubmitGovernancePetition.mockRejectedValue(new Error('bad'))
    await actions.submitPetition()
    expect(signals.governanceError.value).toBe('bad')
    expect(mockShowToast).toHaveBeenCalledWith('bad', 'error')
    expect(signals.governanceStarting.value).toBe(false)
  })

  it('submitBrief submits and refreshes', async () => {
    signals.governanceBriefInput.value = 'my brief'
    signals.governanceBriefStance.value = 'support'
    const data = { items: [{ kind: 'case', id: 'c1', status: 'open' }] }
    const bundle = { id: 'c1', briefs: [] }
    mockFetchDashboardGovernance.mockResolvedValue(data)
    mockFetchGovernanceCaseStatus.mockResolvedValue({ id: 'c1' })
    mockSubmitGovernanceCaseBrief.mockResolvedValue(bundle)
    signals.selectedDecisionKey.value = 'case:c1'
    mockResourceState.value = { status: 'loaded', data }
    await actions.submitBrief()
    expect(mockSubmitGovernanceCaseBrief).toHaveBeenCalledWith('c1', 'support', 'my brief')
    expect(signals.governanceBriefInput.value).toBe('')
    expect(signals.selectedCaseDetail.value).toEqual({ id: 'c1' })
    expect(mockShowToast).toHaveBeenCalledWith('심의 의견을 기록했습니다', 'success')
    expect(signals.governanceBriefSubmitting.value).toBe(false)
  })

  it('submitBrief skips when no item', async () => {
    signals.governanceBriefInput.value = 'brief'
    signals.selectedDecisionKey.value = null
    await actions.submitBrief()
    expect(mockSubmitGovernanceCaseBrief).not.toHaveBeenCalled()
  })

  it('submitBrief skips when no summary', async () => {
    signals.governanceBriefInput.value = '   '
    const data = { items: [{ kind: 'case', id: 'c1', status: 'open' }] }
    mockFetchDashboardGovernance.mockResolvedValue(data)
    signals.selectedDecisionKey.value = 'case:c1'
    await actions.submitBrief()
    expect(mockSubmitGovernanceCaseBrief).not.toHaveBeenCalled()
  })

  it('submitBrief sets error on failure', async () => {
    signals.governanceBriefInput.value = 'brief'
    const data = { items: [{ kind: 'case', id: 'c1', status: 'open' }] }
    mockFetchDashboardGovernance.mockResolvedValue(data)
    mockFetchGovernanceCaseStatus.mockResolvedValue({ id: 'c1' })
    mockSubmitGovernanceCaseBrief.mockRejectedValue(new Error('brief fail'))
    signals.selectedDecisionKey.value = 'case:c1'
    mockResourceState.value = { status: 'loaded', data }
    await actions.submitBrief()
    expect(signals.governanceError.value).toBe('brief fail')
    expect(mockShowToast).toHaveBeenCalledWith('brief fail', 'error')
    expect(signals.governanceBriefSubmitting.value).toBe(false)
  })

  it('respondToExecutionOrder confirms', async () => {
    const data = { items: [{ kind: 'case', id: 'c1', status: 'open' }] }
    mockFetchDashboardGovernance.mockResolvedValue(data)
    mockFetchGovernanceCaseStatus.mockResolvedValue({ id: 'c1' })
    mockDecideGovernanceExecutionOrder.mockResolvedValue(undefined)
    signals.selectedDecisionKey.value = 'case:c1'
    mockResourceState.value = { status: 'loaded', data }
    await actions.respondToExecutionOrder('confirm')
    expect(mockDecideGovernanceExecutionOrder).toHaveBeenCalledWith('c1', 'confirm')
    expect(mockShowToast).toHaveBeenCalledWith('집행을 승인했습니다', 'success')
    expect(signals.governanceActing.value).toBe(false)
  })

  it('respondToExecutionOrder denies', async () => {
    const data = { items: [{ kind: 'case', id: 'c1', status: 'open' }] }
    mockFetchDashboardGovernance.mockResolvedValue(data)
    mockFetchGovernanceCaseStatus.mockResolvedValue({ id: 'c1' })
    mockDecideGovernanceExecutionOrder.mockResolvedValue(undefined)
    signals.selectedDecisionKey.value = 'case:c1'
    mockResourceState.value = { status: 'loaded', data }
    await actions.respondToExecutionOrder('deny')
    expect(mockDecideGovernanceExecutionOrder).toHaveBeenCalledWith('c1', 'deny')
    expect(mockShowToast).toHaveBeenCalledWith('집행을 거부했습니다', 'success')
  })

  it('respondToExecutionOrder skips when no item', async () => {
    signals.selectedDecisionKey.value = null
    await actions.respondToExecutionOrder('confirm')
    expect(mockDecideGovernanceExecutionOrder).not.toHaveBeenCalled()
  })

  it('respondToExecutionOrder sets error on failure', async () => {
    const data = { items: [{ kind: 'case', id: 'c1', status: 'open' }] }
    mockFetchDashboardGovernance.mockResolvedValue(data)
    mockFetchGovernanceCaseStatus.mockResolvedValue({ id: 'c1' })
    mockDecideGovernanceExecutionOrder.mockRejectedValue(new Error('exec fail'))
    signals.selectedDecisionKey.value = 'case:c1'
    mockResourceState.value = { status: 'loaded', data }
    await actions.respondToExecutionOrder('confirm')
    expect(signals.governanceError.value).toBe('exec fail')
    expect(mockShowToast).toHaveBeenCalledWith('exec fail', 'error')
    expect(signals.governanceActing.value).toBe(false)
  })

  it('respondToKeeperApproval approves', async () => {
    mockResolveGovernanceApproval.mockResolvedValue(undefined)
    mockFetchDashboardGovernance.mockResolvedValue({ items: [] })
    await actions.respondToKeeperApproval('k1', 'approve')
    expect(mockResolveGovernanceApproval).toHaveBeenCalledWith('k1', 'approve', false)
    expect(mockShowToast).toHaveBeenCalledWith('keeper 승인 요청을 승인했습니다', 'success')
    expect(signals.governanceApprovalActing.value).toBeNull()
  })

  it('respondToKeeperApproval rejects with remember rule', async () => {
    mockResolveGovernanceApproval.mockResolvedValue(undefined)
    mockFetchDashboardGovernance.mockResolvedValue({ items: [] })
    await actions.respondToKeeperApproval('k1', 'reject', true)
    expect(mockResolveGovernanceApproval).toHaveBeenCalledWith('k1', 'reject', true)
    expect(mockShowToast).toHaveBeenCalledWith('keeper 승인 요청을 거부했습니다', 'success')
  })

  it('respondToKeeperApproval skips empty id', async () => {
    await actions.respondToKeeperApproval('', 'approve')
    expect(mockResolveGovernanceApproval).not.toHaveBeenCalled()
  })

  it('respondToKeeperApproval sets error on failure', async () => {
    mockResolveGovernanceApproval.mockRejectedValue(new Error('approval fail'))
    mockFetchDashboardGovernance.mockResolvedValue({ items: [] })
    await actions.respondToKeeperApproval('k1', 'approve')
    expect(signals.governanceError.value).toBe('approval fail')
    expect(mockShowToast).toHaveBeenCalledWith('approval fail', 'error')
    expect(signals.governanceApprovalActing.value).toBeNull()
  })

  it('deleteKeeperApprovalRule deletes and refreshes', async () => {
    mockDeleteGovernanceApprovalRule.mockResolvedValue(undefined)
    mockFetchDashboardGovernance.mockResolvedValue({ items: [] })
    await actions.deleteKeeperApprovalRule('r1')
    expect(mockDeleteGovernanceApprovalRule).toHaveBeenCalledWith('r1')
    expect(mockShowToast).toHaveBeenCalledWith('Always 규칙을 삭제했습니다', 'success')
    expect(signals.governanceApprovalActing.value).toBeNull()
  })

  it('deleteKeeperApprovalRule skips empty id', async () => {
    await actions.deleteKeeperApprovalRule('')
    expect(mockDeleteGovernanceApprovalRule).not.toHaveBeenCalled()
  })

  it('deleteKeeperApprovalRule sets error on failure', async () => {
    mockDeleteGovernanceApprovalRule.mockRejectedValue(new Error('delete fail'))
    mockFetchDashboardGovernance.mockResolvedValue({ items: [] })
    await actions.deleteKeeperApprovalRule('r1')
    expect(signals.governanceError.value).toBe('delete fail')
    expect(mockShowToast).toHaveBeenCalledWith('delete fail', 'error')
    expect(signals.governanceApprovalActing.value).toBeNull()
  })
})
