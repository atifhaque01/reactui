import React from "react";
import "./index.css";
import { ReactFlowProvider } from "reactflow";
import { RawFamilyMember, buildFamilyAndRelations, RawFamilyRelation } from "./utils";
// import rawFamily from "../tests/family1.json";
import { FamilyTree } from "./FamilyTree";
import "reactflow/dist/style.css";

interface TreeProps {
    members: RawFamilyMember[];
    relations: RawFamilyRelation[];
    rootId: string;
    setRootId: (_id: string) => void;
}

export const Tree: React.FC<TreeProps> = ({ members, relations, rootId, setRootId }) => {
    const [familyMembersRecord, familyRelationsRecord] = buildFamilyAndRelations(members as RawFamilyMember[],
        relations as RawFamilyRelation[]);
    const rootMember = rootId ? familyMembersRecord[rootId] : Object.values(familyMembersRecord)[0];
    return <React.StrictMode>
        <ReactFlowProvider>
            <ReactFlowProvider>
                <div style={{ height: "80vh", width: "100vw" }}>
                    <FamilyTree
                        familyMembers={familyMembersRecord}
                        familyRelations={familyRelationsRecord}
                        rootMember={rootMember}
                        setRootId={setRootId}
                    />
                </div>
            </ReactFlowProvider>
        </ReactFlowProvider>
    </React.StrictMode>;
};
