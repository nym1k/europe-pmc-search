// DOMParser documents are inert: no scripts run and no images load, so parsing untrusted titles is safe.
const textOf = (html: string) => new DOMParser().parseFromString(html, 'text/html').body.textContent ?? ''

// shortcut: a decoded < followed by a letter is read as a tag and stripped; issue #13 replaces this with an allow-list sanitiser.
export function cleanTitle(title: string) {
  return textOf(textOf(title))
}
