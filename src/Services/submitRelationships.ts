import axios from "axios";
import { FamilyRelation } from "../tree/types";
import { API_BASE_URL } from "./config";

export default async function submitRelationships(relationships: FamilyRelation[]): Promise<String | undefined> {
  try {
    // The backend / read path stores relationships keyed by fromId/toId,
    // while the in-memory model uses from/to. Map to the persisted shape.
    const payload = relationships.map((relationship) => ({
      relationType: relationship.relationType,
      prettyType: relationship.prettyType,
      fromId: relationship.from,
      toId: relationship.to,
      isInnerFamily: relationship.isInnerFamily
    }));
    const response = await axios.post(`${API_BASE_URL}/family/addRelationship`, payload);
    return response.data;
  } catch (error) {
    return undefined;
  }
}