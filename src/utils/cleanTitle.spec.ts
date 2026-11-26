import { describe, expect, it } from 'vitest'
import resultsPage from '../__fixtures__/results-page.json'
import { cleanTitle } from './cleanTitle'

describe('cleanTitle', () => {
  it('decodes entities, then strips the tags they spelled out', () => {
    const laponite = resultsPage.resultList.result[2].title
    expect(laponite).toContain('&lt;sup&gt;')
    expect(cleanTitle(laponite)).toBe(
      'Laponite®/Ethyl Lauroyl Arginate Complex-Functionalized Silk Peptide/Chitosan Edible Coating for Banana Preservation.',
    )
  })

  it('strips real tags', () => {
    expect(cleanTitle('<i>E. coli</i> growth')).toBe('E. coli growth')
  })

  it('keeps an escaped less-than that is not a tag', () => {
    expect(cleanTitle('Dose &lt; 5 mg')).toBe('Dose < 5 mg')
  })

  it('reduces an escaped img with an onerror handler to its text', () => {
    expect(cleanTitle('&lt;img src=x onerror=alert(1)&gt;Title')).toBe('Title')
  })

  it('leaves a plain title unchanged', () => {
    const plain = resultsPage.resultList.result[0].title
    expect(cleanTitle(plain)).toBe(plain)
  })
})
