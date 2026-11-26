<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import QueryBuilder from './components/QueryBuilder.vue'
import { PAGE_SIZE, useSearch, type EuropePmcResult } from './composables/useSearch'
import { cleanTitle } from './utils/cleanTitle'

const { results, hitCount, page, loading, error, empty, hasNext, hasPrevious, search, next, previous, retry } =
  useSearch()
const retrying = ref(false)
const failedRetries = ref(0)
const heading = ref<HTMLElement>()

const showError = computed(() => !!error.value && !loading.value)
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
  await nextTick()
  heading.value?.focus()
}

// Retry stays rendered while it loads, so focus never drops to the page; a second failure leaves it on Retry.
async function retryWithFocus() {
  retrying.value = true
  await retry()
  retrying.value = false
  failedRetries.value = error.value ? failedRetries.value + 1 : 0
  if (error.value || loading.value) return
  // The section only renders with results, so after a failed first search the heading appears on the next render.
  await nextTick()
  heading.value?.focus()
}
</script>

<template>
  <main>
    <h1>Search Europe PMC</h1>
    <QueryBuilder @search="onSearch" />

    <p aria-live="polite" :class="{ error: showError }"><span v-if="loading" class="spinner" aria-hidden="true"></span>{{ status }}</p>
    <button v-if="error || retrying" type="button" @click="retryWithFocus">Retry</button>

    <section v-if="results.length" aria-labelledby="results-heading">
      <h2 id="results-heading" ref="heading" tabindex="-1">Results</h2>
      <ol role="list" :start="first" :style="{ counterReset: `result ${first - 1}` }">
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
        <!-- Loading and errors repeated where the user is, since the live region may be scrolled out of view;
             screen readers already hear the live region, so this is visual only.
             Always rendered with its height reserved, so the buttons don't move when it fills. -->
        <span class="nav-status" :class="{ error: showError }" aria-hidden="true">
          <template v-if="loading"><span class="spinner"></span>Loading results</template>
          <template v-else-if="showError">{{ status }}</template>
        </span>
        <button type="button" :disabled="!hasPrevious" @click="changePage(previous)">Previous</button>
        <button type="button" :disabled="!hasNext" @click="changePage(next)">Next</button>
      </nav>
    </section>
  </main>
</template>

<style scoped>
p[aria-live],
.nav-status {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

p[aria-live] {
  margin-top: var(--space-4);
}

.error {
  color: var(--error);
}

.nav-status {
  flex-basis: 100%;
  justify-content: center;
  min-height: 1.5em;
}

.spinner {
  flex: none;
  width: 1em;
  height: 1em;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(1turn);
  }
}

@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
  }
}

/* Numbers sit on the page's left edge and share one column (subgrid) as wide as the widest number, so titles
   line up; Safari drops list semantics with list-style: none, hence role="list" on the <ol>. */
section ol {
  display: grid;
  grid-template-columns: max-content 1fr;
  column-gap: var(--space-2);
  row-gap: var(--space-4);
  list-style: none;
  padding: 0;
  margin: 0 0 var(--space-4);
}

li {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: subgrid;
  counter-increment: result;
}

li::before {
  content: counter(result) '.';
  font-size: 1.125rem;
  font-weight: bold;
  line-height: 1.25;
}

li > * {
  grid-column: 2;
}

h3,
li p {
  overflow-wrap: anywhere;
}

li p {
  margin: 0;
  color: var(--text-muted);
}

nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-2);
}
</style>
