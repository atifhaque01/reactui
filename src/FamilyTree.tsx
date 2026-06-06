import { useEffect, useState } from "react";
import ReactFlow, { MiniMap, useReactFlow } from "reactflow";
import CoupleEdge, { CoupleEdgeTypeKey } from "./FamilyComponents/CoupleEdge";
import { FamilyMemberNodeComp } from "./FamilyComponents/FamilyMemberNode";
import InnerFamilyEdge, { InnerFamilyTypeKey } from "./FamilyComponents/InnerFamilyEdge";
import { buildDataStructure, buildGenerations, buildParentsChildrenStructs } from "./tree/buildDataStructure";
import { buildCouplesEdges, buildEdgesFromParentChildrenRelations } from "./tree/buildEdges";
import {
    addNodeSelection,
    addNodeVisibilityCallback,
    positionAndBuildFamilyTree,
    positionUnknownGeneration
} from "./tree/positionNodes";
import { FamilyMember, FamilyMembers, FamilyRelations, OTHERS_GENERATION } from "./tree/types";
import { NODE_HEIGHT, NODE_WIDTH } from "./tree/constants";
import { nodeColorForMinimap } from "./utils";

const nodeTypes = { familyMember: FamilyMemberNodeComp };
const edgeTypes = {
    [InnerFamilyTypeKey]: InnerFamilyEdge,
    [CoupleEdgeTypeKey]: CoupleEdge
};

type FamilyTreeProps = {
    familyMembers: FamilyMembers;
    familyRelations: FamilyRelations;
    rootMember: FamilyMember;
    setRootId: (id: string) => void;
    onDoubleClick?: (sfdcId: string) => void;
};

export const FamilyTree = ({
    familyMembers: rawFamilyMembers,
    familyRelations,
    rootMember,
    setRootId,
    onDoubleClick
}: FamilyTreeProps) => {
    const selectedNode = rootMember.id;
    const [hiddenNodesIds, setHiddenNodesIds] = useState<string[]>([]);
    const { setCenter } = useReactFlow();

    const familyMembersWithVisibility = Object.fromEntries(
        Object.entries(rawFamilyMembers).map(([key, value]) => {
            value.data.isHidden = hiddenNodesIds.includes(key);
            return [key, value] as const;
        })
    );

    const familyMembersValues = Object.values(familyMembersWithVisibility);
    const familyRelationsValues = Object.values(familyRelations);

    const familyGenerations = buildGenerations(familyMembersWithVisibility, familyRelations, rootMember.id);
    const innerFamiliesPerGeneration = buildDataStructure(familyGenerations, familyRelations);

    const familyNodes = positionAndBuildFamilyTree(innerFamiliesPerGeneration, familyMembersWithVisibility);
    const otherNodes = positionUnknownGeneration(familyGenerations[OTHERS_GENERATION]);

    const allNodes = [...familyNodes, ...otherNodes];
    const nodesWithSelectedInfo = addNodeSelection(familyRelations, allNodes, selectedNode);
    const nodesWithVizCallback = addNodeVisibilityCallback(nodesWithSelectedInfo, hiddenNodesIds, setHiddenNodesIds);

    const parentChildrenFamilies = buildParentsChildrenStructs(familyMembersValues, familyRelationsValues);
    const parentChildEdges = buildEdgesFromParentChildrenRelations(parentChildrenFamilies, familyGenerations);

    const couplesEdges = buildCouplesEdges(familyRelationsValues, parentChildEdges, parentChildrenFamilies);

    // Always keep the selected node centered (horizontally and vertically).
    const selectedNodePosition = nodesWithVizCallback.find((node) => node.id === selectedNode)?.position;
    const selectedNodeX = selectedNodePosition?.x;
    const selectedNodeY = selectedNodePosition?.y;
    useEffect(() => {
        if (selectedNodeX === undefined || selectedNodeY === undefined) {
            return;
        }
        setCenter(selectedNodeX + NODE_WIDTH / 2, selectedNodeY + NODE_HEIGHT / 2, {
            zoom: 0.5,
            duration: 400,
        });
    }, [selectedNode, selectedNodeX, selectedNodeY, setCenter]);

    return (
        <div style={{ height: "100%", width: "100%", direction: "ltr" }} className="family-chart">
            <ReactFlow
                nodes={nodesWithVizCallback}
                edges={[...parentChildEdges, ...couplesEdges]}
                fitView
                fitViewOptions={{
                    padding: 5,
                    nodes: allNodes.filter((node) => node.id === selectedNode)
                }}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                defaultEdgeOptions={{ type: "smoothstep" }}
                proOptions={{
                    hideAttribution: true
                }}
                onNodeClick={(_, node) => {
                    setRootId(node.id);
                }}
                onNodeDoubleClick={(_, node) => onDoubleClick && onDoubleClick(node.id)}
            >
                <MiniMap nodeStrokeWidth={3} pannable zoomable nodeColor={nodeColorForMinimap} />
            </ReactFlow>
        </div>
    );
};
