import 'reactflow/dist/style.css';
import { Tree } from './Tree';
import { RawFamilyMember, RawFamilyRelation } from './utils';
import React from 'react';

interface TreeConstructorProps {
  familyMembers: RawFamilyMember[];
  familyRelations: RawFamilyRelation[];
}
export const TreeConstructor: React.FC<TreeConstructorProps> = ({ familyMembers, familyRelations }) => {
  const [rootId, setRootId] = React.useState<string>("0");
  return (
    <div>
      <Tree
        members={familyMembers}
        relations={familyRelations}
        rootId={rootId}
        setRootId={setRootId}
      />
    </div>
  );
}

export default TreeConstructor;
