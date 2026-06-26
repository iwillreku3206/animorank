# Changelog entries

Each `.svx` file here is one published changelog entry. They render in
reverse-chronological order at `/changelog` and in the RSS feed at
`/changelog/rss.xml`. Files in this folder are content only — they are not routes.

## Adding an entry

1. Copy an existing `.svx` file and name it `YYYY-MM-DD-short-slug.svx`. The date
   controls ordering; the slug becomes the entry's anchor (`/changelog#slug`) and
   its feed GUID, so don't rename a file after it's published.
2. Fill in the frontmatter:

   ```
   ---
   date: 2026-06-24          # ISO date the change shipped; controls ordering
   title: Short, benefit-led headline
   summary: One sentence shown in meta tags and the RSS feed.
   ---
   ```

3. Write the body in Markdown. Group related changes under bold labels —
   **Added**, **Improved**, **Fixed**, **Removed** — following
   <https://keepachangelog.com>.

## What to include

New features, behavior changes, notable fixes, removals/deprecations, security.

## What to leave out

Internal refactors, dependency bumps, typo fixes — anything users won't notice.

## Voice

Present tense, second person ("you"), benefit first.

- Yes: "You can now filter problem sets by tag."
- No: "Implemented the TagFilter component."

## Workflow

Add or update the relevant entry in the **same PR** as the user-facing change, so
the changelog ships with the release instead of drifting behind it.
