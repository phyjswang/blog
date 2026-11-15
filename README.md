# Tufte notebook

Quartz **4.5.2**, with TufteObsidian's bundled ET Book and Cabin fonts, KaTeX,
numbered sidenotes, and responsive margin notes. Requires Node **22+** and npm 10.9+.
The Quartz source is vendored from commit `4923affa7722dfc751f1074348e6dad214fe0c08`;
its MIT license is in `LICENSE.txt`.

## Write and preview

This folder is the Obsidian vault. Write notes and keep their attachments in
`content/`. That directory and `.obsidian/` are ignored by Git. Add YAML
frontmatter to each note you want to publish:

```yaml
---
title: My note
publish: true
published: 2026-11-15
description: A one-sentence summary of the note.
---
```

Only the boolean `true` opts a note in. `content/index.md` is the home page: your name and the body of `content/about.md`
appear on the left, and exported posts appear on the right, newest first. Edit
`content/about.md` to update the bio. Set each post’s `published` date and a
one-sentence `description` in its frontmatter; these appear beside its title.
`learning-what-to-prove.md` is the first included essay. The home page has an RSS link beside the theme toggle at the top right.
Note pages retain their reading layout and theme toggle, without search or
a footer credit.

The original typography demonstration is preserved in `content/tufte-demo.md`
with `publish: false`, so it stays out of the local export.

```sh
npm ci
npm run sync
npm run dev
```

Open <http://localhost:8080>. After editing notes, run `npm run sync` again;
Quartz watches the exported files. `npm run build` creates a production build
from the current export. Both commands use `published/`, not the private vault.
The equivalent Quartz command is `npx quartz build -d published --serve`.

`npm run sync` exports only opted-in notes and their referenced image, audio,
video, and PDF attachments. It supports Markdown links/images (including
reference-style links), Obsidian wikilinks/embeds, and HTML `src`, `href`,
`poster`, and `srcset`. Unreferenced media, hidden files, and symlinks are excluded.
Missing or ambiguous attachments and embeds of private notes stop the export.
Previously exported notes and assets are removed when no longer selected.
Use unique attachment names or explicit paths when names collide.

`published/` is generated and committed; do not edit it directly. Its
`.vault-export.json` marks the directory as managed by the sync script. The
script refuses to replace an unmarked directory. To use a separate external
vault instead of this vault's `content/` directory:

```sh
OBSIDIAN_VAULT_PATH="/absolute/path/to/other/vault" npm run sync
```

The source and export directories must not overlap. Do not point that variable
at this repository root; the local source is its `content/` directory. Keep
private Markdown and media inside `content/`, not elsewhere in the repository.
Git ignores apply to new files; withdrawing already published content cannot
erase previous Git history or copies downloaded by readers.

## Margin syntax

- Standard footnotes (`[^name]` plus a `[^name]: ...` definition) become numbered
  sidenotes. Repeated references get separate toggles.
- `> [!sidenote]` creates a numbered note beside the preceding paragraph.
- `> [!marginnote]` creates an unnumbered note, with an **⊕** toggle on mobile.
- `^^A new thought^^` renders small caps; `&&An opening phrase&&` renders italics.
- Markdown formatting, images, and `$math$` work inside notes. Shorthands apply
  to plain text spans; code and math are left intact.

Tufte Suite’s paired syntax is supported directly, without changing the source:

```markdown
A thought[^1] in the main paragraph.

> [!sidenote] 1
> A related thought in the margin.
```

The callout title supplies the label for the matching inline marker. Numbered
and named labels are preserved; repeated references get separate mobile toggles.
Unpaired callouts still sit beside the preceding paragraph. Standard Markdown
footnotes remain supported as an alternative. On screens up to 760px, tap a marker
(or focus its checkbox with the keyboard and press Space) to reveal the note.

## Publish updates

Site: <https://phyjswang.github.io/blog/>  
Repository: <https://github.com/phyjswang/blog>

After editing notes in `content/` (or the bio in `content/about.md`):

```sh
npm run sync
git diff -- published
git add -A published
git commit -m "Update notes"
git push
```

GitHub Actions builds and deploys automatically. For a new post, include
`publish: true`, `published: YYYY-MM-DD`, `title`, and a one-sentence `description`.
To withdraw a post, set `publish: false` and repeat the same commands. For design
or code changes, also stage the specific files you changed before committing.

## GitHub Pages

The workflow builds the committed `published/` export on pushes to `main` using
Node 22, then deploys it with the official GitHub Pages actions. It never reads
the local vault. Configure the repository's **Settings → Pages → Source** as
**GitHub Actions**. The deployment workflow derives the site URL from Pages;
local builds default to `phyjswang.github.io/blog`. Override it with
`QUARTZ_BASE_URL=example.com/path` (without a URL scheme).

For each publication, run `npm run sync`, review `git diff -- published`, and
commit and push the changes. The Quartz `ExplicitPublish` filter provides a
second check at build time. Use `npm run sync` for this project's selective
export; Quartz's separate `npx quartz sync` command is not the vault exporter.

## Checks and customization

```sh
npm run test:blog
npm test
npm run check
npm run build
```

- `quartz.config.ts`: title, colors, plugins, site URL.
- `quartz.layout.ts`: minimal header and empty sidebars.
- `quartz/plugins/transformers/tufte.ts`: Markdown shorthands and rendered notes.
- `quartz/styles/custom.scss`: typography, margin layout, mobile toggles.
- `scripts/sync-vault.mjs`: selective export.

Fonts are served locally; licenses are in `quartz/static/fonts/`. KaTeX's
stylesheet and copy support use the CDN configured by Quartz's LaTeX plugin.
Analytics and hover previews are disabled.

The inherited Quartz 4 dependency tree still reports eight npm audit advisories
(four low, two moderate, two high) after compatible fixes. The high-severity
findings affect Sharp and the TOML parser. Resolving the remaining reports
requires dependency changes beyond the upstream version ranges. Sharp and the
TOML parser run at build time; the deployed site is static and has no Node server.
