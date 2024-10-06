import 'reactflow/dist/style.css';
import { Tree } from './Tree';
import { RawFamilyMember, RawFamilyRelation } from './utils';

interface TreeConstructorProps {
  familyMembers: RawFamilyMember[];
  familyRelations: RawFamilyRelation[];
}
export const TreeConstructor: React.FC<TreeConstructorProps> = ({familyMembers, familyRelations}) => {

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <Tree
        members={familyMembers}
        relations={familyRelations}
        rootId={"0"}
      />
    </div>
  );
}

export default TreeConstructor;
