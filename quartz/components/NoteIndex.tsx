import type { ComponentChildren } from "preact"
import type { QuartzComponent, QuartzComponentConstructor } from "./types"
import { resolveRelative } from "../util/path"
import { htmlToJsx } from "../util/jsx"
import { Date as PostDate } from "./Date"

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
