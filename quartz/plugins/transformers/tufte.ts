import type { Element, ElementContent, Root } from "hast"
import type { Root as MdRoot } from "mdast"
import { findAndReplace } from "mdast-util-find-and-replace"
import { toString } from "hast-util-to-string"
import { visit } from "unist-util-visit"
import type { QuartzTransformerPlugin } from "../types"

const element = (
  tagName: string,
  properties: Element["properties"],
  children: ElementContent[] = [],
): Element => ({ type: "element", tagName, properties, children })

const classes = (node: Element): string[] => String(node.properties.className ?? "").split(/[ ,]+/)

// Marginalia live inside paragraphs. Keep the rendered children (including KaTeX),
// but turn block wrappers into phrasing content so browsers don't split the paragraph.
const blocks = new Set([
  "p",
  "div",
  "blockquote",
  "ul",
  "ol",
  "li",
  "pre",
  "figure",
  "figcaption",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "td",
  "th",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
])
function inlineContent(children: ElementContent[]): ElementContent[] {
  return children.flatMap((child): ElementContent[] => {
    if (child.type !== "element") return [child]
    if (
      child.properties.dataFootnoteBackref !== undefined ||
      classes(child).includes("callout-title")
    ) {
      return []
    }
    if (classes(child).includes("callout-content")) return inlineContent(child.children)
    const copy = structuredClone(child)
    copy.children = inlineContent(copy.children)
    if (blocks.has(copy.tagName)) {
      copy.properties.className = [...classes(copy), `tufte-${copy.tagName}`]
      copy.tagName = "span"
    }
    return [copy]
  })
}

export function tufteHtml() {
  return (tree: Root) => {
    const definitions = new Map<string, Element>()
    const callouts = new Map<string, Element>()
    const labels = new Map<Element, string>()
    const ids = new Set<string>()
    visit(tree, "element", (node) => {
      if (node.properties.id) ids.add(String(node.properties.id))
      if (
        node.tagName === "blockquote" &&
        (node.properties.dataCallout ?? node.properties["data-callout"]) === "sidenote"
      ) {
        const title = node.children.find(
          (child) => child.type === "element" && classes(child).includes("callout-title"),
        )
        const label = title && toString(title).trim()
        if (label && !/^sidenote$/i.test(label)) {
          labels.set(node, label)
          if (!callouts.has(label)) callouts.set(label, node)
        }
      }
      if (node.tagName === "section" && node.properties.dataFootnotes !== undefined) {
        visit(node, "element", (item) => {
          if (item.tagName === "li" && item.properties.id) {
            definitions.set(String(item.properties.id), item)
          }
        })
      }
    })

    let serial = 0
    const note = (kind: "sidenote" | "marginnote", children: ElementContent[], label?: string) => {
      let id: string
      do {
        id = `tufte-${++serial}`
      } while (ids.has(id) || ids.has(`${id}-body`))
      ids.add(id)
      ids.add(`${id}-body`)
      const numbered = kind === "sidenote"
      const ariaLabel = numbered
        ? `Toggle sidenote${label ? ` ${label}` : ""}`
        : "Toggle margin note"
      return [
        element(
          "label",
          {
            htmlFor: id,
            className: ["margin-toggle", ...(numbered ? ["sidenote-number"] : [])],
            ariaLabel,
            dataNoteLabel: label,
          },
          numbered ? [] : [{ type: "text", value: "⊕" }],
        ),
        element("input", {
          type: "checkbox",
          id,
          className: ["margin-toggle"],
          ariaLabel,
          ariaControls: `${id}-body`,
        }),
        element(
          "span",
          { id: `${id}-body`, className: [kind], dataNoteLabel: label },
          inlineContent(children),
        ),
      ]
    }

    // Tufte Suite pairs literal [^label] markers with titled sidenote callouts.
    // Resolve them after Markdown/KaTeX rendering, without rewriting vault files.
    const usedCallouts = new Set<Element>()
    function inlineCalloutRefs(parent: Root | Element) {
      if (parent.type === "element") {
        const kind = parent.properties.dataCallout ?? parent.properties["data-callout"]
        if (
          ["code", "pre", "a", "sup", "script", "style", "math"].includes(parent.tagName) ||
          classes(parent).includes("katex") ||
          parent.properties.dataFootnotes !== undefined ||
          kind === "sidenote" ||
          kind === "marginnote"
        )
          return
      }
      for (let i = 0; i < parent.children.length; i++) {
        const child = parent.children[i]
        if (child.type === "element") {
          inlineCalloutRefs(child)
        } else if (child.type === "text") {
          const replacement: ElementContent[] = []
          let end = 0
          for (const match of child.value.matchAll(/\[\^([^\]\s]+)\](?!:)/g)) {
            const callout = callouts.get(match[1])
            if (!callout) continue
            replacement.push(
              { type: "text", value: child.value.slice(end, match.index) },
              ...note("sidenote", callout.children, match[1]),
            )
            usedCallouts.add(callout)
            end = match.index! + match[0].length
          }
          if (end > 0) {
            replacement.push({ type: "text", value: child.value.slice(end) })
            parent.children.splice(i, 1, ...replacement)
            i += replacement.length - 1
          }
        }
      }
    }
    inlineCalloutRefs(tree)

    function transform(parent: Root | Element) {
      for (let i = 0; i < parent.children.length; i++) {
        const child = parent.children[i]
        if (child.type !== "element") continue
        if (usedCallouts.has(child)) {
          parent.children.splice(i--, 1)
          continue
        }
        if (child.tagName === "section" && child.properties.dataFootnotes !== undefined) continue
        const ref = child.tagName === "sup" ? child.children[0] : child
        if (ref?.type === "element" && ref.properties.dataFootnoteRef !== undefined) {
          const definition = definitions.get(String(ref.properties.href).slice(1))
          if (definition) {
            const replacement = note("sidenote", definition.children)
            parent.children.splice(i, 1, ...replacement)
            i += replacement.length - 1
            continue
          }
        }
        transform(child)
        const kind = child.properties.dataCallout ?? child.properties["data-callout"]
        if (child.tagName === "blockquote" && (kind === "sidenote" || kind === "marginnote")) {
          const replacement = note(kind, child.children, labels.get(child))
          let prev = i - 1
          while (
            prev >= 0 &&
            parent.children[prev].type === "text" &&
            !(parent.children[prev] as { value: string }).value.trim()
          )
            prev--
          const paragraph = parent.children[prev]
          if (paragraph?.type === "element" && paragraph.tagName === "p") {
            paragraph.children.push(...replacement)
            parent.children.splice(i--, 1)
          } else {
            parent.children.splice(
              i,
              1,
              element("p", { className: ["margin-anchor"] }, replacement),
            )
          }
        }
      }
    }
    transform(tree)
    // Keep the standard footnote section if any reference could not be resolved.
    let unresolved = false
    visit(tree, "element", (node) => {
      if (node.properties.dataFootnoteRef !== undefined) unresolved = true
    })
    if (!unresolved) {
      tree.children = tree.children.filter(
        (node) => !(node.type === "element" && node.properties.dataFootnotes !== undefined),
      )
    }
  }
}

export function tufteMarkdown() {
  return (tree: MdRoot) => {
    findAndReplace(tree, [
      [
        /\^\^([^\n]+?)\^\^/g,
        (_match, value: string) => ({
          type: "emphasis",
          data: { hName: "span", hProperties: { className: ["newthought"] } },
          children: [{ type: "text", value }],
        }),
      ],
      [
        /&&([^\n]+?)&&/g,
        (_match, value: string) => ({
          type: "emphasis",
          data: { hProperties: { className: ["tufte-italic-opener"] } },
          children: [{ type: "text", value }],
        }),
      ],
    ])
  }
}

export const Tufte: QuartzTransformerPlugin = () => ({
  name: "Tufte",
  markdownPlugins: () => [tufteMarkdown],
  htmlPlugins: () => [tufteHtml],
})
