// @ts-nocheck
import { describe, expect, it } from 'vitest'

describe('tools barrel', () => {
  it('re-exports Tools', async () => {
    const mod = await import('./tools')
    expect(mod.Tools).toBeDefined()
    expect(typeof mod.Tools).toBe('function')
  })
})
