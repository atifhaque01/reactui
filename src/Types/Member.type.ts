export interface Member {
    _id?: string;
    name?: string;
    gender?: string;
    date_of_birth?: Date;
    place_of_birth?: string;
    date_of_death?: Date;
    place_of_death?: string;
    date_of_marriage?: Date;
    description?: string;
    generation?: number;
    images?: string[];
}