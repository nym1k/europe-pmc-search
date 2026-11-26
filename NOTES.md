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

About 4 hours of building before this README and notes issue, including scaffold and setup, plus about 35 minutes on this issue: about 4h35 in all, against the 3 hours I'd planned.

- **Wed 25 Nov:** about 1h50. Scaffold and setup (16:45 to 17:16), then 18:00 to 19:21 on tests and CI, the query builder function, the query builder form and the start of the search composable.
- **Thu 26 Nov:** about 2h10 from 16:57 to 19:08 on the search composable, the results list and paging, styling and the accessibility check, then the README and these notes from about 19:08 to 19:43.
- **Stated separately:** about 25 minutes planning and writing the issues (17:17 to 17:40 on Wed 25 Nov). The prep before 16:45, reading the API docs and checking the live API, wasn't timed.

It ran over mainly because each round of keyboard and VoiceOver testing turned up something to change, and on making sure the tests would fail if the code they protect broke.

## AI reflection

Claude Code drafted plans, tests and code; I set the scope of each issue and did the manual testing. It edited code through the Serena MCP server, ran the issue and pull request workflow through slash commands, and checked pages with Playwright and axe-core. A separate Claude chat reviewed its plans and pull requests, and on larger pull requests Claude Code also ran a reviewer that hadn't seen our conversation.

The most helpful suggestion came after my VoiceOver pass. Pressing Retry while offline gave no announcement, and Claude explained why: the live region went from the error to "Loading results" and back to the same error within milliseconds, and screen readers skip text that comes back unchanged. It suggested different wording for a failed retry, and when it pointed out that a third failure would repeat that wording, we added the attempt number.

One suggestion I rejected was dropping the abort-on-unmount cleanup in the search composable, because nothing in this app unmounts it. I kept it, with a test, because a composable shouldn't depend on how one page uses it today.

For behaviour changes, tests were written first and seen to fail, and for the search composable I had each guard removed in turn to confirm a test failed. The fresh reviewer found a real focus bug: a new search that cancelled a page still loading moved focus to the Results heading. Claude confirmed it in Chromium by removing the fix, and I checked the fixed behaviour in Safari. axe-core checked five page states at three widths against WCAG 2.2 AA. Before each pull request that changed the page, I tested with the keyboard and VoiceOver in Safari, which is how loading and error messages that sat out of view were found.
