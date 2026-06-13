import React, { useEffect, useState } from 'react';
import './SlideInForm.css'; // Make sure to create and style this CSS file
import AppButton from '../CommonComponents/AppButton';
import Form from '../CommonComponents/Form';
import { RawFamilyMember, RawFamilyRelation } from '../utils';
import submitMember from '../Services/submitMember';
import submitRelationships from '../Services/submitRelationships';
import updateMember from '../Services/updateMember';
import removeMember from '../Services/removeMember';
import deleteRelationshipApi from '../Services/removeRelationship';
import { FamilyRelation, RelationTypes } from '../tree/types';
import {
    ALL_RELATION_TYPES,
    RELATION_TYPE_GROUPS,
    relationGroupsForSex,
    getInverseRelationType,
    isAutoInverseRelation,
    isInnerFamilyRelation,
    isRelationAParent,
    deriveAllRelations,
    getVariantFamily,
    filterGroupsBySex,
    buildSpousesMap,
    StoredRelation,
    DerivedRow,
    RelativeSex
} from '../tree/utils';
import { buildEdgeId } from '../tree/buildEdges';

interface SlideInFormProps {
    members: RawFamilyMember[];
    relations?: RawFamilyRelation[];
    onChange?: () => void;
}

export interface SlideInFormHandle {
    startEdit: (member: RawFamilyMember) => void;
    startAddRelationship: (member: RawFamilyMember) => void;
    startEditRelationships: (member: RawFamilyMember) => void;
    closeAll: () => void;
}

// An existing relationship as shown in the edit panel, captured from the
// anchor member's perspective. `forwardType` is the anchor's role toward the
// relative; `reverseType` is the relative's role toward the anchor.
interface EditableRelationship {
    relativeId: string;
    relativeName: string;
    forwardType: RelationTypes;
    reverseType: RelationTypes;
    visual: boolean;
}

// Relationship types whose inferred suggestions default to drawing a graph edge.
// Parent/child (and step/adoptive variants) + all spouse types.
// Excludes in-law types, siblings, cousins, grandparents, etc.
const DRAW_EDGE_DEFAULT_TYPES = new Set<string>([
    "Father", "Mother", "Father (step)", "Mother (step)", "Step father", "Step mother", "Adoptive father", "Adoptive mother",
    "Son", "Daughter", "Son (step)", "Daughter (step)", "Step son", "Step daughter", "Adopted son", "Adopted daughter",
    "Husband", "Wife", "Husband (divorced)", "Wife (divorced)", "Common-Law Partner", "Have shared kids"
]);

// A paired derived relationship shown as a single checkbox in the confirmation step.
// `rows` holds both directions (A→B and B→A) so they're always saved/skipped together.
interface DerivedRelationSuggestion {
    key: string;
    fromId: string;
    fromName: string;
    toId: string;
    toName: string;
    prettyType: string;
    rows: StoredRelation[];
    checked: boolean;
    forceDirectOnly: boolean; // true when every link in the inference path is direct — no step variants allowed
    drawEdge: boolean;        // whether a graph edge should be drawn for this relation
}

function buildRelationPair(
    anchorId: string,
    relativeId: string,
    forwardType: RelationTypes,
    reverseType: RelationTypes,
    visual: boolean
): FamilyRelation[] {
    // Both relationType and prettyType use the SAME convention: for a row
    // `from -> to` the stored type means "`to` is the [type] of `from`".
    // relationType drives generation/layout; prettyType drives the node label.
    // anchor -> relative row: "relative is reverseType of anchor"
    const forward: FamilyRelation = {
        id: buildEdgeId(anchorId, relativeId),
        from: anchorId,
        to: relativeId,
        relationType: visual ? reverseType : 'Relative',
        prettyType: reverseType,
        isInnerFamily: visual ? isInnerFamilyRelation(reverseType) : false
    };
    // relative -> anchor row: "anchor is forwardType of relative"
    const reverse: FamilyRelation = {
        id: buildEdgeId(relativeId, anchorId),
        from: relativeId,
        to: anchorId,
        relationType: visual ? forwardType : 'Relative',
        prettyType: forwardType,
        isInnerFamily: visual ? isInnerFamilyRelation(forwardType) : false
    };
    return [forward, reverse];
}

// Grouped <optgroup> options shared by the relationship dropdowns. When `sex`
// is provided only relationship types valid for that sex (plus gender-neutral
// ones) are shown.
const RelationTypeOptions: React.FC<{ sex?: RelativeSex }> = ({ sex }) => (
    <>
        {(sex ? relationGroupsForSex(sex) : RELATION_TYPE_GROUPS).map((group) => (
            <optgroup key={group.label} label={group.label}>
                {group.options.map((option) => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
            </optgroup>
        ))}
    </>
);

// Reads a stored relation's "real" type from its pretty label, falling back to
// the canonical relationType (and validating against the known list).
const readStoredType = (relation: { relationType: string; prettyType: string }): RelationTypes => {
    const candidate = relation.prettyType as RelationTypes;
    if (ALL_RELATION_TYPES.includes(candidate)) {
        return candidate;
    }
    const fromType = relation.relationType as RelationTypes;
    return ALL_RELATION_TYPES.includes(fromType) ? fromType : 'Relative';
};

// subtitles are stored as "Date of birth: <dob>\n<description>".
// Treat the literal string "undefined" (from older saved data) as empty.
const cleanValue = (value: string): string => (value === 'undefined' ? '' : value);

function parseSubtitles(subtitles: string | undefined): { dob: string; description: string } {
    if (!subtitles) {
        return { dob: '', description: '' };
    }
    const [first, ...rest] = subtitles.split('\n');
    const dobMatch = first.match(/^Date of birth:\s*(.*)$/);
    if (dobMatch) {
        return { dob: cleanValue(dobMatch[1].trim()), description: cleanValue(rest.join('\n')) };
    }
    return { dob: '', description: cleanValue(subtitles) };
}

const SlideInForm = React.forwardRef<SlideInFormHandle, SlideInFormProps>(({ members, relations = [], onChange }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isAddRelationshipOpen, setIsAddRelationshipOpen] = useState(false);
    const [isManageOpen, setIsManageOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isEditRelationshipsOpen, setIsEditRelationshipsOpen] = useState(false);
    const [isDerivedOpen, setIsDerivedOpen] = useState(false);
    const [pendingDerived, setPendingDerived] = useState<DerivedRelationSuggestion[]>([]);
    const postDerivedCallbackRef = React.useRef<(() => void) | null>(null);
    const [editingMember, setEditingMember] = useState<RawFamilyMember | null>(null);
    const [relationshipsMember, setRelationshipsMember] = useState<RawFamilyMember | null>(null);
    const [editableRelationships, setEditableRelationships] = useState<EditableRelationship[]>([]);
    const [selectedMember, setSelectedMember] = useState<RawFamilyMember | null>(null);
    const [missingFields, setMissingFields] = React.useState<string[]>([]);
    const [familyMembers, setFamilyMembers] = useState<RawFamilyMember[]>(members);
    const [relationshipFields, setRelationshipFields] = React.useState<{ name: string; type: string; label: string; complexOptions: RawFamilyMember[]; relationshipOptions: string[]; required: true; }[]>([]);
    const [relationshipCounter, setRelationshipCounter] = React.useState<number>(0);
    const panelsRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        setFamilyMembers(members);
    }, [members]);

    // Reset every right-side panel and its transient state.
    const closeAllPanels = React.useCallback(() => {
        // If the derived confirmation was open, run the pending callback (treat as skip).
        if (postDerivedCallbackRef.current) {
            postDerivedCallbackRef.current();
            postDerivedCallbackRef.current = null;
        }
        setIsDerivedOpen(false);
        setPendingDerived([]);
        setIsOpen(false);
        setIsAddRelationshipOpen(false);
        setIsManageOpen(false);
        setIsEditOpen(false);
        setIsEditRelationshipsOpen(false);
        setEditingMember(null);
        setRelationshipsMember(null);
        setEditableRelationships([]);
        setSelectedMember(null);
        setRelationshipFields([]);
        setRelationshipCounter(0);
    }, []);

    const anyPanelOpen = isOpen || isAddRelationshipOpen || isManageOpen || isEditOpen || isEditRelationshipsOpen || isDerivedOpen;

    // Close the panels when clicking anywhere outside of them.
    useEffect(() => {
        if (!anyPanelOpen) {
            return;
        }
        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (panelsRef.current && !panelsRef.current.contains(target)) {
                // Keep the derived confirmation open; the user must explicitly choose.
                if (isDerivedOpen) return;
                closeAllPanels();
            }
        };
        // Use the capture phase so reactflow (which stops propagation on some
        // pointer events) cannot prevent the outside-click from being detected.
        document.addEventListener('mousedown', handlePointerDown, true);
        return () => document.removeEventListener('mousedown', handlePointerDown, true);
    }, [anyPanelOpen, closeAllPanels, isDerivedOpen]);
    // Member ids that already have a direct relationship with the currently
    // selected member, so they can be hidden from the relationship picker.
    const existingRelatedIds = React.useMemo(() => {
        if (!selectedMember?.id) {
            return [];
        }
        const related = new Set<string>();
        relations.forEach((rel) => {
            if (rel.fromId === selectedMember.id) {
                related.add(rel.toId);
            } else if (rel.toId === selectedMember.id) {
                related.add(rel.fromId);
            }
        });
        return Array.from(related);
    }, [relations, selectedMember]);

    // After the main relationship(s) have been persisted, derive all implied
    // relationships and show them to the user for confirmation. If there are none,
    // or the user confirms/skips, `callback` is invoked (typically `onChange`).
    const checkAndShowDerived = React.useCallback(
        async (submittedRows: FamilyRelation[], callback: () => void) => {
            const sexById = new Map(familyMembers.map((m) => [m.id, m.data.sex] as const));
            const nameById = new Map(familyMembers.map((m) => [m.id, m.data.title] as const));
            const sexOf = (id: string): RelativeSex | undefined => sexById.get(id);
            const allRelations: StoredRelation[] = [
                ...relations.map((rel) => ({
                    fromId: rel.fromId,
                    toId: rel.toId,
                    relationType: rel.relationType,
                    prettyType: rel.prettyType,
                    isInnerFamily: rel.isInnerFamily
                })),
                ...submittedRows.map((row) => ({
                    fromId: row.from,
                    toId: row.to,
                    relationType: row.relationType,
                    prettyType: row.prettyType,
                    isInnerFamily: row.isInnerFamily
                }))
            ];
            const derived = deriveAllRelations(allRelations, sexOf);
            // Group forward + reverse rows into a single checkbox per pair so the
            // user doesn't see both "A is B's Grandson" and "B is A's Grandfather".
            const usedKeys = new Set<string>();
            const suggestions: DerivedRelationSuggestion[] = [];
            derived.forEach((row) => {
                const rowKey = `${row.fromId}-${row.toId}`;
                if (usedKeys.has(rowKey)) return;
                usedKeys.add(rowKey);
                const reverseKey = `${row.toId}-${row.fromId}`;
                const reverseRow = derived.find((r) => `${r.fromId}-${r.toId}` === reverseKey);
                if (reverseRow) usedKeys.add(reverseKey);
                suggestions.push({
                    key: rowKey,
                    fromId: row.fromId,
                    fromName: nameById.get(row.fromId) ?? row.fromId,
                    toId: row.toId,
                    toName: nameById.get(row.toId) ?? row.toId,
                    prettyType: row.prettyType,
                    rows: reverseRow ? [row, reverseRow] : [row],
                    checked: true,
                    forceDirectOnly: !row.pathHasStep,
                    drawEdge: DRAW_EDGE_DEFAULT_TYPES.has(row.prettyType)
                });
            });

            // Co-parent spouse suggestions: when a newly added parent joins a child who
            // already has another parent and those two parents have no existing link,
            // suggest a Husband/Wife relationship between them.
            for (const submitted of submittedRows) {
                const subType = (submitted.prettyType || submitted.relationType) as RelationTypes;
                if (!isRelationAParent(subType)) continue;
                const childId = submitted.from;
                const newParentId = submitted.to;

                const existingCoParents = allRelations
                    .filter((r) => {
                        const t = (r.prettyType || r.relationType) as RelationTypes;
                        // Exclude in-law types — "Father in law" passes isRelationAParent
                        // but is not a co-parent of the child.
                        const isInLaw = t === "Father in law" || t === "Mother in law" ||
                            t === "Step father in law" || t === "Step mother in law";
                        return r.fromId === childId && isRelationAParent(t) && !isInLaw && r.toId !== newParentId;
                    })
                    .map((r) => r.toId);

                for (const existingParentId of existingCoParents) {
                    const hasRelation = allRelations.some(
                        (r) =>
                            (r.fromId === newParentId && r.toId === existingParentId) ||
                            (r.fromId === existingParentId && r.toId === newParentId)
                    );
                    if (hasRelation) continue;

                    const pairKey = `${newParentId}-${existingParentId}`;
                    const reversePairKey = `${existingParentId}-${newParentId}`;
                    if (usedKeys.has(pairKey) || usedKeys.has(reversePairKey)) continue;
                    usedKeys.add(pairKey);
                    usedKeys.add(reversePairKey);

                    const existingParentSex = sexOf(existingParentId);
                    const newParentSex = sexOf(newParentId);
                    const spouseTypeForExisting: RelationTypes = existingParentSex === 'F' ? 'Wife' : 'Husband';
                    const spouseTypeForNew: RelationTypes = newParentSex === 'F' ? 'Wife' : 'Husband';

                    suggestions.push({
                        key: pairKey,
                        fromId: newParentId,
                        fromName: nameById.get(newParentId) ?? newParentId,
                        toId: existingParentId,
                        toName: nameById.get(existingParentId) ?? existingParentId,
                        prettyType: spouseTypeForExisting,
                        rows: [
                            {
                                fromId: newParentId,
                                toId: existingParentId,
                                relationType: spouseTypeForExisting,
                                prettyType: spouseTypeForExisting,
                                isInnerFamily: false
                            },
                            {
                                fromId: existingParentId,
                                toId: newParentId,
                                relationType: spouseTypeForNew,
                                prettyType: spouseTypeForNew,
                                isInnerFamily: false
                            }
                        ],
                        checked: true,
                        forceDirectOnly: false,
                        drawEdge: true
                    });
                }
            }

            if (suggestions.length === 0) {
                callback();
                return;
            }
            setPendingDerived(suggestions);
            postDerivedCallbackRef.current = callback;
            setIsDerivedOpen(true);
        },
        [familyMembers, relations]
    );

    const handleConfirmDerived = React.useCallback(async () => {
        const toSave = pendingDerived
            .filter((s) => s.checked)
            .flatMap((s) =>
                s.rows.map((r) => {
                    if (!s.drawEdge) return r;
                    // When drawing a graph edge, upgrade relationType from "Relative" to
                    // the actual canonical type so buildParentsChildrenStructs and
                    // buildCouplesEdges pick it up for visual rendering.
                    const actualType = (ALL_RELATION_TYPES as string[]).includes(r.prettyType)
                        ? (r.prettyType as RelationTypes)
                        : ('Relative' as RelationTypes);
                    return { ...r, relationType: actualType, isInnerFamily: isInnerFamilyRelation(actualType) };
                })
            );
        if (toSave.length > 0) {
            await submitRelationships(
                toSave.map((r) => ({
                    id: `${r.fromId}-${r.toId}`,
                    from: r.fromId,
                    to: r.toId,
                    relationType: r.relationType,
                    prettyType: r.prettyType,
                    isInnerFamily: r.isInnerFamily
                }))
            );
        }
        setIsDerivedOpen(false);
        setPendingDerived([]);
        const cb = postDerivedCallbackRef.current;
        postDerivedCallbackRef.current = null;
        cb?.();
    }, [pendingDerived]);

    const handleSkipDerived = React.useCallback(() => {
        setIsDerivedOpen(false);
        setPendingDerived([]);
        const cb = postDerivedCallbackRef.current;
        postDerivedCallbackRef.current = null;
        cb?.();
    }, []);

    // When the user picks a different variant type (e.g. Uncle → Uncle (step))
    // in the suggestion panel, update both the primary row and the paired reverse
    // row in real time so they stay consistent. Also cascades: when a son/daughter
    // relationship flips to step, in-law and grandchild suggestions update too.
    const handleSuggestionTypeChange = React.useCallback(
        (key: string, newPrimaryType: string) => {
            const sexById = new Map(familyMembers.map((m) => [m.id, m.data.sex] as const));

            const isStepType = (t: string) => /\(step\)/i.test(t) || /^step /i.test(t);
            const newIsStep = isStepType(newPrimaryType);

            // Variant families for detecting child-type changes.
            const sonVars = getVariantFamily("Son") as string[];
            const daughterVars = getVariantFamily("Daughter") as string[];
            const fatherVars = getVariantFamily("Father") as string[];
            const motherVars = getVariantFamily("Mother") as string[];
            const isChildVariant = (t: string) => sonVars.includes(t) || daughterVars.includes(t);

            // Build spouses map for in-law cascade.
            const spousesOf = buildSpousesMap(relations);

            // Build childrenOf map for grandchild cascade.
            const childrenOf = new Map<string, Set<string>>();
            relations.forEach((r) => {
                const t = r.relationType as string;
                if (fatherVars.includes(t) || motherVars.includes(t)) {
                    // r.toId is the parent of r.fromId
                    if (!childrenOf.has(r.toId)) childrenOf.set(r.toId, new Set());
                    childrenOf.get(r.toId)!.add(r.fromId);
                } else if (sonVars.includes(t) || daughterVars.includes(t)) {
                    // r.toId is the child of r.fromId
                    if (!childrenOf.has(r.fromId)) childrenOf.set(r.fromId, new Set());
                    childrenOf.get(r.fromId)!.add(r.toId);
                }
            });

            // BFS to collect all descendants of a person (excluding self).
            const getDescendants = (personId: string): Set<string> => {
                const result = new Set<string>();
                const queue = Array.from(childrenOf.get(personId) ?? []);
                while (queue.length > 0) {
                    const id = queue.shift()!;
                    if (result.has(id)) continue;
                    result.add(id);
                    Array.from(childrenOf.get(id) ?? []).forEach((c) => queue.push(c));
                }
                return result;
            };

            // Apply a new prettyType to a suggestion and recompute its reverse row.
            const applyTypeChange = (s: DerivedRelationSuggestion, newType: string): DerivedRelationSuggestion => {
                const newRows = s.rows.map((row) => {
                    const isPrimary = `${row.fromId}-${row.toId}` === s.key;
                    if (isPrimary) return { ...row, prettyType: newType };
                    const reverseSex = sexById.get(row.toId) ?? "M";
                    const newInverse =
                        getInverseRelationType(newType as RelationTypes, reverseSex as RelativeSex) ?? newType;
                    return { ...row, prettyType: newInverse };
                });
                return { ...s, prettyType: newType, rows: newRows, drawEdge: DRAW_EDGE_DEFAULT_TYPES.has(newType) };
            };

            // Toggle step on/off for a suggestion using its variant family.
            const cascadeStep = (s: DerivedRelationSuggestion, makeStep: boolean): DerivedRelationSuggestion => {
                const variants = getVariantFamily(s.prettyType) as string[];
                if (variants.length <= 1) return s;
                const newType = makeStep
                    ? variants.find((v) => isStepType(v)) ?? s.prettyType
                    : variants.find((v) => !isStepType(v)) ?? s.prettyType;
                return applyTypeChange(s, newType);
            };

            setPendingDerived((prev) => {
                const changed = prev.find((s) => s.key === key);
                const afterPrimary = prev.map((s) => (s.key === key ? applyTypeChange(s, newPrimaryType) : s));

                // Only cascade when a son/daughter type changes.
                if (!changed || !isChildVariant(newPrimaryType)) return afterPrimary;

                const childId = changed.toId;   // e.g. "sautil"
                const parentId = changed.fromId; // e.g. "maimun"
                const childSpouses = spousesOf.get(childId) ?? new Set<string>();
                const childDescendants = getDescendants(childId);

                return afterPrimary.map((s) => {
                    if (s.key === key || s.fromId !== parentId) return s;
                    // In-law: toId is a spouse of the child.
                    if (childSpouses.has(s.toId)) return cascadeStep(s, newIsStep);
                    // Grandchild/descendant: toId is a descendant of the child.
                    if (childDescendants.has(s.toId)) return cascadeStep(s, newIsStep);
                    return s;
                });
            });
        },
        [familyMembers, relations]
    );

    const handleOpen = () => {
        closeAllPanels();
        setIsOpen(true);
    };
    const handleClose = () => setIsOpen(false);
    const handleOpenRel = () => setIsAddRelationshipOpen(true);
    const handleCloseRel = () => {
        setIsAddRelationshipOpen(false);
        setRelationshipFields([]);
        setRelationshipCounter(0);
        setSelectedMember(null);
    };
    const handleSubmitMember = async (formData: any) => {
        const member: RawFamilyMember = {
            data: {
                sex: formData.gender === "Male" ? "M" : "F",
                subtitles: `Date of birth: ${formData.dob ?? ''}\n${formData.description ?? ''}`,
                title: formData.title,
            }
        }
        handleClose();
        const newId = await submitMember(member);
        if (!newId) {
            console.error('Failed to add family member');
            return;
        }
        const createdMember: RawFamilyMember = { ...member, id: newId.toString() };
        setSelectedMember(createdMember);
        // Make sure the new member is selectable when adding relationships.
        setFamilyMembers((prev) => [...prev, createdMember]);
        addRelationship();
        handleOpenRel();
    };

    const addRelationship = () => {
        setRelationshipFields([...relationshipFields, {
            name: `relationship`,
            type: 'select', label: '',
            complexOptions: familyMembers,
            relationshipOptions: ['Parent', 'Child', 'Spouse'],
            required: true
        }]);
        setRelationshipCounter(relationshipCounter + 1);
    }

    const removeRelationship = () => {
        setRelationshipFields(relationshipFields.slice(0, relationshipFields.length - 1));
        setRelationshipCounter(relationshipCounter - 1);
    }

    const handleSubmitRelationship = async (relationships: FamilyRelation[]) => {
        if (relationships.length > 0) {
            await submitRelationships(relationships);
        }
        setRelationshipFields([]);
        setRelationshipCounter(0);
        setSelectedMember(null);
        handleCloseRel();
        if (relationships.length > 0) {
            await checkAndShowDerived(relationships, () => onChange?.());
        } else {
            onChange?.();
        }
    }

    const handleOpenManage = () => {
        closeAllPanels();
        setIsManageOpen(true);
    };
    const handleCloseManage = () => setIsManageOpen(false);

    const handleStartEdit = (member: RawFamilyMember) => {
        closeAllPanels();
        setEditingMember(member);
        setIsEditOpen(true);
    };

    const handleStartAddRelationship = (member: RawFamilyMember) => {
        closeAllPanels();
        setSelectedMember(member);
        // Seed a single empty relationship row for the selected member.
        setRelationshipFields([{
            name: `relationship`,
            type: 'select', label: '',
            complexOptions: familyMembers,
            relationshipOptions: ['Parent', 'Child', 'Spouse'],
            required: true
        }]);
        setRelationshipCounter(1);
        handleOpenRel();
    };

    const handleStartEditRelationships = (member: RawFamilyMember) => {
        closeAllPanels();
        if (!member.id) {
            return;
        }
        const memberNameById = new Map(familyMembers.map((m) => [m.id, m.data.title] as const));
        const memberSexById = new Map(familyMembers.map((m) => [m.id, m.data.sex] as const));
        // Storage convention: a row `from -> to` describes the destination, so:
        //  - anchor -> relative row carries the relative's role (reverseType)
        //  - relative -> anchor row carries the anchor's role (forwardType)
        // Map the anchor -> relative rows (fromId === anchor) by the relative id
        // so we can read the anchor's role (forwardType) from the reverse rows.
        const anchorRoleByRelativeId = new Map(
            relations
                .filter((relation) => relation.toId === member.id)
                .map((relation) => [relation.fromId, relation] as const)
        );
        const editable: EditableRelationship[] = relations
            .filter((relation) => relation.fromId === member.id)
            .map((relation) => {
                // This (anchor -> relative) row describes the relative.
                const reverseType = readStoredType(relation);
                const anchorRoleRelation = anchorRoleByRelativeId.get(relation.toId);
                const relativeSex = memberSexById.get(relation.toId) ?? 'M';
                const forwardType = anchorRoleRelation
                    ? readStoredType(anchorRoleRelation)
                    : getInverseRelationType(reverseType, relativeSex) ?? 'Relative';
                return {
                    relativeId: relation.toId,
                    relativeName: memberNameById.get(relation.toId) ?? relation.toId,
                    forwardType,
                    reverseType,
                    visual: relation.relationType !== 'Relative'
                };
            });
        setRelationshipsMember(member);
        setEditableRelationships(editable);
        setIsEditRelationshipsOpen(true);
    };

    const handleEditableTypeChange = (relativeId: string, forwardType: RelationTypes) => {
        setEditableRelationships((prev) =>
            prev.map((rel) => (rel.relativeId === relativeId ? { ...rel, forwardType } : rel))
        );
    };

    const handleEditableReverseTypeChange = (relativeId: string, reverseType: RelationTypes) => {
        const anchorSex = relationshipsMember?.data.sex ?? 'M';
        setEditableRelationships((prev) =>
            prev.map((rel) => {
                if (rel.relativeId !== relativeId) {
                    return rel;
                }
                // Parent/Child auto-derive the anchor's role from the relative's
                // role; otherwise keep the current forward type.
                const forwardType = isAutoInverseRelation(reverseType)
                    ? getInverseRelationType(reverseType, anchorSex) ?? rel.forwardType
                    : rel.forwardType;
                return { ...rel, reverseType, forwardType };
            })
        );
    };

    const handleEditableVisualChange = (relativeId: string, visual: boolean) => {
        setEditableRelationships((prev) =>
            prev.map((rel) => (rel.relativeId === relativeId ? { ...rel, visual } : rel))
        );
    };

    const handleDeleteRelationship = async (relativeId: string) => {
        if (!relationshipsMember?.id) {
            return;
        }
        const confirmed = window.confirm('Remove this relationship?');
        if (!confirmed) {
            return;
        }
        await deleteRelationshipApi(relationshipsMember.id, relativeId);
        setEditableRelationships((prev) => prev.filter((rel) => rel.relativeId !== relativeId));
        onChange?.();
    };

    const handleSaveRelationships = async () => {
        if (!relationshipsMember?.id) {
            return;
        }
        const anchorId = relationshipsMember.id;
        const submitted: FamilyRelation[] = [];
        for (const rel of editableRelationships) {
            await deleteRelationshipApi(anchorId, rel.relativeId);
            const pair = buildRelationPair(anchorId, rel.relativeId, rel.forwardType, rel.reverseType, rel.visual);
            await submitRelationships(pair);
            submitted.push(...pair);
        }
        setIsEditRelationshipsOpen(false);
        setRelationshipsMember(null);
        setEditableRelationships([]);
        await checkAndShowDerived(submitted, () => onChange?.());
    };

    const handleCancelEditRelationships = () => {
        setIsEditRelationshipsOpen(false);
        setRelationshipsMember(null);
        setEditableRelationships([]);
        setIsManageOpen(true);
    };

    const handleCancelEdit = () => {
        setEditingMember(null);
        setIsEditOpen(false);
        setIsManageOpen(true);
    };

    const handleSubmitEdit = async (formData: any) => {
        if (!editingMember?.id) {
            return;
        }
        const updated: RawFamilyMember = {
            id: editingMember.id,
            data: {
                ...editingMember.data,
                sex: formData.gender === 'Male' ? 'M' : 'F',
                subtitles: `Date of birth: ${formData.dob ?? ''}\n${formData.description ?? ''}`,
                title: formData.title,
            }
        };
        const ok = await updateMember(editingMember.id, updated);
        setEditingMember(null);
        setIsEditOpen(false);
        if (ok) {
            onChange?.();
        }
    };

    const handleDeleteMember = async (member: RawFamilyMember) => {
        if (!member.id) {
            return;
        }
        const confirmed = window.confirm(`Delete ${member.data.title}? This also removes their relationships.`);
        if (!confirmed) {
            return;
        }
        // Remove every relationship that touches this member, then the member.
        const touching = relations.filter(
            (relation) => relation.fromId === member.id || relation.toId === member.id
        );
        for (const relation of touching) {
            await deleteRelationshipApi(relation.fromId, relation.toId);
        }
        await removeMember(member.id);
        onChange?.();
    };

    // Memoize so the reference is stable across renders; otherwise the Form's
    // initialValues effect re-runs every render and wipes out user input.
    const editInitialValues = React.useMemo(() => {
        if (!editingMember) {
            return undefined;
        }
        const parsed = parseSubtitles(editingMember.data.subtitles);
        return {
            title: editingMember.data.title,
            gender: editingMember.data.sex === 'M' ? 'Male' : 'Female',
            dob: parsed.dob,
            description: parsed.description,
        };
    }, [editingMember]);

    React.useImperativeHandle(ref, () => ({
        startEdit: (member: RawFamilyMember) => handleStartEdit(member),
        startAddRelationship: (member: RawFamilyMember) => handleStartAddRelationship(member),
        startEditRelationships: (member: RawFamilyMember) => handleStartEditRelationships(member),
        closeAll: () => closeAllPanels(),
    }));

    return (
        <div ref={panelsRef} style={{ textAlign: 'left', display: 'flex', gap: '8px' }}>
            <AppButton onClick={handleOpen} label={'Add Family Member'} primary={false} />
            <AppButton onClick={handleOpenManage} label={'Manage Members'} primary={false} />
            <div className={`slide-in-form ${isManageOpen ? 'open' : ''}`} style={{ display: 'flex', flexDirection: 'column', padding: '10px', overflowY: 'auto' }}>
                <button type="button" className="slide-in-close" aria-label="Close" onClick={closeAllPanels}>×</button>
                <div className="manage-panel">
                    <h2>Manage Members</h2>
                    {familyMembers.length === 0 && <p>No members yet.</p>}
                    <ul className="manage-list">
                        {familyMembers.map((member) => (
                            <li key={member.id} className="manage-list-item">
                                <span className="manage-list-name">{member.data.title}</span>
                                <span className="manage-list-actions">
                                    <AppButton label={'Edit'} onClick={() => handleStartEdit(member)} primary={true} />
                                    <AppButton label={'Add Relationship'} onClick={() => handleStartAddRelationship(member)} primary={false} />
                                    <AppButton label={'Edit Relationships'} onClick={() => handleStartEditRelationships(member)} primary={false} />
                                    <AppButton label={'Delete'} onClick={() => handleDeleteMember(member)} />
                                </span>
                            </li>
                        ))}
                    </ul>
                    <div className="form-group">
                        <AppButton label={'Close'} onClick={handleCloseManage} />
                    </div>
                </div>
            </div>
            <div className={`slide-in-form ${isEditOpen ? 'open' : ''}`} style={{ display: 'flex', padding: '10px' }}>
                <button type="button" className="slide-in-close" aria-label="Close" onClick={closeAllPanels}>×</button>
                {editingMember && (
                    <Form
                        formTitle={`Edit ${editingMember.data.title}`}
                        submitText={'Save'}
                        fields={[
                            { name: 'title', type: 'text', label: 'Name', required: true },
                            { name: 'gender', type: 'select', label: 'Gender', options: ['Male', 'Female'], required: true },
                            { name: 'dob', type: 'date', label: 'Date of birth' },
                            { name: 'description', type: 'textarea', label: 'Additional Info' },
                        ]}
                        initialValues={editInitialValues}
                        onSubmit={handleSubmitEdit}
                        onCancel={handleCancelEdit}
                        missingFields={missingFields}
                        setMissingFields={setMissingFields}
                    />
                )}
            </div>
            <div className={`slide-in-form ${isOpen ? 'open' : ''}`} style={{ display: 'flex', padding: '10px' }}>
                <button type="button" className="slide-in-close" aria-label="Close" onClick={closeAllPanels}>×</button>
                <Form
                    formTitle={'Add Family Member'}
                    fields={[
                        { name: 'title', type: 'text', label: 'Name', required: true },
                        { name: 'gender', type: 'select', label: 'Gender', options: ['Male', 'Female'], required: true },
                        { name: 'dob', type: 'date', label: 'Date of birth' },
                        { name: 'description', type: 'textarea', label: 'Additional Info' },
                    ]}
                    onSubmit={handleSubmitMember}
                    onCancel={handleClose}
                    missingFields={missingFields}
                    setMissingFields={setMissingFields}
                />
            </div>
            <div className={`slide-in-form ${isAddRelationshipOpen ? 'open' : ''}`} style={{ display: 'flex', padding: '10px' }}>
                <button type="button" className="slide-in-close" aria-label="Close" onClick={closeAllPanels}>×</button>
                <Form
                    formTitle={`Add Relationship(s) for ${selectedMember?.data.title}`}
                    cancelText='Skip'
                    fields={relationshipFields}
                    anchorMemberId={selectedMember?.id}
                    anchorMemberSex={selectedMember?.data.sex}
                    existingRelatedIds={existingRelatedIds}
                    onSubmitRelationship={handleSubmitRelationship}
                    onCancel={handleCloseRel}
                    missingFields={missingFields}
                    setMissingFields={setMissingFields}
                    setFamilyMembers={setFamilyMembers}
                    addRelationship={addRelationship}
                    removeRelationship={removeRelationship}
                />
            </div>
            <div className={`slide-in-form ${isEditRelationshipsOpen ? 'open' : ''}`} style={{ display: 'flex', flexDirection: 'column', padding: '10px', overflowY: 'auto' }}>
                <button type="button" className="slide-in-close" aria-label="Close" onClick={closeAllPanels}>×</button>
                <h2>Edit Relationships for {relationshipsMember?.data.title}</h2>
                {editableRelationships.length === 0 && <p>No relationships yet.</p>}
                <ul className="edit-relationships-list">
                    {editableRelationships.map((rel) => (
                        <li key={rel.relativeId} className="edit-relationship-item">
                            <span className="edit-relationship-name">{rel.relativeName}</span>
                            <div className="edit-relationship-controls">
                                <label className="relationship-direction-label">
                                    {rel.relativeName} is {relationshipsMember?.data.title}'s…
                                </label>
                                <select
                                    className="form-input"
                                    value={rel.reverseType}
                                    onChange={(e) =>
                                        handleEditableReverseTypeChange(rel.relativeId, e.target.value as RelationTypes)
                                    }
                                >
                                    <RelationTypeOptions
                                        sex={familyMembers.find((m) => m.id === rel.relativeId)?.data.sex}
                                    />
                                </select>
                                <label className="relationship-direction-label">
                                    {relationshipsMember?.data.title} is their…
                                </label>
                                <select
                                    className="form-input"
                                    value={rel.forwardType}
                                    disabled={isAutoInverseRelation(rel.reverseType)}
                                    onChange={(e) =>
                                        handleEditableTypeChange(rel.relativeId, e.target.value as RelationTypes)
                                    }
                                >
                                    <RelationTypeOptions sex={relationshipsMember?.data.sex} />
                                </select>
                                <label className="relationship-visual-toggle">
                                    <input
                                        type="checkbox"
                                        checked={rel.visual}
                                        onChange={(e) =>
                                            handleEditableVisualChange(rel.relativeId, e.target.checked)
                                        }
                                    />
                                    Show edge in graph
                                </label>
                                <AppButton label={'Remove'} onClick={() => handleDeleteRelationship(rel.relativeId)} />
                            </div>
                        </li>
                    ))}
                </ul>
                <div className="form-group">
                    {editableRelationships.length > 0 && (
                        <AppButton label={'Save'} onClick={handleSaveRelationships} primary={true} />
                    )}
                    <AppButton label={'Close'} onClick={handleCancelEditRelationships} />
                </div>
            </div>
            <div className={`slide-in-form ${isDerivedOpen ? 'open' : ''}`} style={{ display: 'flex', flexDirection: 'column', padding: '10px', overflowY: 'auto' }}>
                <h2>Suggested Relationships</h2>
                <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '12px' }}>
                    Based on the relationship you just added, these implied relationships were found.
                    Uncheck any you'd like to skip.
                </p>
                <ul className="derived-relations-list" style={{ listStyle: 'none', padding: 0, margin: '0 0 12px 0' }}>
                    {pendingDerived.map((suggestion) => {
                        const variants = getVariantFamily(suggestion.prettyType);
                        const toSex = familyMembers.find((m) => m.id === suggestion.toId)?.data.sex;
                        const sexFiltered = variants.length > 1
                            ? filterGroupsBySex([{ label: '', options: variants }], toSex)[0]?.options ?? variants
                            : variants;
                        // Drop step variants when the entire path is made of direct links.
                        const isStepVariant = (v: string) => /\(step\)/i.test(v) || /^step /i.test(v);
                        const filteredVariants = suggestion.forceDirectOnly
                            ? sexFiltered.filter((v) => !isStepVariant(v))
                            : sexFiltered;
                        return (
                            <li key={suggestion.key} style={{ padding: '6px 0', borderBottom: '1px solid #eee' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <input
                                        type="checkbox"
                                        checked={suggestion.checked}
                                        onChange={(e) =>
                                            setPendingDerived((prev) =>
                                                prev.map((s) =>
                                                    s.key === suggestion.key ? { ...s, checked: e.target.checked } : s
                                                )
                                            )
                                        }
                                        style={{ flexShrink: 0 }}
                                    />
                                    <span>
                                        <strong>{suggestion.toName}</strong> is <strong>{suggestion.fromName}</strong>'s
                                    </span>
                                    {filteredVariants.length > 1 ? (
                                        <select
                                            className="form-input"
                                            value={suggestion.prettyType}
                                            style={{ width: 'auto', minWidth: '140px' }}
                                            onChange={(e) => handleSuggestionTypeChange(suggestion.key, e.target.value)}
                                        >
                                            {filteredVariants.map((v) => (
                                                <option key={v} value={v}>{v}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <em>{suggestion.prettyType}</em>
                                    )}
                                </div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px', marginLeft: '24px', fontSize: '0.8rem', color: '#555', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={suggestion.drawEdge}
                                        onChange={(e) =>
                                            setPendingDerived((prev) =>
                                                prev.map((s) =>
                                                    s.key === suggestion.key ? { ...s, drawEdge: e.target.checked } : s
                                                )
                                            )
                                        }
                                    />
                                    Show in graph
                                </label>
                            </li>
                        );
                    })}
                </ul>
                <div className="form-group">
                    <AppButton
                        label={`Save Selected (${pendingDerived.filter((s) => s.checked).length})`}
                        onClick={handleConfirmDerived}
                        primary={true}
                    />
                    <AppButton label={'Skip All'} onClick={handleSkipDerived} />
                </div>
            </div>
        </div>
    );
});

export default SlideInForm;