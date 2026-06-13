import TreeConstructor from './TreeConstructor';
import PageHeader from './Components/PageHeader';
import SlideInForm, { SlideInFormHandle } from './Components/SlideInForm';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getAllMembers } from './Services/getMembers';
import { getAllRelationships } from './Services/getRelationships';
import { RawFamilyMember, RawFamilyRelation } from './utils';
import { TreeHandle } from './Tree';
import './App.css';

export default function App() {
  const [familyMembers, setFamilyMembers] = useState<RawFamilyMember[]>([]);
  const [familyRelations, setFamilyRelations] = useState<RawFamilyRelation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const slideInRef = useRef<SlideInFormHandle>(null);
  const treeRef = useRef<TreeHandle>(null);
  // Fetch members and relationships together so the tree never renders with
  // members from one snapshot and relationships from another.
  const refresh = useCallback(async () => {
    try {
      const [members, relations] = await Promise.all([getAllMembers(), getAllRelationships()]);
      setFamilyMembers(members);
      setFamilyRelations(relations);
      setLoadError(false);
    } catch (error) {
      console.error('Error loading family tree data:', error);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  const handleRetry = () => {
    setIsLoading(true);
    refresh();
  };
  const handleEditMember = (member: RawFamilyMember) => slideInRef.current?.startEdit(member);
  const handleAddRelationshipForMember = (member: RawFamilyMember) =>
    slideInRef.current?.startAddRelationship(member);
  const handleSelectionChange = () => slideInRef.current?.closeAll();
  const handleSearchSelect = (id: string) => treeRef.current?.setRoot(id);
  return (
    <div className="app-shell">
      <PageHeader members={familyMembers} onSelectMember={handleSearchSelect}>
        <SlideInForm ref={slideInRef} members={familyMembers} relations={familyRelations} onChange={refresh} />
      </PageHeader>
      {isLoading && (
        <div className="app-status">
          <div className="app-spinner" aria-hidden="true" />
          <p>Loading family tree…</p>
        </div>
      )}
      {!isLoading && loadError && (
        <div className="app-status">
          <p className="app-status-title">Could not reach the family tree service</p>
          <p>Check that the backend is running, then try again.</p>
          <button className="app-status-retry" onClick={handleRetry}>Retry</button>
        </div>
      )}
      {!isLoading && !loadError && familyMembers.length === 0 && (
        <div className="app-status">
          <p className="app-status-title">No family members yet</p>
          <p>Use the “Add Family Member” button above to start your tree.</p>
        </div>
      )}
      {!loadError && familyMembers.length > 0 && (
        <main className="app-tree">
          <TreeConstructor
            ref={treeRef}
            familyMembers={familyMembers}
            familyRelations={familyRelations}
            onEditMember={handleEditMember}
            onAddRelationshipForMember={handleAddRelationshipForMember}
            onSelectionChange={handleSelectionChange}
          />
        </main>
      )}
    </div>
  );
}
