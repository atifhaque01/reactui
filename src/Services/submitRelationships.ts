import axios from "axios";
import { FamilyRelation } from "../tree/types";

export default async function submitRelationships(relationships: FamilyRelation[]): Promise<String | undefined> {
  try {
    const response = await axios.post("http://localhost:3012/family/addRelationship", relationships);
    return response.data;
  } catch (error) {
    return undefined;
  }
}