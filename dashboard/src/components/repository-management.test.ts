// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { h } from 'preact'
import { render } from 'preact'

vi.mock('./repo-sidebar', () => ({
  RepoSidebar: () => h('div', { 'data-testid': 'repo-sidebar' }, 'RepoSidebar'),
  selectedRepoId: { value: null },
  fetchRepositories: vi.fn(),
  showAddRepoDialog: vi.fn(),
}))

vi.mock('./repo-detail-panel', () => ({
  RepoDetailPanel: () => h('div', { 'data-testid': 'repo-detail-panel' }, 'RepoDetailPanel'),
}))

vi.mock('./add-repo-dialog', () => ({
  AddRepoDialog: () => h('div', { 'data-testid': 'add-repo-dialog' }, 'AddRepoDialog'),
}))

vi.mock('./credential-settings', () => ({
  CredentialSettings: () => h('div', { 'data-testid': 'credential-settings' }, 'CredentialSettings'),
}))

vi.mock('./keeper-repo-mapping', () => ({
  KeeperRepoMapping: () => h('div', { 'data-testid': 'keeper-repo-mapping' }, 'KeeperRepoMapping'),
}))

import { RepositoryManagement } from './repository-management'

describe('RepositoryManagement', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    render(null, container)
    container.remove()
  })

  it('renders header and tabs', () => {
    render(h(RepositoryManagement, null), container)
    expect(container.textContent).toContain('저장소 운영')
    expect(container.textContent).toContain('저장소')
    expect(container.textContent).toContain('Credentials')
    expect(container.textContent).toContain('Keeper 접근')
  })

  it('shows repos view by default', () => {
    render(h(RepositoryManagement, null), container)
    expect(container.querySelector('[data-testid="repo-sidebar"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="repo-detail-panel"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="add-repo-dialog"]')).not.toBeNull()
  })

  it('switches to credentials view on button click', () => {
    render(h(RepositoryManagement, null), container)
    const credsButton = Array.from(container.querySelectorAll('button')).find(
      b => b.textContent?.includes('Credentials'),
    )
    expect(credsButton).not.toBeUndefined()
    credsButton!.click()
    render(h(RepositoryManagement, null), container)
    expect(container.querySelector('[data-testid="credential-settings"]')).not.toBeNull()
  })

  it('switches to mappings view on button click', () => {
    render(h(RepositoryManagement, null), container)
    const mapButton = Array.from(container.querySelectorAll('button')).find(
      b => b.textContent?.includes('Keeper 접근'),
    )
    expect(mapButton).not.toBeUndefined()
    mapButton!.click()
    render(h(RepositoryManagement, null), container)
    expect(container.querySelector('[data-testid="keeper-repo-mapping"]')).not.toBeNull()
  })
})
