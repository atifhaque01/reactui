import axios from "axios";
import { RawFamilyMember } from "../utils";

export async function getAllMembers(): Promise<RawFamilyMember[]> {
    let members: RawFamilyMember[];
    members = [{
        "id": "0",
        "data": {
            "title": "Atif Haque",
            "titleBgColor": "rgb(63, 108, 191)",
            "titleTextColor": "white",
            "subtitles": [
                "Company: ADP",
                "Born: 2000"
            ],
            "sex": "M",
            "badges": []
        }
    }];
    try {
        const responseMembers = (await axios.get('http://localhost:3012/family/getAllMembers')).data as [];

        members = responseMembers.map((member: any) => ({
            id: member.id,
            data: member.data
        }));

        return members;
    } catch (error) {
        console.error('Error fetching family member data:', error);
    }
    return members;
}