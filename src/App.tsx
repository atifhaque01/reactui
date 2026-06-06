import TreeConstructor from './TreeConstructor';
import PageHeader from './Components/PageHeader';
import SlideInForm, { SlideInFormHandle } from './Components/SlideInForm';
import { useEffect, useRef, useState } from 'react';
import { getAllMembers } from './Services/getMembers';
import { getAllRelationships } from './Services/getRelationships';
import { RawFamilyMember, RawFamilyRelation } from './utils';
import { TreeHandle } from './Tree';

export default function App() {
  const [familyMembers, setFamilyMembers] = useState<RawFamilyMember[]>([]);
  const [familyRelations, setFamilyRelations] = useState<RawFamilyRelation[]>([]);
  const slideInRef = useRef<SlideInFormHandle>(null);
  const treeRef = useRef<TreeHandle>(null);
  const refresh = () => {
    getAllMembers().then((members) => setFamilyMembers(members));
    getAllRelationships().then((relations) => setFamilyRelations(relations));
  };
  useEffect(() => {
    refresh();
  }, []);
  const handleEditMember = (member: RawFamilyMember) => slideInRef.current?.startEdit(member);
  const handleAddRelationshipForMember = (member: RawFamilyMember) =>
    slideInRef.current?.startAddRelationship(member);
  const handleSelectionChange = () => slideInRef.current?.closeAll();
  const handleSearchSelect = (id: string) => treeRef.current?.setRoot(id);
  return (
    <div style={{ overflow: 'hidden', height: '100vh' }}>
      <div>
        <PageHeader members={familyMembers} onSelectMember={handleSearchSelect} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '5px' }}>
        <SlideInForm ref={slideInRef} members={familyMembers} relations={familyRelations} onChange={refresh} />
      </div>
      {familyMembers.length > 0 && 
        <div>
          <TreeConstructor
            ref={treeRef}
            familyMembers={familyMembers}
            familyRelations={familyRelations}
            onEditMember={handleEditMember}
            onAddRelationshipForMember={handleAddRelationshipForMember}
            onSelectionChange={handleSelectionChange} />
        </div>}
    </div>
  );
}
