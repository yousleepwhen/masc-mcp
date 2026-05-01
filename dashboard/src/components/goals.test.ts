// @ts-nocheck
import { describe, expect, it } from 'vitest'

describe('goals barrel', () => {
  it('re-exports Planning', async () => {
    const mod = await import('./goals')
    expect(mod.Planning).toBeDefined()
    expect(typeof mod.Planning).toBe('function')
  })
})
