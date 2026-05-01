// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { h, render } from 'preact'
import { act } from 'preact/test-utils'

const mockLoadToolSchemas = vi.fn()
const mockUpdateFormValues = vi.fn()
const mockExecuteTool = vi.fn()
const mockClearSelection = vi.fn()

vi.mock('./tool-executor-state', async () => {
  const { signal } = await import('@preact/signals')
  return {
    schemasLoading: signal(false),
    schemasError: signal(null),
    selectedTool: signal(null),
    formValues: signal({}),
    validationErrors: signal([]),
    executing: signal(false),
    lastResult: signal(null),
    selectedToolAccess: signal({ allowed: true, reason: null }),
    searchQuery: signal(''),
    tierFilter: signal('all'),
    loadToolSchemas: mockLoadToolSchemas,
    updateFormValues: mockUpdateFormValues,
    executeTool: mockExecuteTool,
    clearSelection: mockClearSelection,
  }
})

vi.mock('../common/card', () => ({
  SurfaceCard: ({ children }: any) => h('div', { 'data-testid': 'surface-card' }, children),
}))

vi.mock('../common/button', () => ({
  ActionButton: ({ children, onClick, disabled }: any) =>
    h('button', { onClick, disabled, 'data-testid': 'action-btn' }, children),
}))

vi.mock('./schema-form', () => ({
  SchemaForm: () => h('div', { 'data-testid': 'schema-form' }, 'SchemaForm'),
}))

vi.mock('./tool-picker', () => ({
  ToolPicker: () => h('div', { 'data-testid': 'tool-picker' }, 'ToolPicker'),
}))

vi.mock('./tool-result-display', () => ({
  ToolResultDisplay: ({ text }: any) => h('div', { 'data-testid': 'tool-result' }, text),
}))

describe('tool-executor', () => {
  let container: HTMLDivElement
  let state: any

  beforeEach(async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    vi.resetModules()
    mockLoadToolSchemas.mockClear()
    mockUpdateFormValues.mockClear()
    mockExecuteTool.mockClear()
    mockClearSelection.mockClear()
    state = await import('./tool-executor-state')
    state.schemasLoading.value = false
    state.schemasError.value = null
    state.selectedTool.value = null
    state.formValues.value = {}
    state.validationErrors.value = []
    state.executing.value = false
    state.lastResult.value = null
    state.selectedToolAccess.value = { allowed: true, reason: null }
  })

  afterEach(() => {
    render(null, container)
    container.remove()
    vi.restoreAllMocks()
  })

  it('calls loadToolSchemas on mount', async () => {
    const { ToolExecutor } = await import('./tool-executor')
    await act(async () => {
      render(h(ToolExecutor), container)
    })
    expect(mockLoadToolSchemas).toHaveBeenCalledTimes(1)
  })

  it('renders loading state', async () => {
    state.schemasLoading.value = true
    state.selectedTool.value = null
    const { ToolExecutor } = await import('./tool-executor')
    await act(async () => {
      render(h(ToolExecutor), container)
    })
    expect(container.textContent).toContain('도구 스키마 로딩 중')
    expect(container.querySelector('[role="status"]')).toBeTruthy()
  })

  it('renders error state with retry', async () => {
    state.schemasError.value = 'load failed'
    const { ToolExecutor } = await import('./tool-executor')
    await act(async () => {
      render(h(ToolExecutor), container)
    })
    expect(container.textContent).toContain('load failed')
    const retryBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('재시도'))
    expect(retryBtn).toBeTruthy()
  })

  it('renders main layout with picker and detail', async () => {
    const { ToolExecutor } = await import('./tool-executor')
    await act(async () => {
      render(h(ToolExecutor), container)
    })
    expect(container.querySelector('[data-testid="tool-picker"]')).toBeTruthy()
    expect(container.textContent).toContain('좌측에서 도구를 선택하세요')
  })

  it('renders tool detail when tool selected', async () => {
    state.selectedTool.value = {
      name: 'test-tool',
      description: 'test desc',
      inputSchema: { type: 'object' },
      annotations: {},
    }
    const { ToolExecutor } = await import('./tool-executor')
    await act(async () => {
      render(h(ToolExecutor), container)
    })
    expect(container.textContent).toContain('test-tool')
    expect(container.textContent).toContain('test desc')
    expect(container.querySelector('[data-testid="schema-form"]')).toBeTruthy()
  })

  it('shows read-only hint', async () => {
    state.selectedTool.value = {
      name: 'ro-tool',
      description: 'ro',
      inputSchema: { type: 'object' },
      annotations: { readOnlyHint: true },
    }
    const { ToolExecutor } = await import('./tool-executor')
    await act(async () => {
      render(h(ToolExecutor), container)
    })
    expect(container.textContent).toContain('읽기 전용')
  })

  it('shows destructive hint', async () => {
    state.selectedTool.value = {
      name: 'del-tool',
      description: 'del',
      inputSchema: { type: 'object' },
      annotations: { destructiveHint: true },
    }
    const { ToolExecutor } = await import('./tool-executor')
    await act(async () => {
      render(h(ToolExecutor), container)
    })
    expect(container.textContent).toContain('파괴적')
  })

  it('shows access blocked message', async () => {
    state.selectedTool.value = {
      name: 'blocked-tool',
      description: 'blocked',
      inputSchema: { type: 'object' },
      annotations: {},
    }
    state.selectedToolAccess.value = { allowed: false, reason: 'admin only' }
    const { ToolExecutor } = await import('./tool-executor')
    await act(async () => {
      render(h(ToolExecutor), container)
    })
    expect(container.textContent).toContain('실행 차단')
    expect(container.textContent).toContain('admin only')
  })

  it('shows validation errors', async () => {
    state.selectedTool.value = {
      name: 'val-tool',
      description: 'val',
      inputSchema: { type: 'object' },
      annotations: {},
    }
    state.validationErrors.value = ['field1', 'field2']
    const { ToolExecutor } = await import('./tool-executor')
    await act(async () => {
      render(h(ToolExecutor), container)
    })
    expect(container.textContent).toContain('필수 필드 누락')
    expect(container.textContent).toContain('field1')
    expect(container.textContent).toContain('field2')
  })

  it('shows executing state', async () => {
    state.selectedTool.value = {
      name: 'exec-tool',
      description: 'exec',
      inputSchema: { type: 'object' },
      annotations: {},
    }
    state.executing.value = true
    const { ToolExecutor } = await import('./tool-executor')
    await act(async () => {
      render(h(ToolExecutor), container)
    })
    expect(container.textContent).toContain('실행 중...')
  })

  it('shows result display', async () => {
    state.selectedTool.value = {
      name: 'res-tool',
      description: 'res',
      inputSchema: { type: 'object' },
      annotations: {},
    }
    state.lastResult.value = {
      success: true,
      text: 'it worked',
      toolName: 'res-tool',
      timestamp: Date.now(),
    }
    const { ToolExecutor } = await import('./tool-executor')
    await act(async () => {
      render(h(ToolExecutor), container)
    })
    expect(container.querySelector('[data-testid="tool-result"]')).toBeTruthy()
    expect(container.textContent).toContain('it worked')
  })

  it('shows destructive confirm dialog', async () => {
    state.selectedTool.value = {
      name: 'destructive-tool',
      description: 'danger',
      inputSchema: { type: 'object' },
      annotations: { destructiveHint: true },
    }
    const { ToolExecutor } = await import('./tool-executor')
    await act(async () => {
      render(h(ToolExecutor), container)
    })
    const execBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('실행'))
    expect(execBtn).toBeTruthy()
    await act(async () => {
      execBtn!.click()
    })
    expect(container.textContent).toContain('파괴적')
    expect(container.textContent).toContain('실행하시겠습니까')
  })

  it('disables execute when access denied', async () => {
    state.selectedTool.value = {
      name: 'denied-tool',
      description: 'denied',
      inputSchema: { type: 'object' },
      annotations: {},
    }
    state.selectedToolAccess.value = { allowed: false, reason: 'no' }
    const { ToolExecutor } = await import('./tool-executor')
    await act(async () => {
      render(h(ToolExecutor), container)
    })
    const execBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('실행'))
    expect(execBtn?.disabled).toBe(true)
  })

  it('clicking retry triggers loadToolSchemas with force', async () => {
    state.schemasError.value = 'fail'
    const { ToolExecutor } = await import('./tool-executor')
    await act(async () => {
      render(h(ToolExecutor), container)
    })
    const retryBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('재시도'))
    await act(async () => {
      retryBtn!.click()
    })
    expect(mockLoadToolSchemas).toHaveBeenCalledWith(true)
  })
})
