// @ts-nocheck
import { describe, expect, it, beforeEach, vi } from 'vitest'

describe('activity-graph-selection', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('exports selectedNodeId with initial null', async () => {
    const { selectedNodeId } = await import('./activity-graph-selection')
    expect(selectedNodeId.value).toBeNull()
  })

  it('exports highlightedAgentId with initial null', async () => {
    const { highlightedAgentId } = await import('./activity-graph-selection')
    expect(highlightedAgentId.value).toBeNull()
  })

  it('selectedNodeId is writable', async () => {
    const { selectedNodeId } = await import('./activity-graph-selection')
    selectedNodeId.value = 'node-1'
    expect(selectedNodeId.value).toBe('node-1')
  })

  it('highlightedAgentId is writable', async () => {
    const { highlightedAgentId } = await import('./activity-graph-selection')
    highlightedAgentId.value = 'agent-alpha'
    expect(highlightedAgentId.value).toBe('agent-alpha')
  })
})
