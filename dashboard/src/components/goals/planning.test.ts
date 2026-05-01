import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { h } from 'preact'
import { render } from 'preact'
import { tasks, goals, keepers, goalsLoading } from '../../store'
import { Planning } from './planning'

const navigateMock = vi.fn()
vi.mock('../../router', () => ({
  navigate: (...args: any[]) => navigateMock(...args),
}))

describe('Planning', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    tasks.value = []
    goals.value = []
    keepers.value = []
    goalsLoading.value = false
    navigateMock.mockClear()
  })

  afterEach(() => {
    render(null, container)
    container.remove()
    tasks.value = []
    goals.value = []
    keepers.value = []
    goalsLoading.value = false
  })

  it('renders empty state message when no tasks or goals', () => {
    render(h(Planning), container)
    expect(container.textContent).toContain('아직 등록된 항목이 없습니다')
  })

  it('renders backlog-only message when tasks exist without goals', () => {
    tasks.value = [
      { id: 't1', title: 'Task 1', status: 'todo' } as any,
    ]
    render(h(Planning), container)
    expect(container.textContent).toContain('지금은 backlog만 채워져 있습니다')
  })

  it('renders task stat cards', () => {
    tasks.value = [
      { id: 't1', title: 'Todo', status: 'todo', priority: 1 } as any,
      { id: 't2', title: 'In Progress', status: 'in_progress', priority: 2 } as any,
      { id: 't3', title: 'Done', status: 'done' } as any,
    ]
    render(h(Planning), container)

    expect(container.textContent).toContain('전체 태스크')
    expect(container.textContent).toContain('3')
    expect(container.textContent).toContain('할 일')
    expect(container.textContent).toContain('1')
    expect(container.textContent).toContain('진행 중')
    expect(container.textContent).toContain('1')
    expect(container.textContent).toContain('완료')
    expect(container.textContent).toContain('1')
    expect(container.textContent).toContain('높은 우선순위')
    expect(container.textContent).toContain('2')
  })

  it('renders goal pipeline section when goals exist', () => {
    goals.value = [
      { id: 'g1', title: 'Goal 1', horizon: 'short', phase: 'active' } as any,
    ]
    tasks.value = [
      { id: 't1', title: 'Task', status: 'todo', goal_id: 'g1' } as any,
    ]
    render(h(Planning), container)

    expect(container.textContent).toContain('장기 목표')
    expect(container.textContent).toContain('목표 트리에서 보기')
  })

  it('renders keeper tool activity when keepers exist', () => {
    keepers.value = [
      {
        name: 'keeper-a',
        koreanName: '키퍼A',
        pipeline_stage: 'working',
        turn_count: 5,
      } as any,
    ]
    render(h(Planning), container)

    expect(container.textContent).toContain('도구 활동 요약')
    expect(container.textContent).toContain('활성 keeper')
    expect(container.textContent).toContain('키퍼A')
  })

  it('shows refresh button text', () => {
    render(h(Planning), container)
    expect(container.textContent).toContain('계획 데이터 새로고침')
  })
})
