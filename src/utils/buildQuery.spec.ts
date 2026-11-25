import { describe, expect, it } from 'vitest'
import { buildQuery, type Operator, type QueryTerm } from './buildQuery'

const term = (operator: Operator, text: string): QueryTerm => ({ operator, text })

describe('buildQuery', () => {
  describe('bracketing', () => {
    it('leaves a single operator type unbracketed', () => {
      expect(buildQuery([term('AND', 'a'), term('AND', 'b'), term('AND', 'c')])).toBe('a AND b AND c')
      expect(buildQuery([term('AND', 'a'), term('OR', 'b'), term('OR', 'c')])).toBe('a OR b OR c')
    })

    it('brackets mixed operators left to right', () => {
      expect(buildQuery([term('AND', 'a'), term('AND', 'b'), term('NOT', 'c')])).toBe('((a AND b) NOT c)')
    })

    it('brackets all three operators mixed left to right', () => {
      expect(
        buildQuery([term('AND', 'a'), term('AND', 'b'), term('OR', 'c'), term('NOT', 'd')]),
      ).toBe('(((a AND b) OR c) NOT d)')
    })

    it('brackets every step when a run of one operator comes before a mix', () => {
      expect(
        buildQuery([term('AND', 'a'), term('AND', 'b'), term('AND', 'c'), term('OR', 'd')]),
      ).toBe('(((a AND b) AND c) OR d)')
    })
  })

  describe('cleaning terms', () => {
    it('quotes multi-word terms and collapses inner spaces', () => {
      expect(buildQuery([term('AND', '  lung   cancer ')])).toBe('"lung cancer"')
      expect(buildQuery([term('AND', 'lung cancer'), term('AND', 'malaria')])).toBe('"lung cancer" AND malaria')
    })

    it('strips quotes the user types', () => {
      expect(buildQuery([term('AND', '"malaria"')])).toBe('malaria')
      expect(buildQuery([term('AND', 'he said "hi" there')])).toBe('"he said hi there"')
    })

    it('strips curly quotes too', () => {
      expect(buildQuery([term('AND', '“malaria”')])).toBe('malaria')
    })

    it('quotes a term that is just an operator word', () => {
      expect(buildQuery([term('AND', 'a'), term('AND', 'AND')])).toBe('a AND "AND"')
      expect(buildQuery([term('AND', 'a'), term('OR', 'not')])).toBe('a OR "not"')
    })

    it('drops empty, whitespace-only and quote-only terms with their operator', () => {
      expect(
        buildQuery([term('AND', 'a'), term('OR', ''), term('NOT', '   '), term('OR', '""'), term('AND', 'b')]),
      ).toBe('a AND b')
    })
  })

  describe('operators at the edges', () => {
    it("ignores the first term's operator, including NOT", () => {
      expect(buildQuery([term('NOT', 'a'), term('AND', 'b')])).toBe('a AND b')
      expect(buildQuery([term('OR', 'a'), term('AND', 'b'), term('AND', 'c')])).toBe('a AND b AND c')
    })

    it('ignores the operator of the first term left after dropping empty ones', () => {
      expect(buildQuery([term('AND', ''), term('NOT', 'a'), term('OR', 'b')])).toBe('a OR b')
    })

    it('never starts or ends with an operator', () => {
      expect(buildQuery([term('NOT', 'a')])).toBe('a')
      expect(buildQuery([term('AND', 'a'), term('OR', '  ')])).toBe('a')
    })

    it('returns an empty string when there are no usable terms', () => {
      expect(buildQuery([])).toBe('')
      expect(buildQuery([term('AND', ' '), term('OR', '""')])).toBe('')
    })
  })
})
