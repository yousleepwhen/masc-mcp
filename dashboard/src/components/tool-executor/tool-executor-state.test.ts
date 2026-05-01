// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'

const mockListAllMcpTools = vi.fn()
const mockCallMcpTool = vi.fn()
const mockShowToast = vi.fn()
const mockBuildDefaults = vi.fn(() => ({}))
const mockStripEmptyOptionals = vi.fn((v: Record<string, unknown>) => v)
const mockValidateRequired = vi.fn(() => [] as string[])
const mockDashboardAuthAccess = vi.fn(() => ({ allowed: true, reason: null as string | null }))

vi.mock('../../api/mcp', () => ({
  listAllMcpTools: mockListAllMcpTools,
  callMcpTool: mockCallMcpTool,
}))

vi.mock('../common/toast', () => ({
  showToast: mockShowToast,
}))

vi.mock('./schema-form', () => ({
  buildDefaults: mockBuildDefaults,
  stripEmptyOptionals: mockStripEmptyOptionals,
  validateRequired: mockValidateRequired,
}))

vi.mock('../../store', () => ({
  shellAuthSummary: { value: { role: 'admin' } },
}))

vi.mock('../../lib/dashboard-auth-access', () => ({
  dashboardAuthAccess: mockDashboardAuthAccess,
}))

describe('tool-executor-state', () => {
  let state: any

  beforeEach(async () => {
    vi.resetModules()
    mockListAllMcpTools.mockClear()
    mockCallMcpTool.mockClear()
    mockShowToast.mockClear()
    mockBuildDefaults.mockClear()
    mockStripEmptyOptionals.mockClear()
    mockValidateRequired.mockClear()
    mockDashboardAuthAccess.mockClear()
    mockDashboardAuthAccess.mockReturnValue({ allowed: true, reason: null })
    state = await import('./tool-executor-state')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('has initial idle state', () => {
    expect(state.schemasLoading.value).toBe(false)
    expect(state.schemasError.value).toBeNull()
    expect(state.selectedTool.value).toBeNull()
    expect(state.formValues.value).toEqual({})
    expect(state.validationErrors.value).toEqual([])
    expect(state.executing.value).toBe(false)
    expect(state.lastResult.value).toBeNull()
    expect(state.searchQuery.value).toBe('')
    expect(state.tierFilter.value).toBe('all')
  })

  it('loadToolSchemas fetches tools and caches', async () => {
    const schemas = [
      { name: 'tool-a', description: 'desc a', inputSchema: { type: 'object' } },
    ]
    mockListAllMcpTools.mockResolvedValue(schemas)
    await state.loadToolSchemas()
    expect(mockListAllMcpTools).toHaveBeenCalledTimes(1)
    expect(state.schemasLoading.value).toBe(false)
    expect(state.schemasError.value).toBeNull()
  })

  it('loadToolSchemas sets error on failure', async () => {
    mockListAllMcpTools.mockRejectedValue(new Error('network fail'))
    await state.loadToolSchemas()
    expect(state.schemasError.value).toBe('network fail')
    expect(state.schemasLoading.value).toBe(false)
    expect(mockShowToast).toHaveBeenCalledWith('도구 스키마 로드 실패', 'error')
  })

  it('loadToolSchemas skips when already loading', async () => {
    mockListAllMcpTools.mockImplementation(() => new Promise(() => {}))
    state.loadToolSchemas()
    state.loadToolSchemas()
    expect(mockListAllMcpTools).toHaveBeenCalledTimes(1)
  })

  it('loadToolSchemas respects cache', async () => {
    const schemas = [{ name: 'tool-a', description: 'a', inputSchema: { type: 'object' } }]
    mockListAllMcpTools.mockResolvedValue(schemas)
    await state.loadToolSchemas()
    await state.loadToolSchemas()
    expect(mockListAllMcpTools).toHaveBeenCalledTimes(1)
  })

  it('loadToolSchemas force=true bypasses cache', async () => {
    const schemas = [{ name: 'tool-a', description: 'a', inputSchema: { type: 'object' } }]
    mockListAllMcpTools.mockResolvedValue(schemas)
    await state.loadToolSchemas()
    await state.loadToolSchemas(true)
    expect(mockListAllMcpTools).toHaveBeenCalledTimes(2)
  })

  it('selectTool sets tool and resets derived state', () => {
    const tool = { name: 't', description: 'd', inputSchema: { type: 'object' } }
    mockBuildDefaults.mockReturnValue({ foo: 'bar' })
    state.selectTool(tool)
    expect(state.selectedTool.value).toBe(tool)
    expect(state.formValues.value).toEqual({ foo: 'bar' })
    expect(state.validationErrors.value).toEqual([])
    expect(state.lastResult.value).toBeNull()
    expect(mockBuildDefaults).toHaveBeenCalledWith(tool.inputSchema)
  })

  it('clearSelection resets all tool state', () => {
    state.selectTool({ name: 't', description: 'd', inputSchema: { type: 'object' } })
    state.formValues.value = { x: 1 }
    state.clearSelection()
    expect(state.selectedTool.value).toBeNull()
    expect(state.formValues.value).toEqual({})
    expect(state.validationErrors.value).toEqual([])
    expect(state.lastResult.value).toBeNull()
  })

  it('updateFormValues updates values', () => {
    state.updateFormValues({ key: 'val' })
    expect(state.formValues.value).toEqual({ key: 'val' })
  })

  it('updateFormValues clears resolved validation errors', () => {
    state.validationErrors.value = ['field1', 'field2']
    state.updateFormValues({ field1: 'ok', field2: null, field3: 'x' })
    expect(state.validationErrors.value).toEqual(['field2'])
  })

  it('selectedToolAccess computes based on tool annotations', () => {
    mockDashboardAuthAccess.mockReturnValue({ allowed: false, reason: 'need role' })
    state.selectTool({ name: 't', description: 'd', inputSchema: { type: 'object' }, annotations: { readOnlyHint: false } })
    expect(state.selectedToolAccess.value.allowed).toBe(false)
    expect(mockDashboardAuthAccess).toHaveBeenCalled()
  })

  it('filteredTools filters by search query', async () => {
    mockListAllMcpTools.mockResolvedValue([
      { name: 'alpha-tool', description: 'first', inputSchema: { type: 'object' } },
      { name: 'beta-tool', description: 'second', inputSchema: { type: 'object' } },
    ])
    await state.loadToolSchemas()
    state.searchQuery.value = 'alpha'
    expect(state.filteredTools.value.length).toBe(1)
    expect(state.filteredTools.value[0].name).toBe('alpha-tool')
  })

  it('filteredTools filters by tier', async () => {
    mockListAllMcpTools.mockResolvedValue([
      { name: 'a', description: 'a', inputSchema: { type: 'object' }, annotations: { 'x-tier': 'premium' } },
      { name: 'b', description: 'b', inputSchema: { type: 'object' }, annotations: { 'x-tier': 'free' } },
    ])
    await state.loadToolSchemas()
    state.tierFilter.value = 'premium'
    expect(state.filteredTools.value.length).toBe(1)
    expect(state.filteredTools.value[0].name).toBe('a')
  })

  it('executeTool validates required fields', async () => {
    mockValidateRequired.mockReturnValue(['missingField'])
    const tool = { name: 't', description: 'd', inputSchema: { type: 'object' } }
    state.selectTool(tool)
    await state.executeTool()
    expect(state.validationErrors.value).toEqual(['missingField'])
    expect(mockShowToast).toHaveBeenCalledWith('필수 필드 누락: missingField', 'error')
    expect(mockCallMcpTool).not.toHaveBeenCalled()
  })

  it('executeTool blocks when access denied', async () => {
    mockDashboardAuthAccess.mockReturnValue({ allowed: false, reason: 'no access' })
    const tool = { name: 't', description: 'd', inputSchema: { type: 'object' } }
    state.selectTool(tool)
    await state.executeTool()
    expect(mockShowToast).toHaveBeenCalledWith('no access', 'error', 6000)
    expect(mockCallMcpTool).not.toHaveBeenCalled()
  })

  it('executeTool calls API and stores success result', async () => {
    mockValidateRequired.mockReturnValue([])
    mockCallMcpTool.mockResolvedValue('result text')
    const tool = { name: 't', description: 'd', inputSchema: { type: 'object' } }
    state.selectTool(tool)
    await state.executeTool()
    expect(mockCallMcpTool).toHaveBeenCalledWith('t', { foo: 'bar' })
    expect(state.lastResult.value?.success).toBe(true)
    expect(state.lastResult.value?.text).toBe('result text')
    expect(state.executing.value).toBe(false)
    expect(mockShowToast).toHaveBeenCalledWith('t 실행 완료', 'success')
  })

  it('executeTool stores error result on API failure', async () => {
    mockValidateRequired.mockReturnValue([])
    mockCallMcpTool.mockRejectedValue(new Error('api error'))
    const tool = { name: 't', description: 'd', inputSchema: { type: 'object' } }
    state.selectTool(tool)
    await state.executeTool()
    expect(state.lastResult.value?.success).toBe(false)
    expect(state.lastResult.value?.text).toBe('api error')
    expect(state.executing.value).toBe(false)
    expect(mockShowToast).toHaveBeenCalledWith('t 실행 실패', 'error')
  })

  it('executeTool is no-op when no tool selected', async () => {
    await state.executeTool()
    expect(mockCallMcpTool).not.toHaveBeenCalled()
  })

  it('executeTool is no-op when already executing', async () => {
    mockValidateRequired.mockReturnValue([])
    mockCallMcpTool.mockImplementation(() => new Promise(() => {}))
    const tool = { name: 't', description: 'd', inputSchema: { type: 'object' } }
    state.selectTool(tool)
    state.executeTool()
    await state.executeTool()
    expect(mockCallMcpTool).toHaveBeenCalledTimes(1)
  })
})
