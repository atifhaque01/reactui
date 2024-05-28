import { GraphEdge } from '../Types/GraphEdge.type';
import axios from 'axios';

export const getGraphEdges = async (): Promise<GraphEdge[]> => {
    try {
        const response = await axios.get('http://localhost:3012/family/getAllRelationships');
        return response.data;
    } catch (error) {
        console.error('Error fetching data:', error);
    }
    return [];
}

