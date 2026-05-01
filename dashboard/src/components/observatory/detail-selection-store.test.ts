// @ts-nocheck
import { describe, expect, it, beforeEach, vi } from 'vitest'

describe('detail-selection-store', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('detailSelection starts as null', async () => {
    const { detailSelection } = await import('./detail-selection-store')
    expect(detailSelection.value).toBeNull()
  })

  it('selectEntity sets the selection', async () => {
    const { detailSelection, selectEntity } = await import(
      './detail-selection-store'
    )
    const selection = {
      kind: 'event',
      entry: { source: 'test' },
      ts: Date.now(),
      bucketCount: 1,
    }
    selectEntity(selection)
    expect(detailSelection.value).toEqual(selection)
  })

  it('selectEntity overwrites previous selection', async () => {
    const { detailSelection, selectEntity } = await import(
      './detail-selection-store'
    )
    selectEntity({
      kind: 'event',
      entry: { source: 'first' },
      ts: 1,
      bucketCount: 1,
    })
    selectEntity({
      kind: 'tool_call',
      entry: { source: 'second', tool_name: 'search' },
      ts: 2,
      bucketCount: 3,
    })
    expect(detailSelection.value!.kind).toBe('tool_call')
    expect(detailSelection.value!.bucketCount).toBe(3)
  })

  it('clearSelection resets to null', async () => {
    const { detailSelection, selectEntity, clearSelection } = await import(
      './detail-selection-store'
    )
    selectEntity({
      kind: 'event',
      entry: { source: 'x' },
      ts: 1,
      bucketCount: 1,
    })
    clearSelection()
    expect(detailSelection.value).toBeNull()
  })
})
