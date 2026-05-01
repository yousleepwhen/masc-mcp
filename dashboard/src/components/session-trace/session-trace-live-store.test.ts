// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'

describe('session-trace-live-store', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('liveTraceFeeds starts empty', async () => {
    const { liveTraceFeeds } = await import('./session-trace-live-store')
    expect(liveTraceFeeds.value).toEqual({})
  })

  it('ensureLiveTraceSlot creates a slot', async () => {
    const { liveTraceFeeds, ensureLiveTraceSlot } = await import(
      './session-trace-live-store'
    )
    ensureLiveTraceSlot('agent-a')
    expect(liveTraceFeeds.value['agent-a']).toEqual([])
  })

  it('ensureLiveTraceSlot is idempotent', async () => {
    const { liveTraceFeeds, ensureLiveTraceSlot } = await import(
      './session-trace-live-store'
    )
    ensureLiveTraceSlot('agent-a')
    liveTraceFeeds.value['agent-a'].push({ id: 'x' } as any)
    ensureLiveTraceSlot('agent-a')
    expect(liveTraceFeeds.value['agent-a']).toHaveLength(1)
  })

  it('deleteLiveTraceSlot removes a slot', async () => {
    const { liveTraceFeeds, ensureLiveTraceSlot, deleteLiveTraceSlot } =
      await import('./session-trace-live-store')
    ensureLiveTraceSlot('agent-a')
    deleteLiveTraceSlot('agent-a')
    expect(liveTraceFeeds.value['agent-a']).toBeUndefined()
  })

  it('appendLiveToolCall adds event to slot', async () => {
    const { liveTraceFeeds, ensureLiveTraceSlot, appendLiveToolCall } =
      await import('./session-trace-live-store')
    ensureLiveTraceSlot('agent-a')
    appendLiveToolCall('agent-a', {
      toolName: 'search',
      durationMs: 100,
      success: true,
      error: null,
      tsUnix: 1,
    })
    const events = liveTraceFeeds.value['agent-a']
    expect(events).toHaveLength(1)
    expect(events[0].kind).toBe('tool_call')
    expect(events[0].toolName).toBe('search')
  })

  it('appendLiveToolCall deduplicates by id', async () => {
    const { liveTraceFeeds, ensureLiveTraceSlot, appendLiveToolCall } =
      await import('./session-trace-live-store')
    ensureLiveTraceSlot('agent-a')
    appendLiveToolCall('agent-a', {
      toolName: 'search',
      durationMs: 100,
      success: true,
      error: null,
      tsUnix: 1,
    })
    appendLiveToolCall('agent-a', {
      toolName: 'search',
      durationMs: 200,
      success: false,
      error: 'err',
      tsUnix: 1,
    })
    const events = liveTraceFeeds.value['agent-a']
    expect(events).toHaveLength(2)
    expect(events[0].id).not.toBe(events[1].id)
  })

  it('appendLiveToolCall auto-creates slot when provider returns true', async () => {
    const {
      liveTraceFeeds,
      registerLiveTraceSlotProvider,
      appendLiveToolCall,
    } = await import('./session-trace-live-store')
    registerLiveTraceSlotProvider(() => true)
    appendLiveToolCall('agent-b', {
      toolName: 'x',
      durationMs: 1,
      success: true,
      error: null,
      tsUnix: 2,
    })
    expect(liveTraceFeeds.value['agent-b']).toHaveLength(1)
  })

  it('appendLiveToolCall skips when provider returns false and no slot', async () => {
    const { liveTraceFeeds, registerLiveTraceSlotProvider, appendLiveToolCall } =
      await import('./session-trace-live-store')
    registerLiveTraceSlotProvider(() => false)
    appendLiveToolCall('agent-c', {
      toolName: 'x',
      durationMs: 1,
      success: true,
      error: null,
      tsUnix: 3,
    })
    expect(liveTraceFeeds.value['agent-c']).toBeUndefined()
  })

  it('prunes to LIVE_TRACE_LIMIT', async () => {
    const { ensureLiveTraceSlot, appendLiveToolCall } = await import(
      './session-trace-live-store'
    )
    ensureLiveTraceSlot('agent-d')
    for (let i = 0; i < 125; i++) {
      appendLiveToolCall('agent-d', {
        toolName: `t${i}`,
        durationMs: 1,
        success: true,
        error: null,
        tsUnix: i + 1,
      })
    }
    const { liveTraceFeeds } = await import('./session-trace-live-store')
    expect(liveTraceFeeds.value['agent-d']).toHaveLength(120)
  })
})
