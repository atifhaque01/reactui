import axios from "axios";
import { RawFamilyRelation } from "../utils";
import { API_BASE_URL } from "./config";

/**
 * Fetches all relationships. Throws on network/server failure so callers can
 * distinguish "backend unreachable" from an empty relationship set.
 */
export async function getAllRelationships(): Promise<RawFamilyRelation[]> {
    const responseRelationships = (await axios.get(`${API_BASE_URL}/family/getAllRelationships`)).data as [];

    return responseRelationships.map((relation: any) => ({
        relationType: relation.relationType,
        prettyType: relation.prettyType,
        fromId: relation.fromId,
        toId: relation.toId,
        isInnerFamily: relation.isInnerFamily
    }));
}