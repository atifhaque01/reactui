import axios from "axios";
import { REACT_APP_API_BASE_URL } from "./config";

export default async function removeRelationship(source: string, target: string): Promise<boolean> {
  try {
    await axios.delete(`${REACT_APP_API_BASE_URL}/family/removeRelationship`, {
      params: { source, target }
    });
    return true;
  } catch (error) {
    console.error("Error removing relationship:", error);
    return false;
  }
}
