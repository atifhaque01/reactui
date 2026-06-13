import { NODE_WIDTH, SPACING } from "./constants";
import { Generation, OTHERS_GENERATION, RelationTypes } from "./types";

export const isOddModifer = (i: number) => (i % 2 === 0 ? 1 : -1);
export const calcX = (i: number) => (((NODE_WIDTH + SPACING) * (i + (i % 2))) / 2) * isOddModifer(i);
export const calcCoupleEdgeYOffset = (i: number) => ((i + (i % 2)) / 2) * isOddModifer(i);

export const getGenerationFromRelation = (relation: RelationTypes | undefined): Generation => {
    switch (relation) {
        case "Grandfather":
        case "Grandmother":
        case "Grandfather (step)":
        case "Grandmother (step)":
            return 2;
        case "Uncle":
        case "Aunt":
        case "Uncle (step)":
        case "Aunt (step)":
        case "Father":
        case "Mother":
        case "Father (step)":
        case "Mother (step)":
        case "Step father":
        case "Step mother":
        case "Adoptive father":
        case "Adoptive mother":
        case "Father in law":
        case "Mother in law":
            return 1;
        case "Husband":
        case "Wife":
        case "Husband (divorced)":
        case "Wife (divorced)":
        case "Common-Law Partner":
        case "Have shared kids":
        case "Brother":
        case "Sister":
        case "Brother (step)":
        case "Sister (step)":
        case "Step brother":
        case "Step sister":
        case "Brother in law":
        case "Sister in law":
        case "Male cousin":
        case "Female cousin":
        case "Male cousin (step)":
        case "Female cousin (step)":
            return 0;
        case "Son":
        case "Daughter":
        case "Son (step)":
        case "Daughter (step)":
        case "Step son":
        case "Step daughter":
        case "Adopted son":
        case "Adopted daughter":
        case "Son in law":
        case "Daughter in law":
        case "Nephew":
        case "Niece":
        case "Nephew (step)":
        case "Niece (step)":
            return -1;
        case "Grandson":
        case "Granddaughter":
        case "Grandson (step)":
        case "Granddaughter (step)":
            return -2;
        case "Relative":
            return OTHERS_GENERATION;
        default:
            // No known relation (e.g. undefined, or an unmapped type) means we
            // can't place this member in a specific generation, so render them
            // in the "others" bucket instead of dropping them entirely.
            return OTHERS_GENERATION;
    }
};

/**
 * Derive a generation offset from a relationship label, including the
 * free-form "Great-…" labels produced for transitive ancestors/descendants
 * (which are stored with relationType "Relative" and only carry their real
 * meaning in the pretty/label text).
 *
 * Returns OTHERS_GENERATION when the label can't be mapped to a generation,
 * so callers can fall back to the "others" bucket.
 */
export const getGenerationOffsetFromLabel = (label: string | undefined): Generation => {
    if (!label) return OTHERS_GENERATION;

    // First try the strict, known relationship vocabulary.
    if ((ALL_RELATION_TYPES as readonly string[]).includes(label)) {
        const known = getGenerationFromRelation(label as RelationTypes);
        if (known !== OTHERS_GENERATION) return known;
    }

    // Then handle the free-form "Great-(great-)grandparent/grandchild" labels.
    const normalized = label.trim().toLowerCase();
    const greatMatch = normalized.match(/^((?:great-)*)grand(father|mother|son|daughter)$/);
    if (greatMatch) {
        const greats = (greatMatch[1].match(/great-/g) ?? []).length;
        const base = 2 + greats; // grandparent/grandchild == 2, each "great" adds one
        const isAncestor = greatMatch[2] === "father" || greatMatch[2] === "mother";
        return (isAncestor ? base : -base) as Generation;
    }

    // Great-(great-)uncle/aunt → same generation offset as grandparent/great-grandparent.
    const uncleAuntMatch = normalized.match(/^((?:great-)*)(?:uncle|aunt)$/);
    if (uncleAuntMatch) {
        const greats = (uncleAuntMatch[1].match(/great-/g) ?? []).length;
        return (greats + 1) as Generation;
    }

    // Great-(great-)nephew/niece → same generation offset as grandchild/great-grandchild.
    const nephewNieceMatch = normalized.match(/^((?:great-)*)(?:nephew|niece)$/);
    if (nephewNieceMatch) {
        const greats = (nephewNieceMatch[1].match(/great-/g) ?? []).length;
        return (-(greats + 1)) as Generation;
    }

    // Cousins of any degree (with or without "removed") → same generation.
    if (/cousin/.test(normalized)) return 0 as Generation;

    // Great-(great-)grandparent-in-law / grandchild-in-law.
    const inLawAncMatch = normalized.match(/^((?:great-)*)grand(father|mother)-in-law$/);
    if (inLawAncMatch) {
        const greats = (inLawAncMatch[1].match(/great-/g) ?? []).length;
        return (greats + 2) as Generation;
    }
    const inLawDescMatch = normalized.match(/^((?:great-)*)grand(son|daughter)-in-law$/);
    if (inLawDescMatch) {
        const greats = (inLawDescMatch[1].match(/great-/g) ?? []).length;
        return (-(greats + 2)) as Generation;
    }

    return OTHERS_GENERATION;
};

export const isRelationSharingKids = (relation: RelationTypes) => {
    return (
        relation === "Have shared kids" ||
        relation === "Common-Law Partner" ||
        relation === "Husband" ||
        relation === "Wife" ||
        relation === "Husband (divorced)" ||
        relation === "Wife (divorced)"
    );
};

/**
 * Whether the couple relationship represents a current marriage (drawn with a
 * solid line). Everything else in a couple (divorced, common-law, shared kids)
 * is rendered dashed.
 */
export const isRelationMarried = (relation: RelationTypes) => {
    return relation === "Husband" || relation === "Wife";
};

export const isRelationAChild = (relation: RelationTypes) => {
    return (
        relation === "Son" ||
        relation === "Daughter" ||
        relation === "Son (step)" ||
        relation === "Daughter (step)" ||
        relation === "Step son" ||
        relation === "Step daughter" ||
        relation === "Adopted son" ||
        relation === "Adopted daughter" ||
        relation === "Son in law" ||
        relation === "Daughter in law"
    );
};

export const isRelationAParent = (relation: RelationTypes) => {
    return (
        relation === "Father" ||
        relation === "Mother" ||
        relation === "Father (step)" ||
        relation === "Mother (step)" ||
        relation === "Step father" ||
        relation === "Step mother" ||
        relation === "Adoptive father" ||
        relation === "Adoptive mother" ||
        relation === "Father in law" ||
        relation === "Mother in law"
    );
};

/**
 * Every relationship type, grouped by the generation/category it belongs to.
 * Used to render an <optgroup>-grouped dropdown in the relationship form so
 * the (large) list of types is easier to scan.
 */
export const RELATION_TYPE_GROUPS: { label: string; options: RelationTypes[] }[] = [
    {
        label: "Older generations",
        options: [
            "Grandfather",
            "Grandmother",
            "Grandfather (step)",
            "Grandmother (step)",
            "Father",
            "Mother",
            "Father (step)",
            "Mother (step)",
            "Step father",
            "Step mother",
            "Adoptive father",
            "Adoptive mother",
            "Father in law",
            "Mother in law",
            "Uncle",
            "Aunt",
            "Uncle (step)",
            "Aunt (step)"
        ]
    },
    {
        label: "Same generation",
        options: [
            "Husband",
            "Wife",
            "Husband (divorced)",
            "Wife (divorced)",
            "Common-Law Partner",
            "Have shared kids",
            "Brother",
            "Sister",
            "Brother (step)",
            "Sister (step)",
            "Step brother",
            "Step sister",
            "Brother in law",
            "Sister in law",
            "Male cousin",
            "Female cousin",
            "Male cousin (step)",
            "Female cousin (step)"
        ]
    },
    {
        label: "Younger generations",
        options: [
            "Son",
            "Daughter",
            "Son (step)",
            "Daughter (step)",
            "Step son",
            "Step daughter",
            "Adopted son",
            "Adopted daughter",
            "Son in law",
            "Daughter in law",
            "Nephew",
            "Niece",
            "Nephew (step)",
            "Niece (step)",
            "Grandson",
            "Granddaughter",
            "Grandson (step)",
            "Granddaughter (step)"
        ]
    },
    {
        label: "Other",
        options: ["Relative"]
    }
];

/** Flat list of every relationship type (in grouped order). */
export const ALL_RELATION_TYPES: RelationTypes[] = RELATION_TYPE_GROUPS.flatMap((group) => group.options);

/** Convenience: a person's sex. */
export type RelativeSex = "M" | "F";

/** Relationship types that describe a male person. */
const MALE_RELATIONS = new Set<RelationTypes>([
    "Grandfather", "Grandfather (step)",
    "Father", "Father (step)", "Step father", "Adoptive father", "Father in law",
    "Uncle", "Uncle (step)",
    "Husband", "Husband (divorced)",
    "Brother", "Brother (step)", "Step brother", "Brother in law",
    "Male cousin", "Male cousin (step)",
    "Son", "Son (step)", "Step son", "Adopted son", "Son in law",
    "Nephew", "Nephew (step)",
    "Grandson", "Grandson (step)"
]);

/** Relationship types that describe a female person. */
const FEMALE_RELATIONS = new Set<RelationTypes>([
    "Grandmother", "Grandmother (step)",
    "Mother", "Mother (step)", "Step mother", "Adoptive mother", "Mother in law",
    "Aunt", "Aunt (step)",
    "Wife", "Wife (divorced)",
    "Sister", "Sister (step)", "Step sister", "Sister in law",
    "Female cousin", "Female cousin (step)",
    "Daughter", "Daughter (step)", "Step daughter", "Adopted daughter", "Daughter in law",
    "Niece", "Niece (step)",
    "Granddaughter", "Granddaughter (step)"
]);

/**
 * The sex of the person a relationship type describes, or `undefined` for
 * gender-neutral types (e.g. "Relative", "Common-Law Partner", "Have shared
 * kids") which apply to either sex.
 */
export const getRelationGender = (relation: RelationTypes): RelativeSex | undefined => {
    if (MALE_RELATIONS.has(relation)) return "M";
    if (FEMALE_RELATIONS.has(relation)) return "F";
    return undefined;
};

/**
 * Relationship types that can be entered manually — partner/spouse, parent,
 * and child (including step/adoptive variants). Everything else (siblings,
 * grandparents, uncles, cousins, in-laws …) is inferred from the graph.
 */
export const DIRECT_RELATION_TYPE_GROUPS: { label: string; options: RelationTypes[] }[] = [
    {
        label: "Partner / Spouse",
        options: ["Husband", "Wife", "Husband (divorced)", "Wife (divorced)", "Common-Law Partner", "Have shared kids"]
    },
    {
        label: "Parent",
        options: ["Father", "Mother", "Father (step)", "Mother (step)", "Step father", "Step mother", "Adoptive father", "Adoptive mother"]
    },
    {
        label: "Child",
        options: ["Son", "Daughter", "Son (step)", "Daughter (step)", "Step son", "Step daughter", "Adopted son", "Adopted daughter"]
    }
];

/**
 * Filters any group list down to types valid for the given sex.
 * Gender-neutral types are always kept. When `sex` is undefined every type is returned.
 */
export const filterGroupsBySex = (
    groups: { label: string; options: RelationTypes[] }[],
    sex: RelativeSex | undefined
): { label: string; options: RelationTypes[] }[] =>
    !sex
        ? groups
        : groups
              .map((group) => ({
                  label: group.label,
                  options: group.options.filter((option) => {
                      const gender = getRelationGender(option);
                      return gender === undefined || gender === sex;
                  })
              }))
              .filter((group) => group.options.length > 0);

/** Convenience: filters the full RELATION_TYPE_GROUPS for a given sex. */
export const relationGroupsForSex = (
    sex: RelativeSex | undefined
): { label: string; options: RelationTypes[] }[] => filterGroupsBySex(RELATION_TYPE_GROUPS, sex);

/**
 * Families of interchangeable relationship variants (e.g. Father / Step father /
 * Adoptive father). Used to populate the variant picker in the derived-relationship
 * confirmation panel so users can adjust inferred types before saving.
 */
const VARIANT_FAMILIES: RelationTypes[][] = [
    ["Grandfather", "Grandfather (step)"],
    ["Grandmother", "Grandmother (step)"],
    ["Father", "Father (step)", "Step father", "Adoptive father"],
    ["Mother", "Mother (step)", "Step mother", "Adoptive mother"],
    ["Son", "Son (step)", "Step son", "Adopted son"],
    ["Daughter", "Daughter (step)", "Step daughter", "Adopted daughter"],
    ["Brother", "Brother (step)", "Step brother"],
    ["Sister", "Sister (step)", "Step sister"],
    ["Uncle", "Uncle (step)"],
    ["Aunt", "Aunt (step)"],
    ["Nephew", "Nephew (step)"],
    ["Niece", "Niece (step)"],
    ["Grandson", "Grandson (step)"],
    ["Granddaughter", "Granddaughter (step)"],
    ["Male cousin", "Male cousin (step)"],
    ["Female cousin", "Female cousin (step)"],
    ["Father in law", "Step father in law"],
    ["Mother in law", "Step mother in law"],
    ["Son in law", "Step son in law"],
    ["Daughter in law", "Step daughter in law"],
    ["Husband", "Husband (divorced)"],
    ["Wife", "Wife (divorced)"],
];

/**
 * Returns the variant family (array of interchangeable types) for `type`, or an
 * empty array when `type` is a free-form label (e.g. "First cousin once removed")
 * that has no canonical variants.
 */
export const getVariantFamily = (type: string): RelationTypes[] => {
    for (const family of VARIANT_FAMILIES) {
        if ((family as string[]).includes(type)) return family;
    }
    return [];
};

/**
 * The canonical inverse for relationship types whose inverse is gender-neutral
 * on the relative's side (the resulting type's gender comes from the *anchor*,
 * not the relative). Symmetric relations map to themselves. Relations whose
 * inverse depends on the relative's gender (parent/child, grandparent/grandchild,
 * uncle-aunt/nephew-niece) are handled separately by `getInverseRelationType`.
 */
const RELATION_INVERSE: Partial<Record<RelationTypes, RelationTypes>> = {
    // Spouses (inverse gender is fixed by the spouse type itself).
    Husband: "Wife",
    Wife: "Husband",
    "Husband (divorced)": "Wife (divorced)",
    "Wife (divorced)": "Husband (divorced)",
    "Common-Law Partner": "Common-Law Partner",
    "Have shared kids": "Have shared kids",
    Relative: "Relative"
};

/**
 * Pairs of (parent-side type, [son inverse, daughter inverse]). When the anchor
 * is the parent, the relative is the child whose gendered type depends on the
 * relative's sex. When the anchor is the child, the relative is the parent whose
 * gendered type depends on the relative's sex.
 */
const PARENT_TO_CHILD_INVERSE: Partial<Record<RelationTypes, { M: RelationTypes; F: RelationTypes }>> = {
    Father: { M: "Son", F: "Daughter" },
    Mother: { M: "Son", F: "Daughter" },
    "Father (step)": { M: "Son (step)", F: "Daughter (step)" },
    "Mother (step)": { M: "Son (step)", F: "Daughter (step)" },
    "Step father": { M: "Step son", F: "Step daughter" },
    "Step mother": { M: "Step son", F: "Step daughter" },
    "Adoptive father": { M: "Adopted son", F: "Adopted daughter" },
    "Adoptive mother": { M: "Adopted son", F: "Adopted daughter" },
    "Father in law": { M: "Son in law", F: "Daughter in law" },
    "Mother in law": { M: "Son in law", F: "Daughter in law" },
    "Step father in law": { M: "Step son in law", F: "Step daughter in law" },
    "Step mother in law": { M: "Step son in law", F: "Step daughter in law" }
};

const CHILD_TO_PARENT_INVERSE: Partial<Record<RelationTypes, { M: RelationTypes; F: RelationTypes }>> = {
    Son: { M: "Father", F: "Mother" },
    Daughter: { M: "Father", F: "Mother" },
    "Son (step)": { M: "Father (step)", F: "Mother (step)" },
    "Daughter (step)": { M: "Father (step)", F: "Mother (step)" },
    "Step son": { M: "Step father", F: "Step mother" },
    "Step daughter": { M: "Step father", F: "Step mother" },
    "Adopted son": { M: "Adoptive father", F: "Adoptive mother" },
    "Adopted daughter": { M: "Adoptive father", F: "Adoptive mother" },
    "Son in law": { M: "Father in law", F: "Mother in law" },
    "Daughter in law": { M: "Father in law", F: "Mother in law" },
    "Step son in law": { M: "Step father in law", F: "Step mother in law" },
    "Step daughter in law": { M: "Step father in law", F: "Step mother in law" }
};

/** Other gendered inverses whose result depends on the relative's gender. */
const GENDERED_INVERSE: Partial<Record<RelationTypes, { M: RelationTypes; F: RelationTypes }>> = {
    Grandfather: { M: "Grandson", F: "Granddaughter" },
    Grandmother: { M: "Grandson", F: "Granddaughter" },
    Grandson: { M: "Grandfather", F: "Grandmother" },
    Granddaughter: { M: "Grandfather", F: "Grandmother" },
    "Grandfather (step)": { M: "Grandson (step)", F: "Granddaughter (step)" },
    "Grandmother (step)": { M: "Grandson (step)", F: "Granddaughter (step)" },
    "Grandson (step)": { M: "Grandfather (step)", F: "Grandmother (step)" },
    "Granddaughter (step)": { M: "Grandfather (step)", F: "Grandmother (step)" },
    Uncle: { M: "Nephew", F: "Niece" },
    Aunt: { M: "Nephew", F: "Niece" },
    Nephew: { M: "Uncle", F: "Aunt" },
    Niece: { M: "Uncle", F: "Aunt" },
    "Uncle (step)": { M: "Nephew (step)", F: "Niece (step)" },
    "Aunt (step)": { M: "Nephew (step)", F: "Niece (step)" },
    "Nephew (step)": { M: "Uncle (step)", F: "Aunt (step)" },
    "Niece (step)": { M: "Uncle (step)", F: "Aunt (step)" },
    // Same-generation gendered (siblings/cousins): inverse gender = relative.
    Brother: { M: "Brother", F: "Sister" },
    Sister: { M: "Brother", F: "Sister" },
    "Brother (step)": { M: "Brother (step)", F: "Sister (step)" },
    "Sister (step)": { M: "Brother (step)", F: "Sister (step)" },
    "Step brother": { M: "Step brother", F: "Step sister" },
    "Step sister": { M: "Step brother", F: "Step sister" },
    "Brother in law": { M: "Brother in law", F: "Sister in law" },
    "Sister in law": { M: "Brother in law", F: "Sister in law" },
    "Male cousin": { M: "Male cousin", F: "Female cousin" },
    "Female cousin": { M: "Male cousin", F: "Female cousin" },
    "Male cousin (step)": { M: "Male cousin (step)", F: "Female cousin (step)" },
    "Female cousin (step)": { M: "Male cousin (step)", F: "Female cousin (step)" }
};

/**
 * Returns the suggested inverse relationship type, or `undefined` when there
 * is no canonical inverse (so the user must choose it manually).
 *
 * Most gendered inverses depend on the *relative's* sex (e.g. a Father's inverse
 * is "Son" for a male relative or "Daughter" for a female one). Pass
 * `relativeSex` to resolve those; when it is omitted the male variant is used as
 * a sensible default.
 */
export const getInverseRelationType = (
    relation: RelationTypes,
    relativeSex: RelativeSex = "M"
): RelationTypes | undefined => {
    const parentChild = PARENT_TO_CHILD_INVERSE[relation] ?? CHILD_TO_PARENT_INVERSE[relation];
    if (parentChild) {
        return parentChild[relativeSex];
    }
    const gendered = GENDERED_INVERSE[relation];
    if (gendered) {
        return gendered[relativeSex];
    }
    return RELATION_INVERSE[relation];
};

/**
 * Relationship types whose inverse is established automatically (and locked in
 * the UI). All direct-add types — parents, children, and spouses — have
 * deterministic inverses, so both sides are always set together.
 */
export const isAutoInverseRelation = (relation: RelationTypes): boolean =>
    isRelationAParent(relation) ||
    isRelationAChild(relation) ||
    relation === "Husband" ||
    relation === "Wife" ||
    relation === "Husband (divorced)" ||
    relation === "Wife (divorced)" ||
    relation === "Common-Law Partner" ||
    relation === "Have shared kids";

/** Direct parent/child links that should be treated as inner-family edges. */
export const isInnerFamilyRelation = (relation: RelationTypes): boolean =>
    isRelationAChild(relation) ||
    relation === "Father" ||
    relation === "Mother" ||
    relation === "Father (step)" ||
    relation === "Mother (step)" ||
    relation === "Step father" ||
    relation === "Step mother" ||
    relation === "Adoptive father" ||
    relation === "Adoptive mother" ||
    relation === "Father in law" ||
    relation === "Mother in law";

/**
 * A relationship as stored/persisted: a row `fromId -> toId` whose type means
 * "`toId` is the [type] of `fromId`" (both `relationType` and `prettyType`
 * follow this convention).
 */
export interface StoredRelation {
    fromId: string;
    toId: string;
    relationType: RelationTypes;
    prettyType: string;
    isInnerFamily: boolean;
}

/** Reads a stored relation's "real" type (prefers the pretty label). */
const storedRelationType = (relation: { relationType: string; prettyType: string }): RelationTypes => {
    const pretty = relation.prettyType as RelationTypes;
    if (ALL_RELATION_TYPES.includes(pretty)) {
        return pretty;
    }
    const raw = relation.relationType as RelationTypes;
    return ALL_RELATION_TYPES.includes(raw) ? raw : "Relative";
};

/**
 * Builds the pretty label for an ancestor that is `generations` levels above a
 * descendant: 2 -> Grandfather/Grandmother, 3 -> Great-grandfather, 4 ->
 * Great-great-grandfather, and so on. `sex` is the *ancestor's* sex.
 */
export const ancestorLabel = (generations: number, sex: RelativeSex): string => {
    const base = sex === "F" ? "grandmother" : "grandfather";
    const greats = "Great-".repeat(Math.max(0, generations - 2));
    // Capitalize the first letter of the whole label.
    const label = `${greats}${base}`;
    return label.charAt(0).toUpperCase() + label.slice(1);
};

/**
 * Builds the pretty label for a descendant that is `generations` levels below
 * an ancestor: 2 -> Grandson/Granddaughter, 3 -> Great-grandson, etc. `sex` is
 * the *descendant's* sex.
 */
export const descendantLabel = (generations: number, sex: RelativeSex): string => {
    const base = sex === "F" ? "granddaughter" : "grandson";
    const greats = "Great-".repeat(Math.max(0, generations - 2));
    const label = `${greats}${base}`;
    return label.charAt(0).toUpperCase() + label.slice(1);
};

/**
 * Given the full set of stored relationships, returns a map of every member to
 * the set of its direct parents, derived from the gendered parent/child links.
 *
 * A row `from -> to` typed as a *parent* type ("`to` is the Father of `from`")
 * means `to` is a parent of `from`. A row typed as a *child* type ("`to` is the
 * Son of `from`") means `from` is a parent of `to`.
 */
const buildParentsMap = (relations: StoredRelation[]): Map<string, Set<string>> => {
    const parentsOf = new Map<string, Set<string>>();
    const addParent = (childId: string, parentId: string) => {
        if (!parentsOf.has(childId)) {
            parentsOf.set(childId, new Set());
        }
        parentsOf.get(childId)!.add(parentId);
    };
    for (const relation of relations) {
        const type = storedRelationType(relation);
        // Exclude in-law types — "Father in law" is NOT a blood/adoptive parent.
        // Walking through in-law links would incorrectly derive a spouse as a
        // grandchild (and similar wrong transitive relationships).
        if (isRelationAParent(type) && type !== "Father in law" && type !== "Mother in law") {
            // `to` is the parent of `from`.
            addParent(relation.fromId, relation.toId);
        } else if (isRelationAChild(type) && type !== "Son in law" && type !== "Daughter in law") {
            // `to` is the child of `from`, so `from` is the parent of `to`.
            addParent(relation.toId, relation.fromId);
        }
    }
    return parentsOf;
};

/**
 * Derives transitive generational relationships (grandparent/grandchild and
 * deeper, with a "Great-" prefix per extra generation) implied by the
 * parent/child links in `relations`.
 *
 * The returned rows are **label-only**: `relationType` is `'Relative'` so they
 * don't draw edges or affect layout, while `prettyType` carries the gendered
 * generational label used for the node badge. Rows that already exist in
 * `relations` (in either direction) are skipped so explicit relationships are
 * never clobbered.
 *
 * @param relations  All currently stored relationships (after the new
 *                   parent/child link has been added).
 * @param sexOf      Lookup for a member's sex; members with unknown sex default
 *                   to male labels.
 */
export const deriveTransitiveRelations = (
    relations: StoredRelation[],
    sexOf: (memberId: string) => RelativeSex | undefined
): StoredRelation[] => {
    const parentsOf = buildParentsMap(relations);
    const existing = new Set(relations.map((relation) => `${relation.fromId}-${relation.toId}`));
    const derived: StoredRelation[] = [];
    const seen = new Set<string>();

    const pushRow = (fromId: string, toId: string, prettyType: string) => {
        const key = `${fromId}-${toId}`;
        if (existing.has(key) || seen.has(key)) {
            return;
        }
        seen.add(key);
        derived.push({
            fromId,
            toId,
            relationType: "Relative",
            prettyType,
            isInnerFamily: false
        });
    };

    // For every member, walk up its ancestor chain. The distance (number of
    // generations) determines the label; distance >= 2 yields grandparent and
    // beyond.
    Array.from(parentsOf.keys()).forEach((descendantId) => {
        // BFS up the parent graph tracking generational distance.
        const queue: { id: string; distance: number }[] = [{ id: descendantId, distance: 0 }];
        const visited = new Set<string>([descendantId]);
        while (queue.length > 0) {
            const { id, distance } = queue.shift()!;
            const parents = parentsOf.get(id);
            if (!parents) {
                continue;
            }
            Array.from(parents).forEach((parentId) => {
                if (visited.has(parentId)) {
                    return;
                }
                visited.add(parentId);
                const ancestorDistance = distance + 1;
                if (ancestorDistance >= 2) {
                    const ancestorSex = sexOf(parentId) ?? "M";
                    const descendantSex = sexOf(descendantId) ?? "M";
                    // Row ancestor -> descendant: "descendant is the [grandson] of ancestor".
                    pushRow(parentId, descendantId, descendantLabel(ancestorDistance, descendantSex));
                    // Row descendant -> ancestor: "ancestor is the [grandfather] of descendant".
                    pushRow(descendantId, parentId, ancestorLabel(ancestorDistance, ancestorSex));
                }
                queue.push({ id: parentId, distance: ancestorDistance });
            });
        }
    });

    return derived;
};

// ─── Comprehensive relationship derivation ───────────────────────────────────

/** Builds a map of every member to their direct spouses (any coupling type). */
export const buildSpousesMap = (relations: StoredRelation[]): Map<string, Set<string>> => {
    const spousesOf = new Map<string, Set<string>>();
    const add = (a: string, b: string) => {
        if (!spousesOf.has(a)) spousesOf.set(a, new Set());
        spousesOf.get(a)!.add(b);
    };
    relations.forEach((rel) => {
        if (isRelationSharingKids(storedRelationType(rel))) {
            add(rel.fromId, rel.toId);
            add(rel.toId, rel.fromId);
        }
    });
    return spousesOf;
};

const SIBLING_RELATION_TYPES = new Set<RelationTypes>([
    "Brother", "Sister", "Brother (step)", "Sister (step)", "Step brother", "Step sister"
]);

/** Builds a map of every member to their known siblings (explicit + inferred from shared parents). */
const buildSiblingsMap = (
    relations: StoredRelation[],
    parentsOf: Map<string, Set<string>>
): Map<string, Set<string>> => {
    const siblingsOf = new Map<string, Set<string>>();
    const add = (a: string, b: string) => {
        if (a === b) return;
        if (!siblingsOf.has(a)) siblingsOf.set(a, new Set());
        siblingsOf.get(a)!.add(b);
    };
    relations.forEach((rel) => {
        if (SIBLING_RELATION_TYPES.has(storedRelationType(rel))) {
            add(rel.fromId, rel.toId);
            add(rel.toId, rel.fromId);
        }
    });
    // Infer siblings from shared parents.
    const childrenOf = new Map<string, string[]>();
    Array.from(parentsOf.entries()).forEach(([childId, parents]) => {
        Array.from(parents).forEach((parentId) => {
            if (!childrenOf.has(parentId)) childrenOf.set(parentId, []);
            childrenOf.get(parentId)!.push(childId);
        });
    });
    Array.from(childrenOf.values()).forEach((children) => {
        for (let i = 0; i < children.length; i++) {
            for (let j = i + 1; j < children.length; j++) {
                add(children[i], children[j]);
                add(children[j], children[i]);
            }
        }
    });
    return siblingsOf;
};

/** BFS up the parent graph from `memberId`; returns ancestor id → distance. */
const getAncestorDistances = (
    memberId: string,
    parentsOf: Map<string, Set<string>>
): Map<string, number> => {
    const dist = new Map<string, number>();
    const queue: { id: string; d: number }[] = [{ id: memberId, d: 0 }];
    while (queue.length > 0) {
        const { id, d } = queue.shift()!;
        if (dist.has(id)) continue;
        dist.set(id, d);
        Array.from(parentsOf.get(id) ?? []).forEach((parentId) => {
            if (!dist.has(parentId)) queue.push({ id: parentId, d: d + 1 });
        });
    }
    return dist;
};

/**
 * Like `buildParentsMap` but only includes Father/Mother/Son/Daughter links —
 * no step, adoptive, or in-law links. Used to decide whether a derived
 * relationship's path is all-direct so we can suppress irrelevant step variants.
 */
const buildDirectParentsMap = (relations: StoredRelation[]): Map<string, Set<string>> => {
    const directParentsOf = new Map<string, Set<string>>();
    const add = (childId: string, parentId: string) => {
        if (!directParentsOf.has(childId)) directParentsOf.set(childId, new Set());
        directParentsOf.get(childId)!.add(parentId);
    };
    relations.forEach((rel) => {
        const type = storedRelationType(rel);
        if (type === "Father" || type === "Mother") { add(rel.fromId, rel.toId); }
        else if (type === "Son" || type === "Daughter") { add(rel.toId, rel.fromId); }
    });
    return directParentsOf;
};

/**
 * BFS up the parent graph tracking both distance and whether every link in the
 * path so far is a direct Father/Mother/Son/Daughter link (`allDirect`).
 * When `allDirect` is true for an ancestor, step/adoptive variants of the
 * derived label are not applicable and should not be offered in the UI.
 */
const getAncestorInfo = (
    memberId: string,
    parentsOf: Map<string, Set<string>>,
    directParentsOf: Map<string, Set<string>>
): Map<string, { dist: number; allDirect: boolean }> => {
    const info = new Map<string, { dist: number; allDirect: boolean }>();
    const queue: { id: string; d: number; direct: boolean }[] = [{ id: memberId, d: 0, direct: true }];
    while (queue.length > 0) {
        const { id, d, direct } = queue.shift()!;
        if (info.has(id)) continue;
        info.set(id, { dist: d, allDirect: direct });
        Array.from(parentsOf.get(id) ?? []).forEach((parentId) => {
            if (!info.has(parentId)) {
                const isDirectLink = directParentsOf.get(id)?.has(parentId) ?? false;
                queue.push({ id: parentId, d: d + 1, direct: direct && isDirectLink });
            }
        });
    }
    return info;
};

/**
 * A derived relationship row. `pathHasStep` is true when the inference path
 * included at least one step/adoptive link, making step variants of the label
 * plausible. When false, only the base (non-step) label should be offered.
 */
export type DerivedRow = StoredRelation & { pathHasStep: boolean };

/** Inverts a parentsOf map to produce a childrenOf map. */
const buildChildrenMap = (parentsOf: Map<string, Set<string>>): Map<string, Set<string>> => {
    const childrenOf = new Map<string, Set<string>>();
    const add = (parentId: string, childId: string) => {
        if (!childrenOf.has(parentId)) childrenOf.set(parentId, new Set());
        childrenOf.get(parentId)!.add(childId);
    };
    Array.from(parentsOf.entries()).forEach(([childId, parents]) => {
        Array.from(parents).forEach((parentId) => add(parentId, childId));
    });
    return childrenOf;
};

/** BFS down through childrenOf; returns distance from memberId to each descendant (dist 0 = self). */
const getDescendantDistances = (memberId: string, childrenOf: Map<string, Set<string>>): Map<string, number> => {
    const dists = new Map<string, number>();
    const queue: { id: string; d: number }[] = [{ id: memberId, d: 0 }];
    while (queue.length > 0) {
        const item = queue.shift()!;
        if (dists.has(item.id)) continue;
        dists.set(item.id, item.d);
        Array.from(childrenOf.get(item.id) ?? []).forEach((childId) => {
            if (!dists.has(childId)) queue.push({ id: childId, d: item.d + 1 });
        });
    }
    return dists;
};

const ORDINALS = ["", "First", "Second", "Third", "Fourth", "Fifth",
    "Sixth", "Seventh", "Eighth", "Ninth", "Tenth"];

const removedSuffix = (n: number): string => {
    if (n === 0) return "";
    if (n === 1) return " once removed";
    if (n === 2) return " twice removed";
    return ` ${n} times removed`;
};

/** Label for a spouse's ancestor at depth `dist` (2 = "Grandfather-in-law", 3 = "Great-grandfather-in-law", …). */
const inLawAncestorLabel = (dist: number, sex: RelativeSex): string => {
    const base = sex === "F" ? "grandmother-in-law" : "grandfather-in-law";
    const label = "Great-".repeat(dist - 2) + base;
    return label.charAt(0).toUpperCase() + label.slice(1);
};

/** Label for a grandchild's spouse at depth `dist` (2 = "Grandson-in-law", 3 = "Great-grandson-in-law", …). */
const inLawDescendantLabel = (dist: number, sex: RelativeSex): string => {
    const base = sex === "F" ? "granddaughter-in-law" : "grandson-in-law";
    const label = "Great-".repeat(dist - 2) + base;
    return label.charAt(0).toUpperCase() + label.slice(1);
};

/** Label for a cousin relationship (cousins are gender-neutral in English). */
export const cousinLabel = (degree: number, removed: number): string => {
    const ord = degree <= 10 ? ORDINALS[degree] : `${degree}th`;
    return `${ord} cousin${removedSuffix(removed)}`;
};

/** Label for an uncle/aunt or great-uncle/aunt. `greats` = 0 for plain uncle/aunt. */
export const uncleAuntLabel = (greats: number, sex: RelativeSex): string => {
    const base = sex === "F" ? "aunt" : "uncle";
    const label = "Great-".repeat(greats) + base;
    return label.charAt(0).toUpperCase() + label.slice(1);
};

/** Label for a nephew/niece or great-nephew/niece. `greats` = 0 for plain nephew/niece. */
export const nephewNieceLabel = (greats: number, sex: RelativeSex): string => {
    const base = sex === "F" ? "niece" : "nephew";
    const label = "Great-".repeat(greats) + base;
    return label.charAt(0).toUpperCase() + label.slice(1);
};

/**
 * Derives ALL transitive/implied relationships from the full relationship graph:
 * - Grandparent/grandchild chains (with "Great-" prefix per extra generation)
 * - Uncle/aunt (parent's sibling), great-uncle/aunt (grandparent's sibling), etc.
 * - Nephew/niece (sibling's child), great-nephew/niece, etc.
 * - Cousin relationships (1st, 2nd, … + once/twice removed)
 * - In-law relationships (parent-in-law, sibling-in-law)
 *
 * All returned rows are label-only: `relationType` is `"Relative"` so they
 * never draw edges or affect layout. Rows already in `relations` are skipped.
 */
export const deriveAllRelations = (
    relations: StoredRelation[],
    sexOf: (memberId: string) => RelativeSex | undefined
): DerivedRow[] => {
    const parentsOf = buildParentsMap(relations);
    const directParentsOf = buildDirectParentsMap(relations);
    const siblingsOf = buildSiblingsMap(relations, parentsOf);
    const spousesOf = buildSpousesMap(relations);

    // Direct (non-step) sibling pairs — used to detect step paths through siblings.
    const directSibPairs = new Set<string>();
    relations.forEach((rel) => {
        const type = storedRelationType(rel);
        if (type === "Brother" || type === "Sister") {
            directSibPairs.add([rel.fromId, rel.toId].sort().join("|"));
        }
    });

    const existing = new Set(relations.map((r) => `${r.fromId}-${r.toId}`));
    const derived: DerivedRow[] = [];
    const seen = new Set<string>();

    const pushRow = (fromId: string, toId: string, prettyType: string, pathHasStep: boolean) => {
        const key = `${fromId}-${toId}`;
        if (existing.has(key) || seen.has(key)) return;
        seen.add(key);
        derived.push({ fromId, toId, relationType: "Relative", prettyType, isInnerFamily: false, pathHasStep });
    };

    const allMembers = new Set<string>();
    relations.forEach((rel) => { allMembers.add(rel.fromId); allMembers.add(rel.toId); });

    // 1. Ancestor chains: grandparent, great-grandparent, etc.
    Array.from(allMembers).forEach((descendantId) => {
        const ancestorInfo = getAncestorInfo(descendantId, parentsOf, directParentsOf);
        Array.from(ancestorInfo.entries()).forEach(([ancestorId, { dist, allDirect }]) => {
            if (dist < 2) return;
            const pathHasStep = !allDirect;
            pushRow(ancestorId, descendantId, descendantLabel(dist, sexOf(descendantId) ?? "M"), pathHasStep);
            pushRow(descendantId, ancestorId, ancestorLabel(dist, sexOf(ancestorId) ?? "M"), pathHasStep);
        });
    });

    // 2. Uncle/aunt (parent's sibling) and great-uncle/aunt (grandparent's sibling), etc.
    //    For each ancestor at distance D, each sibling of that ancestor is a
    //    (D-1)-"greats" uncle/aunt of the person (0 greats = plain uncle/aunt).
    Array.from(allMembers).forEach((personId) => {
        const ancestorInfo = getAncestorInfo(personId, parentsOf, directParentsOf);
        Array.from(ancestorInfo.entries()).forEach(([ancestorId, { dist, allDirect }]) => {
            if (dist === 0) return;
            Array.from(siblingsOf.get(ancestorId) ?? []).forEach((siblingId) => {
                if (siblingId === personId) return;
                const greats = dist - 1;
                const sibIsDirectSibling = directSibPairs.has([ancestorId, siblingId].sort().join("|"));
                const pathHasStep = !allDirect || !sibIsDirectSibling;
                pushRow(personId, siblingId, uncleAuntLabel(greats, sexOf(siblingId) ?? "M"), pathHasStep);
                pushRow(siblingId, personId, nephewNieceLabel(greats, sexOf(personId) ?? "M"), pathHasStep);
            });
        });
    });

    // 3. Cousin relationships via Most Recent Common Ancestor (MRCA).
    //    Both parties must be ≥ 2 generations below the MRCA (otherwise it's a
    //    parent/child or uncle/nephew situation already handled above).
    //    degree = min(distA, distB) - 1; removed = |distA - distB|.
    const allMembersArr = Array.from(allMembers);
    for (let i = 0; i < allMembersArr.length; i++) {
        const a = allMembersArr[i];
        const ancestorInfoA = getAncestorInfo(a, parentsOf, directParentsOf);
        for (let j = i + 1; j < allMembersArr.length; j++) {
            const b = allMembersArr[j];
            const ancestorInfoB = getAncestorInfo(b, parentsOf, directParentsOf);
            let bestDistA = Infinity, bestDistB = Infinity, bestAllDirect = true;
            Array.from(ancestorInfoA.entries()).forEach(([ancestor, { dist: dA, allDirect: adA }]) => {
                if (dA < 2) return;
                const infoB = ancestorInfoB.get(ancestor);
                if (!infoB || infoB.dist < 2) return;
                if (dA + infoB.dist < bestDistA + bestDistB) {
                    bestDistA = dA; bestDistB = infoB.dist; bestAllDirect = adA && infoB.allDirect;
                }
            });
            if (bestDistA === Infinity) continue;
            const label = cousinLabel(Math.min(bestDistA, bestDistB) - 1, Math.abs(bestDistA - bestDistB));
            const pathHasStep = !bestAllDirect;
            pushRow(a, b, label, pathHasStep);
            pushRow(b, a, label, pathHasStep);
        }
    }

    // 4. In-law relationships (pathHasStep=false — in-laws are their own category).
    Array.from(allMembers).forEach((personId) => {
        Array.from(spousesOf.get(personId) ?? []).forEach((spouseId) => {
            // Walk the spouse's full ancestor chain:
            //   dist=1 → Father/Mother-in-law + Son/Daughter-in-law (canonical types)
            //   dist≥2 → Grandfather/Grandmother-in-law + Grandson/Granddaughter-in-law
            const spouseAncestors = getAncestorDistances(spouseId, parentsOf);
            Array.from(spouseAncestors.entries()).forEach(([ancestorId, dist]) => {
                if (dist === 0) return;
                const ancestorSex = sexOf(ancestorId) ?? "M";
                const personSex = sexOf(personId) ?? "M";
                if (dist === 1) {
                    pushRow(personId, ancestorId, ancestorSex === "F" ? "Mother in law" : "Father in law", false);
                    pushRow(ancestorId, personId, personSex === "F" ? "Daughter in law" : "Son in law", false);
                } else {
                    pushRow(personId, ancestorId, inLawAncestorLabel(dist, ancestorSex), false);
                    pushRow(ancestorId, personId, inLawDescendantLabel(dist, personSex), false);
                }
            });
            // Spouse's siblings → sibling-in-law.
            Array.from(siblingsOf.get(spouseId) ?? []).forEach((sibInLawId) => {
                if (sibInLawId === personId) return;
                pushRow(personId, sibInLawId, (sexOf(sibInLawId) ?? "M") === "F" ? "Sister in law" : "Brother in law", false);
                pushRow(sibInLawId, personId, (sexOf(personId) ?? "M") === "F" ? "Sister in law" : "Brother in law", false);
            });
        });
        // Sibling's spouse → sibling-in-law (other direction).
        Array.from(siblingsOf.get(personId) ?? []).forEach((siblingId) => {
            Array.from(spousesOf.get(siblingId) ?? []).forEach((sibSpouseId) => {
                if (sibSpouseId === personId) return;
                pushRow(personId, sibSpouseId, (sexOf(sibSpouseId) ?? "M") === "F" ? "Sister in law" : "Brother in law", false);
                pushRow(sibSpouseId, personId, (sexOf(personId) ?? "M") === "F" ? "Sister in law" : "Brother in law", false);
            });
        });
    });

    // 5. Spouse's children/descendants.
    //    When P marries S, S's children become P's (step-)children; their spouses
    //    become P's son/daughter-in-law; S's grandchildren become P's grandchildren.
    //    pathHasStep=true on all these so the user can switch to the step variant.
    const childrenOf = buildChildrenMap(parentsOf);
    Array.from(allMembers).forEach((personId) => {
        Array.from(spousesOf.get(personId) ?? []).forEach((spouseId) => {
            const spouseDesc = getDescendantDistances(spouseId, childrenOf);
            Array.from(spouseDesc.entries()).forEach(([descId, dist]) => {
                if (dist === 0) return;
                // Skip if personId is already a recorded parent of descId.
                if (parentsOf.get(descId)?.has(personId)) return;
                const descSex = sexOf(descId) ?? "M";
                const personSex = sexOf(personId) ?? "M";
                if (dist === 1) {
                    // Direct child of spouse → son/daughter (step variant available).
                    pushRow(personId, descId, descSex === "F" ? "Daughter" : "Son", true);
                    pushRow(descId, personId, personSex === "F" ? "Mother" : "Father", true);
                    // Child's spouses → son/daughter-in-law (step variant available for cascade).
                    Array.from(spousesOf.get(descId) ?? []).forEach((childSpouseId) => {
                        if (childSpouseId === personId || childSpouseId === spouseId) return;
                        if (parentsOf.get(childSpouseId)?.has(personId)) return;
                        const csSex = sexOf(childSpouseId) ?? "M";
                        pushRow(personId, childSpouseId, csSex === "F" ? "Daughter in law" : "Son in law", true);
                        pushRow(childSpouseId, personId, personSex === "F" ? "Mother in law" : "Father in law", true);
                    });
                } else {
                    // Grandchild, great-grandchild, etc.
                    pushRow(personId, descId, descendantLabel(dist, descSex), true);
                    pushRow(descId, personId, ancestorLabel(dist, personSex), true);
                }
            });
        });
    });

    return derived;
};
