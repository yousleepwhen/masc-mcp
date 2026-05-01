// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { h, render } from 'preact'

const mockSearchQuery = { value: '' }
const mockCategoryFilter = { value: 'all' }
const mockDirectOnly = { value: false }
const mockShowHidden = { value: false }
const mockShowDeprecated = { value: false }
const mockSurfaceFilter = { value: 'all' }
const mockShowBackToTop = { value: false }

vi.mock('./tool-state', () => ({
  searchQuery: mockSearchQuery,
  categoryFilter: mockCategoryFilter,
  directOnly: mockDirectOnly,
  showHidden: mockShowHidden,
  showDeprecated: mockShowDeprecated,
  surfaceFilter: mockSurfaceFilter,
  SURFACE_MAP: {
    all: [],
    public_mcp: ['public_mcp'],
    internal: ['internal'],
    admin: ['admin'],
  },
  SURFACE_LABELS: {
    all: '전체',
    public_mcp: 'MCP 공개',
    internal: '날짜',
    admin: '관리자',
  },
  hasSurface: (item: any, s: string) => (item.surfaces ?? []).includes(s),
  loadTools: vi.fn(),
  toolMatchesQuery: (item: any, q: string) =>
    !q || item.name.includes(q) || item.description.includes(q),
  surfaceCountForFilter: (inventory: any[], key: string) =>
    key === 'all' ? inventory.length : inventory.filter(i => (i.surfaces ?? []).includes(key)).length,
  showBackToTop: mockShowBackToTop,
}))

vi.mock('../../router', () => ({
  route: { value: { tab: 'lab', params: { section: 'tools', q: '' } } },
}))

vi.mock('../common/button', () => ({
  ActionButton: ({ children, onClick, disabled, pressed }: any) =>
    h('button', { onClick, disabled, 'aria-pressed': pressed }, children),
}))

vi.mock('../common/virtual-list', () => ({
  VirtualList: ({ items, renderItem, getKey }: any) =>
    h('div', { className: 'virtual-list' }, items.map((item: any) => h('div', { key: getKey(item) }, renderItem(item)))),
}))

vi.mock('../common/empty-state', () => ({
  EmptyState: ({ message }: any) => h('div', { className: 'empty' }, message),
}))

vi.mock('../common/feedback-state', () => ({
  ErrorState: ({ message }: any) => h('div', { className: 'error' }, message),
}))

vi.mock('../common/input', () => ({
  TextInput: ({ value, placeholder, onInput }: any) =>
    h('input', { type: 'text', value, placeholder, onInput }),
}))

vi.mock('../common/select', () => ({
  Select: ({ value, options, onInput }: any) =>
    h('select', { value, onChange: (e: any) => onInput?.(e.target.value) },
      options.map((o: any) => h('option', { key: o.value, value: o.value }, o.label)),
    ),
}))

vi.mock('../common/checkbox', () => ({
  Checkbox: ({ checked, onChange }: any) =>
    h('input', { type: 'checkbox', checked, onChange: (e: any) => onChange?.(e.target.checked) }),
}))

vi.mock('./tool-inventory-row', () => ({
  InventoryRow: ({ item }: any) => h('div', { className: 'inventory-row' }, item.name),
}))

describe('tool-full-inventory', () => {
  let container: HTMLDivElement

  beforeEach(async () => {
    vi.resetModules()
    mockSearchQuery.value = ''
    mockCategoryFilter.value = 'all'
    mockDirectOnly.value = false
    mockShowHidden.value = false
    mockShowDeprecated.value = false
    mockSurfaceFilter.value = 'all'
    mockShowBackToTop.value = false
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    render(null, container)
    container.remove()
    vi.restoreAllMocks()
  })

  const makeInventory = () => [
    { name: 'search', description: 'Search tool', category: 'utils', direct_call_allowed: true, visibility: 'visible', lifecycle: 'active', surfaces: ['public_mcp'] },
    { name: 'fetch', description: 'Fetch tool', category: 'utils', direct_call_allowed: false, visibility: 'hidden', lifecycle: 'active', surfaces: ['internal'] },
    { name: 'old-tool', description: 'Old tool', category: 'legacy', direct_call_allowed: false, visibility: 'visible', lifecycle: 'deprecated', surfaces: ['public_mcp'] },
  ]

  it('renders stat cards', async () => {
    const { FullInventoryView } = await import('./tool-full-inventory')
    render(h(FullInventoryView, { inventory: makeInventory(), loading: false, error: null }), container)
    expect(container.textContent).toContain('전체 도구')
    expect(container.textContent).toContain('MCP 공개')
    expect(container.textContent).toContain('숨김')
    expect(container.textContent).toContain('지원 중단')
    expect(container.textContent).toContain('직접 호출')
    expect(container.textContent).toContain('필터 결과')
  })

  it('renders surface filter buttons', async () => {
    const { FullInventoryView } = await import('./tool-full-inventory')
    render(h(FullInventoryView, { inventory: makeInventory(), loading: false, error: null }), container)
    expect(container.textContent).toContain('전체')
    expect(container.textContent).toContain('MCP 공개')
  })

  it('renders search input and category select', async () => {
    const { FullInventoryView } = await import('./tool-full-inventory')
    render(h(FullInventoryView, { inventory: makeInventory(), loading: false, error: null }), container)
    expect(container.querySelector('input')).toBeTruthy()
    expect(container.querySelector('select')).toBeTruthy()
  })

  it('renders checkboxes', async () => {
    const { FullInventoryView } = await import('./tool-full-inventory')
    render(h(FullInventoryView, { inventory: makeInventory(), loading: false, error: null }), container)
    const checkboxes = container.querySelectorAll('input[type="checkbox"]')
    expect(checkboxes.length).toBeGreaterThanOrEqual(3)
  })

  it('renders error state', async () => {
    const { FullInventoryView } = await import('./tool-full-inventory')
    render(h(FullInventoryView, { inventory: [], loading: false, error: 'load failed' }), container)
    expect(container.textContent).toContain('load failed')
  })

  it('renders empty state when no filtered items', async () => {
    const { FullInventoryView } = await import('./tool-full-inventory')
    render(h(FullInventoryView, { inventory: [], loading: false, error: null }), container)
    expect(container.textContent).toContain('조건에 맞는 도구가 없습니다')
  })

  it('renders virtual list when items exist', async () => {
    mockShowHidden.value = true
    mockShowDeprecated.value = true
    const { FullInventoryView } = await import('./tool-full-inventory')
    render(h(FullInventoryView, { inventory: makeInventory(), loading: false, error: null }), container)
    expect(container.textContent).toContain('search')
    expect(container.textContent).toContain('fetch')
    expect(container.textContent).toContain('old-tool')
  })

  it('shows back-to-top button when scrolled', async () => {
    mockShowBackToTop.value = true
    const { FullInventoryView } = await import('./tool-full-inventory')
    render(h(FullInventoryView, { inventory: makeInventory(), loading: false, error: null }), container)
    const btn = container.querySelector('button[aria-label="목록 맨 위로 이동"]')
    expect(btn).toBeTruthy()
  })
})
