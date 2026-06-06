import React from 'react';
import './Form.css';
import AppButton from './AppButton';
import { RawFamilyMember } from '../utils';
import { FamilyRelation, RelationTypes } from '../tree/types';
import { buildEdgeId } from '../tree/buildEdges';
import {
    RELATION_TYPE_GROUPS,
    relationGroupsForSex,
    getInverseRelationType,
    isAutoInverseRelation,
    isInnerFamilyRelation,
    RelativeSex
} from '../tree/utils';

interface Field {
    options?: string[];
    complexOptions?: RawFamilyMember[];
    relationshipOptions?: string[];
    name: string;
    type: string;
    label: string;
    required?: boolean;
}

// When a relationship row only has a relative chosen, assume the anchor is the
// relative's child. This keeps the common "add a member under a parent" flow
// working even if the type dropdown is never opened. The gendered default is
// derived from the anchor member's sex (a male anchor is a "Son", etc.).
const defaultForwardRelationType = (anchorSex: 'M' | 'F' | undefined): RelationTypes =>
    anchorSex === 'F' ? 'Daughter' : 'Son';

interface FormProps {
    formTitle: string;
    cancelText?: string;
    submitText?: string;
    fields: Field[];
    /** Pre-populate the form (used when editing an existing member). */
    initialValues?: { [key: string]: any };
    /** Id of the member these relationships are being created for. */
    anchorMemberId?: string;
    /** Sex of the anchor member, used to gender the default relationship type. */
    anchorMemberSex?: 'M' | 'F';
    /** Ids of members that already have a direct relationship with the anchor. */
    existingRelatedIds?: string[];
    onSubmit?: (formData: { [key: string]: any }) => void;
    onSubmitRelationship?: (relationships: FamilyRelation[]) => void;
    onCancel: () => void;
    missingFields: string[];
    setMissingFields: (fields: string[]) => void;
    setFamilyMembers?: (members: RawFamilyMember[]) => void;
    addRelationship?: () => void;
    removeRelationship?: () => void;
}

/**
 * Builds a relationship and its reverse between the anchor member and the
 * selected relative, storing both directions so the tree layout can traverse
 * either way.
 *
 * - `forwardType` describes how the anchor relates to the relative
 *   ("anchor is the [forwardType] of relative").
 * - `reverseType` describes how the relative relates to the anchor
 *   ("relative is the [reverseType] of anchor"). For obvious relationships
 *   (parent/child) the caller passes the auto-derived inverse; otherwise it is
 *   whatever the user chose.
 *
 * Storage conventions differ between the two stored fields:
 *  - `relationType` (used by the generation/layout logic) means
 *    "from is the [type] of to".
 *  - `prettyType` (used for the node label shown to the user) means
 *    "to is the [type] of from".
 * They are therefore inverses of each other on the same row.
 *
 * When `visual` is false a direction still surfaces its human readable label on
 * the node, but its canonical relationType is forced to "Relative" so the tree
 * layout never draws a visual edge for it.
 */
export function buildRelationPair(
    anchorId: string,
    relativeId: string,
    forwardType: RelationTypes,
    reverseType: RelationTypes,
    visual: boolean
): FamilyRelation[] {
    // Both relationType and prettyType use the SAME convention here:
    // for a row `from -> to`, the stored type means "`to` is the [type] of `from`".
    // relationType drives generation/layout (buildGenerations, etc.); prettyType
    // drives the displayed node label. Keeping them aligned matches the existing
    // data and the layout engine's expectations.
    //
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

/**
 * Resolves the derived (other party's) relationship type for a row given the
 * primary type the user picked. Obvious relationships (parent/child) always use
 * the auto-derived inverse; everything else uses the type the user selected
 * (falling back to a canonical inverse when one exists, otherwise undefined so
 * the row is treated as incomplete). `otherSex` is the sex of the party the
 * derived type describes (it genders the inverse).
 */
function resolveReverseType(
    primaryType: RelationTypes,
    chosenDerived: RelationTypes | undefined,
    otherSex: 'M' | 'F'
): RelationTypes | undefined {
    if (isAutoInverseRelation(primaryType)) {
        return getInverseRelationType(primaryType, otherSex);
    }
    if (chosenDerived) {
        return chosenDerived;
    }
    return getInverseRelationType(primaryType, otherSex);
}

/**
 * Renders the grouped <optgroup> options shared by every relation dropdown.
 * When `sex` is provided only relationship types valid for that sex (plus
 * gender-neutral ones) are shown.
 */
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

export const Form: React.FC<FormProps> = (
    {
        formTitle,
        cancelText,
        submitText,
        fields,
        initialValues,
        anchorMemberId,
        anchorMemberSex,
        existingRelatedIds,
        onSubmit,
        onSubmitRelationship,
        onCancel,
        missingFields,
        setMissingFields,
        setFamilyMembers,
        addRelationship,
        removeRelationship
    }) => {
    const [formData, setFormData] = React.useState<{ [key: string]: any }>(initialValues || {});
    const [missingBanner, setMissingBanner] = React.useState(false);

    // Re-sync the form when the initial values change (e.g. editing a
    // different member without remounting the component).
    React.useEffect(() => {
        setFormData(initialValues || {});
    }, [initialValues]);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        let preMissingFields: string[] = [];
        setMissingBanner(false);

        // Check for required fields
        for (const field of fields) {
            if (field.required && !formData[field.name]) {
                preMissingFields = [...preMissingFields, field.name];
            }
        }

        if (preMissingFields.length) {
            setMissingFields(preMissingFields);
            setMissingBanner(true);
            return;
        }

        const finalFormData = { ...formData };
        setFormData({});
        onSubmit?.(finalFormData);
    };

    const handleSubmitRelationship = (e: React.FormEvent) => {
        e.preventDefault();
        setMissingBanner(false);

        if (!anchorMemberId) {
            console.error('No member to attach relationships to');
            onSubmitRelationship?.([]);
            return;
        }

        const relationships: FamilyRelation[] = [];
        let hasIncompleteRow = false;

        fields.forEach((field, index) => {
            if (!field.complexOptions) return;
            const relativeId = formData[`relationship-${index}`];
            // The relative's sex resolves gendered defaults and auto-inverse
            // types (e.g. a Son's inverse is Father for a male anchor, Mother
            // for a female anchor).
            const relativeSex = field.complexOptions.find((m) => m.id === relativeId)?.data.sex ?? 'M';
            // The relative's role toward the anchor is the primary input and
            // defaults to "Son"/"Daughter" (by the relative's sex) so a row with
            // only a relative chosen still forms a valid relationship instead of
            // being silently dropped.
            const reverseType = (formData[`relationshipReverseType-${index}`] as RelationTypes | undefined)
                ?? (relativeId ? defaultForwardRelationType(relativeSex) : undefined);
            // Visual edge toggle defaults to on when the row hasn't touched it.
            const visual = formData[`relationshipVisual-${index}`] !== false;

            // A row that's been left entirely blank is simply ignored.
            if (!relativeId && !reverseType) return;

            // A partially filled row is invalid.
            if (!relativeId || !reverseType) {
                hasIncompleteRow = true;
                return;
            }

            // For obvious relationships the anchor's role is auto-derived;
            // otherwise the user must have chosen a forward type explicitly.
            const forwardType = resolveReverseType(
                reverseType,
                formData[`relationshipType-${index}`],
                anchorMemberSex ?? 'M'
            );
            if (!forwardType) {
                hasIncompleteRow = true;
                return;
            }

            relationships.push(...buildRelationPair(anchorMemberId, relativeId, forwardType, reverseType, visual));
        });

        if (hasIncompleteRow) {
            setMissingBanner(true);
            return;
        }

        setFormData({});
        onSubmitRelationship?.(relationships);
    };

    const handleCancel = (e: React.MouseEvent) => {
        e.preventDefault();
        setFormData({});
        setMissingFields([]);
        setMissingBanner(false);
        console.log(formData);
        onCancel();
    };

    const handleAddRelationship = (e: React.MouseEvent) => {
        e.preventDefault();
        addRelationship?.();
    }

    const handleRemoveRelationship = (e: React.MouseEvent) => {
        e.preventDefault();
        removeRelationship?.();
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setMissingFields(missingFields.filter((field) => field !== name));
        setMissingBanner(false);
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (value === 'Please Select') {
            return;
        }
        setMissingFields(missingFields.filter((field) => field !== name));
        setMissingBanner(false);
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setMissingBanner(false);
        setFormData({
            ...formData,
            [name]: checked,
        });
    };

    const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setMissingFields(missingFields.filter((field) => field !== name));
        setMissingBanner(false);
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    const handleTextAreaKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    };

    // Members that are eligible to be picked at all: not the anchor and not
    // already directly related to the anchor.
    const baseSelectableOptions = (fields[0]?.complexOptions ?? [])
        .filter((option) => option.id !== anchorMemberId)
        .filter((option) => !existingRelatedIds?.includes(option.id ?? ''));

    // Ids already chosen across the relationship rows currently on the form.
    const selectedRelativeIds = fields
        .map((field, index) => (field.complexOptions ? formData[`relationship-${index}`] : undefined))
        .filter((id): id is string => Boolean(id) && id !== 'Please Select');

    // No more members left to add => disable the Add button.
    const noMoreMembersToAdd = baseSelectableOptions
        .every((option) => selectedRelativeIds.includes(option.id ?? ''));

    return (
        <form className="form-container" style={{ padding: '10px' }} onKeyDown={handleKeyDown}>
            <h2>{formTitle}</h2>
            {fields[0]?.complexOptions && <div className="form-group">
                <h3 className="form-label">Name</h3>
                <h3 className='form-right-header'>Relationship</h3>
            </div>}
            {fields.map((field, index) => {
                const memberFieldName = field.complexOptions ? `relationship-${index}` : field.name;
                const typeFieldName = `relationshipType-${index}`;
                const reverseTypeFieldName = `relationshipReverseType-${index}`;
                // The chosen relative's sex genders the primary (relative-role)
                // dropdown and the auto-derived anchor-role inverse.
                const rowRelativeId = formData[memberFieldName];
                const rowRelativeSex = field.complexOptions?.find((m) => m.id === rowRelativeId)?.data.sex ?? 'M';
                // The relative's role toward the anchor is the primary input the
                // user picks; it defaults to "Son"/"Daughter" by the relative's
                // sex so a row with only a relative chosen is still valid.
                const reverseType = (formData[reverseTypeFieldName] as RelationTypes | undefined)
                    ?? defaultForwardRelationType(rowRelativeSex);
                // Father/Mother/Son/Daughter auto-derive (and lock) the anchor's
                // role from the relative's role.
                const autoInverse = isAutoInverseRelation(reverseType);
                const forwardValue = autoInverse
                    ? getInverseRelationType(reverseType, anchorMemberSex)
                    : formData[typeFieldName] || getInverseRelationType(reverseType, anchorMemberSex);
                return (
                <div className="form-group" key={`${field.name}-${index}`}>
                    {!field?.complexOptions &&
                        <label htmlFor={field.name} className="form-label">{field.label}</label>
                    }
                    {field?.complexOptions &&
                        <select
                            name={memberFieldName}
                            id={memberFieldName}
                            onChange={handleSelectChange} required={field.required || false}
                            className="form-label-spcl-select"
                            value={formData[memberFieldName] || 'Please Select'}
                        >
                            <option key={'Please Select'} value={'Please Select'}>
                                {'Please Select'}
                            </option>
                            {baseSelectableOptions
                                // Hide members already picked in other rows, but keep
                                // this row's own current selection visible.
                                .filter((option) =>
                                    formData[memberFieldName] === option.id ||
                                    !selectedRelativeIds.includes(option.id ?? ''))
                                .map((option) => (
                                <option key={option.id} value={option.id}>
                                    {option.data.title}
                                </option>
                            ))}
                        </select>
                    }
                    {field.type === 'select' && field.options ? (
                        <select
                            name={field.name}
                            id={field.name}
                            onChange={handleSelectChange} required={field.required || false}
                            value={formData[field.name] || 'Please Select'}
                            className={field?.required && missingFields.includes(field.name) ?
                                'form-input-missing' : 'form-input'}
                        >
                            <option key={'Please Select'} value={'Please Select'}>
                                {'Please Select'}
                            </option>
                            {field.options.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    ) : field.type === 'select' &&
                        field?.complexOptions && field.relationshipOptions?.length ? (
                        <div className="relationship-type-group">
                            <label className="relationship-direction-label" htmlFor={reverseTypeFieldName}>
                                The relative is this member's…
                            </label>
                            <select
                                name={reverseTypeFieldName}
                                id={reverseTypeFieldName}
                                onChange={handleSelectChange} required={field.required || false}
                                className="form-input"
                                value={reverseType}
                            >
                                <RelationTypeOptions sex={rowRelativeSex} />
                            </select>
                            <label className="relationship-direction-label" htmlFor={typeFieldName}>
                                This member is the relative's…
                            </label>
                            <select
                                name={typeFieldName}
                                id={typeFieldName}
                                onChange={handleSelectChange}
                                required={field.required || false}
                                className="form-input"
                                disabled={autoInverse}
                                value={forwardValue || 'Please Select'}
                            >
                                <option key={'Please Select'} value={'Please Select'}>
                                    {'Please Select'}
                                </option>
                                <RelationTypeOptions sex={anchorMemberSex} />
                            </select>
                            <label className="relationship-visual-toggle" htmlFor={`relationshipVisual-${index}`}>
                                <input
                                    type="checkbox"
                                    name={`relationshipVisual-${index}`}
                                    id={`relationshipVisual-${index}`}
                                    checked={formData[`relationshipVisual-${index}`] !== false}
                                    onChange={handleCheckboxChange}
                                />
                                Show edge in graph
                            </label>
                        </div>
                    ) : field.type === 'textarea' ? (
                        <textarea
                            name={field.name}
                            id={field.name}
                            value={formData[field.name] || ''}
                            onChange={handleTextAreaChange}
                            required={field.required || false}
                            onKeyDown={handleTextAreaKeyDown}
                            className={field?.required && missingFields.includes(field.name) ? 'form-textarea-missing' : 'form-textarea'} />
                    ) : (
                        <input
                            type={field.type}
                            name={field.name}
                            id={field.name}
                            value={formData[field.name] || ''}
                            onChange={handleChange}
                            required={field?.required || false}
                            className={field?.required && missingFields.includes(field.name) ? 'form-input-missing' : 'form-input'}
                        />
                    )}
                </div>
                );
            })}
            {missingBanner && <div className="missing-banner">Please Fill all required data</div>}
            {fields[0]?.complexOptions &&
                <div className="form-group">
                    <div className="form-label">
                        <AppButton label={'+ Add'} onClick={handleAddRelationship} primary={true} disabled={noMoreMembersToAdd} />
                    </div>
                    {fields?.length > 1 &&
                        <div>
                            <AppButton label={'- Remove'} onClick={handleRemoveRelationship} />
                        </div>}
                </div>
            }
            <div className="form-group">
                <div className="form-label">
                    <AppButton
                        label={submitText || 'Submit'}
                        onClick={fields[0]?.complexOptions ? handleSubmitRelationship : handleSubmit}
                        primary={true}
                    />
                </div>
                <div>
                    <AppButton label={cancelText || 'Cancel'} onClick={handleCancel} />
                </div>
            </div>
        </form>
    );
};

export default Form;