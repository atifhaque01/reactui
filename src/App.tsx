/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useCallback, useEffect } from 'react';
import ReactFlow, { useNodesState, useEdgesState, addEdge, Connection, Edge, Node } from 'reactflow';
import { getGraphNodes } from './Hooks/getGraphNodes';
import { GraphNode } from './Types/GraphNode.type';
import { getGraphEdges } from './Hooks/getGraphEdges';
import { GraphEdge } from './Types/GraphEdge.type';

import 'reactflow/dist/style.css';
import { get } from 'http';

const initialNodes = [
  { id: '1', position: { x: 50, y: 0 }, data: { label: '1' } },
  { id: '2', position: { x: 50, y: 100 }, data: { label: '2' } },
];
const initialEdges = [{ id: 'e1-2', source: '1', target: '2' }];

export default function App() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    getGraphNodes().then((data: GraphNode[]) => {
      let formattedNodes: Node[] = [];
      data.forEach((node: GraphNode) => {
        formattedNodes.push({
          id: node._id || '',
          position: { x: node.x || 0, y: node.y || 0 },
          data: { label: node.member.name },
        });
      });
      setNodes(formattedNodes);
    });

    getGraphEdges().then((data: GraphEdge[]) => {
      let formattedEdges: Edge[] = [];
      data.forEach((edge: GraphEdge) => {
        formattedEdges.push({
          id: edge._id || '',
          source: edge.source || '',
          target: edge.target || '',
        });
      });
      setEdges(formattedEdges);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
      />
    </div>
  );
}