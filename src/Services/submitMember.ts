import axios from "axios";
import { RawFamilyMember } from "../utils";
import { REACT_APP_API_BASE_URL } from "./config";

export default async function submitMember(member: RawFamilyMember): Promise<String | undefined> {
  try {
    const response = await axios.post(`${REACT_APP_API_BASE_URL}/family/addMember`, member.data);
    return response.data;
  } catch (error) {
    return undefined;
  }
}