// @ts-nocheck
import { describe, expect, it, beforeEach, vi } from 'vitest'

describe('agent-detail-selection', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('exports selectedAgentName with initial null', async () => {
    const { selectedAgentName } = await import('./agent-detail-selection')
    expect(selectedAgentName.value).toBeNull()
  })

  it('selectedAgentName is writable', async () => {
    const { selectedAgentName } = await import('./agent-detail-selection')
    selectedAgentName.value = 'keeper-alpha'
    expect(selectedAgentName.value).toBe('keeper-alpha')
  })
})
