import assert from "node:assert/strict"
import test from "node:test"
import { promises as fs } from "node:fs"
import path from "node:path"
import os from "node:os"
import { syncVault } from "./sync-vault.mjs"

async function fixture(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "blog-sync-"))
  t.after(() => fs.rm(dir, { recursive: true, force: true }))
  const source = path.join(dir, "vault")
  const destination = path.join(dir, "published")
  await fs.mkdir(source)
  const write = async (name, text) => {
    const file = path.join(source, name)
    await fs.mkdir(path.dirname(file), { recursive: true })
    await fs.writeFile(file, text)
  }
  return { source, destination, write }
}

test("only explicit publish and referenced media are exported; stale exports disappear", async (t) => {
  const { source, destination, write } = await fixture(t)
  await write(
    "index.md",
    '---\npublish: true\n---\n![[plot.png]]\n![image][ref]\n\n[ref]: assets/photo.jpg\n\n<img src="assets/raw.svg">',
  )
  await write("private.md", "Secret.\npublish: true")
  await write("quoted.md", '---\npublish: "true"\n---\nPrivate')
  await write("assets/plot.png", "image")
  await write("assets/photo.jpg", "image")
  await write("assets/raw.svg", "image")
  await write("assets/unused.png", "private image")
  await write(".obsidian/secret.md", "---\npublish: true\n---\nSecret")
  assert.deepEqual(await syncVault(source, destination), { notes: 1, attachments: 3 })
  assert.equal(await fs.readFile(path.join(destination, "assets/plot.png"), "utf8"), "image")
  await assert.rejects(fs.stat(path.join(destination, "private.md")))
  await assert.rejects(fs.stat(path.join(destination, "quoted.md")))
  await assert.rejects(fs.stat(path.join(destination, "assets/unused.png")))
  await write("index.md", "---\npublish: false\n---\nWithdrawn")
  assert.deepEqual(await syncVault(source, destination), { notes: 0, attachments: 0 })
  await assert.rejects(fs.stat(path.join(destination, "index.md")))
  await assert.rejects(fs.stat(path.join(destination, "assets/plot.png")))
  assert.match(await fs.readFile(path.join(source, "index.md"), "utf8"), /Withdrawn/)
})

test("private note embeds and ambiguous media fail before modifying the export", async (t) => {
  const { source, destination, write } = await fixture(t)
  await write("index.md", "---\npublish: true\n---\nOriginal")
  await syncVault(source, destination)
  await write("private.md", "Secret")
  await write("index.md", "---\npublish: true\n---\n![[private]]")
  await assert.rejects(syncVault(source, destination), /unpublished note/)
  assert.match(await fs.readFile(path.join(destination, "index.md"), "utf8"), /Original/)
  await write("index.md", "---\npublish: true\n---\n![[photo.png]]")
  await write("a/photo.png", "a")
  await write("b/photo.png", "b")
  await assert.rejects(syncVault(source, destination), /Ambiguous/)
})

test("source/destination overlap, symlinks, and unmanaged destinations are rejected", async (t) => {
  const { source, destination, write } = await fixture(t)
  await assert.rejects(syncVault(source, source), /separate/)
  await assert.rejects(syncVault(source, path.join(source, "out")), /separate/)
  await fs.mkdir(destination)
  await assert.rejects(syncVault(source, destination), /unmanaged/)
  await fs.rm(destination, { recursive: true })
  await write("index.md", "---\npublish: true\n---\n![[secret.png]]")
  await fs.writeFile(path.join(path.dirname(source), "secret.png"), "private")
  await fs.symlink(path.join(path.dirname(source), "secret.png"), path.join(source, "secret.png"))
  await assert.rejects(syncVault(source, destination), /Missing or unsafe/)
})
