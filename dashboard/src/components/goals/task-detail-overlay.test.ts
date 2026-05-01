// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import { signal } from '@preact/signals'

const mockCloseTaskDetail = vi.fn()
const mockSwitchToActivityTab = vi.fn()
const mockFilterTaskEvents = vi.fn((events) => events)
const mockFilterGoalRelations = vi.fn((ids) => ids)
const mockGoalById = vi.fn()
const mockPriorityLabel = vi.fn((p) => `P${p}`)
const mockFindKeeper = vi.fn()

const selectedTask = signal(null)
const taskEvents = signal([])
const taskEventsLoading = signal(false)
const taskEventsError = signal(null)
const taskEventsSearchQuery = signal('')
const goalRelationSearchQuery = signal('')
const assigneeGoalIds = signal([])
const activeTab = signal('overview')
const activityEvents = signal([])
const activityLoading = signal(false)
const activityError = signal(null)

vi.mock('./task-detail-state', () => ({
  selectedTask,
  closeTaskDetail: mockCloseTaskDetail,
  taskEvents,
  taskEventsLoading,
  taskEventsError,
  taskEventsSearchQuery,
  filterTaskEvents: mockFilterTaskEvents,
  goalRelationSearchQuery,
  filterGoalRelations: mockFilterGoalRelations,
  assigneeGoalIds: (task: any) => {
    const keeper = mockFindKeeper(task?.assignee)
    return keeper?.active_goal_ids ?? []
  },
  activeTab,
  switchToActivityTab: mockSwitchToActivityTab,
  activityEvents,
  activityLoading,
  activityError,
  hasActivityTab: (task: any) => Boolean(task?.assignee),
  isKeeperAssignee: (task: any) => Boolean(task?.assignee),
}))

vi.mock('./goal-helpers', () => ({
  goalById: mockGoalById,
  priorityLabel: mockPriorityLabel,
}))

vi.mock('../../lib/keeper-utils', () => ({
  findKeeper: mockFindKeeper,
}))

vi.mock('../common/dialog', () => ({
  DialogOverlay: ({ children, onClose }: any) => h('div', { 'data-testid': 'dialog-overlay', onClick: onClose }, children),
}))

vi.mock('../common/status-badge', () => ({
  StatusBadge: ({ status }: any) => h('span', { 'data-testid': 'status-badge' }, status),
}))

vi.mock('../common/empty-state', () => ({
  EmptyState: ({ message }: any) => h('div', { 'data-testid': 'empty-state' }, message),
}))

vi.mock('../common/feedback-state', () => ({
  ErrorState: ({ message }: any) => h('div', { 'data-testid': 'error-state' }, message),
  LoadingState: ({ children }: any) => h('div', { 'data-testid': 'loading-state' }, children),
}))

vi.mock('../common/rich-content', () => ({
  RichContent: ({ text }: any) => h('span', { 'data-testid': 'rich-content' }, text),
}))

vi.mock('../common/input', () => ({
  TextInput: ({ value, placeholder, onInput }: any) =>
    h('input', { value, placeholder, onInput, 'data-testid': 'text-input' }),
}))

vi.mock('../common/time-ago', () => ({
  TimeAgo: ({ timestamp }: any) => h('span', { 'data-testid': 'time-ago' }, `ago:${timestamp}`),
}))

vi.mock('./task-activity-list', () => ({
  TaskActivityList: ({ events, loading, error }: any) =>
    h('div', { 'data-testid': 'task-activity-list' }, `${events?.length ?? 0} events, loading=${loading}, error=${error}`),
}))

vi.mock('lucide-preact', () => ({
  Check: () => h('span', null, '✓'),
  X: () => h('span', null, '✗'),
  ArrowRight: () => h('span', null, '→'),
  Dot: () => h('span', null, '·'),
  UserPlus: () => h('span', null, '+'),
}))

describe('task-detail-overlay', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    vi.clearAllMocks()
    selectedTask.value = null
    taskEvents.value = []
    taskEventsLoading.value = false
    taskEventsError.value = null
    taskEventsSearchQuery.value = ''
    goalRelationSearchQuery.value = ''
    assigneeGoalIds.value = []
    activeTab.value = 'overview'
    activityEvents.value = []
    activityLoading.value = false
    activityError.value = null
    mockGoalById.mockReturnValue(undefined)
    mockFindKeeper.mockReturnValue(null)
    mockFilterTaskEvents.mockImplementation((events: any[]) => events)
    mockFilterGoalRelations.mockImplementation((ids: any[]) => ids)
  })

  afterEach(() => {
    render(null, container)
    container.remove()
    vi.restoreAllMocks()
  })

  it('returns null when no task is selected', async () => {
    selectedTask.value = null
    const { TaskDetailOverlay } = await import('./task-detail-overlay')
    await act(async () => {
      render(h(TaskDetailOverlay), container)
    })
    expect(container.innerHTML).toBe('')
  })

  it('renders task title and status badge', async () => {
    selectedTask.value = {
      id: 't1',
      title: 'Test Task',
      status: 'in_progress',
      priority: 2,
      assignee: null,
    }
    const { TaskDetailOverlay } = await import('./task-detail-overlay')
    await act(async () => {
      render(h(TaskDetailOverlay), container)
    })
    expect(container.textContent).toContain('Test Task')
    expect(container.querySelector('[data-testid="status-badge"]')).toBeTruthy()
  })

  it('renders priority label', async () => {
    selectedTask.value = {
      id: 't1',
      title: 'Task',
      status: 'todo',
      priority: 1,
      assignee: null,
    }
    const { TaskDetailOverlay } = await import('./task-detail-overlay')
    await act(async () => {
      render(h(TaskDetailOverlay), container)
    })
    expect(container.textContent).toContain('P1')
  })

  it('renders assignee with kind', async () => {
    selectedTask.value = {
      id: 't1',
      title: 'Task',
      status: 'todo',
      priority: 4,
      assignee: 'keeper-a',
      assignee_kind: 'keeper',
    }
    mockFindKeeper.mockReturnValue({ name: 'keeper-a', agent_name: 'agent-a' })
    const { TaskDetailOverlay } = await import('./task-detail-overlay')
    await act(async () => {
      render(h(TaskDetailOverlay), container)
    })
    expect(container.textContent).toContain('@keeper-a')
    expect(container.textContent).toContain('(keeper)')
  })

  it('renders description in overview tab', async () => {
    selectedTask.value = {
      id: 't1',
      title: 'Task',
      status: 'todo',
      priority: 4,
      assignee: null,
      description: 'This is the description',
    }
    const { TaskDetailOverlay } = await import('./task-detail-overlay')
    await act(async () => {
      render(h(TaskDetailOverlay), container)
    })
    expect(container.textContent).toContain('설명')
    expect(container.textContent).toContain('This is the description')
  })

  it('renders contract gate section when task has contract', async () => {
    selectedTask.value = {
      id: 't1',
      title: 'Task',
      status: 'todo',
      priority: 4,
      assignee: null,
      contract: { strict: true, completion_contract: ['item1'], required_evidence: ['ev1'] },
      gate: { done: { status: 'ready', reasons: ['reason1'] } },
    }
    const { TaskDetailOverlay } = await import('./task-detail-overlay')
    await act(async () => {
      render(h(TaskDetailOverlay), container)
    })
    expect(container.textContent).toContain('계약 게이트')
    expect(container.textContent).toContain('strict')
    expect(container.textContent).toContain('item1')
    expect(container.textContent).toContain('ev1')
  })

  it('renders awaiting verification banner', async () => {
    selectedTask.value = {
      id: 't1',
      title: 'Task',
      status: 'awaiting_verification',
      priority: 4,
      assignee: 'keeper-b',
      contract: { strict: false },
    }
    const { TaskDetailOverlay } = await import('./task-detail-overlay')
    await act(async () => {
      render(h(TaskDetailOverlay), container)
    })
    expect(container.textContent).toContain('검증 대기')
    expect(container.textContent).toContain('Verifier Keeper 검증 중')
  })

  it('renders task events section with events', async () => {
    selectedTask.value = {
      id: 't1',
      title: 'Task',
      status: 'todo',
      priority: 4,
      assignee: null,
    }
    taskEvents.value = [
      { label: 'claim', agent: 'alice', actorKind: 'human', taskId: 't1', ts: '2024-01-01T00:00:00Z', notes: 'claimed it' },
      { label: 'done', agent: null, actorKind: null, taskId: 't1', ts: null, notes: null },
    ]
    const { TaskDetailOverlay } = await import('./task-detail-overlay')
    await act(async () => {
      render(h(TaskDetailOverlay), container)
    })
    expect(container.textContent).toContain('최근 태스크 이벤트')
    expect(container.textContent).toContain('claim')
    expect(container.textContent).toContain('@alice')
    expect(container.textContent).toContain('claimed it')
  })

  it('renders task events loading state', async () => {
    selectedTask.value = { id: 't1', title: 'Task', status: 'todo', priority: 4, assignee: null }
    taskEventsLoading.value = true
    const { TaskDetailOverlay } = await import('./task-detail-overlay')
    await act(async () => {
      render(h(TaskDetailOverlay), container)
    })
    expect(container.textContent).toContain('이벤트 불러오는 중')
  })

  it('renders task events error state', async () => {
    selectedTask.value = { id: 't1', title: 'Task', status: 'todo', priority: 4, assignee: null }
    taskEventsError.value = 'fetch failed'
    const { TaskDetailOverlay } = await import('./task-detail-overlay')
    await act(async () => {
      render(h(TaskDetailOverlay), container)
    })
    expect(container.textContent).toContain('fetch failed')
  })

  it('renders empty task events state', async () => {
    selectedTask.value = { id: 't1', title: 'Task', status: 'todo', priority: 4, assignee: null }
    taskEvents.value = []
    const { TaskDetailOverlay } = await import('./task-detail-overlay')
    await act(async () => {
      render(h(TaskDetailOverlay), container)
    })
    expect(container.textContent).toContain('기록된 이벤트가 없습니다')
  })

  it('renders verdict lineage for verification events', async () => {
    selectedTask.value = { id: 't1', title: 'Task', status: 'todo', priority: 4, assignee: null }
    taskEvents.value = [
      { label: 'submit_for_verification', agent: 'bob', actorKind: 'keeper', taskId: 't1', ts: '2024-01-01T00:00:00Z', notes: null },
      { label: 'approved', agent: 'charlie', actorKind: 'human', taskId: 't1', ts: '2024-01-02T00:00:00Z', notes: 'looks good' },
    ]
    const { TaskDetailOverlay } = await import('./task-detail-overlay')
    await act(async () => {
      render(h(TaskDetailOverlay), container)
    })
    expect(container.textContent).toContain('검증 진행 이력')
    expect(container.textContent).toContain('제출')
    expect(container.textContent).toContain('승인')
  })

  it('renders execution links section', async () => {
    selectedTask.value = {
      id: 't1',
      title: 'Task',
      status: 'todo',
      priority: 4,
      assignee: null,
      execution_links: { session_id: 'sess-123', operation_id: 'op-456' },
    }
    const { TaskDetailOverlay } = await import('./task-detail-overlay')
    await act(async () => {
      render(h(TaskDetailOverlay), container)
    })
    expect(container.textContent).toContain('연결된 실행')
    expect(container.textContent).toContain('sess-123')
    expect(container.textContent).toContain('op-456')
  })

  it('renders handoff section', async () => {
    selectedTask.value = {
      id: 't1',
      title: 'Task',
      status: 'todo',
      priority: 4,
      assignee: null,
      handoff_context: {
        summary: 'Handoff summary here',
        reason: 'blocked',
        next_step: 'reassign',
        failure_mode: 'timeout',
        evidence_refs: ['ref1', 'ref2'],
      },
    }
    const { TaskDetailOverlay } = await import('./task-detail-overlay')
    await act(async () => {
      render(h(TaskDetailOverlay), container)
    })
    expect(container.textContent).toContain('최근 Handoff')
    expect(container.textContent).toContain('Handoff summary here')
    expect(container.textContent).toContain('ref1')
  })

  it('renders goal relations section', async () => {
    selectedTask.value = {
      id: 't1',
      title: 'Task',
      status: 'todo',
      priority: 4,
      assignee: 'keeper-a',
    }
    mockFindKeeper.mockReturnValue({ name: 'keeper-a', active_goal_ids: ['g1', 'g2'] })
    mockGoalById.mockImplementation((id: string) => {
      if (id === 'g1') return { id: 'g1', title: 'Goal One', status: 'executing' }
      if (id === 'g2') return { id: 'g2', title: 'Goal Two', status: 'completed' }
      return undefined
    })
    const { TaskDetailOverlay } = await import('./task-detail-overlay')
    await act(async () => {
      render(h(TaskDetailOverlay), container)
    })
    expect(container.textContent).toContain('담당 키퍼의 활성 목표')
    expect(container.textContent).toContain('Goal One')
    expect(container.textContent).toContain('Goal Two')
  })

  it('shows activity tab buttons when assignee exists', async () => {
    selectedTask.value = {
      id: 't1',
      title: 'Task',
      status: 'todo',
      priority: 4,
      assignee: 'keeper-a',
    }
    const { TaskDetailOverlay } = await import('./task-detail-overlay')
    await act(async () => {
      render(h(TaskDetailOverlay), container)
    })
    expect(container.textContent).toContain('개요')
    expect(container.textContent).toContain('담당자 최근 활동')
  })

  it('switches to activity tab and renders TaskActivityList', async () => {
    selectedTask.value = {
      id: 't1',
      title: 'Task',
      status: 'todo',
      priority: 4,
      assignee: 'keeper-a',
    }
    activeTab.value = 'activity'
    activityEvents.value = [{ kind: 'tool_call', summary: 'call' }]
    const { TaskDetailOverlay } = await import('./task-detail-overlay')
    await act(async () => {
      render(h(TaskDetailOverlay), container)
    })
    expect(container.querySelector('[data-testid="task-activity-list"]')).toBeTruthy()
    expect(container.textContent).toContain('1 events, loading=false, error=null')
  })

  it('closes overlay on close button click', async () => {
    selectedTask.value = { id: 't1', title: 'Task', status: 'todo', priority: 4, assignee: null }
    const { TaskDetailOverlay } = await import('./task-detail-overlay')
    await act(async () => {
      render(h(TaskDetailOverlay), container)
    })
    const dialog = container.querySelector('[data-testid="dialog-overlay"]')
    expect(dialog).toBeTruthy()
    await act(async () => {
      ;(dialog as HTMLElement).click()
    })
    expect(mockCloseTaskDetail).toHaveBeenCalledTimes(1)
  })

  it('renders metadata with task id and created_at', async () => {
    selectedTask.value = {
      id: 't1',
      title: 'Task',
      status: 'todo',
      priority: 4,
      assignee: null,
      created_at: '2024-01-01T00:00:00Z',
    }
    const { TaskDetailOverlay } = await import('./task-detail-overlay')
    await act(async () => {
      render(h(TaskDetailOverlay), container)
    })
    expect(container.textContent).toContain('t1')
    expect(container.textContent).toContain('ago:2024-01-01T00:00:00Z')
  })
})
