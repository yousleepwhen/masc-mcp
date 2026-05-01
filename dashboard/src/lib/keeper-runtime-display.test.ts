import { describe, it, expect } from 'vitest'
import {
  keeperDisplayModel,
  keeperRuntimeBlockerHint,
} from './keeper-runtime-display'

describe('keeperDisplayModel', () => {
  it('returns last_model_used_label when present', () => {
    const result = keeperDisplayModel({
      last_model_used_label: 'Claude 4',
    })
    expect(result).toEqual({ label: '최근 모델', value: 'Claude 4' })
  })

  it('falls back to last_model_used', () => {
    const result = keeperDisplayModel({
      last_model_used: 'gpt-4',
    })
    expect(result).toEqual({ label: '최근 모델', value: 'gpt-4' })
  })

  it('prefers active_model_label over active_model', () => {
    const result = keeperDisplayModel({
      active_model_label: 'Gemini Pro',
      active_model: 'gemini-1.5',
    })
    expect(result).toEqual({ label: '현재 모델', value: 'Gemini Pro' })
  })

  it('returns null when all fields are empty', () => {
    const result = keeperDisplayModel({})
    expect(result).toBeNull()
  })

  it('skips placeholder values', () => {
    const result = keeperDisplayModel({
      last_model_used: 'unknown',
      active_model: 'real-model',
    })
    expect(result).toEqual({ label: '현재 모델', value: 'real-model' })
  })
})

describe('keeperRuntimeBlockerHint', () => {
  it('returns null for null keeper', () => {
    expect(keeperRuntimeBlockerHint(null)).toBeNull()
  })

  it('returns null for undefined keeper', () => {
    expect(keeperRuntimeBlockerHint(undefined)).toBeNull()
  })

  it('returns continue gate hint when flag is set', () => {
    const result = keeperRuntimeBlockerHint({
      runtime_blocker_continue_gate: true,
      runtime_blocker_summary: 'waiting for approval',
    } as any)
    expect(result).toContain('계속 진행 승인 대기')
    expect(result).toContain('waiting for approval')
  })

  it('returns ambiguous_post_commit_timeout message', () => {
    const result = keeperRuntimeBlockerHint({
      runtime_blocker_class: 'ambiguous_post_commit_timeout',
    } as any)
    expect(result).toContain('응답이 끊겨')
  })

  it('returns ambiguous_post_commit_failure message', () => {
    const result = keeperRuntimeBlockerHint({
      runtime_blocker_class: 'ambiguous_post_commit_failure',
    } as any)
    expect(result).toContain('실패가 있어')
  })

  it('returns turn_timeout message', () => {
    const result = keeperRuntimeBlockerHint({
      runtime_blocker_class: 'turn_timeout',
    } as any)
    expect(result).toContain('제한 시간을 초과')
  })

  it('returns null for unrecognized blocker class', () => {
    const result = keeperRuntimeBlockerHint({
      runtime_blocker_class: 'something_else',
    } as any)
    expect(result).toBeNull()
  })
})
