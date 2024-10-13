import 'reactflow/dist/style.css';
import { Tree } from './Tree';
import { RawFamilyMember, RawFamilyRelation } from './utils';
import React from 'react';

interface TreeConstructorProps {
  familyMembers: RawFamilyMember[];
  familyRelations: RawFamilyRelation[];
}
export const TreeConstructor: React.FC<TreeConstructorProps> = ({ familyMembers, familyRelations }) => {
  return (
    <div>
      <Tree
        members={familyMembers}
        relations={familyRelations}
      />
    </div>
  );
}

export default TreeConstructor;
