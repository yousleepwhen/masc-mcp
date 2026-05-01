// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { h, render } from 'preact'

const mockPersonaDraft = { value: null }
const mockPersonaGenerating = { value: false }
const mockPersonaSaving = { value: false }
const mockSpawning = { value: false }
const mockPersonaSaveResult = { value: null }
const mockPersonaAuthoringResult = { value: null }

vi.mock('./keeper-spawn-state', () => ({
  generatePersonaDraft: vi.fn(),
  personaAuthoringResult: mockPersonaAuthoringResult,
  personaDraft: mockPersonaDraft,
  personaGenerating: mockPersonaGenerating,
  personaSaveResult: mockPersonaSaveResult,
  personaSaving: mockPersonaSaving,
  savePersonaDraft: vi.fn(),
  spawnKeeperFromPersona: vi.fn(),
  spawning: mockSpawning,
}))

vi.mock('../common/button', () => ({
  ActionButton: ({ children, onClick, disabled }: any) =>
    h('button', { onClick, disabled }, children),
}))

vi.mock('../common/checkbox', () => ({
  Checkbox: ({ checked, onChange }: any) =>
    h('input', { type: 'checkbox', checked, onChange: (e: any) => onChange?.(e.target.checked) }),
}))

vi.mock('../common/input', () => ({
  TextArea: ({ value, placeholder, onInput, id }: any) =>
    h('textarea', { value, placeholder, onInput, id }),
  TextInput: ({ value, placeholder, onInput }: any) =>
    h('input', { type: 'text', value, placeholder, onInput }),
}))

vi.mock('../common/toast', () => ({
  showToast: vi.fn(),
}))

describe('persona-generator', () => {
  let container: HTMLDivElement

  beforeEach(async () => {
    vi.resetModules()
    mockPersonaDraft.value = null
    mockPersonaGenerating.value = false
    mockPersonaSaving.value = false
    mockSpawning.value = false
    mockPersonaSaveResult.value = null
    mockPersonaAuthoringResult.value = null
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    render(null, container)
    container.remove()
    vi.restoreAllMocks()
  })

  it('renders concept textarea and inputs', async () => {
    const { PersonaGenerator } = await import('./persona-generator')
    render(h(PersonaGenerator), container)
    expect(container.querySelector('textarea#persona-concept')).toBeTruthy()
    expect(container.textContent).toContain('handle')
    expect(container.textContent).toContain('display')
  })

  it('renders generate button', async () => {
    const { PersonaGenerator } = await import('./persona-generator')
    render(h(PersonaGenerator), container)
    expect(container.textContent).toContain('초안 생성')
  })

  it('shows generating state', async () => {
    mockPersonaGenerating.value = true
    const { PersonaGenerator } = await import('./persona-generator')
    render(h(PersonaGenerator), container)
    expect(container.textContent).toContain('생성 중')
  })

  it('renders profile textarea when draft exists', async () => {
    mockPersonaDraft.value = {
      handle: 'test-keeper',
      profile: { name: 'Test' },
      fieldExplanations: [],
    }
    const { PersonaGenerator } = await import('./persona-generator')
    render(h(PersonaGenerator), container)
    expect(container.querySelector('textarea#persona-profile-json')).toBeTruthy()
    expect(container.textContent).toContain('test-keeper')
  })

  it('renders field explanations when draft has them', async () => {
    mockPersonaDraft.value = {
      handle: 'test-keeper',
      profile: { name: 'Test' },
      fieldExplanations: [
        { path: 'name', value: 'Test', effect: 'display name' },
      ],
    }
    const { PersonaGenerator } = await import('./persona-generator')
    render(h(PersonaGenerator), container)
    expect(container.textContent).toContain('name')
    expect(container.textContent).toContain('display name')
  })

  it('renders save buttons when draft exists', async () => {
    mockPersonaDraft.value = {
      handle: 'test-keeper',
      profile: {},
      fieldExplanations: [],
    }
    const { PersonaGenerator } = await import('./persona-generator')
    render(h(PersonaGenerator), container)
    expect(container.textContent).toContain('저장 dry-run')
    expect(container.textContent).toContain('저장')
  })

  it('renders spawn buttons when saved for draft', async () => {
    mockPersonaDraft.value = {
      handle: 'test-keeper',
      profile: {},
      fieldExplanations: [],
    }
    mockPersonaSaveResult.value = { handle: 'test-keeper', saved: true, profilePath: '/path/to/profile' }
    const { PersonaGenerator } = await import('./persona-generator')
    render(h(PersonaGenerator), container)
    expect(container.textContent).toContain('키퍼 dry-run')
    expect(container.textContent).toContain('키퍼 시작')
    expect(container.textContent).toContain('/path/to/profile')
  })

  it('renders authoring result', async () => {
    mockPersonaAuthoringResult.value = { success: false, message: 'validation failed' }
    const { PersonaGenerator } = await import('./persona-generator')
    render(h(PersonaGenerator), container)
    expect(container.textContent).toContain('validation failed')
  })
})
