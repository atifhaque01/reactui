import 'reactflow/dist/style.css';
import { Tree } from './Tree';
import rawFamily from "./tests/family1.json";
import { RawFamilyMember, RawFamilyRelation } from './utils';

const familyMembers: RawFamilyMember[] = rawFamily.familyMembers.map((member: any) => ({
  id: member.id,
  data: member.data
}));

const familyRelations: RawFamilyRelation[] = rawFamily.familyRelations.map((relation: any) => ({
  relationType: relation.relationType,
  prettyType: relation.prettyType,
  fromId: relation.fromId,
  toId: relation.toId,
  isInnerFamily: relation.isInnerFamily
}));

export default function App() {
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
