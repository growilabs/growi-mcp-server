---
name: growi-smart-save
description: |
  Save content to GROWI wiki with intelligent path suggestions. Use this skill when the user asks to save, store, or archive content to GROWI. Triggers on: "save to GROWI", "store this in the wiki", "save this page", or any request to persist content in GROWI. Also use when the user uploads a document and wants it stored in GROWI, or after a conversation session the user wants to capture as a wiki page.
---

# Smart Save: GROWI Content Save Workflow

Save content to GROWI by finding the best destination, confirming with the user, and creating the page.

## Workflow

### Step 1: Get destination candidates

Call the **suggest-path** tool with the content body the user wants to save.

- **Input**: The full content body (the text to be saved)
- **Output**: An array of destination suggestions

### Step 2: Present options to the user

Show all suggestions from the response. Always add a **"specify path manually"** option — this is your responsibility, not part of the API response.

For each suggestion, show the `label` and `description` to help the user decide. Example presentation:

```
1. Save as memo — Save to your personal memo area
2. Save near related pages — Related pages like "How to use React Hooks" exist nearby
3. Specify path manually
```

### Step 3: Decide on a page name

After the user selects a destination:

1. Propose a page name based on the content
2. Let the user confirm or modify
3. Combine directory path + page name into the final path
   - Example: `/Tech Notes/React/` + `Jotai vs Redux` → `/Tech Notes/React/Jotai vs Redux`

The `path` from suggestions is always a directory (ends with `/`). You are responsible for proposing the page name portion.

### Step 4: Confirm visibility (grant)

Before saving, confirm the page's visibility with the user. Present up to 3 simple options based on the destination's grant upper limit:

1. **Inherit from parent page** — use the `grant` value from the API response as-is
2. **Only me** — grant 4 (Only-me)
3. **Anyone with the link** — grant 2 (Anyone-with-the-link)

**Which options to show depends on the grant upper limit:**

| Grant upper limit | Options to show |
|-------------------|-----------------|
| 1 (Public)        | All three: Inherit from parent / Only me / Anyone with the link |
| 2 (Anyone-with-link) | All three: Inherit from parent / Only me / Anyone with the link |
| 5 (Group-only)    | Two only: Inherit from parent / Only me (omit "Anyone with the link" — it would exceed the upper limit) |
| 4 (Only-me)       | No confirmation needed — Only-me is the only option |

The user must never select a grant that exceeds the upper limit from the API.

Example (when grant upper limit is 1):

```
How should the page visibility be set?
1. Inherit from parent page (Public)
2. Only me
3. Anyone with the link
```

Do NOT silently default to the upper limit. Always ask unless the only option is Only-me.

### Step 5: Save the page

Use the **page creation** tool to save:

- **path**: The combined path from Step 3
- **body**: The content to save
- **grant**: The visibility level confirmed in Step 4

## Understanding the response

Each suggestion contains:

| Field         | Description                                              |
|---------------|----------------------------------------------------------|
| `type`        | `memo` (personal memo area), `search` (AI-recommended based on related pages), or `category` (top-level category match) |
| `path`        | Directory path (always ends with `/`)                    |
| `label`       | Short display label for the option                       |
| `description` | Why this destination is recommended — show this to the user |
| `grant`       | Maximum permission level allowed at this path            |

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

- Suggestions contain only `memo` type → present those + manual input option
- suggest-path tool fails or is unavailable → offer manual path input
- Always ensure the user can save their content regardless of tool availability
