// @ts-nocheck
import { describe, expect, it, beforeEach, vi } from 'vitest'

describe('governance-signals', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('governanceLoading starts as false', async () => {
    const { governanceLoading } = await import('./governance-signals')
    expect(governanceLoading.value).toBe(false)
  })

  it('governanceError starts as empty string', async () => {
    const { governanceError } = await import('./governance-signals')
    expect(governanceError.value).toBe('')
  })

  it('governanceData starts as null', async () => {
    const { governanceData } = await import('./governance-signals')
    expect(governanceData.value).toBeNull()
  })

  it('governanceStarting starts as false', async () => {
    const { governanceStarting } = await import('./governance-signals')
    expect(governanceStarting.value).toBe(false)
  })

  it('governanceActing starts as false', async () => {
    const { governanceActing } = await import('./governance-signals')
    expect(governanceActing.value).toBe(false)
  })

  it('governanceBriefSubmitting starts as false', async () => {
    const { governanceBriefSubmitting } = await import('./governance-signals')
    expect(governanceBriefSubmitting.value).toBe(false)
  })

  it('governanceApprovalActing starts as null', async () => {
    const { governanceApprovalActing } = await import('./governance-signals')
    expect(governanceApprovalActing.value).toBeNull()
  })

  it('governanceTopicInput starts as empty string', async () => {
    const { governanceTopicInput } = await import('./governance-signals')
    expect(governanceTopicInput.value).toBe('')
  })

  it('governanceBriefInput starts as empty string', async () => {
    const { governanceBriefInput } = await import('./governance-signals')
    expect(governanceBriefInput.value).toBe('')
  })

  it('governanceBriefStance starts as support', async () => {
    const { governanceBriefStance } = await import('./governance-signals')
    expect(governanceBriefStance.value).toBe('support')
  })

  it('governanceFilter starts as open', async () => {
    const { governanceFilter } = await import('./governance-signals')
    expect(governanceFilter.value).toBe('open')
  })

  it('selectedDecisionKey starts as null', async () => {
    const { selectedDecisionKey } = await import('./governance-signals')
    expect(selectedDecisionKey.value).toBeNull()
  })

  it('selectedCaseDetail starts as null', async () => {
    const { selectedCaseDetail } = await import('./governance-signals')
    expect(selectedCaseDetail.value).toBeNull()
  })

  it('detailLoading starts as false', async () => {
    const { detailLoading } = await import('./governance-signals')
    expect(detailLoading.value).toBe(false)
  })
})
