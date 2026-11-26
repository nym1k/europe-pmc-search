import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import resultsPage from '../__fixtures__/results-page.json'
import zeroResults from '../__fixtures__/zero-results.json'
import { useSearch } from './useSearch'

type Body = Record<string, unknown>

const fetchMock = vi.fn()

const ok = (body: Body) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) })
const httpError = (status: number) => Promise.resolve({ ok: false, status, json: () => Promise.resolve({}) })
const page = (overrides: Body = {}): Body => ({ ...resultsPage, ...overrides })

// A response the test resolves by hand; it rejects like real fetch when its signal aborts.
function pending() {
  let resolve!: (body: Body) => void
  const respond = (_url: string, init: RequestInit) =>
    new Promise((res, rej) => {
      resolve = (body) => res({ ok: true, status: 200, json: () => Promise.resolve(body) })
      init.signal?.addEventListener('abort', () => rej(new DOMException('Aborted', 'AbortError')))
    })
  return { respond, resolve: (body: Body) => resolve(body) }
}

const requested = (call: number) => new URL(fetchMock.mock.calls[call][0])

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

describe('useSearch', () => {
  describe('search', () => {
    it('requests the first page and exposes the results', async () => {
      fetchMock.mockImplementationOnce(() => ok(page()))
      const s = useSearch()
      await s.search('bananas')

      const url = requested(0)
      expect(url.origin + url.pathname).toBe('https://www.ebi.ac.uk/europepmc/webservices/rest/search')
      expect(Object.fromEntries(url.searchParams)).toEqual({
        query: 'bananas',
        cursorMark: '*',
        format: 'json',
        resultType: 'lite',
        pageSize: '25',
      })
      expect(s.results.value.map((r) => r.id)).toEqual(['43061341', '42903256', '43027453'])
      expect(s.hitCount.value).toBe(18068)
      expect(s.page.value).toBe(1)
    })

    it('is loading while a request runs, and not after', async () => {
      const response = pending()
      fetchMock.mockImplementationOnce(response.respond)
      const s = useSearch()
      const done = s.search('bananas')
      expect(s.loading.value).toBe(true)
      response.resolve(page())
      await done
      expect(s.loading.value).toBe(false)
    })

    it('does nothing for an empty query', async () => {
      const s = useSearch()
      await s.search('')
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('encodes the query in the request URL', async () => {
      const query = '"heart attack" AND (mice OR rats)'
      fetchMock.mockImplementationOnce(() => ok(page()))
      const s = useSearch()
      await s.search(query)
      expect(fetchMock.mock.calls[0][0]).toContain('query=%22heart+attack%22+AND+%28mice+OR+rats%29&')
      expect(requested(0).searchParams.get('query')).toBe(query)
    })
  })

  describe('empty state', () => {
    it('is not empty before any search has run', () => {
      expect(useSearch().empty.value).toBe(false)
    })

    it('is empty with no error when nothing matches', async () => {
      fetchMock.mockImplementationOnce(() => ok(zeroResults))
      const s = useSearch()
      await s.search('sdgljhsadg')
      expect(s.empty.value).toBe(true)
      expect(s.results.value).toEqual([])
      expect(s.error.value).toBeNull()
      expect(s.hasNext.value).toBe(false)
    })
  })

  describe('error state', () => {
    it('sets an error on an HTTP error', async () => {
      fetchMock.mockImplementationOnce(() => httpError(500))
      const s = useSearch()
      await s.search('bananas')
      expect(s.error.value).toBe('The search failed. Please try again.')
      expect(s.loading.value).toBe(false)
    })

    it('sets an error on a network failure', async () => {
      fetchMock.mockImplementationOnce(() => Promise.reject(new TypeError('Failed to fetch')))
      const s = useSearch()
      await s.search('bananas')
      expect(s.error.value).toBe('The search failed. Please try again.')
      expect(s.loading.value).toBe(false)
    })
  })

  describe('aborting', () => {
    it('aborts the request in flight on a new search, without setting an error', async () => {
      const first = pending()
      const second = pending()
      fetchMock.mockImplementationOnce(first.respond).mockImplementationOnce(second.respond)
      const s = useSearch()
      const firstDone = s.search('apples')
      const secondDone = s.search('bananas')
      await firstDone

      expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true)
      expect(s.loading.value).toBe(true)
      second.resolve(page())
      await secondDone
      expect(s.error.value).toBeNull()
      expect(s.loading.value).toBe(false)
      expect(s.hitCount.value).toBe(18068)
    })

    it('never lets a stale response overwrite newer results', async () => {
      let resolveStale!: (value: unknown) => void
      // Ignores its signal, so it resolves after the newer search.
      fetchMock
        .mockImplementationOnce(() => new Promise((res) => (resolveStale = res)))
        .mockImplementationOnce(() => ok(page()))
      const s = useSearch()
      const staleDone = s.search('apples')
      await s.search('bananas')
      resolveStale({ ok: true, status: 200, json: () => Promise.resolve(zeroResults) })
      await staleDone

      expect(s.hitCount.value).toBe(18068)
      expect(s.empty.value).toBe(false)
    })
  })

  describe('paging', () => {
    it('moves next and back with the cursor stack', async () => {
      fetchMock
        .mockImplementationOnce(() => ok(page()))
        .mockImplementationOnce(() => ok(page({ nextCursorMark: 'page3' })))
        .mockImplementationOnce(() => ok(page()))
      const s = useSearch()
      await s.search('bananas')
      expect(s.hasPrevious.value).toBe(false)
      expect(s.hasNext.value).toBe(true)

      await s.next()
      expect(requested(1).searchParams.get('cursorMark')).toBe(resultsPage.nextCursorMark)
      expect(s.page.value).toBe(2)
      expect(s.hasPrevious.value).toBe(true)

      await s.previous()
      expect(requested(2).searchParams.get('cursorMark')).toBe('*')
      expect(s.page.value).toBe(1)
      expect(s.hasPrevious.value).toBe(false)
    })

    it('does nothing on previous() from the first page', async () => {
      fetchMock.mockImplementationOnce(() => ok(page()))
      const s = useSearch()
      await s.search('bananas')
      expect(s.hasPrevious.value).toBe(false)
      await s.previous()
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(s.page.value).toBe(1)
    })

    it('requests the same cursors again after going back', async () => {
      const page2 = () => ok(page({ nextCursorMark: 'page3' }))
      fetchMock.mockImplementation(() => ok(page()))
      const s = useSearch()
      await s.search('bananas')
      fetchMock.mockImplementationOnce(page2)
      await s.next()
      await s.previous()
      fetchMock.mockImplementationOnce(page2)
      await s.next()
      expect(requested(3).searchParams.get('cursorMark')).toBe(resultsPage.nextCursorMark)
      expect(s.page.value).toBe(2)
      await s.next()
      expect(requested(4).searchParams.get('cursorMark')).toBe('page3')
      expect(s.page.value).toBe(3)
    })

    it('round-trips a cursor containing + / and = exactly', async () => {
      const cursor = 'AoE/+x9z=='
      fetchMock.mockImplementationOnce(() => ok(page({ nextCursorMark: cursor }))).mockImplementationOnce(() => ok(page()))
      const s = useSearch()
      await s.search('bananas')
      await s.next()
      expect(requested(1).searchParams.get('cursorMark')).toBe(cursor)
    })

    it('resets the cursor stack and page on a new search', async () => {
      fetchMock.mockImplementation(() => ok(page()))
      const s = useSearch()
      await s.search('bananas')
      await s.next()
      await s.search('apples')
      expect(requested(2).searchParams.get('cursorMark')).toBe('*')
      expect(requested(2).searchParams.get('query')).toBe('apples')
      expect(s.page.value).toBe(1)
      expect(s.hasPrevious.value).toBe(false)

      fetchMock.mockImplementation(() => ok(page({ nextCursorMark: 'apples-2' })))
      await s.next()
      await s.next()
      await s.previous()
      expect(requested(5).searchParams.get('cursorMark')).toBe(resultsPage.nextCursorMark)
      await s.previous()
      expect(requested(6).searchParams.get('cursorMark')).toBe('*')
    })

    it('resets straight away when a new search starts, before it responds', async () => {
      const later = pending()
      fetchMock
        .mockImplementationOnce(() => ok(page()))
        .mockImplementationOnce(() => ok(page()))
        .mockImplementationOnce(later.respond)
      const s = useSearch()
      await s.search('bananas')
      await s.next()
      const done = s.search('apples')

      expect(s.results.value).toEqual([])
      expect(s.hitCount.value).toBe(0)
      expect(s.page.value).toBe(1)
      expect(s.hasPrevious.value).toBe(false)
      later.resolve(page())
      await done
    })

    it('has no next page without a new cursor, with a repeated cursor, or once every hit is seen', async () => {
      const s = useSearch()
      fetchMock.mockImplementationOnce(() => ok(page({ nextCursorMark: undefined })))
      await s.search('bananas')
      expect(s.hasNext.value).toBe(false)

      fetchMock.mockImplementationOnce(() => ok(page({ nextCursorMark: '*' })))
      await s.search('bananas')
      expect(s.hasNext.value).toBe(false)

      fetchMock.mockImplementationOnce(() => ok(page({ hitCount: 3 })))
      await s.search('bananas')
      expect(s.hasNext.value).toBe(false)

      fetchMock
        .mockImplementationOnce(() => ok(page({ hitCount: 28 })))
        .mockImplementationOnce(() => ok(page({ hitCount: 28, nextCursorMark: 'page3' })))
      await s.search('bananas')
      expect(s.hasNext.value).toBe(true)
      await s.next()
      expect(s.page.value).toBe(2)
      expect(s.hasNext.value).toBe(false)
    })

    it('keeps the page and results when next() fails', async () => {
      fetchMock.mockImplementationOnce(() => ok(page())).mockImplementationOnce(() => httpError(500))
      const s = useSearch()
      await s.search('bananas')
      const before = s.results.value
      await s.next()
      expect(s.error.value).toBeTruthy()
      expect(s.page.value).toBe(1)
      expect(s.results.value).toEqual(before)
      expect(s.hasPrevious.value).toBe(false)
    })

    it('keeps the page when next() is aborted, without setting an error', async () => {
      const nextResponse = pending()
      fetchMock.mockImplementationOnce(() => ok(page())).mockImplementationOnce(nextResponse.respond)
      const scope = effectScope()
      const s = scope.run(() => useSearch())!
      await s.search('bananas')
      const before = s.results.value
      const nextDone = s.next()
      scope.stop()
      await nextDone
      expect(s.results.value).toBe(before)
      expect(s.page.value).toBe(1)
      expect(s.hasPrevious.value).toBe(false)
      expect(s.error.value).toBeNull()
    })
  })

  describe('aborted next() responding late', () => {
    it('never shows the late page', async () => {
      let resolveLate!: (value: unknown) => void
      fetchMock
        .mockImplementationOnce(() => ok(page()))
        // Ignores its signal, so it resolves after the new search.
        .mockImplementationOnce(() => new Promise((res) => (resolveLate = res)))
        .mockImplementationOnce(() => ok(page()))
      const s = useSearch()
      await s.search('bananas')
      const nextDone = s.next()
      await s.search('bananas')
      resolveLate({ ok: true, status: 200, json: () => Promise.resolve(page({ hitCount: 999, resultList: { result: [] } })) })
      await nextDone

      expect(s.page.value).toBe(1)
      expect(s.hitCount.value).toBe(18068)
      expect(s.results.value).toHaveLength(3)
    })
  })

  describe('cleanup', () => {
    it('aborts the request in flight when its scope is disposed', async () => {
      const response = pending()
      fetchMock.mockImplementationOnce(response.respond)
      const scope = effectScope()
      const s = scope.run(() => useSearch())!
      const done = s.search('bananas')
      scope.stop()
      await done

      expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true)
      expect(s.error.value).toBeNull()
    })
  })

  describe('retry', () => {
    it('re-fetches the current page', async () => {
      fetchMock.mockImplementation(() => ok(page()))
      const s = useSearch()
      await s.search('bananas')
      await s.next()
      await s.retry()
      expect(requested(2).searchParams.get('cursorMark')).toBe(resultsPage.nextCursorMark)
      expect(requested(2).searchParams.get('query')).toBe('bananas')
      expect(s.page.value).toBe(2)
    })

    it('does nothing before any search has run', async () => {
      await useSearch().retry()
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('clears the error once the retry succeeds', async () => {
      fetchMock.mockImplementationOnce(() => httpError(503)).mockImplementationOnce(() => ok(page()))
      const s = useSearch()
      await s.search('bananas')
      expect(s.error.value).toBeTruthy()
      await s.retry()
      expect(s.error.value).toBeNull()
      expect(s.hitCount.value).toBe(18068)
    })

    it('retries the page change after next() fails', async () => {
      fetchMock.mockImplementation(() => ok(page()))
      const s = useSearch()
      await s.search('bananas')
      fetchMock.mockImplementationOnce(() => httpError(503))
      await s.next()
      expect(s.page.value).toBe(1)
      await s.retry()
      expect(requested(2).searchParams.get('cursorMark')).toBe(resultsPage.nextCursorMark)
      expect(s.page.value).toBe(2)
      expect(s.error.value).toBeNull()
    })

    it('retries the page change after previous() fails', async () => {
      fetchMock.mockImplementation(() => ok(page()))
      const s = useSearch()
      await s.search('bananas')
      await s.next()
      fetchMock.mockImplementationOnce(() => httpError(503))
      await s.previous()
      expect(s.page.value).toBe(2)
      await s.retry()
      expect(requested(3).searchParams.get('cursorMark')).toBe('*')
      expect(s.page.value).toBe(1)
      expect(s.error.value).toBeNull()
    })
  })
})
