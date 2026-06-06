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
    deriveTransitiveRelations,
    StoredRelation,
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

    const anyPanelOpen = isOpen || isAddRelationshipOpen || isManageOpen || isEditOpen || isEditRelationshipsOpen;

    // Close the panels when clicking anywhere outside of them.
    useEffect(() => {
        if (!anyPanelOpen) {
            return;
        }
        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (panelsRef.current && !panelsRef.current.contains(target)) {
                closeAllPanels();
            }
        };
        // Use the capture phase so reactflow (which stops propagation on some
        // pointer events) cannot prevent the outside-click from being detected.
        document.addEventListener('mousedown', handlePointerDown, true);
        return () => document.removeEventListener('mousedown', handlePointerDown, true);
    }, [anyPanelOpen, closeAllPanels]);
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

    // After the explicit parent/child link(s) have been persisted, recompute
    // the implied generational relationships (grandparent/grandchild and
    // deeper, with a "Great-" prefix per extra generation) and persist any new
    // label-only rows. `submittedRows` are the rows just sent to the backend
    // (in the in-memory `from`/`to` shape).
    const persistDerivedRelations = React.useCallback(
        async (submittedRows: FamilyRelation[]) => {
            const sexById = new Map(familyMembers.map((m) => [m.id, m.data.sex] as const));
            const sexOf = (id: string): RelativeSex | undefined => sexById.get(id);
            // Build the up-to-date relationship set: existing rows plus the
            // rows just submitted (normalized to the persisted fromId/toId shape).
            const submittedStored: StoredRelation[] = submittedRows.map((row) => ({
                fromId: row.from,
                toId: row.to,
                relationType: row.relationType,
                prettyType: row.prettyType,
                isInnerFamily: row.isInnerFamily
            }));
            const allRelations: StoredRelation[] = [
                ...relations.map((rel) => ({
                    fromId: rel.fromId,
                    toId: rel.toId,
                    relationType: rel.relationType,
                    prettyType: rel.prettyType,
                    isInnerFamily: rel.isInnerFamily
                })),
                ...submittedStored
            ];
            const derived = deriveTransitiveRelations(allRelations, sexOf);
            if (derived.length === 0) {
                return;
            }
            await submitRelationships(
                derived.map((row) => ({
                    id: `${row.fromId}-${row.toId}`,
                    from: row.fromId,
                    to: row.toId,
                    relationType: row.relationType,
                    prettyType: row.prettyType,
                    isInnerFamily: row.isInnerFamily
                }))
            );
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
            await persistDerivedRelations(relationships);
        }
        setRelationshipFields([]);
        setRelationshipCounter(0);
        setSelectedMember(null);
        handleCloseRel();
        onChange?.();
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
        // Re-write each relationship: remove the existing pair (both
        // directions) and re-add it with the chosen type/visibility.
        const submitted: FamilyRelation[] = [];
        for (const rel of editableRelationships) {
            await deleteRelationshipApi(anchorId, rel.relativeId);
            const pair = buildRelationPair(anchorId, rel.relativeId, rel.forwardType, rel.reverseType, rel.visual);
            await submitRelationships(pair);
            submitted.push(...pair);
        }
        await persistDerivedRelations(submitted);
        setIsEditRelationshipsOpen(false);
        setRelationshipsMember(null);
        setEditableRelationships([]);
        onChange?.();
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
        </div>
    );
});

export default SlideInForm;