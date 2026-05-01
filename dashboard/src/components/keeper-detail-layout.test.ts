import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { html } from 'htm/preact'
import { render } from 'preact'
import { KeeperDetailSectionCard } from './keeper-detail-layout'

describe('KeeperDetailSectionCard', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    render(null, container)
    container.remove()
  })

  it('renders title and children', () => {
    render(
      html`<${KeeperDetailSectionCard} title="Overview">
        <div data-testid="child">Child content</div>
      <//>`,
      container,
    )

    expect(container.textContent).toContain('Overview')
    expect(container.textContent).toContain('Child content')
    expect(container.querySelector('[data-testid="child"]')).not.toBeNull()
  })

  it('applies card styling classes', () => {
    render(
      html`<${KeeperDetailSectionCard} title="Test">content<//>`,
      container,
    )

    const card = container.querySelector('div')
    expect(card?.classList.contains('rounded')).toBe(true)
    expect(card?.classList.contains('border')).toBe(true)
  })

  it('renders accent dot indicator', () => {
    render(
      html`<${KeeperDetailSectionCard} title="Test">content<//>`,
      container,
    )

    const dot = container.querySelector('span[aria-hidden="true"]')
    expect(dot).not.toBeNull()
    expect(dot?.classList.contains('rounded-full')).toBe(true)
  })
})
