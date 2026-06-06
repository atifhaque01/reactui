import axios from "axios";
import { RawFamilyMember } from "../utils";
import { API_BASE_URL } from "./config";

export default async function submitMember(member: RawFamilyMember): Promise<String | undefined> {
  try {
    const response = await axios.post(`${API_BASE_URL}/family/addMember`, member.data);
    return response.data;
  } catch (error) {
    return undefined;
  }
}