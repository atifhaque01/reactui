import { GraphNode } from "../Types/GraphNode.type";
import axios from "axios";

export const getGraphNodes = async (): Promise<GraphNode[]> => {
    try {
        const response = await axios.get("http://localhost:3012/family/getAllMembers");
        return response.data;
    } catch (error) {
        console.error("Error fetching node data:", error);
    }
    return [];
}