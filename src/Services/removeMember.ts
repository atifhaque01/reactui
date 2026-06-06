import axios from "axios";
import { API_BASE_URL } from "./config";

export default async function removeMember(id: string): Promise<boolean> {
  try {
    await axios.delete(`${API_BASE_URL}/family/removeMember`, {
      params: { id }
    });
    return true;
  } catch (error) {
    console.error("Error removing member:", error);
    return false;
  }
}
