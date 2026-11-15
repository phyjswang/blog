import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"
import NoteIndex from "./quartz/components/NoteIndex"
import Rss from "./quartz/components/Rss"

export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [
    Component.ConditionalRender({
      component: Component.PageTitle(),
      condition: ({ fileData }) => fileData.slug !== "index",
    }),
    Component.ConditionalRender({
      component: Rss(),
      condition: ({ fileData }) => fileData.slug === "index",
    }),
    Component.Darkmode(),
  ],
  afterBody: [],
  footer: () => null,
}

export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: NoteIndex(),
      condition: ({ fileData }) => fileData.slug === "index",
    }),
    Component.ConditionalRender({
      component: Component.ArticleTitle(),
      condition: ({ fileData }) => fileData.slug !== "index",
    }),
    Component.ConditionalRender({
      component: Component.ContentMeta(),
      condition: ({ fileData }) => fileData.slug !== "index" && fileData.slug !== "about",
    }),
  ],
  left: [],
  right: [],
}

export const defaultListPageLayout: PageLayout = defaultContentPageLayout
