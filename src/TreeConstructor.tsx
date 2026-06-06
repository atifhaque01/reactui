import 'reactflow/dist/style.css';
import { Tree, TreeHandle } from './Tree';
import { RawFamilyMember, RawFamilyRelation } from './utils';
import React from 'react';

interface TreeConstructorProps {
  familyMembers: RawFamilyMember[];
  familyRelations: RawFamilyRelation[];
  onEditMember?: (member: RawFamilyMember) => void;
  onAddRelationshipForMember?: (member: RawFamilyMember) => void;
  onSelectionChange?: () => void;
}
export const TreeConstructor = React.forwardRef<TreeHandle, TreeConstructorProps>(({
  familyMembers,
  familyRelations,
  onEditMember,
  onAddRelationshipForMember,
  onSelectionChange,
}, ref) => {
  return (
    <div>
      <Tree
        ref={ref}
        members={familyMembers}
        relations={familyRelations}
        onEditMember={onEditMember}
        onAddRelationshipForMember={onAddRelationshipForMember}
        onSelectionChange={onSelectionChange}
      />
    </div>
  );
});

TreeConstructor.displayName = "TreeConstructor";

export default TreeConstructor;
