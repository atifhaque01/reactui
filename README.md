# reactui (frontend)

Interactive Family Tree viewer/editor. It fetches members and relationships
from the [`familytree`](../familytree) backend, computes a generational layout,
and renders an explorable tree using [React Flow](https://reactflow.dev/). You
can re-root the tree on any person, search, hide/show branches, and add or edit
members and relationships.

This README documents the full architecture so the project can be handed off to
other developers. For the API and data persistence see
[`familytree/README.md`](../familytree/README.md).

---

## Table of contents

- [Tech stack](#tech-stack)
- [Running and building](#running-and-building)
- [Configuration](#configuration)
- [The relationship convention (read this first)](#the-relationship-convention-read-this-first)
- [Generations and the layout coordinate system](#generations-and-the-layout-coordinate-system)
- [Generation inference](#generation-inference)
- [Generation window (visible context)](#generation-window-visible-context)
- [The rendering pipeline](#the-rendering-pipeline)
- [Edges](#edges)
- [Relationship derivation engine](#relationship-derivation-engine)
- [Derived relationship suggestion panel](#derived-relationship-suggestion-panel)
- [UI components](#ui-components)
- [Services layer](#services-layer)
- [Code layout](#code-layout)

---

## Tech stack

- **Create React App** (`react-scripts` 5) + **React 18** + **TypeScript 4.9**.
- **reactflow 11** — node/edge graph rendering, panning, zoom, minimap.
- **axios** — HTTP calls to the backend.
- **lodash** — small array/object utilities (`uniq`, `uniqBy`, `uniqWith`).
- **styled-components** — available, used sparingly.

---

## Running and building

```bash
npm install
npm start        # dev server on http://localhost:3000
npm run build    # production build into build/
npm test         # CRA test runner (watch mode)
```

> **Build warnings are treated as errors in CI.** When building with
> `CI=true` (as CI does), any ESLint warning — including unused imports — fails
> the build. A clean build prints `Compiled successfully.`
>
> There is a known **benign** type error that can be ignored:
> *"Cannot find module or type declarations for side-effect import of
> `./SlideInForm.css`"*.

---

## Configuration

The backend base URL is configured in `src/Services/config.ts`:

```ts
export const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:3012";
```

Override it by setting `REACT_APP_API_BASE_URL` (e.g. in a `.env` file) before
building/starting.

---

## The relationship convention (read this first)

Everything in the layout and the editing UI depends on this rule:

> For a stored/persisted row `fromId -> toId`, the type means **"`toId` is the
> [type] of `fromId`"**, and **both `relationType` and `prettyType` follow this
> convention**. For a normal (visual) row they are **equal**.

- `relationType` is a value from the gendered `RelationTypes` union
  (`src/tree/types.ts`) and **drives layout & edges**.
- `prettyType` is the human label shown on a node and **drives the displayed
  relationship text**. It is usually identical to `relationType`.

### Label-only rows vs. visual rows

There are two kinds of derived rows:

- **Label-only** — `relationType: "Relative"`. Used for inferred labels the user
  chose *not* to draw an edge for (e.g. "Great-grandfather", "Brother in law").
  These display the correct relationship text on a node but add no edge and do
  not affect layout.
- **Visual** — `relationType` = the actual canonical type (e.g. `"Father"`,
  `"Son"`, `"Husband"`). These are the same as manually-added rows and fully
  participate in layout and edge drawing.

When the user confirms a derived suggestion with **"Show in graph"** checked,
`handleConfirmDerived` upgrades the row's `relationType` from `"Relative"` to
`prettyType as RelationTypes` and sets `isInnerFamily` accordingly before
persisting.

### In-memory inversion

`buildFamilyAndRelations` (`src/utils.ts`) reads the persisted shape
(`fromId`/`toId`) into the in-memory `FamilyRelation` shape. Note that it sets
`from: toId` and `to: fromId` (it **inverts** `from`/`to`) while keeping the map
key as `` `${fromId}-${toId}` ``. So in the in-memory model, a relation's `to`
is the *anchor* and `from` is the *relative*. The layout helpers
(`isRelationAParent`, `isRelationAChild`, etc.) are written against this
in-memory orientation.

---

## Generations and the layout coordinate system

People are bucketed into integer **generations** relative to the currently
selected root member (generation `0`).

- **Ancestors** get **negative** generations (`-1` = parents, `-2` =
  grandparents, …).
- **Descendants** get **positive** generations (`+1` = children, `+2` =
  grandchildren, …).
- Same-generation relatives (spouse, sibling, cousin) stay at the root's
  generation.

Key constants live in `src/tree/types.ts`:

```ts
export const MAX_GENERATION_DISTANCE = 20;       // 20 generations each direction
export const GenerationsPossible = [-20 … 20];   // the layout iterates this range
export const OTHERS_GENERATION = 999;            // bucket for unplaceable members
export type Generation = number;
```

`GenerationsPossible` is the full `[-20, +20]` range the layout loops over.
`OTHERS_GENERATION` (`999`) is a sentinel bucket for members whose generation
cannot be inferred from the relationship graph.

### Y-positioning rule

In `src/tree/positionNodes.ts` the vertical position of a couple is:

```
y = couple.generation * (GENERATION_HEIGHT + NODE_HEIGHT) + yOffset
```

So a **larger generation number → larger Y → lower on screen**. Ancestors
(negative generations) are above the root; descendants (positive) are below.

`OTHERS_GENERATION` (`999`) members are **excluded** by the generation window
filter in `FamilyTree.tsx` before the layout runs, so `positionUnknownGeneration`
is not called and these members do not appear on screen.
Constants (`src/tree/constants.ts`): `GENERATION_HEIGHT = 240`, `NODE_WIDTH =
400`, `NODE_HEIGHT = 300`, `SPACING = 120`, `MAX_IN_ROW = 10`.

---

## Generation inference

The generation of every member is computed in `src/tree/utils.ts` /
`src/tree/buildDataStructure.ts`:

- `getGenerationFromRelation` maps a direct relationship type to a generation
  delta: grandparent `+2`, parent/uncle/aunt `+1`, spouse/sibling/cousin `0`,
  child/nephew/niece `-1`, grandchild `-2`. (Recall the in-memory orientation
  means "to is the [type] of from".)
- `getGenerationOffsetFromLabel(label)` handles **deep** generations. If a label
  is a known `RelationTypes`, it uses the mapping above; otherwise it parses
  `Great-` prefixed grandparent/grandchild labels with the regex
  `/^((?:great-)*)grand(father|mother|son|daughter)$/`, returning
  `±(2 + numberOfGreats)`. Unmappable labels return `OTHERS_GENERATION`.
- `tryInferGenerationForOthers` runs an **iterative fixpoint**: it repeatedly
  walks relations between an already-placed member and an unplaced one (trying
  the `relationType` label, then the `prettyType` label) until no further
  members can be placed. This lets generations propagate across the graph rather
  than only from the root.

Members that still cannot be placed end up in the `OTHERS_GENERATION` bucket.

---

## Generation window (visible context)

`FamilyTree.tsx` filters the full `familyGenerations` map down to a
**±`GENERATION_WINDOW`** slice (currently `2`) centred on the selected root
before feeding the layout:

```ts
const GENERATION_WINDOW = 2;
const windowedGenerations = Object.fromEntries(
    Object.entries(familyGenerations).filter(([gen]) => {
        const g = parseInt(gen);
        return !isNaN(g) && Math.abs(g) <= GENERATION_WINDOW;
    })
);
```

This means the root's **grandparents** (generation `+2`), **parents** (`+1`),
the root and their **spouse(s)** (`0`), their **children** (`−1`), and
**grandchildren** (`−2`) are all rendered at once. Members outside this window —
great-grandparents and deeper, great-grandchildren and deeper, and the
`OTHERS_GENERATION` bucket — are simply not sent to React Flow.

`visibleIds` is the set of member ids present in `windowedGenerations`.
`visibleFamilyMembers` and `visibleRelationsValues` are then derived from that
set so that edges are only built between visible nodes. The layout helpers
(`buildDataStructure`, `buildEdgesFromParentChildrenRelations`,
`buildCouplesEdges`) receive these pre-filtered inputs.

Siblings, cousins, and their spouses are automatically included in the
generation-0 slice because `buildGenerations` + `tryInferGenerationForOthers`
already places them at the correct generation via their stored `prettyType`
offsets, without requiring a direct relation to the root.

---

## The rendering pipeline

The data flows from raw API rows to React Flow nodes/edges like this:

```
API (getAllMembers + getAllRelationships)            [App.tsx]
        │
        ▼
buildFamilyAndRelations()                            [utils.ts]
   raw rows -> FamilyMembers + FamilyRelations (keyed records, from/to inverted)
        │
        ▼
buildGenerations(members, relations, rootId)         [tree/buildDataStructure.ts]
   assign each member an integer generation (+ inference for distant members)
        │
        ▼
buildDataStructure(generations, relations)           [tree/buildDataStructure.ts]
   buildCouplesPerGeneration  -> group partners into couples per generation
   buildInnerFamilyPerCouple  -> attach each couple's children
        │
        ▼
positionAndBuildFamilyTree(innerFamilies, members)   [tree/positionNodes.ts]
   compute (x, y) for every node -> React Flow nodes
   + positionUnknownGeneration() for the OTHERS bucket
        │
        ▼
addNodeSelection / addNodeVisibilityCallback         [tree/positionNodes.ts]
   mark the root node, attach "relationToSelected" label, wire show/hide
        │
        ▼
buildParentsChildrenStructs + buildEdges*            [tree/buildEdges.ts]
   parent→child edges (InnerFamilyEdge) and couple edges (CoupleEdge)
        │
        ▼
<ReactFlow nodes=… edges=… />                        [FamilyTree.tsx]
```

`App.tsx` loads the data and renders `PageHeader` (search), `SlideInForm`
(add/edit panel) and `TreeConstructor`. `TreeConstructor` → `Tree` →
`FamilyTree` is the rendering chain. `Tree` owns the **current root** (`rootId`)
and re-centers/re-roots the graph whenever you click a node or pick a search
result. `FamilyTree` runs the pipeline above on every render and keeps the
selected node centered via `setCenter`.

---

## Edges

`src/tree/buildEdges.ts` produces two kinds of React Flow edges:

- **Inner-family edges** (`InnerFamilyEdge`, key `"innerFamily"`) — parent →
  child links. Built from `buildParentsChildrenStructs` (which groups each child
  under its parent couple). Each parent-couple family gets a color from
  `EDGES_COLORS`; sibling edges sharing a generation are vertically offset
  (`EDGE_YGAP_MODIFIER`) and horizontally fanned (`EDGE_XGAP_MODIFIER`) so they
  don't overlap.
- **Couple edges** (`CoupleEdge`, key `"coupleEdge"`) — links between partners
  (`isRelationSharingKids`). Married couples (`isRelationMarried`, i.e.
  Husband/Wife) draw a **solid** line; everything else (divorced, common-law,
  "have shared kids") draws **dashed**. The couple edge inherits the color of
  the family's child edges so a couple and their children read as one unit.

`buildEdgeId(from, to)` (`` `${from}-${to}` ``) is the canonical id helper used
across the app.

---

## Relationship derivation engine

When you add a relationship in the UI, the frontend derives **all** implied
relationships before persisting them. The backend derivation is dormant (see the
backend README); everything happens here.

### `deriveAllRelations` (`src/tree/utils.ts`)

Returns `DerivedRow[]` — a `StoredRelation` extended with a `pathHasStep:
boolean` flag. There are five derivation sections, each appending rows to the
result if they don't already exist in storage:

| # | What it derives | `pathHasStep` |
|---|-----------------|---------------|
| 1 | **Ancestor chains** — grandparent/grandchild and deeper, with `Great-` prefixes | `true` if any link in the path is step/adoptive |
| 2 | **Uncle/aunt** (parent's sibling) and great-uncle/aunt (grandparent's sibling) | `true` if ancestor path or sibling link is step |
| 3 | **Cousin relationships** via Most Recent Common Ancestor (degree + "removed") | `true` if any ancestor path is step |
| 4 | **In-law relationships** — parent-in-law, sibling-in-law, grandparent-in-law | always `false` (in-law is its own category) |
| 5 | **Spouse's children/descendants** — when P marries S, S's children become P's (step-)children; their spouses become P's son/daughter-in-law; deeper descendants become P's grandchildren etc. | always `true` (user can switch to step variant) |

Section 5 is the key one for blended families: adding a spouse immediately
suggests all the spouse's existing descendants as (step-)children, grandchildren,
etc. of the new partner.

### `pathHasStep` and step variant suppression

`DerivedRow.pathHasStep` tracks whether the inference path traversed at least one
step/adoptive link. The suggestion panel sets `forceDirectOnly = !pathHasStep`
on each suggestion; when true, the variant picker hides all step/adoptive options
(e.g. a suggestion derived through two direct blood links only shows "Grandson",
not "Grandson (step)").

`buildDirectParentsMap` builds a Father/Mother/Son/Daughter-only parent map.
`getAncestorInfo` BFS-walks it tracking an `allDirect` flag per ancestor; when
that flag is false at any point the path is flagged as step.

### Step in-law types (`src/tree/types.ts`)

Four new canonical types were added to `RelationTypes` to support cascade:

```ts
"Step father in law" | "Step mother in law" | "Step son in law" | "Step daughter in law"
```

They are wired into `VARIANT_FAMILIES`, `PARENT_TO_CHILD_INVERSE`, and
`CHILD_TO_PARENT_INVERSE` so the suggestion picker and inverse computation treat
them like any other step variant.

### `deriveTransitiveRelations`

The older, narrower helper that only walks parent→child links for grandparent/
grandchild labels. Still used in some call sites; superseded by `deriveAllRelations`
for the full derivation pass triggered by the confirmation panel.

### Key helper exports from `src/tree/utils.ts`

| Export | Purpose |
|--------|---------|
| `DerivedRow` | `StoredRelation & { pathHasStep: boolean }` |
| `buildSpousesMap` | builds `memberId → Set<spouseId>` from any coupling relation |
| `getVariantFamily` | returns the family of interchangeable types (e.g. `["Son","Son (step)","Step son","Adopted son"]`) |
| `ancestorLabel` / `descendantLabel` | gendered "Grandfather" / "Grandson" with `Great-` prefix per extra generation |
| `cousinLabel` / `uncleAuntLabel` / `nephewNieceLabel` | gendered labels for extended family |
| `getInverseRelationType` | computes the opposite-direction type (sex-aware) |
| `isAutoInverseRelation` | true for types whose reverse is locked automatically in the form |

---

## Derived relationship suggestion panel

After a relationship is saved, `checkAndShowDerived` builds suggestions from
two sources:

1. **`deriveAllRelations`** — the 5-section transitive inference engine described
   above.
2. **Co-parent spouse suggestions** — when the newly saved row is a parent type
   (Father, Mother, etc.) and the child already has another recorded parent with
   no existing relationship to the new parent, a Husband/Wife suggestion is
   generated between the two co-parents. This fires on both the "add relationship"
   path and the "edit relationships" path. It is automatically sex-aware (uses
   "Wife" for female parents, "Husband" for male), defaults to checked and
   `drawEdge: true`, and is de-duplicated against the `deriveAllRelations`
   results via the same `usedKeys` set.

Both sets of rows are combined into **paired suggestions** (one entry per A↔B pair
rather than showing both directions separately). Each suggestion is represented
by a `DerivedRelationSuggestion` object:

```ts
interface DerivedRelationSuggestion {
    key: string;          // "fromId-toId" — primary direction
    fromId / fromName     // the "anchor" of the suggestion
    toId / toName         // the "relative" of the suggestion
    prettyType: string;   // the displayed label (may be changed by the user)
    rows: StoredRelation[]; // [forward, reverse] to save/skip together
    checked: boolean;     // whether this suggestion is included in the save
    forceDirectOnly: boolean; // hide step variants (path was all-direct blood links)
    drawEdge: boolean;    // whether a graph edge should be drawn
}
```

### Type variant picker

When `getVariantFamily(prettyType)` returns multiple options, a `<select>` is
shown so the user can choose the right variant (e.g. "Son" vs "Step son"). The
options are filtered by `toId`'s sex and — when `forceDirectOnly` is true — all
step/adoptive variants are hidden.

Changing the type updates both directions in `rows` via
`getInverseRelationType` and also recalculates `drawEdge` via
`DRAW_EDGE_DEFAULT_TYPES`.

### Step cascade in `handleSuggestionTypeChange`

When a son/daughter type is changed (e.g. "Son" → "Step son"), the cascade
automatically updates:

1. **In-law suggestions**: any suggestion where `toId` is a spouse of the child
   is toggled to the step variant (e.g. "Daughter in law" → "Step daughter in
   law").
2. **Grandchild suggestions**: any suggestion where `toId` is a BFS descendant
   of the child is also toggled (e.g. "Grandson" → "Grandson (step)").

The cascade is entirely in-memory; it updates the `pendingDerived` state before
the user confirms.

### Graph-edge checkbox (`drawEdge`)

Each suggestion row shows a **"Show in graph"** checkbox. When checked, saving
the suggestion upgrades `relationType` from `"Relative"` to the actual canonical
type (e.g. `"Father"`, `"Husband"`) so the rendering pipeline draws a visual
edge. `isInnerFamily` is set accordingly via `isInnerFamilyRelation`.

Default values (set by `DRAW_EDGE_DEFAULT_TYPES`):

| Checked by default | Unchecked by default |
|--------------------|----------------------|
| Parent/child types (Father, Mother, Son, Daughter + step/adoptive variants) | In-law types (Father in law, Son in law, Step variants) |
| Spouse types (Husband, Wife, divorced variants, Common-Law Partner, Have shared kids) | Siblings, cousins, grandparents/grandchildren, uncle/aunt, nephew/niece |

When the user picks a different variant type, `drawEdge` is automatically
recalculated — switching to an in-law type turns it off; switching back to a
direct child type turns it on again.

---

## UI components

- **`PageHeader`** (`src/Components/PageHeader.tsx`) — top bar with a member
  **search** box; selecting a result re-roots the tree on that person.
- **`SlideInForm`** (`src/Components/SlideInForm.tsx`) — the slide-in panel for
  **adding/editing members** and **adding/editing relationships**. It builds the
  forward+reverse relationship pair (`buildRelationPair`), runs `deriveAllRelations`
  after each save, and presents the derived suggestions in a confirmation panel
  (see [Derived relationship suggestion panel](#derived-relationship-suggestion-panel)).
  Relationship dropdowns are grouped by generation (`RELATION_TYPE_GROUPS`) and
  filtered by the selected person's sex (`relationGroupsForSex`). The "Edit
  Relationships" mode exposes a per-row "Show edge in graph" toggle that sets
  `relationType` vs. `"Relative"` for existing saved rows.
- **`Form`** (`src/CommonComponents/Form.tsx`) and **`AppButton`** — reusable
  form building blocks.
- **`MemberDetailsPanel`** (`src/Components/MemberDetailsPanel.tsx`) — shows the
  currently selected (root) member with Edit / Add-relationship actions.
- **`FamilyMemberNode`** (`src/FamilyComponents/FamilyMemberNode.tsx`) — the
  React Flow node for a person (name, image, badges, relationship-to-root label,
  and a +/- control to hide/show the node). The root node is highlighted.
- **`CoupleEdge`** / **`InnerFamilyEdge`** (`src/FamilyComponents/`) — the custom
  React Flow edge renderers described in [Edges](#edges).

---

## Services layer

Thin axios wrappers around the backend API (`src/Services/`), all using
`API_BASE_URL`:

| File                       | Backend endpoint                         |
| -------------------------- | ---------------------------------------- |
| `getMembers.ts`            | `GET /family/getAllMembers`              |
| `getRelationships.ts`      | `GET /family/getAllRelationships`        |
| `submitMember.ts`          | `POST /family/addMember`                 |
| `updateMember.ts`          | `PUT /family/updateMember?id=`           |
| `removeMember.ts`          | `DELETE /family/removeMember?id=`        |
| `submitRelationships.ts`   | `POST /family/addRelationship`           |
| `removeRelationship.ts`    | `DELETE /family/removeRelationship?source=&target=` |

`submitRelationships.ts` maps the in-memory `from`/`to` back to the persisted
`fromId`/`toId` shape before sending.

---

## Code layout

```
reactui/src/
├─ App.tsx                       # loads data, top-level layout
├─ TreeConstructor.tsx           # wraps Tree
├─ Tree.tsx                      # owns current root, re-roots/re-centers
├─ FamilyTree.tsx                # runs the pipeline, renders <ReactFlow>
├─ utils.ts                      # raw<->in-memory mapping (buildFamilyAndRelations)
├─ tree/
│  ├─ types.ts                   # RelationTypes, Generation constants, models
│  ├─ constants.ts               # GENERATION_HEIGHT, NODE_*, colors, gaps
│  ├─ utils.ts                   # relation vocabulary, inverses, generation inference,
│  │                             #   transitive "Great-" derivation
│  ├─ buildDataStructure.ts      # buildGenerations / couples / inner families
│  ├─ positionNodes.ts           # (x, y) layout -> React Flow nodes
│  └─ buildEdges.ts              # parent-child and couple edges
├─ Components/
│  ├─ PageHeader.tsx             # search bar
│  ├─ SlideInForm.tsx            # add/edit member & relationships
│  ├─ MemberDetailsPanel.tsx     # selected-member panel
│  └─ SlideIn.tsx
├─ CommonComponents/             # Form, AppButton, shared types
├─ FamilyComponents/             # FamilyMemberNode, CoupleEdge, InnerFamilyEdge
└─ Services/                     # axios API wrappers + config.ts
```

---

## Glossary of gotchas for new developers

- "to is the [type] of from" — memorise this; it governs every helper.
- `relationType` drives layout; `prettyType` drives the label. They are equal for
  visual rows, but derived rows default to `relationType: "Relative"` (label-only)
  unless the user checks "Show in graph", at which point `relationType` is
  upgraded to the actual canonical type on save.
- `buildFamilyAndRelations` inverts `from`/`to` but keeps the `fromId-toId` key.
- Generations: negative = ancestors (up), positive = descendants (down),
  supported up to ±20 (`MAX_GENERATION_DISTANCE`). The graph shows ±2
  at a time (`GENERATION_WINDOW`); clicking a node re-roots and shifts the window.
- Unplaceable members land in `OTHERS_GENERATION` (999); they are **excluded**
  by the ±1 generation window and therefore invisible. They become visible after
  re-rooting to a connected member that gives their generation a concrete value.
- Backend relationship derivation is dormant; all derivation happens here in
  `deriveAllRelations` (5 sections).
- `pathHasStep` on a `DerivedRow` controls whether step variants appear in the
  suggestion dropdown. A path through only Father/Mother/Son/Daughter links is
  `allDirect`; step variants are suppressed in that case.
- Step cascade: changing a child suggestion to a step variant auto-updates the
  child's spouses (in-law → step in-law) and all descendants (grandson →
  grandson (step)) in the pending suggestion list.
- Four step in-law types (`Step father in law`, `Step mother in law`,
  `Step son in law`, `Step daughter in law`) were added to `RelationTypes` and
  `VARIANT_FAMILIES`. If you add new gendered types, update both tables.
- Co-parent spouse suggestions are generated by `checkAndShowDerived` outside of
  `deriveAllRelations`. They appear alongside transitive suggestions in the same
  confirmation panel. The early-exit (`derived.length === 0`) was moved to after
  both suggestion sources are computed so these suggestions are never silently
  dropped when `deriveAllRelations` returns nothing.
- CI build treats warnings as errors; the `SlideInForm.css` side-effect import
  type error is benign.
