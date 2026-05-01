// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'

const mockFetchAutoresearchLoops = vi.fn()
const mockFetchAutoresearchLoopDetail = vi.fn()
const mockRetryAutoresearchLoop = vi.fn()
const mockDeleteAutoresearchLoop = vi.fn()
const mockRequestConfirm = vi.fn()

const mockResourceState = { value: { status: 'idle' } }
const mockLoad = vi.fn()
const mockReset = vi.fn()

vi.mock('../api', () => ({
  fetchAutoresearchLoops: mockFetchAutoresearchLoops,
  fetchAutoresearchLoopDetail: mockFetchAutoresearchLoopDetail,
  retryAutoresearchLoop: mockRetryAutoresearchLoop,
  deleteAutoresearchLoop: mockDeleteAutoresearchLoop,
}))

vi.mock('./common/confirm-dialog', () => ({
  requestConfirm: mockRequestConfirm,
}))

vi.mock('../lib/async-state', () => ({
  createAsyncResource: vi.fn(() => ({
    state: mockResourceState,
    load: mockLoad,
    reset: mockReset,
  })),
}))

describe('autoresearch-state', () => {
  let state: any

  beforeEach(async () => {
    vi.resetModules()
    mockFetchAutoresearchLoops.mockClear()
    mockFetchAutoresearchLoopDetail.mockClear()
    mockRetryAutoresearchLoop.mockClear()
    mockDeleteAutoresearchLoop.mockClear()
    mockRequestConfirm.mockClear()
    mockLoad.mockClear()
    mockReset.mockClear()
    mockResourceState.value = { status: 'idle' }
    state = await import('./autoresearch-state')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('has initial idle state', () => {
    expect(state.selectedLoopId.value).toBeNull()
    expect(state.loopDetail.value).toBeNull()
    expect(state.detailLoading.value).toBe(false)
    expect(state.detailError.value).toBeNull()
    expect(state.loopActionBusy.value).toBe(false)
    expect(state.loopActionError.value).toBeNull()
    expect(state.authorFilter.value).toBe('all')
  })

  it('filteredLoops returns empty when resource idle', () => {
    mockResourceState.value = { status: 'idle' }
    expect(state.filteredLoops.value).toEqual([])
  })

  it('filteredLoops returns all loops when filter is all', () => {
    mockResourceState.value = {
      status: 'loaded',
      data: {
        loops: [
          { loop_id: 'l1', author: 'alice' },
          { loop_id: 'l2', author: 'bob' },
        ],
        total: 2,
      },
    }
    expect(state.filteredLoops.value.length).toBe(2)
  })

  it('filteredLoops filters by author', () => {
    mockResourceState.value = {
      status: 'loaded',
      data: {
        loops: [
          { loop_id: 'l1', author: 'alice' },
          { loop_id: 'l2', author: 'bob' },
        ],
        total: 2,
      },
    }
    state.authorFilter.value = 'alice'
    expect(state.filteredLoops.value.length).toBe(1)
    expect(state.filteredLoops.value[0].loop_id).toBe('l1')
  })

  it('filteredLoops filters unknown author', () => {
    mockResourceState.value = {
      status: 'loaded',
      data: {
        loops: [
          { loop_id: 'l1', author: 'alice' },
          { loop_id: 'l2', author: null },
        ],
        total: 2,
      },
    }
    state.authorFilter.value = 'unknown'
    expect(state.filteredLoops.value.length).toBe(1)
    expect(state.filteredLoops.value[0].loop_id).toBe('l2')
  })

  it('availableAuthors extracts unique sorted authors', () => {
    mockResourceState.value = {
      status: 'loaded',
      data: {
        loops: [
          { loop_id: 'l1', author: 'bob' },
          { loop_id: 'l2', author: 'alice' },
          { loop_id: 'l3', author: 'bob' },
          { loop_id: 'l4', author: null },
        ],
        total: 4,
      },
    }
    expect(state.availableAuthors.value).toEqual(['alice', 'bob'])
  })

  it('hasMoreLoops returns false when loaded total equals loops length', () => {
    mockResourceState.value = {
      status: 'loaded',
      data: { loops: [{ loop_id: 'l1' }], total: 1 },
    }
    expect(state.hasMoreLoops.value).toBe(false)
  })

  it('hasMoreLoops returns true when more exist', () => {
    mockResourceState.value = {
      status: 'loaded',
      data: { loops: [{ loop_id: 'l1' }], total: 5 },
    }
    expect(state.hasMoreLoops.value).toBe(true)
  })

  it('selectedLoop finds loop by selectedLoopId', () => {
    mockResourceState.value = {
      status: 'loaded',
      data: {
        loops: [
          { loop_id: 'l1', author: 'alice' },
          { loop_id: 'l2', author: 'bob' },
        ],
        total: 2,
      },
    }
    state.selectedLoopId.value = 'l2'
    expect(state.selectedLoop.value?.loop_id).toBe('l2')
  })

  it('selectedLoop returns null when not found', () => {
    mockResourceState.value = {
      status: 'loaded',
      data: { loops: [{ loop_id: 'l1' }], total: 1 },
    }
    state.selectedLoopId.value = 'missing'
    expect(state.selectedLoop.value).toBeNull()
  })

  it('loadLoops delegates to resource load and selects first loop', async () => {
    const data = { loops: [{ loop_id: 'l1' }], total: 1 }
    mockFetchAutoresearchLoops.mockResolvedValue(data)
    mockLoad.mockImplementation(async (fn: () => Promise<unknown>) => {
      const result = await fn()
      mockResourceState.value = { status: 'loaded', data: result }
      return result
    })
    await state.loadLoops()
    expect(mockFetchAutoresearchLoops).toHaveBeenCalledWith(0, 100)
    expect(state.selectedLoopId.value).toBe('l1')
  })

  it('loadLoops preserves selected loop when still present', async () => {
    const data = {
      loops: [
        { loop_id: 'l1' },
        { loop_id: 'l2' },
      ],
      total: 2,
    }
    mockFetchAutoresearchLoops.mockResolvedValue(data)
    mockLoad.mockImplementation(async (fn: () => Promise<unknown>) => {
      const result = await fn()
      mockResourceState.value = { status: 'loaded', data: result }
      return result
    })
    state.selectedLoopId.value = 'l2'
    await state.loadLoops()
    expect(state.selectedLoopId.value).toBe('l2')
  })

  it('loadDetail fetches detail and stores it', async () => {
    const detail = { loop_id: 'l1', status: 'running' }
    mockFetchAutoresearchLoopDetail.mockResolvedValue(detail)
    state.selectedLoopId.value = 'l1'
    await state.loadDetail('l1')
    expect(state.loopDetail.value).toEqual(detail)
    expect(state.detailLoading.value).toBe(false)
    expect(state.detailError.value).toBeNull()
  })

  it('loadDetail sets error on failure', async () => {
    mockFetchAutoresearchLoopDetail.mockRejectedValue(new Error('fetch fail'))
    state.selectedLoopId.value = 'l1'
    await state.loadDetail('l1')
    expect(state.loopDetail.value).toBeNull()
    expect(state.detailError.value).toBe('fetch fail')
    expect(state.detailLoading.value).toBe(false)
  })

  it('loadDetail discards stale response when loopId changed', async () => {
    mockFetchAutoresearchLoopDetail.mockImplementation(async () => {
      state.selectedLoopId.value = 'l2'
      return { loop_id: 'l1' }
    })
    state.selectedLoopId.value = 'l1'
    await state.loadDetail('l1')
    expect(state.loopDetail.value).toBeNull()
  })

  it('selectLoop sets id and loads detail', async () => {
    const detail = { loop_id: 'l1', status: 'running' }
    mockFetchAutoresearchLoopDetail.mockResolvedValue(detail)
    state.selectLoop('l1')
    await new Promise(r => setTimeout(r, 10))
    expect(state.selectedLoopId.value).toBe('l1')
    expect(state.loopDetail.value).toEqual(detail)
  })

  it('loadMoreLoops increments limit and reloads', async () => {
    const data = { loops: [{ loop_id: 'l1' }], total: 1 }
    mockFetchAutoresearchLoops.mockResolvedValue(data)
    mockLoad.mockImplementation(async (fn: () => Promise<unknown>) => {
      const result = await fn()
      mockResourceState.value = { status: 'loaded', data: result }
      return result
    })
    await state.loadMoreLoops()
    expect(mockFetchAutoresearchLoops).toHaveBeenCalledWith(0, 200)
  })

  it('retrySelectedLoop calls API and refreshes', async () => {
    mockResourceState.value = {
      status: 'loaded',
      data: { loops: [{ loop_id: 'l1' }], total: 1 },
    }
    state.selectedLoopId.value = 'l1'
    mockRetryAutoresearchLoop.mockResolvedValue(undefined)
    mockFetchAutoresearchLoops.mockResolvedValue({ loops: [{ loop_id: 'l1' }], total: 1 })
    mockLoad.mockImplementation(async (fn: () => Promise<unknown>) => {
      const result = await fn()
      mockResourceState.value = { status: 'loaded', data: result }
      return result
    })
    await state.retrySelectedLoop()
    expect(mockRetryAutoresearchLoop).toHaveBeenCalledWith('l1')
    expect(state.loopActionBusy.value).toBe(false)
  })

  it('deleteSelectedLoop confirms before deleting', async () => {
    mockResourceState.value = {
      status: 'loaded',
      data: { loops: [{ loop_id: 'l1' }], total: 1 },
    }
    state.selectedLoopId.value = 'l1'
    mockRequestConfirm.mockResolvedValue(false)
    mockDeleteAutoresearchLoop.mockResolvedValue(undefined)
    await state.deleteSelectedLoop()
    expect(mockRequestConfirm).toHaveBeenCalled()
    expect(mockDeleteAutoresearchLoop).not.toHaveBeenCalled()
  })

  it('deleteSelectedLoop deletes after confirm', async () => {
    mockResourceState.value = {
      status: 'loaded',
      data: { loops: [{ loop_id: 'l1' }], total: 1 },
    }
    state.selectedLoopId.value = 'l1'
    mockRequestConfirm.mockResolvedValue(true)
    mockDeleteAutoresearchLoop.mockResolvedValue(undefined)
    mockFetchAutoresearchLoops.mockResolvedValue({ loops: [], total: 0 })
    mockLoad.mockImplementation(async (fn: () => Promise<unknown>) => {
      const result = await fn()
      mockResourceState.value = { status: 'loaded', data: result }
      return result
    })
    await state.deleteSelectedLoop()
    expect(mockDeleteAutoresearchLoop).toHaveBeenCalledWith('l1')
    expect(state.loopActionBusy.value).toBe(false)
  })

  it('resetAutoresearchState clears everything', () => {
    state.selectedLoopId.value = 'l1'
    state.loopDetail.value = { loop_id: 'l1' }
    state.detailLoading.value = true
    state.detailError.value = 'err'
    state.loopActionBusy.value = true
    state.loopActionError.value = 'err'
    const mockResetForm = vi.fn()
    state.resetAutoresearchState(mockResetForm)
    expect(state.selectedLoopId.value).toBeNull()
    expect(state.loopDetail.value).toBeNull()
    expect(state.detailLoading.value).toBe(false)
    expect(state.detailError.value).toBeNull()
    expect(state.loopActionBusy.value).toBe(false)
    expect(state.loopActionError.value).toBeNull()
    expect(mockResetForm).toHaveBeenCalled()
    expect(mockReset).toHaveBeenCalled()
  })

  it('refreshAutoresearchSurface refreshes with detail', async () => {
    const data = { loops: [{ loop_id: 'l1' }], total: 1 }
    mockFetchAutoresearchLoops.mockResolvedValue(data)
    mockLoad.mockImplementation(async (fn: () => Promise<unknown>) => {
      const result = await fn()
      mockResourceState.value = { status: 'loaded', data: result }
      return result
    })
    await state.refreshAutoresearchSurface()
    expect(mockFetchAutoresearchLoops).toHaveBeenCalled()
  })
})
