import React from "react";
import "./index.css";
import { ReactFlowProvider } from "reactflow";
import { RawFamilyMember, buildFamilyAndRelations, RawFamilyRelation } from "./utils";
import { FamilyTree } from "./FamilyTree";
import MemberDetailsPanel from "./Components/MemberDetailsPanel";
import "reactflow/dist/style.css";

interface TreeProps {
    members: RawFamilyMember[];
    relations: RawFamilyRelation[];
    onEditMember?: (member: RawFamilyMember) => void;
    onAddRelationshipForMember?: (member: RawFamilyMember) => void;
    onSelectionChange?: () => void;
}

export interface TreeHandle {
    setRoot: (id: string) => void;
}

export const Tree = React.forwardRef<TreeHandle, TreeProps>(({ members, relations, onEditMember, onAddRelationshipForMember, onSelectionChange }, ref) => {
    const [familyMembersRecord, familyRelationsRecord] = React.useMemo(
        () => buildFamilyAndRelations(members, relations),
        [members, relations]
    );
    const [rootId, setRootId] = React.useState(() => Object.values(familyMembersRecord)[0]?.id);
    // If the current root no longer exists (e.g. it was just deleted), fall
    // back to any remaining member so the tree doesn't render with an
    // undefined root.
    const resolvedRootId = familyMembersRecord[rootId]
        ? rootId
        : Object.values(familyMembersRecord)[0]?.id;
    React.useEffect(() => {
        if (resolvedRootId && resolvedRootId !== rootId) {
            setRootId(resolvedRootId);
        }
    }, [resolvedRootId, rootId]);
    const rootMember = resolvedRootId ? familyMembersRecord[resolvedRootId] : undefined;
    const handleSetRootId = (id: string) => {
        setRootId(id);
        onSelectionChange?.();
    };
    React.useImperativeHandle(ref, () => ({
        setRoot: (id: string) => {
            if (familyMembersRecord[id]) {
                handleSetRootId(id);
            }
        },
    }));
    const selectedRawMember = members.find((member) => member.id === resolvedRootId);
    return (
        <ReactFlowProvider>
            <div style={{ height: "100%", width: "100%" }}>
                {rootMember && (
                    <>
                        <MemberDetailsPanel
                            member={rootMember}
                            onEdit={selectedRawMember && onEditMember ? () => onEditMember(selectedRawMember) : undefined}
                            onAddRelationship={
                                selectedRawMember && onAddRelationshipForMember
                                    ? () => onAddRelationshipForMember(selectedRawMember)
                                    : undefined
                            }
                        />
                        <FamilyTree
                            familyMembers={familyMembersRecord}
                            familyRelations={familyRelationsRecord}
                            rootMember={rootMember}
                            setRootId={handleSetRootId}
                        />
                    </>
                )}
            </div>
        </ReactFlowProvider>
    );
});

Tree.displayName = "Tree";
