import 'reactflow/dist/style.css';
import { Tree } from './Tree';
import { useEffect, useState } from 'react';
import { RawFamilyMember, RawFamilyRelation } from './utils';

export default function App() {
  const [familyMembers, setFamilyMembers] = useState<RawFamilyMember[]>([]);
  const [familyRelations, setFamilyRelations] = useState<RawFamilyRelation[]>([]);

  async function fetchFamilyData() {
    try {
      const getAllMembers = await fetch('localhost:3012/family/getAllMembers');
      const responseMembers = await getAllMembers.json();

      const members: RawFamilyMember[] = responseMembers.map((member: any) => ({
        id: member.id,
        data: member.data
      }));

      const getAllRelationships = await fetch('localhost:3012/family/getAllRelationships');
      const responseRelationships = await getAllRelationships.json();

      const relations: RawFamilyRelation[] = responseRelationships.map((relation: any) => ({
        relationType: relation.relationType,
        prettyType: relation.prettyType,
        fromId: relation.fromId,
        toId: relation.toId,
        isInnerFamily: relation.isInnerFamily
      }));

      setFamilyMembers(members);
      setFamilyRelations(relations);
    } catch (error) {
      console.error('Error fetching family data:', error);
    }
  }

  useEffect(() => {
    fetchFamilyData();
  }, []);
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
