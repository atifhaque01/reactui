export type ParentsChildrens = {
  parentA: string;
  parentB: string;
  children: string[];
};

export type RelationTypes =
  // Older generations
  | "Grandfather"
  | "Grandmother"
  | "Grandfather (step)"
  | "Grandmother (step)"
  | "Father"
  | "Mother"
  | "Father (step)"
  | "Mother (step)"
  | "Step father"
  | "Step mother"
  | "Adoptive father"
  | "Adoptive mother"
  | "Father in law"
  | "Mother in law"
  | "Step father in law"
  | "Step mother in law"
  | "Uncle"
  | "Aunt"
  | "Uncle (step)"
  | "Aunt (step)"
  // Same generation
  | "Husband"
  | "Wife"
  | "Husband (divorced)"
  | "Wife (divorced)"
  | "Common-Law Partner"
  | "Have shared kids"
  | "Brother"
  | "Sister"
  | "Brother (step)"
  | "Sister (step)"
  | "Step brother"
  | "Step sister"
  | "Brother in law"
  | "Sister in law"
  | "Male cousin"
  | "Female cousin"
  | "Male cousin (step)"
  | "Female cousin (step)"
  // Younger generations
  | "Son"
  | "Daughter"
  | "Son (step)"
  | "Daughter (step)"
  | "Step son"
  | "Step daughter"
  | "Adopted son"
  | "Adopted daughter"
  | "Son in law"
  | "Daughter in law"
  | "Step son in law"
  | "Step daughter in law"
  | "Nephew"
  | "Niece"
  | "Nephew (step)"
  | "Niece (step)"
  | "Grandson"
  | "Granddaughter"
  | "Grandson (step)"
  | "Granddaughter (step)"
  // Other
  | "Relative";

export type FamilyRelation = {
  id: string;
  from: string;
  to: string;
  relationType: RelationTypes;
  prettyType: string;
  isInnerFamily: boolean;
};

export type BadgeData = {
  bgColor: string;
  label: string;
  textColor: string;
};

export type FamilyMember = {
  id: string;
  data: {
    badges: {
      bgColor: string;
      label: string;
      textColor: string;
    }[];
    title: string;
    titleBgColor: string;
    titleTextColor: string;
    sex: "M" | "F";
    subtitles: string;
    isHidden: boolean;
    imageUrl?: string;
    onVisibilityChange: (isVisible: boolean) => void;
  };
};

export type FamilyMembers = Record<string, FamilyMember>;
export type FamilyRelations = Record<string, FamilyRelation>;

export type InnerFamily = {
  parents: string[];
  children: InnerFamily[];
  generation: Generation;
  width?: number;
  centerX?: number;
  couplePainted?: boolean;
  childMemberIds?: string[]; // all biological/step children by ID, regardless of which parent couple claims them in the tree structure
};

// Support up to 20 generations in each direction from the root (generation 0).
export const MAX_GENERATION_DISTANCE = 20;
export const GenerationsPossible: readonly number[] = Array.from(
  { length: MAX_GENERATION_DISTANCE * 2 + 1 },
  (_, i) => i - MAX_GENERATION_DISTANCE
);
// Must stay OUTSIDE the renderable generation range above.
export const OTHERS_GENERATION = 999;
export type Generation = number;
