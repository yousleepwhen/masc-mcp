// @ts-nocheck
import { describe, expect, it } from 'vitest'

describe('governance-store barrel', () => {
  it('re-exports signals and actions', async () => {
    const mod = await import('./governance-store')
    expect(mod.governanceLoading).toBeDefined()
    expect(mod.governanceStarting).toBeDefined()
    expect(mod.governanceActing).toBeDefined()
    expect(mod.governanceBriefSubmitting).toBeDefined()
    expect(mod.governanceApprovalActing).toBeDefined()
    expect(mod.governanceError).toBeDefined()
    expect(mod.governanceTopicInput).toBeDefined()
    expect(mod.governanceBriefInput).toBeDefined()
    expect(mod.governanceBriefStance).toBeDefined()
    expect(mod.governanceFilter).toBeDefined()
    expect(mod.governanceData).toBeDefined()
    expect(mod.selectedDecisionKey).toBeDefined()
    expect(mod.selectedCaseDetail).toBeDefined()
    expect(mod.detailLoading).toBeDefined()
    expect(mod.selectDecision).toBeDefined()
    expect(mod.refreshGovernance).toBeDefined()
    expect(mod.submitPetition).toBeDefined()
    expect(mod.submitBrief).toBeDefined()
    expect(mod.respondToExecutionOrder).toBeDefined()
    expect(mod.respondToKeeperApproval).toBeDefined()
    expect(mod.deleteKeeperApprovalRule).toBeDefined()
  })
})
