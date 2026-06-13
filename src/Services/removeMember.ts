import axios from "axios";
import { REACT_APP_API_BASE_URL } from "./config";

export default async function removeMember(id: string): Promise<boolean> {
  try {
    await axios.delete(`${REACT_APP_API_BASE_URL}/family/removeMember`, {
      params: { id }
    });
    return true;
  } catch (error) {
    console.error("Error removing member:", error);
    return false;
  }
}
