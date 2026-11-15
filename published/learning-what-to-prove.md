---
title: Learning What to Prove
publish: true
published: 2026-11-15
description: It always has been more about what and why to do, than how to do.
---

I recently came across a single sentence from Emil Artin[^1], spoken at Princeton in 1946:

> [!sidenote] 1
> Actually, it was when reading a book, _Algebra_, written by his son, Michael Artin.

> Our difficulty is not in the proofs, but in learning what to prove.

Artin was speaking about non-abelian class field theory, a subject that had stalled not because mathematicians lacked technical skill, but because they had not yet found the right language and objects to state the theorems that mattered. Reading his words today, they carry a different weight. We are entering an era in which machines can generate proofs with a tactical[^2] stamina that few humans can match. As deduction itself grows cheap, Artin’s observation feels less like a historical remark and more like a quiet description of what remains for us to do.

> [!sidenote] 2
> The _tactic_ literally appears in Lean 4.

In _Récoltes et Semailles_, Alexander Grothendieck compared solving a mathematical problem to opening a hard nut. One can strike it repeatedly with a hammer and chisel until the shell gives way, or one can immerse it in a slowly rising sea[^3] of general definitions until the shell softens and opens on its own.

> [!sidenote] 3
> There is actually a book named _the rising sea_ on algebra geometry, by Ravi Vakil.

Much of mathematics involves both, corresponding roughly to what Timothy Gowers called the two cultures of problem-solvers and theory-builders. Current AI systems are, at heart, an extraordinarily patient hammer and chisel. Given a fixed set of axioms and a well-defined target, they search through vast trees of algebraic and logical maneuvers to force a path through. For mathematicians whose primary joy is problem-solving within an established framework, the shift is not a distant prospect; it is already arriving.

Yet a ten-thousand-line machine proof only tells us _that_ a statement is true. It rarely tells us _why_. The nut is cracked, but the surrounding landscape remains as opaque as before. Artin’s "learning what to prove" is the work of pouring Grothendieck’s sea: finding the right definition, the hidden invariance, or the natural abstraction that makes a difficult theorem collapse into a simple corollary. The next real threshold for machine intelligence will not be proving harder lemmas inside a formal library, but learning to refactor the library itself—noticing that fifty disparate proofs share a common skeleton, and proposing the single definition that absorbs them all.

We have already watched a version of this unfold in software engineering. Over the past few years, programming moved rapidly from tactical tab-completion to high-level "vibe coding," where entire modules are generated from intent. It is tempting to view mathematics as simply following the same path, a few years behind.

There are, however, structural differences between code and proof. Software is forgiving of approximation. A program that is ninety percent correct can still run, return partial outputs, and guide its author toward a fix. Deductive truth has no such gradient. A proof that is ninety-nine percent complete, resting on a single unproven lemma[^4], may still be attempting to establish a falsehood. Furthermore, in software, the specification usually comes from the outside: we know what tool we want to build before we begin. In frontier mathematics and theoretical physics, the specification is hidden. Discovering what is both true and worth stating is the entire struggle.

> [!sidenote] 4
> Or just a sign error, as occurring in OpenAI's proof.

Curiously, once that specification is found, mathematics enjoys one advantage that software does not. In vibe coding, a human still has to worry about subtle bugs lurking in generated code. In formalized mathematics, a kernel like Lean acts as an infallible judge. Once the right theorem is stated and the right definitions are in place, one can let a machine fill in the tactical proofs without ever reading them, confident that the foundation holds.

Even so, the lesson from software remains encouraging. Vibe coding has made generating syntax nearly free, yet it has not eliminated the software engineer. Left to itself, automated code generation quickly produces a brittle labyrinth that collapses under its own complexity. What endures—and becomes more valuable—is system architecture: defining clean boundaries, managing entropy, and knowing what ought to be built in the first place.

Something similar seems likely for theoretical work. As the mechanical layers of calculation and routine deduction are handed over, the discipline is not erased; it is distilled. We are left with the quieter, harder problem Artin pointed to eighty years ago: cultivating the taste to recognize which questions matter, and building a language clear enough that we can still understand the answers.
