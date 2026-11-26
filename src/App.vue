<script setup lang="ts">
import { computed, ref } from 'vue'
import QueryBuilder from './components/QueryBuilder.vue'
import { PAGE_SIZE, useSearch, type EuropePmcResult } from './composables/useSearch'
import { cleanTitle } from './utils/cleanTitle'

const { results, hitCount, page, loading, error, empty, hasNext, hasPrevious, search, next, previous, retry } =
  useSearch()
const searched = ref(false)
const retrying = ref(false)
const failedRetries = ref(0)
const heading = ref<HTMLElement>()

const first = computed(() => (page.value - 1) * PAGE_SIZE + 1)
const formatNumber = (n: number) => n.toLocaleString('en-GB')
const status = computed(() => {
  if (loading.value) return 'Loading results'
  // Screen readers skip a live region whose text comes back unchanged, so each failed retry names its attempt.
  if (error.value)
    return failedRetries.value
      ? `The search failed again (attempt ${failedRetries.value + 1}). Please try again.`
      : error.value
  if (empty.value) return 'No results. Try removing a term to widen the search.'
  if (!results.value.length) return ''
  const last = first.value + results.value.length - 1
  return `Results ${formatNumber(first.value)} to ${formatNumber(last)} of ${formatNumber(hitCount.value)}`
})

const articleUrl = (result: EuropePmcResult) =>
  `https://europepmc.org/article/${encodeURIComponent(result.source)}/${encodeURIComponent(result.id)}`

function onSearch(query: string) {
  searched.value = true
  failedRetries.value = 0
  search(query)
}

// Focus only follows a page that actually changed, so a failed Next or Previous leaves it on the button;
// a newer request still loading means a new search took over, and focus stays where the user is.
async function changePage(move: () => Promise<void>) {
  const before = page.value
  failedRetries.value = 0
  await move()
  if (page.value === before || loading.value) return
  heading.value?.focus()
}

// Retry stays rendered while it loads, so focus never drops to the page; a second failure leaves it on Retry.
async function retryWithFocus() {
  retrying.value = true
  await retry()
  retrying.value = false
  failedRetries.value = error.value ? failedRetries.value + 1 : 0
  if (!error.value && !loading.value) heading.value?.focus()
}
</script>

<template>
  <main>
    <h1>Search Europe PMC</h1>
    <QueryBuilder @search="onSearch" />

    <p aria-live="polite">{{ status }}</p>
    <button v-if="error || retrying" type="button" @click="retryWithFocus">Retry</button>

    <section v-if="searched" aria-labelledby="results-heading">
      <h2 id="results-heading" ref="heading" tabindex="-1">Results</h2>
      <template v-if="results.length">
        <ol :start="first">
          <li v-for="result in results" :key="`${result.source}-${result.id}`">
            <h3>
              <a :href="articleUrl(result)">{{ cleanTitle(result.title) }}</a>
            </h3>
            <p v-if="result.authorString">{{ result.authorString }}</p>
            <p v-if="result.journalTitle || result.pubYear">
              {{ [result.journalTitle, result.pubYear].filter(Boolean).join(', ') }}
            </p>
          </li>
        </ol>
        <nav aria-label="Results pages">
          <button type="button" :disabled="!hasPrevious" @click="changePage(previous)">Previous</button>
          <button type="button" :disabled="!hasNext" @click="changePage(next)">Next</button>
        </nav>
      </template>
    </section>
  </main>
</template>
