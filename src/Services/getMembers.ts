import axios from "axios";
import { RawFamilyMember } from "../utils";
import { API_BASE_URL } from "./config";

export async function getAllMembers(): Promise<RawFamilyMember[]> {
    try {
        const responseMembers = (await axios.get(`${API_BASE_URL}/family/getAllMembers`)).data as [];

        return responseMembers.map((member: any) => ({
            id: member.id,
            data: member.data
        }));
    } catch (error) {
        console.error('Error fetching family member data:', error);
        return [];
    }
}