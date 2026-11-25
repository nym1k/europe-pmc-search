export type Operator = 'AND' | 'OR' | 'NOT'

export type QueryTerm = { operator: Operator; text: string }

const clean = (text: string) => text.replace(/["“”]/g, '').replace(/\s+/g, ' ').trim()

const isOperatorWord = (text: string) => /^(AND|OR|NOT)$/i.test(text)

const quote = (text: string) => (text.includes(' ') || isOperatorWord(text) ? `"${text}"` : text)

export function buildQuery(terms: QueryTerm[]): string {
  const usable = terms
    .map(({ operator, text }) => ({ operator, text: quote(clean(text)) }))
    .filter(({ text }) => text !== '')
  if (usable.length === 0) return ''

  const [first, ...rest] = usable
  const mixed = new Set(rest.map(({ operator }) => operator)).size > 1
  return rest.reduce((query, { operator, text }) => {
    const joined = `${query} ${operator} ${text}`
    return mixed ? `(${joined})` : joined
  }, first.text)
}
