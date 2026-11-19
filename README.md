# TermWeb

The website of TermOne, TermTwo, TermThree and TermFour: download page, documentation and package
browser. It is plain HTML, CSS and JavaScript in `site/`, with no build step.

## How it gets its data

- The download buttons read the latest release of `Term-org/TermApp` from the GitHub API.
- The package page reads the `Packages` index of the TP and TCP apt repositories published on
  GitHub Pages.

Both happen in the visitor's browser, so nothing here needs to be rebuilt when a release or a
package changes.

## Deploying

Push to `main`. The workflow checks every local link and anchor with `scripts/check-links.py`
and publishes `site/` to GitHub Pages. Set **Settings > Pages > Source** to **GitHub Actions**
once.

To preview locally:

    python3 -m http.server --directory site 8000
