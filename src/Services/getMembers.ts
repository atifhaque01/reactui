import axios from "axios";
import { RawFamilyMember } from "../utils";
import { REACT_APP_API_BASE_URL } from "./config";

/**
 * Fetches all family members. Throws on network/server failure so callers can
 * distinguish "backend unreachable" from a legitimately empty family.
 */
export async function getAllMembers(): Promise<RawFamilyMember[]> {
    const responseMembers = (await axios.get(`${REACT_APP_API_BASE_URL}/family/getAllMembers`)).data as [];

    return responseMembers.map((member: any) => ({
        id: member.id,
        data: member.data
    }));
}