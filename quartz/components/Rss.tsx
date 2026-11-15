import type { QuartzComponent, QuartzComponentConstructor } from "./types"
import { pathToRoot } from "../util/path"

const Rss: QuartzComponent = ({ fileData }) => (
  <a
    class="rss-link"
    href={`${pathToRoot(fileData.slug!)}/index.xml`}
    type="application/rss+xml"
    aria-label="RSS feed"
    title="RSS feed"
    data-router-ignore
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <circle cx="5" cy="19" r="1" fill="currentColor" />
      <path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16" />
    </svg>
  </a>
)

export default (() => Rss) satisfies QuartzComponentConstructor
