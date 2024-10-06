import axios from "axios";
import { RawFamilyRelation } from "../utils";

export async function getAllRelationships() {
    let relations: RawFamilyRelation[] = [];
    try{
    const responseRelationships = (await axios.get('http://localhost:3012/family/getAllRelationships')).data as [];

    relations = responseRelationships.map((relation: any) => ({
        relationType: relation.relationType,
        prettyType: relation.prettyType,
        fromId: relation.fromId,
        toId: relation.toId,
        isInnerFamily: relation.isInnerFamily
    }));} catch (error) {
        console.error('Error fetching family relationship data:', error);
    }
    return relations;
}