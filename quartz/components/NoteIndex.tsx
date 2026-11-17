import type { ComponentChildren } from "preact"
import type { QuartzComponent, QuartzComponentConstructor } from "./types"
import { resolveRelative } from "../util/path"
import { htmlToJsx } from "../util/jsx"
import { Date as PostDate } from "./Date"

// Brand icons from Simple Icons (CC0): https://simpleicons.org; custom email icon.
const profileIcons = [
  {
    key: "orcid",
    label: "ORCID",
    path: "M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zM7.369 4.378c.525 0 .947.431.947.947s-.422.947-.947.947a.95.95 0 0 1-.947-.947c0-.525.422-.947.947-.947zm-.722 3.038h1.444v10.041H6.647V7.416zm3.562 0h3.9c3.712 0 5.344 2.653 5.344 5.025 0 2.578-2.016 5.025-5.325 5.025h-3.919V7.416zm1.444 1.303v7.444h2.297c3.272 0 4.022-2.484 4.022-3.722 0-2.016-1.284-3.722-4.097-3.722h-2.222z",
  },
  {
    key: "scholar",
    label: "Google Scholar",
    path: "M5.242 13.769L0 9.5 12 0l12 9.5-5.242 4.269C17.548 11.249 14.978 9.5 12 9.5c-2.977 0-5.548 1.748-6.758 4.269zM12 10a7 7 0 1 0 0 14 7 7 0 0 0 0-14z",
  },
  {
    key: "github",
    label: "GitHub",
    path: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
  },
  {
    key: "email",
    label: "Email",
    path: "M2 4h20v16H2V4zm2 2 8 6 8-6H4zm16 3-8 6-8-6v9h16V9z",
  },
]

const NoteIndex: QuartzComponent = ({ cfg, fileData, allFiles }) => {
  const about = allFiles.find((page) => page.slug === "about")
  const notes = allFiles
    .filter((page) => page.slug && page.slug !== "index" && page.slug !== "about")
    .sort(
      (a, b) =>
        (b.dates?.published.getTime() ?? 0) - (a.dates?.published.getTime() ?? 0) ||
        (a.frontmatter?.title ?? "").localeCompare(b.frontmatter?.title ?? ""),
    )

  return (
    <main class="home-columns">
      <section class="home-about" aria-labelledby="home-name">
        <h1 id="home-name">{cfg.pageTitle}</h1>
        <nav class="profile-links" aria-label="Profiles">
          {profileIcons.map(({ key, label, path }) => {
            const href = about?.frontmatter?.[key]
            if (typeof href !== "string" || !href) return null
            return (
              <a
                key={key}
                href={key === "email" ? `mailto:${href}` : href}
                aria-label={label}
                title={label}
                target={key === "email" ? undefined : "_blank"}
                rel="noopener noreferrer"
                data-router-ignore
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d={path} />
                </svg>
              </a>
            )
          })}
        </nav>
        <h2>About</h2>
        {about?.htmlAst && (
          <div class="home-bio">
            {htmlToJsx(about.filePath!, about.htmlAst) as ComponentChildren}
          </div>
        )}
      </section>
      <section class="home-posts" aria-labelledby="posts-heading">
        <h2 id="posts-heading">Posts</h2>
        <ul>
          {notes.map((page) => (
            <li key={page.slug}>
              {page.dates && <PostDate date={page.dates.published} locale={cfg.locale} />}
              <h3>
                <a class="internal" href={resolveRelative(fileData.slug!, page.slug!)}>
                  {page.frontmatter?.title ?? page.slug}
                </a>
              </h3>
              <p>{page.frontmatter?.description ?? page.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

export default (() => NoteIndex) satisfies QuartzComponentConstructor
