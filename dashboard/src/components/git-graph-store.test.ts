// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'

vi.mock('../api/git-graph', () => ({
  fetchGitGraph: vi.fn(),
}))

describe('git-graph-store', () => {
  let fetchGitGraph: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules()
    const api = await import('../api/git-graph')
    fetchGitGraph = api.fetchGitGraph
    fetchGitGraph.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts with null data and not loading', async () => {
    const { gitGraphResource } = await import('./git-graph-store')
    expect(gitGraphResource.state.value.data).toBeNull()
    expect(gitGraphResource.state.value.loading).toBe(false)
    expect(gitGraphResource.state.value.error).toBeNull()
  })

  it('refreshGitGraph calls fetchGitGraph with limit 160', async () => {
    const { gitGraphResource, refreshGitGraph } = await import(
      './git-graph-store'
    )
    const mockData = { nodes: [], edges: [] }
    fetchGitGraph.mockResolvedValue(mockData)

    await refreshGitGraph()
    await Promise.resolve()

    expect(fetchGitGraph).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 160 }),
    )
  })

  it('refreshGitGraph populates data on success', async () => {
    const { gitGraphResource, refreshGitGraph } = await import(
      './git-graph-store'
    )
    const mockData = { nodes: [{ id: 'a' }], edges: [] }
    fetchGitGraph.mockResolvedValue(mockData)

    await refreshGitGraph()
    await Promise.resolve()

    expect(gitGraphResource.state.value.data).toEqual(mockData)
    expect(gitGraphResource.state.value.loading).toBe(false)
    expect(gitGraphResource.state.value.error).toBeNull()
  })

  it('refreshGitGraph sets error on failure', async () => {
    const { gitGraphResource, refreshGitGraph } = await import(
      './git-graph-store'
    )
    fetchGitGraph.mockRejectedValue(new Error('network down'))

    await refreshGitGraph()
    await Promise.resolve()

    expect(gitGraphResource.state.value.error).toBe('network down')
    expect(gitGraphResource.state.value.loading).toBe(false)
  })

  it('cancelGitGraphRefresh cancels in-flight request', async () => {
    const { gitGraphResource, refreshGitGraph, cancelGitGraphRefresh } =
      await import('./git-graph-store')

    let resolveFetch: (v: unknown) => void
    fetchGitGraph.mockImplementation(() => {
      return new Promise((resolve) => {
        resolveFetch = resolve
      })
    })

    refreshGitGraph()
    await Promise.resolve()
    expect(gitGraphResource.state.value.loading).toBe(true)

    cancelGitGraphRefresh()
    await Promise.resolve()

    expect(gitGraphResource.state.value.loading).toBe(false)
    if (resolveFetch) resolveFetch({ nodes: [] })
  })

  it('abort signal is passed to fetchGitGraph', async () => {
    const { refreshGitGraph } = await import('./git-graph-store')
    fetchGitGraph.mockResolvedValue({ nodes: [] })

    await refreshGitGraph()
    const callArg = fetchGitGraph.mock.calls[0][0]
    expect(callArg).toHaveProperty('signal')
    expect(callArg.signal).toBeInstanceOf(AbortSignal)
  })
})
