// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { h } from 'preact'
import { render } from 'preact'

vi.mock('../api', () => ({
  startAutoresearchLoop: vi.fn(),
}))
vi.mock('./autoresearch-state', () => ({
  refreshAutoresearchSurface: vi.fn(),
}))
vi.mock('./common/dialog', () => ({
  DialogOverlay: ({ children }) =>
    h('div', { 'data-testid': 'dialog-overlay' }, children),
}))

describe('autoresearch-form', () => {
  let container: HTMLDivElement
  let mod: any

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    mod = await import('./autoresearch-form')
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    render(null, container)
    container.remove()
  })

  it('StartFormButton opens form on click', () => {
    const { StartFormButton, showStartForm } = mod
    expect(showStartForm.value).toBe(false)
    render(h(StartFormButton, null), container)
    const btn = container.querySelector('button')
    expect(btn).not.toBeNull()
    btn!.click()
    expect(showStartForm.value).toBe(true)
  })

  it('StartAutoresearchForm renders dialog and required fields', () => {
    const { StartAutoresearchForm } = mod
    render(h(StartAutoresearchForm, null), container)
    expect(container.textContent).toContain('새 오토리서치 루프')
    expect(container.textContent).toContain('목표')
    expect(container.textContent).toContain('메트릭 명령어')
    expect(container.textContent).toContain('대상 파일')
  })

  it('disables submit when required fields are empty', () => {
    const { StartAutoresearchForm } = mod
    render(h(StartAutoresearchForm, null), container)
    const submitBtn = Array.from(container.querySelectorAll('button')).find(
      b => b.textContent?.includes('시작'),
    )
    expect(submitBtn).not.toBeUndefined()
    expect(submitBtn!.disabled).toBe(true)
  })

  it('enables submit when required fields are filled', async () => {
    const { StartAutoresearchForm } = mod
    render(h(StartAutoresearchForm, null), container)

    const textarea = container.querySelector('textarea')
    const inputs = container.querySelectorAll('input')
    expect(textarea).not.toBeNull()
    expect(inputs.length).toBeGreaterThanOrEqual(2)

    textarea!.value = 'optimize latency'
    textarea!.dispatchEvent(new Event('input', { bubbles: true }))
    inputs[0]!.value = 'python eval.py'
    inputs[0]!.dispatchEvent(new Event('input', { bubbles: true }))
    inputs[1]!.value = 'lib/optimizer.ml'
    inputs[1]!.dispatchEvent(new Event('input', { bubbles: true }))

    render(h(StartAutoresearchForm, null), container)
    const submitBtn = Array.from(container.querySelectorAll('button')).find(
      b => b.textContent?.includes('시작'),
    )
    expect(submitBtn!.disabled).toBe(false)
  })

  it('toggles advanced settings', () => {
    const { StartAutoresearchForm } = mod
    render(h(StartAutoresearchForm, null), container)
    expect(container.textContent).not.toContain('작업 디렉토리')

    const toggleBtn = Array.from(container.querySelectorAll('button')).find(
      b => b.textContent?.includes('고급 설정'),
    )
    expect(toggleBtn).not.toBeUndefined()
    toggleBtn!.click()
    render(h(StartAutoresearchForm, null), container)
    expect(container.textContent).toContain('작업 디렉토리')

    toggleBtn!.click()
    render(h(StartAutoresearchForm, null), container)
    expect(container.textContent).not.toContain('작업 디렉토리')
  })

  it('calls startAutoresearchLoop with params on submit', async () => {
    const { startAutoresearchLoop } = await import('../api')
    const { StartAutoresearchForm } = mod
    startAutoresearchLoop.mockResolvedValue({ ok: true })

    render(h(StartAutoresearchForm, null), container)

    const textarea = container.querySelector('textarea')
    const inputs = container.querySelectorAll('input')
    textarea!.value = 'goal'
    textarea!.dispatchEvent(new Event('input', { bubbles: true }))
    inputs[0]!.value = 'metric'
    inputs[0]!.dispatchEvent(new Event('input', { bubbles: true }))
    inputs[1]!.value = 'target.ml'
    inputs[1]!.dispatchEvent(new Event('input', { bubbles: true }))

    // Expand advanced settings and fill workdir + max cycles
    const toggleBtn = Array.from(container.querySelectorAll('button')).find(
      b => b.textContent?.includes('고급 설정'),
    )
    toggleBtn!.click()
    render(h(StartAutoresearchForm, null), container)

    const advancedInputs = container.querySelectorAll('input')
    // advancedInputs order: metric_fn, target_file, workdir, model, maxCycles, cycleTimeout, baseline, patience, buildVerifyFn
    advancedInputs[2]!.value = 'src'
    advancedInputs[2]!.dispatchEvent(new Event('input', { bubbles: true }))
    advancedInputs[4]!.value = '42'
    advancedInputs[4]!.dispatchEvent(new Event('input', { bubbles: true }))

    render(h(StartAutoresearchForm, null), container)
    const submitBtn = Array.from(container.querySelectorAll('button')).find(
      b => b.textContent?.includes('시작'),
    )
    submitBtn!.click()
    await Promise.resolve()
    await Promise.resolve()

    expect(startAutoresearchLoop).toHaveBeenCalledWith({
      goal: 'goal',
      metric_fn: 'metric',
      target_file: 'target.ml',
      workdir: 'src',
      max_cycles: 42,
      cycle_timeout_s: 300,
      model_model: 'glm',
    })
  })

  it('closes form and resets fields on success', async () => {
    const { startAutoresearchLoop } = await import('../api')
    const { StartAutoresearchForm, showStartForm } = mod
    startAutoresearchLoop.mockResolvedValue({ ok: true })

    showStartForm.value = true
    render(h(StartAutoresearchForm, null), container)

    const textarea = container.querySelector('textarea')
    const inputs = container.querySelectorAll('input')
    textarea!.value = 'goal'
    textarea!.dispatchEvent(new Event('input', { bubbles: true }))
    inputs[0]!.value = 'metric'
    inputs[0]!.dispatchEvent(new Event('input', { bubbles: true }))
    inputs[1]!.value = 'target.ml'
    inputs[1]!.dispatchEvent(new Event('input', { bubbles: true }))

    render(h(StartAutoresearchForm, null), container)
    const submitBtn = Array.from(container.querySelectorAll('button')).find(
      b => b.textContent?.includes('시작'),
    )
    submitBtn!.click()
    await Promise.resolve()
    await Promise.resolve()

    expect(showStartForm.value).toBe(false)
  })

  it('shows error when startAutoresearchLoop fails', async () => {
    const { startAutoresearchLoop } = await import('../api')
    const { StartAutoresearchForm } = mod
    startAutoresearchLoop.mockResolvedValue({ ok: false, error: 'server down' })

    render(h(StartAutoresearchForm, null), container)

    const textarea = container.querySelector('textarea')
    const inputs = container.querySelectorAll('input')
    textarea!.value = 'goal'
    textarea!.dispatchEvent(new Event('input', { bubbles: true }))
    inputs[0]!.value = 'metric'
    inputs[0]!.dispatchEvent(new Event('input', { bubbles: true }))
    inputs[1]!.value = 'target.ml'
    inputs[1]!.dispatchEvent(new Event('input', { bubbles: true }))

    render(h(StartAutoresearchForm, null), container)
    const submitBtn = Array.from(container.querySelectorAll('button')).find(
      b => b.textContent?.includes('시작'),
    )
    submitBtn!.click()
    await Promise.resolve()
    await Promise.resolve()

    expect(container.textContent).toContain('server down')
  })

  it('closes form on cancel click', () => {
    const { StartAutoresearchForm, showStartForm } = mod
    showStartForm.value = true
    render(h(StartAutoresearchForm, null), container)
    const cancelBtn = Array.from(container.querySelectorAll('button')).find(
      b => b.textContent?.includes('취소'),
    )
    expect(cancelBtn).not.toBeUndefined()
    cancelBtn!.click()
    expect(showStartForm.value).toBe(false)
  })
})
