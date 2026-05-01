// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { h, render } from 'preact'

const mockShowAddRepoDialog = { value: false }

vi.mock('./repo-sidebar', () => ({
  showAddRepoDialog: mockShowAddRepoDialog,
  fetchRepositories: vi.fn(),
}))

vi.mock('../api/core', () => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('./common/toast', () => ({
  showToast: vi.fn(),
}))

vi.mock('lucide-preact', () => ({
  X: () => h('span', null, 'X'),
}))

describe('add-repo-dialog', () => {
  let container: HTMLDivElement

  beforeEach(async () => {
    vi.resetModules()
    mockShowAddRepoDialog.value = false
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    render(null, container)
    container.remove()
    vi.restoreAllMocks()
  })

  it('returns null when dialog is closed', async () => {
    const { AddRepoDialog } = await import('./add-repo-dialog')
    render(h(AddRepoDialog), container)
    expect(container.innerHTML).toBe('')
  })

  it('renders form when dialog is open', async () => {
    mockShowAddRepoDialog.value = true
    const { AddRepoDialog } = await import('./add-repo-dialog')
    render(h(AddRepoDialog), container)
    expect(container.textContent).toContain('저장소 추가')
    expect(container.textContent).toContain('이름')
    expect(container.textContent).toContain('URL')
    expect(container.textContent).toContain('로컬 경로')
    expect(container.textContent).toContain('기본 브랜치')
  })

  it('shows credential loading state', async () => {
    mockShowAddRepoDialog.value = true
    const api = await import('../api/core')
    api.get.mockImplementation(() => new Promise(() => {}))
    const { AddRepoDialog } = await import('./add-repo-dialog')
    render(h(AddRepoDialog), container)
    expect(container.textContent).toContain('인증 정보 로딩 중')
  })

  it('shows credential options when loaded', async () => {
    mockShowAddRepoDialog.value = true
    const api = await import('../api/core')
    api.get.mockResolvedValue([
      { id: 'cred-1', name: 'GitHub Token' },
    ])
    const { AddRepoDialog } = await import('./add-repo-dialog')
    render(h(AddRepoDialog), container)
    await new Promise(r => setTimeout(r, 10))
    expect(container.textContent).toContain('GitHub Token')
  })

  it('shows empty credential message', async () => {
    mockShowAddRepoDialog.value = true
    const api = await import('../api/core')
    api.get.mockResolvedValue([])
    const { AddRepoDialog } = await import('./add-repo-dialog')
    render(h(AddRepoDialog), container)
    await new Promise(r => setTimeout(r, 10))
    expect(container.textContent).toContain('등록된 인증 정보가 없습니다')
  })

  it('validates empty name', async () => {
    mockShowAddRepoDialog.value = true
    const { AddRepoDialog } = await import('./add-repo-dialog')
    render(h(AddRepoDialog), container)
    const submitBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('저장소 등록'))
    expect(submitBtn).toBeTruthy()
    submitBtn!.click()
    await new Promise(r => setTimeout(r, 10))
    expect(container.textContent).toContain('저장소 이름을 입력하세요')
  })

  it('validates empty url', async () => {
    mockShowAddRepoDialog.value = true
    const { AddRepoDialog } = await import('./add-repo-dialog')
    render(h(AddRepoDialog), container)
    const nameInput = container.querySelector('input[placeholder="my-project"]') as HTMLInputElement
    nameInput.value = 'my-repo'
    nameInput.dispatchEvent(new Event('input', { bubbles: true }))
    const submitBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('저장소 등록'))
    expect(submitBtn).toBeTruthy()
    submitBtn!.click()
    await new Promise(r => setTimeout(r, 10))
    expect(container.textContent).toContain('저장소 URL을 입력하세요')
  })

  it('submits with valid data', async () => {
    mockShowAddRepoDialog.value = true
    const api = await import('../api/core')
    api.post.mockResolvedValue({})
    const toast = await import('./common/toast')
    const sidebar = await import('./repo-sidebar')

    const { AddRepoDialog } = await import('./add-repo-dialog')
    render(h(AddRepoDialog), container)

    const inputs = container.querySelectorAll('input')
    const nameInput = Array.from(inputs).find(i => i.placeholder === 'my-project') as HTMLInputElement
    const urlInput = Array.from(inputs).find(i => i.placeholder?.includes('github')) as HTMLInputElement

    nameInput.value = 'my-repo'
    nameInput.dispatchEvent(new Event('input', { bubbles: true }))
    urlInput.value = 'https://github.com/a/b.git'
    urlInput.dispatchEvent(new Event('input', { bubbles: true }))

    const submitBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('저장소 등록'))
    expect(submitBtn).toBeTruthy()
    submitBtn!.click()

    await new Promise(r => setTimeout(r, 10))
    expect(api.post).toHaveBeenCalled()
    expect(toast.showToast).toHaveBeenCalledWith('저장소 등록 완료', 'success')
    expect(sidebar.fetchRepositories).toHaveBeenCalled()
  })
})
