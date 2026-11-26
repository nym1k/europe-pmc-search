import { computed, getCurrentScope, onScopeDispose, ref, shallowRef } from 'vue'

const ENDPOINT = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search'
export const PAGE_SIZE = 25

export type EuropePmcResult = {
  id: string
  source: string
  title: string
  authorString?: string
  journalTitle?: string
  pubYear?: string
}

type SearchResponse = {
  hitCount: number
  nextCursorMark?: string
  resultList?: { result: EuropePmcResult[] }
}

export function useSearch() {
  const query = ref('')
  const cursors = ref(['*'])
  const page = ref(1)
  const results = shallowRef<EuropePmcResult[]>([])
  const hitCount = ref(0)
  const nextCursor = ref<string>()
  const searched = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)
  let controller: AbortController | undefined
  let lastLoad: [stack: string[], pageNumber: number] | undefined
  if (getCurrentScope()) onScopeDispose(() => controller?.abort())

  const empty = computed(() => searched.value && hitCount.value === 0)
  const hasPrevious = computed(() => page.value > 1)
  const hasNext = computed(
    () =>
      !!nextCursor.value &&
      nextCursor.value !== cursors.value[page.value - 1] &&
      (page.value - 1) * PAGE_SIZE + results.value.length < hitCount.value,
  )

  // Paging state only moves once the request succeeds, so a failed or aborted page change leaves it as it was.
  async function load(stack: string[], pageNumber: number) {
    lastLoad = [stack, pageNumber]
    controller?.abort()
    const current = (controller = new AbortController())
    loading.value = true
    error.value = null
    const params = new URLSearchParams({
      query: query.value,
      cursorMark: stack[pageNumber - 1],
      format: 'json',
      resultType: 'lite',
      pageSize: String(PAGE_SIZE),
    })
    try {
      const response = await fetch(`${ENDPOINT}?${params}`, { signal: current.signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data: SearchResponse = await response.json()
      // A response can arrive after a newer request has started; only the newest one counts.
      if (current.signal.aborted) return
      cursors.value = stack
      page.value = pageNumber
      results.value = data.resultList?.result ?? []
      hitCount.value = data.hitCount
      nextCursor.value = data.nextCursorMark
      searched.value = true
    } catch {
      if (!current.signal.aborted) error.value = 'The search failed. Please try again.'
    } finally {
      if (controller === current) loading.value = false
    }
  }

  function search(newQuery: string) {
    if (!newQuery.trim()) return Promise.resolve()
    query.value = newQuery
    cursors.value = ['*']
    page.value = 1
    results.value = []
    hitCount.value = 0
    nextCursor.value = undefined
    searched.value = false
    return load(['*'], 1)
  }

  function next() {
    if (!hasNext.value || !nextCursor.value) return Promise.resolve()
    return load([...cursors.value.slice(0, page.value), nextCursor.value], page.value + 1)
  }

  function previous() {
    if (!hasPrevious.value) return Promise.resolve()
    return load(cursors.value, page.value - 1)
  }

  function retry() {
    // Re-runs the last request, so a failed next() or previous() is retried as a page change.
    if (!lastLoad) return Promise.resolve()
    return load(...lastLoad)
  }

  return { results, hitCount, page, loading, error, empty, hasNext, hasPrevious, search, next, previous, retry }
}
