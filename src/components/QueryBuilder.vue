<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { buildQuery, type Operator } from '../utils/buildQuery'

type Term = { id: number; operator: Operator; text: string }

const emit = defineEmits<{ search: [query: string] }>()

const operators: Operator[] = ['AND', 'OR', 'NOT']
let nextId = 1
const terms = ref<Term[]>([{ id: nextId++, operator: 'AND', text: '' }])
const query = computed(() => buildQuery(terms.value))

const focusTerm = (id: number) => document.getElementById(`term-${id}`)?.focus()

async function addTerm() {
  const id = nextId++
  terms.value.push({ id, operator: 'AND', text: '' })
  await nextTick()
  focusTerm(id)
}

async function removeTerm(index: number) {
  terms.value.splice(index, 1)
  await nextTick()
  const target = terms.value[index - 1] ?? terms.value[0]
  if (target) focusTerm(target.id)
}

function submit() {
  if (query.value) emit('search', query.value)
}
</script>

<template>
  <form role="search" aria-label="Search Europe PMC" @submit.prevent="submit">
    <ol>
      <li v-for="(term, index) in terms" :key="term.id">
        <div v-if="index > 0" class="field">
          <label :for="`operator-${term.id}`">Operator for term {{ index + 1 }}</label>
          <select :id="`operator-${term.id}`" v-model="term.operator">
            <option v-for="operator in operators" :key="operator" :value="operator">{{ operator }}</option>
          </select>
        </div>
        <div class="field term">
          <label :for="`term-${term.id}`">Term {{ index + 1 }}</label>
          <input :id="`term-${term.id}`" v-model="term.text" type="text" />
        </div>
        <button
          v-if="terms.length > 1"
          type="button"
          :aria-label="`Remove term: ${term.text.trim() || `term ${index + 1}`}`"
          @click="removeTerm(index)"
        >
          Remove
        </button>
      </li>
    </ol>
    <button type="button" @click="addTerm">Add term</button>

    <h2>Query preview</h2>
    <p data-testid="query-preview" class="preview" :class="{ placeholder: !query }">{{ query || 'No query yet' }}</p>

    <button type="submit">Search</button>
  </form>
</template>

<style scoped>
ol {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--space-3);
}

li {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-2) var(--space-3);
  margin-bottom: var(--space-3);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.term {
  flex: 1 1 12rem;
}

.preview {
  padding: var(--space-2) var(--space-3);
  font-family: var(--mono);
  background: var(--surface);
  border-radius: 4px;
  overflow-wrap: anywhere;
}

.placeholder {
  font-family: var(--sans);
  color: var(--text-muted);
}

h2 {
  margin-top: var(--space-4);
}
</style>
