import { IPhoto, Types } from "./common";

export interface IMealOption {
    name: Types.IMLString;
    amount: number;
    currency: Types.IMLString;
    includeOptions?: IMealOption[];
    excludeOptions?: IMealOption[];
    esId?: string;
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
}

export interface IMenuItem {
    mealId?: Types.ObjectId;
    options: IMealOption[];
    restrictions?: Types.IMLString[];
}

export interface IMenuChapter {
    items: IMenuItem[];
    iconUrl?: string;
    name: Types.IMLString;
    headerHtml?: Types.IMLString;
    footerHtml?: Types.IMLString;
    restrictions?: Types.IMLString;
}

export interface IMenu extends Types.IDocument {
    userId?: Types.ObjectId;
    name: string;
    headerHtml: Types.IMLString;
    footerHtml: Types.IMLString;
    restrictions?: Types.IMLString[];
    chapters: IMenuChapter[];
}
