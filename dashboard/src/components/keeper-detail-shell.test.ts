// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { h, render } from 'preact'
import { act } from 'preact/test-utils'

const mockFetchCascadeProfiles = vi.fn()
const mockUpdateKeeperCascade = vi.fn()
const mockShowToast = vi.fn()
const mockRefreshDashboard = vi.fn()
const mockKeeperDisplayModel = vi.fn()
const mockFormatDuration = vi.fn((s) => `${s}s`)

vi.mock('../api/dashboard', () => ({
  fetchCascadeProfiles: mockFetchCascadeProfiles,
  updateKeeperCascade: mockUpdateKeeperCascade,
}))

vi.mock('./common/toast', () => ({
  showToast: mockShowToast,
}))

vi.mock('../store', () => ({
  refreshDashboard: mockRefreshDashboard,
  keepers: { value: [] },
}))

vi.mock('./keeper-phase-indicator', () => ({
  KeeperPhaseAndStage: ({ phase }: any) => h('span', null, `phase:${phase}`),
}))

vi.mock('../lib/format-time', () => ({
  formatDuration: mockFormatDuration,
}))

vi.mock('../lib/keeper-runtime-display', () => ({
  keeperDisplayModel: mockKeeperDisplayModel,
}))

vi.mock('./common/time-ago', () => ({
  TimeAgo: ({ timestamp }: any) => h('span', null, `ago:${timestamp}`),
}))

describe('keeper-detail-shell', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    vi.clearAllMocks()
    mockFetchCascadeProfiles.mockResolvedValue({ profiles: [], invalid_profiles: [] })
  })

  afterEach(() => {
    render(null, container)
    container.remove()
  })

  it('KeeperDetailMissingState renders loading message', async () => {
    const { KeeperDetailMissingState } = await import('./keeper-detail-shell')
    await act(async () => {
      render(h(KeeperDetailMissingState, { keeperName: 'k1', onClose: vi.fn() }), container)
    })
    expect(container.textContent).toContain('k1')
    expect(container.textContent).toContain('레지스트리가 아직 로드되지 않았습니다')
  })

  it('KeeperDetailMissingState renders dead message when keepers exist', async () => {
    const store = await import('../store')
    store.keepers.value = [{ name: 'other' }]
    const { KeeperDetailMissingState } = await import('./keeper-detail-shell')
    await act(async () => {
      render(h(KeeperDetailMissingState, { keeperName: 'k1', onClose: vi.fn() }), container)
    })
    expect(container.textContent).toContain('live 1명')
    expect(container.textContent).toContain('watchdog 종료')
  })

  it('KeeperDetailHeaderInfo renders keeper info', async () => {
    const keeper = {
      name: 'keeper-a',
      emoji: '🤖',
      phase: 'running',
      pipeline_stage: 'idle',
      koreanName: '한국명',
      created_at: 1234567890,
    }
    mockKeeperDisplayModel.mockReturnValue({ label: 'model', value: 'gpt-4' })
    const { KeeperDetailHeaderInfo } = await import('./keeper-detail-shell')
    await act(async () => {
      render(h(KeeperDetailHeaderInfo, { keeper, titleId: 'title1', phaseEnteredAtSec: null, onClose: vi.fn() }), container)
    })
    expect(container.textContent).toContain('keeper-a')
    expect(container.textContent).toContain('한국명')
    expect(container.textContent).toContain('🤖')
    expect(container.textContent).toContain('gpt-4')
  })

  it('KeeperDetailOverviewSidebar renders facts', async () => {
    const { KeeperDetailOverviewSidebar } = await import('./keeper-detail-shell')
    await act(async () => {
      render(h(KeeperDetailOverviewSidebar, {
        effectiveStatus: 'running',
        contextRatioPct: '45%',
        effectiveModelLabel: 'Model',
        effectiveModel: 'gpt-4',
        activity: { label: 'active', timestamp: 1234567890 },
      }), container)
    })
    expect(container.textContent).toContain('running')
    expect(container.textContent).toContain('45%')
    expect(container.textContent).toContain('gpt-4')
    expect(container.textContent).toContain('active')
  })

  it('KeeperDetailSection renders section', async () => {
    const { KeeperDetailSection } = await import('./keeper-detail-shell')
    await act(async () => {
      render(h(KeeperDetailSection, {
        id: 'keeper-summary',
        eyebrow: 'overview',
        title: 'Summary',
        description: 'desc',
        children: h('div', null, 'content'),
      }), container)
    })
    expect(container.textContent).toContain('overview')
    expect(container.textContent).toContain('Summary')
    expect(container.textContent).toContain('desc')
    expect(container.textContent).toContain('content')
    expect(container.querySelector('section')).toBeTruthy()
  })
})
