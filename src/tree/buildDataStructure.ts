import { buildEdgeId } from "./buildEdges";
import {
    FamilyMember,
    FamilyMembers,
    FamilyRelations,
    Generation,
    InnerFamily,
    OTHERS_GENERATION,
    GenerationsPossible,
    ParentsChildrens,
    FamilyRelation
} from "./types";
import {
    getGenerationOffsetFromLabel,
    isRelationAChild,
    isRelationAParent,
    isRelationSharingKids
} from "./utils";

function tryInferGenerationForOthers(
    familyMemberByGeneration: [Generation, FamilyMember][],
    familyRelations: FamilyRelations
): [Generation, FamilyMember][] {
    // Work on a mutable copy so we can keep promoting "others" to a concrete
    // generation across multiple passes.
    const working: [Generation, FamilyMember][] = familyMemberByGeneration.map(
        ([gen, member]) => [gen, member]
    );

    // The offset between an "other" member and any already-placed relative may
    // be encoded either in the strict relationType or in the free-form pretty
    // label (e.g. "Great-grandfather"), so consider both.
    const offsetBetween = (othersId: string, relativeId: string): Generation | null => {
        const relation = familyRelations[buildEdgeId(othersId, relativeId)];
        if (!relation) return null;

        const fromType = getGenerationOffsetFromLabel(relation.relationType);
        if (fromType !== OTHERS_GENERATION) return fromType;

        const fromPretty = getGenerationOffsetFromLabel(relation.prettyType);
        if (fromPretty !== OTHERS_GENERATION) return fromPretty;

        return null;
    };

    // Iterate to a fixpoint: each pass can place "others" that anchor off
    // members placed in a previous pass. This lets deep ancestor/descendant
    // chains (great-grandparent -> grandparent -> parent -> root) resolve even
    // though only adjacent links carry a concrete relationship.
    let changed = true;
    while (changed) {
        changed = false;

        const placed = working.filter(([gen]) => gen !== OTHERS_GENERATION);

        for (let i = 0; i < working.length; i++) {
            const [gen, othersMember] = working[i];
            if (gen !== OTHERS_GENERATION) continue;

            const inferredGenerations = placed
                .map(([relativeGeneration, relative]) => {
                    const relationOffset = offsetBetween(othersMember.id, relative.id);
                    if (relationOffset === null) return null;

                    // relationOffset is how many generations "up" the relative
                    // is from othersMember; add it to the relative's own
                    // generation to get othersMember's generation.
                    return (relativeGeneration + relationOffset) as Generation;
                })
                .filter((generation): generation is Generation => generation !== null);

            if (
                inferredGenerations.length > 0 &&
                inferredGenerations.every((g) => g === inferredGenerations[0])
            ) {
                working[i] = [inferredGenerations[0], othersMember];
                changed = true;
            }
        }
    }

    return working;
}

export function buildGenerations(
    familyMembers: FamilyMembers,
    familyRelations: FamilyRelations,
    rootId: string
): Record<Generation, FamilyMember[]> {
    const familyMembersByGeneration: [Generation, FamilyMember][] = Object.values(familyMembers).map((member) => {
        if (member.id === rootId) return [0, member];

        const relation = familyRelations[`${member.id}-${rootId}`];
        // The direct-to-root relationship may be a strict relationType or a
        // free-form pretty label (e.g. derived "Great-grandfather"), so try
        // both before falling back to the "others" bucket.
        const generationFromType = getGenerationOffsetFromLabel(relation?.relationType);
        const generation =
            generationFromType !== OTHERS_GENERATION
                ? generationFromType
                : getGenerationOffsetFromLabel(relation?.prettyType);

        return [generation, member];
    });

    const membersByGenFull = tryInferGenerationForOthers(familyMembersByGeneration, familyRelations);

    const reducedFamilyMembersByGeneration = membersByGenFull.reduce(
        (obj, member) => {
            const [generation, memberData] = member;

            if (!obj[generation]) obj[generation] = [memberData];
            else obj[generation] = [...obj[generation], memberData];
            return obj;
        },
        {} as Record<Generation, FamilyMember[]>
    );

    return reducedFamilyMembersByGeneration;
}

function buildCouplesPerGeneration(
    familyGenerations: ReturnType<typeof buildGenerations>,
    familyRelations: FamilyRelations
) {
    const couplesPerGeneration = Object.fromEntries(
        Object.entries(familyGenerations).map(([rawGeneration, nodesInGeneration]) => {
            const generation: Generation = parseInt(rawGeneration) as Generation;
            const couples: InnerFamily[] = [];
            let availableNodesInGeneration = [...nodesInGeneration];

            while (availableNodesInGeneration.length > 0) {
                const node = availableNodesInGeneration.pop();
                if (!node) {
                    break;
                }

                const partnersIds = Object.values(familyRelations)
                    .filter((relation) => relation.from === node.id && isRelationSharingKids(relation.relationType))
                    .map((relation) => relation.to);
                if (partnersIds.length === 0) {
                    couples.push({ parents: [node.id], children: [], generation });
                    continue;
                }

                const partnersNodes: FamilyMember[] = partnersIds
                    // eslint-disable-next-line no-loop-func
                    .map((partnerId) => {
                        return availableNodesInGeneration.find((node) => node.id === partnerId);
                    })
                    .filter((node): node is FamilyMember => !!node);

                couples.push({
                    parents: [node.id, ...partnersNodes.map((node) => node.id)],
                    children: [],
                    generation
                });
                availableNodesInGeneration = availableNodesInGeneration.filter((node) => !partnersNodes.includes(node));
            }

            return [generation, couples] as const;
        })
    );

    return couplesPerGeneration;
}

// NOTE: this function edits couplesPerGeneration in place
function buildInnerFamilyPerCouple(
    couplesPerGeneration: ReturnType<typeof buildCouplesPerGeneration>,
    familyRelations: FamilyRelations
) {
    GenerationsPossible.forEach((generation) => {
        const couplesInCurrentGeneration = couplesPerGeneration[generation];
        if (!couplesInCurrentGeneration || couplesInCurrentGeneration.length === 0) {
            return;
        }

        const couplesInNextGeneration = couplesPerGeneration[generation + 1];
        if (!couplesInNextGeneration || couplesInNextGeneration.length === 0) {
            return;
        }

        couplesInCurrentGeneration.forEach((couple) => {
            const currentParents = couple.parents;

            const childrenRelations = Object.values(familyRelations).filter(
                (relation) => isRelationAChild(relation.relationType) && currentParents.includes(relation.to)
            );
            const childrenIds = childrenRelations.map((relation) => relation.from);

            if (childrenIds.length === 0) {
                return;
            }

            const childrenWithTheirCouples = couplesInNextGeneration
                .filter((nextGenFamilies) => {
                    return nextGenFamilies.parents.some((nextGenParent) =>
                        childrenIds.some((child) => child === nextGenParent)
                    );
                })
                .flat();

            const uniqueChildren = childrenWithTheirCouples.filter((child) => {
                return !couplesInCurrentGeneration.some((couple) => {
                    return couple.children.includes(child);
                });
            });

            couple.children = uniqueChildren
                .map((childWithFamily) => ({
                    child: childWithFamily,
                    parents: childrenRelations.filter((rel) => childWithFamily.parents.includes(rel.from)).join()
                }))
                .sort((childWithFamilyA, childWithFamilyB) =>
                    childWithFamilyA.parents.localeCompare(childWithFamilyB.parents)
                )
                .map((childWithFamily) => childWithFamily.child);
        });
    });

    return couplesPerGeneration;
}

export function buildDataStructure(
    familyGenerations: Record<Generation, FamilyMember[]>,
    familyRelations: FamilyRelations
) {
    const couplesPerGeneration = buildCouplesPerGeneration(familyGenerations, familyRelations);
    const innerFamiliesPerGeneration = buildInnerFamilyPerCouple(couplesPerGeneration, familyRelations);

    return innerFamiliesPerGeneration;
}

export function buildParentsChildrenStructs(familyMembers: FamilyMember[], familyRelations: FamilyRelation[]) {
    const parentChildrenFamilies = familyMembers
        .map((member) => {
            const parents = familyRelations
                .filter((relation) => relation.to === member.id && isRelationAParent(relation.relationType))
                .sort();
            if (parents.length > 2) console.error(`Too many parents for ${member.id}`);

            const parentA = parents[0]?.from;
            const parentB = parents[1]?.from;
            const id = [parentA, parentB]
                .filter((parent) => !!parent)
                .sort()
                .join("-");
            return { id, child: member.id, parentA, parentB };
        })
        .filter((childWithParents) => !!childWithParents.id)
        .reduce(
            (parentsWithAllChildren, childWithParents) => {
                if (parentsWithAllChildren[childWithParents.id]) {
                    parentsWithAllChildren[childWithParents.id].children.push(childWithParents.child);
                } else {
                    parentsWithAllChildren[childWithParents.id] = {
                        parentA: childWithParents.parentA,
                        parentB: childWithParents.parentB,
                        children: [childWithParents.child]
                    };
                }

                return parentsWithAllChildren;
            },
            {} as Record<string, ParentsChildrens>
        );

    return Object.values(parentChildrenFamilies);
}
