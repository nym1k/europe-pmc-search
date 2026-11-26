import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import resultsPage from './__fixtures__/results-page.json'
import zeroResults from './__fixtures__/zero-results.json'
import App from './App.vue'

type Body = Record<string, unknown>

const fetchMock = vi.fn()
const ok = (body: Body) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) })
const httpError = () => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) })
const page = (overrides: Body = {}): Body => ({ ...resultsPage, ...overrides })
const fixtureResults = resultsPage.resultList.result
const manyResults = (n: number) => Array.from({ length: n }, (_, i) => ({ ...fixtureResults[0], id: `id-${i}` }))
const requested = (call: number) => new URL(fetchMock.mock.calls[call][0])

// A response the test resolves by hand.
function pending() {
  let resolve!: (body: Body) => void
  const respond = () =>
    new Promise((res) => (resolve = (body) => res({ ok: true, status: 200, json: () => Promise.resolve(body) })))
  return { respond, resolve: (body: Body) => resolve(body) }
}

// Like pending(), but rejects like real fetch when its signal aborts.
function abortable() {
  let resolve!: (body: Body) => void
  const respond = (_url: string, init: RequestInit) =>
    new Promise((res, rej) => {
      resolve = (body) => res({ ok: true, status: 200, json: () => Promise.resolve(body) })
      init.signal?.addEventListener('abort', () => rej(new DOMException('Aborted', 'AbortError')))
    })
  return { respond, resolve: (body: Body) => resolve(body) }
}

const retryButton = (wrapper: VueWrapper) => {
  const found = wrapper.findAll('button').find((b) => b.text() === 'Retry')
  if (!found) throw new Error('No "Retry" button')
  return found
}

enableAutoUnmount(afterEach)
beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

// Attached to the document so focus can be checked.
const mountApp = () => mount(App, { attachTo: document.body })

async function searchFor(wrapper: VueWrapper, text: string) {
  await wrapper.get('input[type="text"]').setValue(text)
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

const liveRegion = (wrapper: VueWrapper) => wrapper.get('[aria-live="polite"]')
const resultsSection = (wrapper: VueWrapper) => wrapper.get('section[aria-labelledby="results-heading"]')
const resultsList = (wrapper: VueWrapper) => resultsSection(wrapper).get('ol')
const resultsHeading = (wrapper: VueWrapper) => resultsSection(wrapper).get('h2#results-heading')
const pagingButton = (wrapper: VueWrapper, text: 'Previous' | 'Next') => {
  const found = wrapper
    .get('nav[aria-label="Results pages"]')
    .findAll('button')
    .find((b) => b.text() === text)
  if (!found) throw new Error(`No "${text}" button in the results nav`)
  return found
}

async function clickWithFocus(wrapper: VueWrapper, text: 'Previous' | 'Next') {
  const button = pagingButton(wrapper, text)
  ;(button.element as HTMLButtonElement).focus()
  await button.trigger('click')
  await flushPromises()
  return button
}

describe('App', () => {
  it('mounts and renders a heading', () => {
    const wrapper = mount(App)
    expect(wrapper.find('h1').exists()).toBe(true)
  })

  describe('results', () => {
    it('searches with the builder query and renders each result', async () => {
      fetchMock.mockImplementationOnce(() => ok(page()))
      const wrapper = mountApp()
      await searchFor(wrapper, 'bananas')

      expect(requested(0).searchParams.get('query')).toBe('bananas')
      expect(resultsHeading(wrapper).text()).toBe('Results')
      const items = resultsList(wrapper).findAll('li')
      expect(items).toHaveLength(3)

      const laponite = items[2]
      const link = laponite.get('h3 > a')
      expect(link.text()).toBe(
        'Laponite®/Ethyl Lauroyl Arginate Complex-Functionalized Silk Peptide/Chitosan Edible Coating for Banana Preservation.',
      )
      expect(link.attributes('href')).toBe('https://europepmc.org/article/MED/43027453')
      expect(laponite.text()).toContain(fixtureResults[2].authorString)
      expect(laponite.text()).toContain('Foods')
      expect(laponite.text()).toContain('2026')
    })

    it('leaves out authors and journal when they are missing', async () => {
      const { authorString: _a, journalTitle: _j, ...bare } = fixtureResults[0]
      fetchMock.mockImplementationOnce(() => ok(page({ hitCount: 1, resultList: { result: [bare] } })))
      const wrapper = mountApp()
      await searchFor(wrapper, 'bananas')

      const item = resultsList(wrapper).get('li')
      expect(item.get('h3 > a').text()).toBe(bare.title)
      expect(item.text()).toContain('2026')
      expect(item.text()).not.toContain('undefined')
      expect(item.findAll('*').filter((el) => el.text().trim() === '')).toHaveLength(0)
    })
  })

  describe('count', () => {
    it('reads the range and total on the first page', async () => {
      fetchMock.mockImplementationOnce(() => ok(page()))
      const wrapper = mountApp()
      await searchFor(wrapper, 'bananas')
      expect(liveRegion(wrapper).text()).toBe('Results 1 to 3 of 18,068')
    })

    it('reads the range on page 2 and numbers the list from 26', async () => {
      const full = () => ok(page({ hitCount: 48213, resultList: { result: manyResults(25) } }))
      fetchMock.mockImplementationOnce(full).mockImplementationOnce(full)
      const wrapper = mountApp()
      await searchFor(wrapper, 'bananas')
      expect(resultsList(wrapper).attributes('start')).toBe('1')

      await pagingButton(wrapper, 'Next').trigger('click')
      await flushPromises()
      expect(liveRegion(wrapper).text()).toBe('Results 26 to 50 of 48,213')
      expect(resultsList(wrapper).attributes('start')).toBe('26')
    })

    it('reads a partial last page', async () => {
      fetchMock
        .mockImplementationOnce(() => ok(page({ hitCount: 28, resultList: { result: manyResults(25) } })))
        .mockImplementationOnce(() => ok(page({ hitCount: 28, nextCursorMark: 'page3' })))
      const wrapper = mountApp()
      await searchFor(wrapper, 'bananas')
      await pagingButton(wrapper, 'Next').trigger('click')
      await flushPromises()
      expect(liveRegion(wrapper).text()).toBe('Results 26 to 28 of 28')
    })
  })

  describe('paging', () => {
    it('disables Previous on the first page and Next on the last page', async () => {
      fetchMock
        .mockImplementationOnce(() => ok(page({ hitCount: 28, resultList: { result: manyResults(25) } })))
        .mockImplementationOnce(() => ok(page({ hitCount: 28, nextCursorMark: 'page3' })))
      const wrapper = mountApp()
      await searchFor(wrapper, 'bananas')
      expect(pagingButton(wrapper, 'Previous').attributes('disabled')).toBeDefined()
      expect(pagingButton(wrapper, 'Next').attributes('disabled')).toBeUndefined()

      await pagingButton(wrapper, 'Next').trigger('click')
      await flushPromises()
      expect(pagingButton(wrapper, 'Previous').attributes('disabled')).toBeUndefined()
      expect(pagingButton(wrapper, 'Next').attributes('disabled')).toBeDefined()
    })

    it('keeps both buttons enabled while a page is loading', async () => {
      const nextPage = pending()
      fetchMock
        .mockImplementationOnce(() => ok(page()))
        .mockImplementationOnce(() => ok(page({ nextCursorMark: 'page3' })))
        .mockImplementationOnce(nextPage.respond)
      const wrapper = mountApp()
      await searchFor(wrapper, 'bananas')
      await pagingButton(wrapper, 'Next').trigger('click')
      await flushPromises()

      await pagingButton(wrapper, 'Next').trigger('click')
      expect(liveRegion(wrapper).text()).toBe('Loading results')
      expect(pagingButton(wrapper, 'Previous').attributes('disabled')).toBeUndefined()
      expect(pagingButton(wrapper, 'Next').attributes('disabled')).toBeUndefined()
      nextPage.resolve(page())
      await flushPromises()
    })

    it('goes back to page 1 on a new search', async () => {
      fetchMock.mockImplementation(() => ok(page()))
      const wrapper = mountApp()
      await searchFor(wrapper, 'bananas')
      await pagingButton(wrapper, 'Next').trigger('click')
      await flushPromises()

      await searchFor(wrapper, 'apples')
      expect(requested(2).searchParams.get('cursorMark')).toBe('*')
      expect(requested(2).searchParams.get('query')).toBe('apples')
      expect(liveRegion(wrapper).text()).toBe('Results 1 to 3 of 18,068')
      expect(resultsList(wrapper).attributes('start')).toBe('1')
    })

    it('keeps the page when a term is edited without searching', async () => {
      fetchMock.mockImplementation(() => ok(page()))
      const wrapper = mountApp()
      await searchFor(wrapper, 'bananas')
      await pagingButton(wrapper, 'Next').trigger('click')
      await flushPromises()

      await wrapper.get('input[type="text"]').setValue('apples')
      await flushPromises()
      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(liveRegion(wrapper).text()).toBe('Results 26 to 28 of 18,068')
      expect(resultsList(wrapper).attributes('start')).toBe('26')
    })
  })

  describe('focus', () => {
    it('moves to the results heading after Next and after Previous', async () => {
      fetchMock.mockImplementation(() => ok(page()))
      const wrapper = mountApp()
      await searchFor(wrapper, 'bananas')
      expect(resultsHeading(wrapper).attributes('tabindex')).toBe('-1')

      await clickWithFocus(wrapper, 'Next')
      expect(document.activeElement).toBe(resultsHeading(wrapper).element)

      await clickWithFocus(wrapper, 'Previous')
      expect(document.activeElement).toBe(resultsHeading(wrapper).element)
    })

    it('stays on Next when the next page fails', async () => {
      fetchMock.mockImplementationOnce(() => ok(page())).mockImplementationOnce(httpError)
      const wrapper = mountApp()
      await searchFor(wrapper, 'bananas')
      const next = await clickWithFocus(wrapper, 'Next')
      expect(document.activeElement).toBe(next.element)
    })

    it('stays on Previous when the previous page fails', async () => {
      fetchMock.mockImplementationOnce(() => ok(page())).mockImplementationOnce(() => ok(page())).mockImplementationOnce(httpError)
      const wrapper = mountApp()
      await searchFor(wrapper, 'bananas')
      await pagingButton(wrapper, 'Next').trigger('click')
      await flushPromises()
      const previous = await clickWithFocus(wrapper, 'Previous')
      expect(document.activeElement).toBe(previous.element)
    })

    it('stays in the form after a new search', async () => {
      fetchMock.mockImplementation(() => ok(page()))
      const wrapper = mountApp()
      await searchFor(wrapper, 'bananas')
      await pagingButton(wrapper, 'Next').trigger('click')
      await flushPromises()

      const input = wrapper.get('input[type="text"]').element as HTMLInputElement
      input.focus()
      await searchFor(wrapper, 'apples')
      expect(document.activeElement).toBe(input)
    })

    it('stays in the form when a new search cancels a page that is still loading', async () => {
      const nextPage = abortable()
      fetchMock.mockImplementation(() => ok(page()))
      fetchMock.mockImplementationOnce(() => ok(page())).mockImplementationOnce(() => ok(page({ nextCursorMark: 'page3' })))
      const wrapper = mountApp()
      await searchFor(wrapper, 'bananas')
      await pagingButton(wrapper, 'Next').trigger('click')
      await flushPromises()

      fetchMock.mockImplementationOnce(nextPage.respond)
      await pagingButton(wrapper, 'Next').trigger('click')
      const input = wrapper.get('input[type="text"]').element as HTMLInputElement
      input.focus()
      await searchFor(wrapper, 'apples')
      expect(liveRegion(wrapper).text()).toBe('Results 1 to 3 of 18,068')
      expect(document.activeElement).toBe(input)
    })
  })

  describe('states', () => {
    it('renders the live region, empty, and no results section before any search', () => {
      const wrapper = mountApp()
      expect(liveRegion(wrapper).text()).toBe('')
      expect(wrapper.find('section').exists()).toBe(false)
      expect(wrapper.find('#results-heading').exists()).toBe(false)
      expect(wrapper.findAll('button').some((b) => b.text() === 'Retry')).toBe(false)
    })

    it('says results are loading while a search runs', async () => {
      const response = pending()
      fetchMock.mockImplementationOnce(response.respond)
      const wrapper = mountApp()
      await wrapper.get('input[type="text"]').setValue('bananas')
      await wrapper.get('form').trigger('submit')
      expect(liveRegion(wrapper).text()).toBe('Loading results')
      response.resolve(page())
      await flushPromises()
      expect(liveRegion(wrapper).text()).toBe('Results 1 to 3 of 18,068')
    })

    it('says nothing matched, with a hint to remove a term', async () => {
      fetchMock.mockImplementationOnce(() => ok(zeroResults))
      const wrapper = mountApp()
      await searchFor(wrapper, 'bananas')
      expect(liveRegion(wrapper).text()).toBe('No results. Try removing a term to widen the search.')
      expect(resultsHeading(wrapper).text()).toBe('Results')
      expect(resultsSection(wrapper).find('ol').exists()).toBe(false)
    })

    it('shows the error with a Retry button just after the live region that retries the search', async () => {
      fetchMock.mockImplementationOnce(httpError).mockImplementationOnce(() => ok(page()))
      const wrapper = mountApp()
      await searchFor(wrapper, 'bananas')
      expect(liveRegion(wrapper).text()).toBe('The search failed. Please try again.')

      const retry = liveRegion(wrapper).element.nextElementSibling as HTMLElement
      expect(retry.tagName).toBe('BUTTON')
      expect(retry.textContent).toBe('Retry')
      retry.click()
      await flushPromises()
      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(requested(1).searchParams.get('query')).toBe('bananas')
      expect(liveRegion(wrapper).text()).toBe('Results 1 to 3 of 18,068')
    })

    it('keeps focus on Retry while it loads, then moves to the heading on page 2 once it succeeds', async () => {
      const retried = pending()
      fetchMock
        .mockImplementationOnce(() => ok(page()))
        .mockImplementationOnce(httpError)
        .mockImplementationOnce(retried.respond)
      const wrapper = mountApp()
      await searchFor(wrapper, 'bananas')
      await clickWithFocus(wrapper, 'Next')

      const retry = retryButton(wrapper)
      ;(retry.element as HTMLButtonElement).focus()
      await retry.trigger('click')
      expect(liveRegion(wrapper).text()).toBe('Loading results')
      expect(document.activeElement).toBe(retryButton(wrapper).element)

      retried.resolve(page())
      await flushPromises()
      expect(liveRegion(wrapper).text()).toBe('Results 26 to 28 of 18,068')
      expect(document.activeElement).toBe(resultsHeading(wrapper).element)
    })

    it('keeps focus on Retry when the retry fails again', async () => {
      fetchMock.mockImplementationOnce(() => ok(page())).mockImplementation(httpError)
      const wrapper = mountApp()
      await searchFor(wrapper, 'bananas')
      await clickWithFocus(wrapper, 'Next')

      const retry = retryButton(wrapper)
      ;(retry.element as HTMLButtonElement).focus()
      await retry.trigger('click')
      await flushPromises()
      // Different wording, so screen readers announce a repeat failure instead of skipping identical text.
      expect(liveRegion(wrapper).text()).toBe('The search failed again (attempt 2). Please try again.')
      expect(document.activeElement).toBe(retryButton(wrapper).element)

      await retry.trigger('click')
      await flushPromises()
      expect(liveRegion(wrapper).text()).toBe('The search failed again (attempt 3). Please try again.')
    })

    it('goes back to the first error message for a new search after a failed retry', async () => {
      fetchMock.mockImplementation(httpError)
      const wrapper = mountApp()
      await searchFor(wrapper, 'bananas')
      await retryButton(wrapper).trigger('click')
      await flushPromises()
      expect(liveRegion(wrapper).text()).toBe('The search failed again (attempt 2). Please try again.')

      await searchFor(wrapper, 'apples')
      expect(liveRegion(wrapper).text()).toBe('The search failed. Please try again.')
    })
  })
})
