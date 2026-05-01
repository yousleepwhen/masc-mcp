// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { h } from 'preact'
import { render } from 'preact'

import { SchemaField } from './schema-field'

describe('SchemaField', () => {
  let container: HTMLDivElement
  const onChange = vi.fn()

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    onChange.mockClear()
  })

  afterEach(() => {
    render(null, container)
    container.remove()
  })

  it('renders Select for string with enum', () => {
    render(
      h(SchemaField, {
        name: 'model',
        schema: { type: 'string', enum: ['gpt-4', 'gpt-3.5'] },
        value: 'gpt-4',
        required: true,
        onChange,
      }),
      container,
    )
    const select = container.querySelector('select')
    expect(select).not.toBeNull()
    expect(container.textContent).toContain('model')
    expect(container.textContent).toContain('*')
  })

  it('renders TextArea for long text string names', () => {
    render(
      h(SchemaField, {
        name: 'prompt',
        schema: { type: 'string' },
        value: '',
        required: false,
        onChange,
      }),
      container,
    )
    const textarea = container.querySelector('textarea')
    expect(textarea).not.toBeNull()
    expect(container.textContent).toContain('prompt')
  })

  it('renders TextInput for short string names', () => {
    render(
      h(SchemaField, {
        name: 'token',
        schema: { type: 'string' },
        value: 'abc',
        required: false,
        onChange,
      }),
      container,
    )
    const input = container.querySelector('input[type="text"]')
    expect(input).not.toBeNull()
    expect(container.textContent).toContain('token')
  })

  it('renders NumberInput for integer type', () => {
    render(
      h(SchemaField, {
        name: 'maxTokens',
        schema: { type: 'integer' },
        value: 1024,
        required: true,
        onChange,
      }),
      container,
    )
    const input = container.querySelector('input[type="number"]')
    expect(input).not.toBeNull()
    expect(input!.getAttribute('step')).toBe('1')
    expect(container.textContent).toContain('maxTokens')
  })

  it('renders NumberInput with any step for number type', () => {
    render(
      h(SchemaField, {
        name: 'temperature',
        schema: { type: 'number' },
        value: 0.7,
        required: false,
        onChange,
      }),
      container,
    )
    const input = container.querySelector('input[type="number"]')
    expect(input!.getAttribute('step')).toBe('any')
  })

  it('renders Checkbox for boolean type', () => {
    render(
      h(SchemaField, {
        name: 'stream',
        schema: { type: 'boolean', description: 'Stream response' },
        value: true,
        required: false,
        onChange,
      }),
      container,
    )
    const checkbox = container.querySelector('input[type="checkbox"]')
    expect(checkbox).not.toBeNull()
    expect(checkbox!.checked).toBe(true)
    expect(container.textContent).toContain('stream')
    expect(container.textContent).toContain('Stream response')
  })

  it('renders TextArea for array of strings', () => {
    render(
      h(SchemaField, {
        name: 'tags',
        schema: { type: 'array', items: { type: 'string' } },
        value: ['a', 'b'],
        required: false,
        onChange,
      }),
      container,
    )
    const textarea = container.querySelector('textarea')
    expect(textarea).not.toBeNull()
    expect(textarea!.value).toBe('a\nb')
    expect(container.textContent).toContain('줄바꿈으로 구분')
  })

  it('renders JSON TextArea for unknown schema type', () => {
    render(
      h(SchemaField, {
        name: 'config',
        schema: { type: 'object' },
        value: { foo: 1 },
        required: false,
        onChange,
      }),
      container,
    )
    const textarea = container.querySelector('textarea')
    expect(textarea).not.toBeNull()
    expect(textarea!.value).toContain('"foo": 1')
    expect(container.textContent).toContain('JSON')
  })

  it('fires onChange from string input', () => {
    render(
      h(SchemaField, {
        name: 'title',
        schema: { type: 'string' },
        value: '',
        required: false,
        onChange,
      }),
      container,
    )
    const input = container.querySelector('input')
    input!.value = 'hello'
    input!.dispatchEvent(new Event('input', { bubbles: true }))
    expect(onChange).toHaveBeenCalledWith('title', 'hello')
  })

  it('fires onChange from number input', () => {
    render(
      h(SchemaField, {
        name: 'count',
        schema: { type: 'integer' },
        value: '',
        required: false,
        onChange,
      }),
      container,
    )
    const input = container.querySelector('input[type="number"]')
    input!.value = '42'
    input!.dispatchEvent(new Event('input', { bubbles: true }))
    expect(onChange).toHaveBeenCalledWith('count', 42)
  })

  it('fires onChange from checkbox', () => {
    render(
      h(SchemaField, {
        name: 'flag',
        schema: { type: 'boolean' },
        value: false,
        required: false,
        onChange,
      }),
      container,
    )
    const checkbox = container.querySelector('input[type="checkbox"]')
    checkbox!.checked = true
    checkbox!.dispatchEvent(new Event('change', { bubbles: true }))
    expect(onChange).toHaveBeenCalledWith('flag', true)
  })

  it('fires onChange with parsed lines from array textarea', () => {
    render(
      h(SchemaField, {
        name: 'lines',
        schema: { type: 'array', items: { type: 'string' } },
        value: [],
        required: false,
        onChange,
      }),
      container,
    )
    const textarea = container.querySelector('textarea')
    textarea!.value = 'x\ny\n'
    textarea!.dispatchEvent(new Event('input', { bubbles: true }))
    expect(onChange).toHaveBeenCalledWith('lines', ['x', 'y'])
  })

  it('shows description hint when provided', () => {
    render(
      h(SchemaField, {
        name: 'apiKey',
        schema: { type: 'string', description: 'Your API key' },
        value: '',
        required: false,
        onChange,
      }),
      container,
    )
    expect(container.textContent).toContain('Your API key')
  })
})
