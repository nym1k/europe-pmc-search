import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import QueryBuilder from './QueryBuilder.vue'

enableAutoUnmount(afterEach)

// Attached to the document so focus can be checked.
const mountBuilder = () => mount(QueryBuilder, { attachTo: document.body })

const button = (wrapper: VueWrapper, text: string) => {
  const found = wrapper.findAll('button').find((b) => b.text() === text)
  if (!found) throw new Error(`No button "${text}"`)
  return found
}
const inputs = (wrapper: VueWrapper) => wrapper.findAll('input[type="text"]')
const selects = (wrapper: VueWrapper) => wrapper.findAll('select')
const removeButtons = (wrapper: VueWrapper) => wrapper.findAll('button[aria-label^="Remove term"]')
const preview = (wrapper: VueWrapper) => wrapper.get('[data-testid="query-preview"]').text()

const addTerm = async (wrapper: VueWrapper) => {
  await button(wrapper, 'Add term').trigger('click')
  await flushPromises()
}

describe('QueryBuilder', () => {
  describe('adding and removing terms', () => {
    it('starts with one term and no remove button', () => {
      const wrapper = mountBuilder()
      expect(inputs(wrapper)).toHaveLength(1)
      expect(removeButtons(wrapper)).toHaveLength(0)
    })

    it('adds a term and focuses its input', async () => {
      const wrapper = mountBuilder()
      await addTerm(wrapper)
      expect(inputs(wrapper)).toHaveLength(2)
      expect(document.activeElement).toBe(inputs(wrapper)[1].element)
    })

    it('names remove buttons after the term, or its position when empty', async () => {
      const wrapper = mountBuilder()
      await inputs(wrapper)[0].setValue('malaria')
      await addTerm(wrapper)
      expect(removeButtons(wrapper).map((b) => b.attributes('aria-label'))).toEqual([
        'Remove term: malaria',
        'Remove term: term 2',
      ])
    })

    it('removes a term and focuses the previous term', async () => {
      const wrapper = mountBuilder()
      await addTerm(wrapper)
      await removeButtons(wrapper)[1].trigger('click')
      await flushPromises()
      expect(inputs(wrapper)).toHaveLength(1)
      expect(document.activeElement).toBe(inputs(wrapper)[0].element)
    })

    it('focuses the new first term after removing the first term', async () => {
      const wrapper = mountBuilder()
      await addTerm(wrapper)
      await removeButtons(wrapper)[0].trigger('click')
      await flushPromises()
      expect(document.activeElement).toBe(inputs(wrapper)[0].element)
    })
  })

  describe('operators', () => {
    it('gives every term after the first an AND/OR/NOT select', async () => {
      const wrapper = mountBuilder()
      expect(selects(wrapper)).toHaveLength(0)
      await addTerm(wrapper)
      await addTerm(wrapper)
      expect(selects(wrapper)).toHaveLength(2)
      expect(selects(wrapper)[0].findAll('option').map((o) => o.text())).toEqual(['AND', 'OR', 'NOT'])
    })

    it("drops the new first term's operator when the first term is removed", async () => {
      const wrapper = mountBuilder()
      await inputs(wrapper)[0].setValue('a')
      await addTerm(wrapper)
      await inputs(wrapper)[1].setValue('b')
      await selects(wrapper)[0].setValue('NOT')
      await removeButtons(wrapper)[0].trigger('click')
      expect(selects(wrapper)).toHaveLength(0)
      expect(preview(wrapper)).toBe('b')
    })
  })

  describe('preview', () => {
    it('shows the built query as terms and operators change', async () => {
      const wrapper = mountBuilder()
      expect(preview(wrapper)).toBe('')
      await inputs(wrapper)[0].setValue('malaria')
      expect(preview(wrapper)).toBe('malaria')
      await addTerm(wrapper)
      await inputs(wrapper)[1].setValue('lung cancer')
      expect(preview(wrapper)).toBe('malaria AND "lung cancer"')
      await selects(wrapper)[0].setValue('NOT')
      expect(preview(wrapper)).toBe('malaria NOT "lung cancer"')
    })
  })

  describe('labels', () => {
    it('gives every input and select a visible label linked by id', async () => {
      const wrapper = mountBuilder()
      await addTerm(wrapper)
      const fields = [...inputs(wrapper), ...selects(wrapper)]
      const labels = fields.map((field) => {
        const id = field.attributes('id')
        expect(id).toBeTruthy()
        return wrapper.get(`label[for="${id}"]`).text()
      })
      expect(labels).toEqual(['Term 1', 'Term 2', 'Operator for term 2'])
    })

    it('keeps labels and focus tied to the right term after removing the first of three', async () => {
      const wrapper = mountBuilder()
      await inputs(wrapper)[0].setValue('a')
      await addTerm(wrapper)
      await inputs(wrapper)[1].setValue('b')
      await addTerm(wrapper)
      await inputs(wrapper)[2].setValue('c')

      await removeButtons(wrapper)[0].trigger('click')
      await flushPromises()
      const labelled = inputs(wrapper).map((input) => {
        const label = wrapper.get(`label[for="${input.attributes('id')}"]`)
        return [label.text(), (input.element as HTMLInputElement).value]
      })
      expect(labelled).toEqual([
        ['Term 1', 'b'],
        ['Term 2', 'c'],
      ])
      expect(document.activeElement).toBe(inputs(wrapper)[0].element)
      expect((document.activeElement as HTMLInputElement).value).toBe('b')

      await removeButtons(wrapper)[1].trigger('click')
      await flushPromises()
      expect(document.activeElement).toBe(inputs(wrapper)[0].element)
      expect((document.activeElement as HTMLInputElement).value).toBe('b')
    })
  })

  describe('search', () => {
    it('is a labelled search landmark', () => {
      const form = mountBuilder().get('form')
      expect(form.attributes('role')).toBe('search')
      expect(form.attributes('aria-label')).toBe('Search Europe PMC')
    })

    it('emits the built query when Search is pressed', async () => {
      const wrapper = mountBuilder()
      await inputs(wrapper)[0].setValue('malaria')
      await button(wrapper, 'Search').trigger('click')
      expect(wrapper.emitted('search')).toEqual([['malaria']])
    })

    it('emits the built query when the form is submitted with Enter', async () => {
      const wrapper = mountBuilder()
      await inputs(wrapper)[0].setValue('malaria')
      await wrapper.get('form').trigger('submit')
      expect(wrapper.emitted('search')).toEqual([['malaria']])
    })

    it('emits nothing for an empty query', async () => {
      const wrapper = mountBuilder()
      await inputs(wrapper)[0].setValue('   ')
      await wrapper.get('form').trigger('submit')
      expect(wrapper.emitted('search')).toBeUndefined()
    })
  })
})
