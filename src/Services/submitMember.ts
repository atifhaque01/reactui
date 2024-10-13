import axios from "axios";
import { RawFamilyMember } from "../utils";

export default async function submitMember(member: RawFamilyMember): Promise<String | undefined> {
  try {
    const response = await axios.post("http://localhost:3012/family/addMember", member.data);
    return response.data;
  } catch (error) {
    return undefined;
  }
}