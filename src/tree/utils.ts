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
 * Filters the grouped relationship options down to those valid for a person of
 * the given sex. Gender-neutral types are always kept. When `sex` is undefined
 * (unknown) every type is returned.
 */
export const relationGroupsForSex = (
    sex: RelativeSex | undefined
): { label: string; options: RelationTypes[] }[] =>
    !sex
        ? RELATION_TYPE_GROUPS
        : RELATION_TYPE_GROUPS
              .map((group) => ({
                  label: group.label,
                  options: group.options.filter((option) => {
                      const gender = getRelationGender(option);
                      return gender === undefined || gender === sex;
                  })
              }))
              .filter((group) => group.options.length > 0);

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
    "Mother in law": { M: "Son in law", F: "Daughter in law" }
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
    "Daughter in law": { M: "Father in law", F: "Mother in law" }
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
 * "Obvious" relationships whose inverse direction is established automatically
 * (and locked in the UI). Per product decision this is limited to the direct
 * father/mother <-> son/daughter pairs; every other relationship's reverse is
 * chosen by the user.
 */
export const isAutoInverseRelation = (relation: RelationTypes): boolean =>
    relation === "Father" ||
    relation === "Mother" ||
    relation === "Son" ||
    relation === "Daughter";

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
        if (isRelationAParent(type)) {
            // `to` is the parent of `from`.
            addParent(relation.fromId, relation.toId);
        } else if (isRelationAChild(type)) {
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
