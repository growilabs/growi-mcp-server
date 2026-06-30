---
name: growi-smart-save
description: |
  Save content to GROWI wiki with intelligent path suggestions. Use this skill when the user asks to save, store, or archive content to GROWI. Triggers on: "save to GROWI", "store this in the wiki", "save this page", or any request to persist content in GROWI. Also use when the user uploads a document and wants it stored in GROWI, or after a conversation session the user wants to capture as a wiki page. Finding the destination uses a local GROWI Vault clone (grep-based discovery) when one is reachable, and falls back to the server-side suggest-path tool otherwise — either way the user ends up choosing and saving.
---

# Smart Save: GROWI Content Save Workflow

Save content to GROWI by finding the best destination, confirming with the user, and creating the page.

## Workflow

### Step 1: Get destination candidates

Produce a small set of candidate destination directories for the document. There are two ways to
get them; **prefer the first when it is available**, because discovering the home yourself from
the wiki's real content finds the right shelf more reliably than the server's indexed search.

**Step 1a — Vault local-grep discovery (preferred).** If a GROWI Vault clone is reachable, find
the candidates by grepping the local clone of the wiki yourself. This is the better path: you are
a stronger reasoner than the server's path agent, and a real `grep` over raw Markdown hits the
exact tokens (slugs, dates, IDs) that decide the right shelf. To do it:

1. Check whether Vault is usable and get/refresh a clone — see
   `references/vault-clone-access.md` (detect, `git clone`/`fetch` via the user's GROWI token,
   where to cache it). If Vault is not usable for any reason, fall through to Step 1b.
2. Discover candidate shelves by grepping the clone — see `references/vault-grep-discovery.md`
   (the method: grep the document's concrete tokens, follow where hits cluster, confirm by
   reading sibling pages, converge on 1–3 parent directories). Judge content fit, not
   path-string similarity.

The output is 1–3 candidate directory paths (each ending in `/`), the same shape Step 1b would
return. Carry them into Step 2.

**Step 1b — Server suggest-path (fallback).** If no Vault clone is reachable (Vault disabled,
not bootstrapped, no local `git`, or any clone/fetch failure), call the **suggest-path** tool
instead.

- **Input**: The full content body (the text to be saved)
- **Output**: An array of destination suggestions (see "Understanding the server response" below)

Whichever path produced the candidates, the rest of the workflow is identical.

### Step 2: Present options to the user

Show the candidate destinations from Step 1. Always add a **"specify path manually"** option —
this is your responsibility, not part of any tool response.

- **From Step 1b (server)**, each candidate has a `label` and `description` — show them as-is.
- **From Step 1a (Vault grep)**, you found the candidates yourself, so write a one-line reason for
  each (why this shelf fits — the sibling pages that confirm it), playing the role `description`
  plays for server results. Lead with the shelf you judged best.

Example presentation:

```
1. Save as memo — Save to your personal memo area
2. Save near related pages — Related pages like "How to use React Hooks" exist nearby
3. Specify path manually
```

### Step 3: Decide on a page name

After the user selects a destination:

1. Propose a page name based on the content. **If Step 1a discovery showed a naming convention at
   the chosen shelf, follow it** — when the sibling pages use a fixed label (e.g. every feature
   folder's spec is named `仕様-Specification-`) or a consistent pattern, match it rather than
   inventing a content-derived title. The destination's existing names are the strongest hint for
   what this page should be called.
2. Let the user confirm or modify
3. Combine directory path + page name into the final path
   - Example: `/Tech Notes/React/` + `Jotai vs Redux` → `/Tech Notes/React/Jotai vs Redux`

The destination is always a directory (ends with `/`). You are responsible for proposing the page
name portion. (When the destination came from Step 1a, make sure the directory is the **decoded**
GROWI page path, not the on-disk percent-encoded filename — see `references/vault-grep-discovery.md`.)

### Step 4: Confirm visibility (grant)

Before saving, confirm the page's visibility with the user. The `grant` value at a directory is an
**upper limit** — a constraint, not a recommendation — and the user must never be allowed to pick a
visibility that exceeds it. How you know the limit depends on which Step 1 path produced the
candidate:

**When the candidate came from Step 1b (server).** The suggestion carries a `grant` upper limit.
Present up to 3 options based on it:

1. **Inherit from parent page** — use the destination's `grant` value as-is
2. **Only me** — grant 4 (Only-me)
3. **Anyone with the link** — grant 2 (Anyone-with-the-link)

| Grant upper limit | Options to show |
|-------------------|-----------------|
| 1 (Public)        | All three: Inherit from parent / Only me / Anyone with the link |
| 2 (Anyone-with-link) | All three: Inherit from parent / Only me / Anyone with the link |
| 5 (Group-only)    | Two only: Inherit from parent / Only me (omit "Anyone with the link" — it would exceed the upper limit) |
| 4 (Only-me)       | No confirmation needed — Only-me is the only option |

```
How should the page visibility be set?
1. Inherit from parent page (Public)
2. Only me
3. Anyone with the link
```

Do NOT silently default to the upper limit. Always ask unless the only option is Only-me.

**When the candidate came from Step 1a (Vault grep).** You discovered the path from the clone, so
you do **not** have the grant upper limit in hand. Default to **inheriting from the parent** —
save with `grant` omitted, and GROWI applies the parent's visibility, which by construction cannot
exceed the limit. Only ask the user about visibility if they signal they want something more
restrictive (e.g. "only me"); if so, pass that grant — GROWI rejects it server-side if it would
exceed the limit, and you can relay that back rather than guessing the limit yourself. (If you do
want the precise limit, resolve the destination with `getPage` → `getPageInfo`, but inheriting is
the simpler default and is usually what the user wants.)

### Step 5: Save the page

Use the **page creation** tool to save:

- **path**: The combined path from Step 3
- **body**: The content to save
- **grant**: The visibility confirmed in Step 4 — or **omit it to inherit from the parent**, which
  is the default for Vault-grep candidates (Step 1a) and whenever the user is happy with parent
  visibility

## Understanding the server response (Step 1b)

When candidates come from the suggest-path tool, each suggestion contains:

| Field         | Description                                              |
|---------------|----------------------------------------------------------|
| `type`        | `memo` (personal memo area), `search` (AI-recommended based on related pages), or `category` (top-level category match) |
| `path`        | Directory path (always ends with `/`)                    |
| `label`       | Short display label for the option                       |
| `description` | Why this destination is recommended — show this to the user |
| `grant`       | Maximum permission level allowed at this path            |

Vault-grep candidates (Step 1a) are just directory `path`s you discovered; you supply the
reason-to-show yourself (Step 2) and inherit grant by default (Step 4).

## Grant constraints

The `grant` value is the **upper limit** of what can be set at that directory — a constraint, not a recommendation.

| Grant | Meaning              |
|-------|----------------------|
| 1     | Public               |
| 2     | Anyone-with-the-link |
| 5     | Group-only           |
| 4     | Only-me              |

When saving, the selected grant must not exceed this limit. See Step 4 for how to present options to the user.

## Fallback behavior

The discovery method degrades gracefully — the user can always save, whatever is available:

- **Vault clone not reachable** (disabled, not bootstrapped, no local `git`, clone/fetch error)
  → fall back to the server suggest-path tool (Step 1b). This is silent and expected, not an
  error to surface.
- **suggest-path tool also fails or is unavailable** → offer manual path input.
- **Candidates are all `memo` type, or none fit the document** → present what you have plus the
  manual input option; don't force a poor pick.
- Always ensure the user can save their content regardless of which discovery path worked.
