import { describe, expect, it } from 'vitest'

import { statusLabel } from './feature-health'

describe('statusLabel', () => {
  // FIXME: Add a minimal component-level test that exercises filtering and validates the rendered status chip tone/labels.
  it.each([
    ['healthy', '정상'],
    ['warning', '실험적'],
    ['inactive', '비활성'],
    ['deprecated', '폐기 예정'],
  ] as const)('statusLabel(%s) → %s', (status, expected) => {
    expect(statusLabel(status)).toBe(expected)
  })
})

