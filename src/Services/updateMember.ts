import axios from "axios";
import { RawFamilyMember } from "../utils";
import { REACT_APP_API_BASE_URL } from "./config";

export default async function updateMember(id: string, member: RawFamilyMember): Promise<boolean> {
  try {
    await axios.put(`${REACT_APP_API_BASE_URL}/family/updateMember`, member.data, {
      params: { id }
    });
    return true;
  } catch (error) {
    console.error("Error updating member:", error);
    return false;
  }
}
