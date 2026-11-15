import { promises as fs } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import matter from "gray-matter"
import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkGfm from "remark-gfm"
import remarkRehype from "remark-rehype"
import rehypeRaw from "rehype-raw"
import { visit } from "unist-util-visit"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const media = /\.(avif|gif|jpe?g|png|svg|webp|ico|pdf|mp3|m4a|ogg|wav|mp4|webm|mov)$/i
const parser = unified().use(remarkParse).use(remarkGfm)
const htmlParser = unified().use(remarkRehype, { allowDangerousHtml: true }).use(rehypeRaw)
const inside = (parent, child) => child === parent || child.startsWith(parent + path.sep)

async function scan(dir, prefix = "") {
  const files = []
  for (const item of await fs.readdir(dir, { withFileTypes: true })) {
    // Never traverse symlinks, hidden configuration, or dependency directories.
    if (
      item.name.startsWith(".") ||
      ["node_modules", "quartz", "published", "public"].includes(item.name)
    )
      continue
    const relative = path.posix.join(prefix, item.name)
    if (item.isDirectory()) files.push(...(await scan(path.join(dir, item.name), relative)))
    else if (item.isFile()) files.push(relative)
  }
  return files.sort()
}

export async function syncVault(source, destination) {
  source = await fs.realpath(source)
  destination = path.resolve(destination)
  await fs.mkdir(path.dirname(destination), { recursive: true })
  destination = path.join(await fs.realpath(path.dirname(destination)), path.basename(destination))
  if (inside(source, destination) || inside(destination, source)) {
    throw new Error(
      "The vault source and export directory must be separate, non-nested directories.",
    )
  }
  const destInfo = await fs.lstat(destination).catch((error) => {
    if (error.code !== "ENOENT") throw error
  })
  if (destInfo?.isSymbolicLink()) throw new Error("Export directory cannot be a symlink.")
  const marker = path.join(destination, ".vault-export.json")
  const old = destInfo
    ? await fs
        .readFile(marker, "utf8")
        .then(JSON.parse)
        .catch(() => null)
    : null
  if (destInfo && !old) throw new Error("Refusing to replace an unmanaged export directory.")

  const files = await scan(source)
  const fileSet = new Set(files)
  const selected = new Map()
  const notes = new Map()
  for (const file of files.filter((name) => name.endsWith(".md"))) {
    const text = await fs.readFile(path.join(source, file), "utf8")
    const parsed = matter(text)
    if (parsed.data.publish === true) {
      selected.set(file, text)
      notes.set(file, parsed.content)
    }
  }

  function resolveReference(url, from, embed = false) {
    if (!url || /^(?:[a-z][\w+.-]*:|\/\/|#)/i.test(url)) return
    let target = decodeURIComponent(url.split(/[?#]/)[0]).replaceAll("\\", "/")
    if (!target) return
    const isMedia = media.test(target)
    if (!isMedia && !embed) return
    const candidates = [
      path.posix.normalize(path.posix.join(path.posix.dirname(from), target)),
      target.replace(/^\/+/, ""),
    ]
    if (embed && !path.posix.extname(target)) candidates.push(...candidates.map((p) => `${p}.md`))
    let resolved = candidates.find((candidate) => fileSet.has(candidate))
    if (!resolved) {
      const matches = files.filter(
        (file) =>
          file === target ||
          file.endsWith(`/${target}`) ||
          (embed &&
            !path.posix.extname(target) &&
            (file === `${target}.md` || file.endsWith(`/${target}.md`))),
      )
      if (matches.length > 1) throw new Error(`Ambiguous attachment in ${from}: ${url}`)
      resolved = matches[0]
    }
    if (!resolved) throw new Error(`Missing or unsafe attachment in ${from}: ${url}`)
    if (resolved.endsWith(".md")) {
      if (!notes.has(resolved)) throw new Error(`Cannot embed unpublished note in ${from}: ${url}`)
    } else if (isMedia) {
      selected.set(resolved, null)
    } else {
      throw new Error(`Unsupported attachment in ${from}: ${url}`)
    }
  }

  for (const [file, content] of notes) {
    const tree = parser.parse(content)
    visit(tree, "text", (node) => {
      for (const match of node.value.matchAll(/(!?)\[\[([^\]]+)\]\]/g)) {
        resolveReference(match[2].split("|")[0], file, match[1] === "!")
      }
    })
    const html = await htmlParser.run(tree)
    visit(html, "element", (node) => {
      for (const prop of ["src", "href", "poster"]) {
        if (typeof node.properties[prop] === "string") resolveReference(node.properties[prop], file)
      }
      if (typeof node.properties.srcSet === "string") {
        for (const candidate of node.properties.srcSet.split(",")) {
          resolveReference(candidate.trim().split(/\s+/)[0], file)
        }
      }
    })
  }

  // Build a fresh export before replacing the previous one; withdrawn notes and
  // orphaned media disappear automatically. The source vault is never modified.
  const stage = await fs.mkdtemp(path.join(path.dirname(destination), ".vault-export-"))
  try {
    for (const [file, text] of selected) {
      const out = path.join(stage, file)
      await fs.mkdir(path.dirname(out), { recursive: true })
      if (text === null) await fs.copyFile(path.join(source, file), out)
      else await fs.writeFile(out, text)
    }
    await fs.writeFile(
      path.join(stage, ".vault-export.json"),
      JSON.stringify({ files: [...selected.keys()].sort() }, null, 2) + "\n",
    )
    if (destInfo) await fs.rm(destination, { recursive: true })
    await fs.rename(stage, destination)
  } finally {
    await fs.rm(stage, { recursive: true, force: true })
  }
  return { notes: notes.size, attachments: selected.size - notes.size }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const source = process.env.OBSIDIAN_VAULT_PATH || path.join(root, "content")
    const result = await syncVault(source, path.join(root, "published"))
    console.log(
      `Exported ${result.notes} published notes and ${result.attachments} referenced attachments.`,
    )
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
