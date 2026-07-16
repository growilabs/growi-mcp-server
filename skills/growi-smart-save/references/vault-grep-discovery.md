# Vault local-grep path discovery

This is the **high-accuracy, opt-in** way to find save-path candidates — used when the user asked
for it and a GROWI Vault clone is available (see Step 1b of the main workflow). Instead of asking
the server's suggest-path tool (a smaller model that searches Elasticsearch indirectly), **you** —
the client model — search a local git clone of the wiki directly with `grep`/`ls`/`read`. You are
a stronger reasoner than the server agent, and a real `grep` over raw Markdown hits exact tokens
(slugs, dates, IDs) that an indexed search only approximates. That combination is why local
discovery finds the right shelf more reliably — at the cost of taking a minute or two.

Keep one thing front of mind throughout: **you are placing a NEW document.** It does not yet
exist in the wiki, so you will not find a copy of it. You find its home through **sibling
pages** of the same topic and kind.

## What a Vault clone looks like

A GROWI Vault clone is the whole wiki as Markdown files on disk:

- A page `/A/B/C` is the file `A/B/C.md`.
- If that page also has children, they live in the directory `A/B/C/`.
- So a page that groups children appears **twice**: as `<name>.md` (its own body) and as
  `<name>/` (the directory of its children).
- A **box/grouping page** (a directory page that exists only to hold children) often has a body
  that is just `$lsx()` or is empty. Its own body tells you little — read its children to learn
  what it groups. (An empty/`$lsx()` body can make `head` exit non-zero with no output — that
  means "box page, empty body", **not** "page doesn't exist". Don't misread it.)
- **Filenames are URL-encoded for path-unsafe characters.** A page-path segment containing
  characters like `:` is stored on disk percent-encoded (e.g. the page `旧: …` becomes the file
  `旧%3A ….md`). When you turn a discovered **file path** back into a GROWI **page path** for the
  rest of the workflow (Step 3), **decode** those (`%3A`→`:`, etc.) so the final path is the real
  page path, not the on-disk filename — use the helper instead of decoding by hand:
  `sh scripts/vault-sync.sh decode '<on-disk name>'` (see `vault-clone-access.md`).

This makes every lookup a plain filesystem operation:

| What you need | Command |
|---------------|---------|
| List a shelf's contents | `ls "<clone>/<dir>/"` |
| Read a page's own body | read `<clone>/<dir>/<name>.md` |
| Find pages by **content** (the key move) | `grep -rl "<token>" --include="*.md" "<clone>"` |
| Is this a box page? | its `.md` body is empty / `$lsx()`-only |

## The discovery method — grep like a careful human

The goal is to land on the **parent shelf** (a directory) where this document belongs, judged by
**content fit**, not by a path string that happens to match a surface word.

1. **Read the document and pick the low-frequency concrete tokens.** What would actually pin the
   right shelf is the specific stuff that appears verbatim in the body: technical slugs
   (`page_layout`, `ImportedUserGroup`), product/tool names (`keycloak`), dates (`20230425`),
   ticket IDs (`GW-2434`), kind-words (spec / memo / minutes / setup / dev-diary). **Prefer these
   over topic paraphrases.** A generic topic word (the Japanese or English phrase for the
   subject) tends to *miss* the right shelf and instead hit decoys — pages that merely *mention*
   the topic (meeting minutes, unrelated discussions) and are a different *kind* of page.

2. **grep those tokens across page bodies and see where the hits cluster.** The shelf is usually
   the common parent directory of the strongest content-matching hits. A token that lands in one
   tight directory is a strong signal; a token scattered across many unrelated directories is a
   decoy — discount it.

3. **A document's most unique token may return nothing — that's expected.** A coined name the
   document itself introduces won't exist elsewhere yet (the doc is new). When that happens,
   **pivot to the surrounding domain tokens** (the tools, the feature area, the kind-word) and
   find the shelf through them.

4. **Confirm by reading siblings, not by trusting the path name.** `ls` the candidate shelf and
   read a sibling or two. A path/title can look right while the content is a different kind (and
   vice versa). Reading a sibling's body is what catches a kind-mismatch and prevents a wrong
   pick. For a box page, read its children to learn its identity.

5. **Converge on 1–3 parent shelves** (directories, ending in `/`). More than one can be
   legitimate — the correct home is not unique. Hand these to Step 2 of the main workflow as your
   candidates (each is a directory `path`, the same shape suggest-path would return).

## Depth: lean toward the shallower parent when unsure

Filing the same document twice, even a careful person may not nest it the same way. If a
candidate is right in subject and kind but you're unsure whether to go one level deeper, lean
toward the **shallower** parent and offer the deeper one as an alternative — a too-broad parent
still leaves room to nest later, whereas a too-narrow box can strand the document. Let the user
make the final depth call in Step 3.

**"Lean shallower" is only a tie-breaker for genuine uncertainty — it does not override a clear
better fit.** When the wiki's habit makes one depth clearly right (e.g. a per-topic subdirectory
already exists and holds the document's direct predecessor, so the deeper folder is unmistakably
its home), lead with that shelf even if it is the deeper one — you are not unsure. Reserve the
shallower default for when you genuinely cannot tell which depth this wiki would use. In both
cases, present the other depth as the alternative so the user decides.

## Filing into a personal space (`user/<name>/`)

A grep can land you in someone's personal space (`user/<name>/...`) because that is where a
matching note happens to live. Before proposing such a shelf, check **whose** space it is: a
document should normally go into the **saving user's own** personal space, not another person's.
Putting your note under a different user's directory is almost always wrong, even when the topic
matches perfectly. If the best content match is in another user's space, treat that as a *signal
about the topic* but propose the saving user's own equivalent location (or a shared shelf)
instead — or, if you can't tell whose space it is, surface it to the user rather than filing
silently.

## A feature folder may legitimately mix kinds

Don't assume one directory holds only one kind of page. A per-feature folder often gathers
**everything** about that feature — meeting minutes, a kickoff note, and the feature's spec — all
together. So a folder that contains minutes is not automatically a "minutes-only" decoy: if it
also holds a spec-shaped sibling and the document is a spec for that same feature, the folder is
the right home. Judge **per sibling**, not by the folder's first-seen page. (This is why reading
siblings matters: it's how you tell "minutes folder, wrong kind" apart from "feature folder that
also holds specs, right home.")

## Decoys: the trap this method exists to avoid

The server agent's classic failure is matching a *topic word* and proposing a shelf that shares
the word but is the wrong **kind** (e.g. a meeting-minutes page that mentions "SAML" is not the
home for a SAML *setup guide*). Your edge is that you can read bodies: when a grep hit is a
different kind of page than the document, drop it even though the path string matched. Judge the
document's kind first (is it a spec? a setup guide? a diary entry? minutes?), then keep only
shelves consistent with that kind.

## Worked sketch

Document: a new "開発用の SAML セットアップ" guide (Keycloak via docker, configure GROWI security).

- Concrete tokens: `keycloak`, `SAML`, `growi-client`, `realms/growi` (verbatim in the body).
- `grep -rl "keycloak"` clusters under `Tips/開発用のミドルウェア追加/` (a predecessor SAML
  setup page sits there), plus scattered meeting-minutes decoys.
- `ls "Tips/開発用のミドルウェア追加/"` shows siblings: `LDAPサーバー.md`, `Basic 認証サーバー.md`,
  `SMTP サーバー (Gmail).md` — all "dev-environment middleware setup" guides, the same kind.
- The minutes hits under `GROWI村議議事録/` merely mention SAML → different kind → dropped.
- Result: top shelf `/Tips/開発用のミドルウェア追加/` (with the topic subfolder as an
  alternative). Reached via siblings, confirmed by reading their bodies — not by a path match.
