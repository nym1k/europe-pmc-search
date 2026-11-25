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
const addButton = ref<HTMLButtonElement>()

async function addTerm() {
  const id = nextId++
  terms.value.push({ id, operator: 'AND', text: '' })
  await nextTick()
  focusTerm(id)
}

async function removeTerm(index: number) {
  const previous = terms.value[index - 1]
  terms.value.splice(index, 1)
  await nextTick()
  if (previous) focusTerm(previous.id)
  else addButton.value?.focus()
}

function submit() {
  if (query.value) emit('search', query.value)
}
</script>

<template>
  <form @submit.prevent="submit">
    <ol>
      <li v-for="(term, index) in terms" :key="term.id">
        <template v-if="index > 0">
          <label :for="`operator-${term.id}`">Operator for term {{ index + 1 }}</label>
          <select :id="`operator-${term.id}`" v-model="term.operator">
            <option v-for="operator in operators" :key="operator" :value="operator">{{ operator }}</option>
          </select>
        </template>
        <label :for="`term-${term.id}`">Term {{ index + 1 }}</label>
        <input :id="`term-${term.id}`" v-model="term.text" type="text" />
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
    <button ref="addButton" type="button" @click="addTerm">Add term</button>

    <h2>Query preview</h2>
    <p data-testid="query-preview">{{ query }}</p>

    <button type="submit">Search</button>
  </form>
</template>
