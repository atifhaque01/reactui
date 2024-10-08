import TreeConstructor from './TreeConstructor';
import PageHeader from './Components/PageHeader';
import SlideInForm from './Components/SlideInForm';
import { useEffect, useState } from 'react';
import { getAllMembers } from './Services/getMembers';
import { getAllRelationships } from './Services/getRelationships';
import { RawFamilyMember, RawFamilyRelation } from './utils';

export default function App() {
  const [familyMembers, setFamilyMembers] = useState<RawFamilyMember[]>([]);
  const [familyRelations, setFamilyRelations] = useState<RawFamilyRelation[]>([]);
  useEffect(() => {
    getAllMembers().then((members) => setFamilyMembers(members));
    getAllRelationships().then((relations) => setFamilyRelations(relations));
  }, []);
  return (
    <div style={{ overflow: 'hidden', height: '100vh' }}>
      <div>
        <PageHeader />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '5px' }}>
        <SlideInForm members={familyMembers} />
      </div>
      {familyMembers.length > 0 && 
        <div>
          <TreeConstructor
            familyMembers={familyMembers}
            familyRelations={familyRelations} />
        </div>}
    </div>
  );
}
