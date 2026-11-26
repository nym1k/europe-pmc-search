# Engineering notes

## Key decisions

- **Cursor paging that only moves on success.** The API pages with a `cursorMark`, so `useSearch` keeps a stack of cursors to go back with. The page, the stack and the results only change once a request succeeds, so a failed or cancelled page change leaves everything as it was, and Retry re-runs the request that failed.
- **Left-to-right bracketing.** The builder has no grouping controls. If every operator is the same the query stays flat (`a AND b AND c`); if they're mixed, every join is bracketed left to right, so `a AND b OR c` gives `((a AND b) OR c)` and `a AND b AND c OR d` gives `(((a AND b) AND c) OR d)`. Slightly over-bracketed, but the query always means what the rows say in order, whatever the API's own operator precedence.
- **Two-pass `cleanTitle`.** Titles arrive with escaped markup such as `&lt;sup&gt;`. The first pass decodes entities and the second strips the tags they spelled out, both with an inert `DOMParser`, and titles render through interpolation, never `v-html`. Limit: a decoded `<` followed by a letter is read as a tag and dropped ([#13](https://github.com/nym1k/europe-pmc-search/issues/13) replaces this with an allow-list sanitiser).
- **A Search button, not search-as-you-type.** Requests can take several seconds, so searching on each keystroke would fire many slow requests and announce half-typed queries. One request per search also keeps well within the API's rate limit (10 requests a second, 500 a minute), and the live preview shows the query before it is sent.
- **One live region, always on the page.** Screen readers often miss a live region that is inserted along with its text, so a single polite region is present from the start and only its text changes: loading, the result range, no results or an error. A repeated failure names its attempt, because identical text is not announced again.
- **Focus rules.** Focus moves only when the user would otherwise lose their place: to a new term, to the previous term after a removal, and to the Results heading after paging or a successful retry. It stays on the button after a failure and in the form after a new search.
- **No page numbers.** The cursor API only returns the next page's cursor, so jumping to page 7 would mean fetching pages 2 to 6 first. Previous and Next, with "Results 26 to 50 of …", say where you are instead.
- **Native operator select.** Browser-default controls are exempt from the 3:1 border contrast rule, and the native control behaves best with the keyboard, VoiceOver and forced colours.

## Workflow

- Work was split into GitHub issues, each built on its own branch and merged through a pull request.
- For behaviour changes, tests were written first and seen to fail.
- Each pull request was reviewed before merging, with a separate fresh review of the larger ones.
- Changes to the page were tested by hand with the keyboard and VoiceOver in Safari before each pull request.
- Ideas outside an issue's scope were logged as `later` issues rather than built.

## Limitations and next steps

- [#9](https://github.com/nym1k/europe-pmc-search/issues/9) Field searches for title, author and year
- [#10](https://github.com/nym1k/europe-pmc-search/issues/10) Sort order
- [#11](https://github.com/nym1k/europe-pmc-search/issues/11) Sync the query with the URL
- [#12](https://github.com/nym1k/europe-pmc-search/issues/12) Cache visited result pages
- [#13](https://github.com/nym1k/europe-pmc-search/issues/13) Allow-list sanitiser for titles
- [#14](https://github.com/nym1k/europe-pmc-search/issues/14) Add ESLint with Vue and accessibility rules
- [#16](https://github.com/nym1k/europe-pmc-search/issues/16) Quote terms containing query syntax
- [#19](https://github.com/nym1k/europe-pmc-search/issues/19) Show a message when Search is pressed with no terms
- [#21](https://github.com/nym1k/europe-pmc-search/issues/21) Time out slow searches and offer Retry
- [#23](https://github.com/nym1k/europe-pmc-search/issues/23) Dark colour scheme
- [#24](https://github.com/nym1k/europe-pmc-search/issues/24) Show a loading state on the Search button

## Time spent

_To be written._

## AI reflection

_To be written._
