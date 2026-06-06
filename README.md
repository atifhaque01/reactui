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
- [The rendering pipeline](#the-rendering-pipeline)
- [Edges](#edges)
- [Transitive "Great-" relation derivation](#transitive-great--relation-derivation)
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

### Label-only rows

There is one important exception. For **derived** ancestry labels (e.g.
"Great-grandfather"), a row is stored with `relationType: "Relative"` so it does
**not** affect layout or draw an edge, while `prettyType` carries the gendered
label. These rows exist purely to display the correct relationship text when you
re-root the tree on a distant relative.

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

`OTHERS_GENERATION` members are positioned **one row above the topmost real
generation** (`positionUnknownGeneration`) so they don't collide with the tree.
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

## Transitive "Great-" relation derivation

When you add a relationship in the UI, the frontend derives the extra
relationships implied by the new link **before persisting** (the backend
derivation is dormant — see the backend README):

- `deriveTransitiveRelations` (`src/tree/utils.ts`) walks the parent/child links
  and emits grandparent/grandchild and deeper relations, adding a `Great-`
  prefix per extra generation (`ancestorLabel` / `descendantLabel`).
- These derived rows are **label-only**: `relationType = "Relative"` (so they
  don't add edges or shift layout) while `prettyType` carries the gendered label
  (e.g. "Great-great-grandmother"). They make the *relationship-to-root* label
  correct no matter how far apart two people are.
- `getInverseRelationType` computes the opposite direction of a relationship
  (using the relative's sex where the inverse is gendered), and
  `isAutoInverseRelation` marks the father/mother↔son/daughter pairs whose
  reverse direction is filled in (and locked) automatically in the form.

---

## UI components

- **`PageHeader`** (`src/Components/PageHeader.tsx`) — top bar with a member
  **search** box; selecting a result re-roots the tree on that person.
- **`SlideInForm`** (`src/Components/SlideInForm.tsx`) — the slide-in panel for
  **adding/editing members** and **adding/editing relationships**. It builds the
  forward+reverse relationship pair (`buildRelationPair`), runs the transitive
  derivation, and persists via the services. Relationship dropdowns are grouped
  by generation (`RELATION_TYPE_GROUPS`) and filtered by the selected person's
  sex (`relationGroupsForSex`).
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
- `relationType` drives layout; `prettyType` drives the label; they are equal
  except for label-only (`relationType: "Relative"`) derived rows.
- `buildFamilyAndRelations` inverts `from`/`to` but keeps the `fromId-toId` key.
- Generations: negative = ancestors (up), positive = descendants (down),
  supported up to ±20 (`MAX_GENERATION_DISTANCE`).
- Unplaceable members land in `OTHERS_GENERATION` (999) and render one row above
  the top of the tree.
- Backend relationship derivation is dormant; all derivation happens here.
- CI build treats warnings as errors; the `SlideInForm.css` side-effect import
  type error is benign.
