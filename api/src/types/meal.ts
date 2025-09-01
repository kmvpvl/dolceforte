import { IPhoto, Types } from "./common";

export interface IMealOption {
    article: string;
    name: Types.IMLString;
    amount?: number;
    currency?: Types.IMLString;
    includeOptions?: IMealOption[];
    excludeOptions?: IMealOption[];
    esId?: string;
    default?: boolean;
}

export interface IMealContainer {
    article: string;
    default?: boolean;
    name: Types.IMLString;
    weight: number;
    unit: Types.IMLString;
    amount: number;
    deposit: boolean;
    currency: Types.IMLString;
}

export interface IMealRequisites {
    name: Types.IMLString;
    description: Types.IMLString;
}

export interface IMeal extends IMealRequisites {}
export interface IMeal extends Types.IDocument {
    userId?: Types.ObjectId;
    eateryId?: Types.ObjectId;
    photos: IPhoto[];
    esId?: string;
    article: string;
}

export interface IMenuItem {
    mealId?: Types.ObjectId;
    byWeight?: number;
    weightUnit?: Types.IMLString;
    basePrice?: number;
    options: IMealOption[];
    restrictions?: Types.IMLString[];
    containers: IMealContainer[];
}


