import assert from "node:assert/strict"
import test from "node:test"
import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import remarkRehype from "remark-rehype"
import rehypeRaw from "rehype-raw"
import rehypeKatex from "rehype-katex"
import { toHtml } from "hast-util-to-html"
import { tufteHtml, tufteMarkdown } from "../quartz/plugins/transformers/tufte"

async function render(markdown: string) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(tufteMarkdown)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeKatex)
    .use(tufteHtml)
  return toHtml(await processor.run(processor.parse(markdown)))
}

test("footnotes preserve formatting and math, remove backlinks, and get unique toggles", async () => {
  const html = await render(
    "Body $x^2$.[^a] Again[^a].\n\n[^a]: *Emphasis*, [link](https://example.org), $x+y$.\n\n    Second paragraph.\n\n    - A list item",
  )
  assert.equal((html.match(/class="sidenote"/g) ?? []).length, 2)
  assert.equal((html.match(/class="katex"/g) ?? []).length, 3)
  assert.match(html, /<em>Emphasis<\/em>/)
  assert.match(html, /href="https:\/\/example.org"/)
  assert.doesNotMatch(html, /data-footnotes|data-footnote-backref/)
  assert.doesNotMatch(html, /<span[^>]*class="sidenote"[^>]*><p>/)
  const ids = [...html.matchAll(/<input[^>]*id="([^"]+)"/g)].map((m) => m[1])
  assert.equal(new Set(ids).size, 2)
  for (const id of ids) assert.ok(html.includes(`for="${id}"`))
})

test("callouts attach to the preceding paragraph and keep images and equations", async () => {
  const html = await render(
    'Lead.\n\n<blockquote data-callout="marginnote"><div class="callout-title">Margin</div><p><img src="plot.svg" alt="Plot"></p></blockquote>\n\n<blockquote data-callout="sidenote"><div class="callout-title">Aside</div><p>Extra <em>detail</em>.</p></blockquote>',
  )
  assert.match(html, /<p>Lead\.<label/)
  assert.match(html, />⊕<\/label><input[^>]+><span[^>]+class="marginnote"/)
  assert.match(html, /<img src="plot.svg" alt="Plot">/)
  assert.match(html, /class="margin-toggle sidenote-number"/)
  assert.doesNotMatch(html, /callout-title|<blockquote|<div/)
})

test("standalone callouts work and ordinary blockquotes survive", async () => {
  const html = await render(
    '<blockquote data-callout="sidenote"><p>Standalone</p></blockquote>\n\n> Ordinary quote',
  )
  assert.match(html, /<p class="margin-anchor">/)
  assert.match(html, /<blockquote>\n<p>Ordinary quote<\/p>/)
})

test("shorthands transform prose but not code or math", async () => {
  const html = await render(
    "^^A beginning^^ and &&an aside&&. `^^literal^^` and `&&literal&&`. $x^{^^}$",
  )
  assert.match(html, /<span class="newthought">A beginning<\/span>/)
  assert.match(html, /<em class="tufte-italic-opener">an aside<\/em>/)
  assert.match(html, /<code>\^\^literal\^\^<\/code>/)
  assert.match(html, /<code>&#x26;&#x26;literal&#x26;&#x26;<\/code>/)
})

// This is the callout HTML shape produced by ObsidianFlavoredMarkdown.
const suiteCallout = (label: string, body: string) =>
  `<blockquote data-callout="sidenote"><div class="callout-title"><div class="callout-title-inner">${label}</div></div>\n\n${body}\n\n</blockquote>`

test("Tufte Suite callouts attach at their inline marker, preserving the explicit label and rich content", async () => {
  const html = await render(
    `A thought[^7] continues.\n\n${suiteCallout("7", "*Formatted* $x^2$ and [a link](https://example.org).\n\n![A figure](plot.svg)")}`,
  )
  assert.match(html, /<p>A thought<label[^>]+data-note-label="7"/)
  assert.match(html, /<\/span> continues\.<\/p>/)
  assert.equal((html.match(/class="sidenote"/g) ?? []).length, 1)
  assert.match(html, /<em>Formatted<\/em>/)
  assert.match(html, /class="katex"/)
  assert.match(html, /href="https:\/\/example.org"/)
  assert.match(html, /<img src="plot.svg" alt="A figure">/)
  assert.doesNotMatch(html, /\[\^7\]|callout-title|<blockquote|data-footnotes/)
})

test("named and repeated markers work even when the callout comes first", async () => {
  const html = await render(
    `${suiteCallout("idea", "One idea.")}\n\nFirst[^idea], then again[^idea].`,
  )
  assert.equal((html.match(/class="sidenote"/g) ?? []).length, 2)
  assert.equal((html.match(/data-note-label="idea"/g) ?? []).length, 4)
  const ids = [...html.matchAll(/<input[^>]*id="([^"]+)"/g)].map((m) => m[1])
  assert.equal(new Set(ids).size, 2)
  assert.doesNotMatch(html, /\[\^idea\]|<blockquote|margin-anchor/)
})

test("markers in code and links stay literal; unmatched markers and standalone callouts survive", async () => {
  const html = await render(
    `Real[^1]. Missing[^missing].\n\n\`[^1]\` and [link [^1]](https://example.org).\n\n\`\`\`text\n[^1]\n\`\`\`\n\n${suiteCallout("1", "Paired.")}\n\n${suiteCallout("9", "Standalone.")}`,
  )
  assert.equal((html.match(/class="sidenote"/g) ?? []).length, 2)
  assert.match(html, /<code>\[\^1\]<\/code>/)
  assert.match(html, /<a href="https:\/\/example.org">link \[\^1\]<\/a>/)
  assert.match(html, /<code class="language-text">\[\^1\]/)
  assert.match(html, /Missing\[\^missing\]/)
  assert.match(html, /data-note-label="9"/)
  assert.match(html, /Standalone\./)
})

test("paired callouts and standard footnotes can coexist", async () => {
  const html = await render(
    `Callout[^side], footnote[^foot].\n\n${suiteCallout("side", "The callout body.")}\n\n[^foot]: The footnote body.`,
  )
  assert.equal((html.match(/class="sidenote"/g) ?? []).length, 2)
  assert.match(html, /The callout body\./)
  assert.match(html, /The footnote body\./)
  assert.doesNotMatch(html, /data-footnotes|\[\^side\]|callout-title/)
})
