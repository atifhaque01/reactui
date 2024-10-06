import 'reactflow/dist/style.css';
import { Tree } from './Tree';
import { useEffect, useState } from 'react';
import { RawFamilyMember, RawFamilyRelation } from './utils';
import axios from 'axios';

export default function TreeConstructor() {
  const [familyMembers, setFamilyMembers] = useState<RawFamilyMember[]>([{
    "id": "0",
    "data": {
      "title": "Atif Haque",
      "titleBgColor": "rgb(63, 108, 191)",
      "titleTextColor": "white",
      "subtitles": [
        "Company: ADP",
        "Born: 2000"
      ],
      "sex": "M",
      "badges": []
    }
  }]);
  const [familyRelations, setFamilyRelations] = useState<RawFamilyRelation[]>([]);

  async function fetchFamilyData() {
    try {
      const responseMembers = (await axios.get('http://localhost:3012/family/getAllMembers')).data as [];

      const members: RawFamilyMember[] = responseMembers.map((member: any) => ({
        id: member.id,
        data: member.data
      }));

      const responseRelationships = (await axios.get('http://localhost:3012/family/getAllRelationships')).data as [];

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
