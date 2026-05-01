// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'

describe('keeper-trajectory-timeline', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loadTrajectory calls fetchKeeperTrajectory with keeper name and default limit', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ entries: [] })
    vi.doMock('../api/dashboard', () => ({
      fetchKeeperTrajectory: mockFetch,
    }))
    const { loadTrajectory } = await import('./keeper-trajectory-timeline')
    await loadTrajectory('keeper-a')
    expect(mockFetch).toHaveBeenCalledWith('keeper-a', 50)
  })

  it('loadTrajectory handles fetch success', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ entries: [{ ts: 1, tool_name: 'search' }] })
    vi.doMock('../api/dashboard', () => ({
      fetchKeeperTrajectory: mockFetch,
    }))
    const { loadTrajectory } = await import('./keeper-trajectory-timeline')
    await expect(loadTrajectory('keeper-b')).resolves.toBeUndefined()
  })

  it('loadTrajectory handles fetch error', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('network down'))
    vi.doMock('../api/dashboard', () => ({
      fetchKeeperTrajectory: mockFetch,
    }))
    const { loadTrajectory } = await import('./keeper-trajectory-timeline')
    await expect(loadTrajectory('keeper-c')).resolves.toBeUndefined()
    expect(mockFetch).toHaveBeenCalledWith('keeper-c', 50)
  })

  it('loadTrajectory handles non-Error throw', async () => {
    const mockFetch = vi.fn().mockRejectedValue('string-error')
    vi.doMock('../api/dashboard', () => ({
      fetchKeeperTrajectory: mockFetch,
    }))
    const { loadTrajectory } = await import('./keeper-trajectory-timeline')
    await expect(loadTrajectory('keeper-d')).resolves.toBeUndefined()
  })
})
