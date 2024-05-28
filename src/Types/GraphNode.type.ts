import { Member } from "./Member.type";

export interface GraphNode {
    member: Member;
    _id?: string;
    x?: number;
    y?: number;
}