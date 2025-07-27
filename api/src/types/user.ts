import { IPhoto, Types } from "./common";

export enum notifyToolType {
    Telegram,
    email
}
export interface IUserSettings {
    notifications: {
        tool: notifyToolType;
        events: {
            signInSuccess: boolean;
            signInFail: boolean;
        }
    }
}

export interface IUser extends Types.IDocument{
    login: string;
    email: string;
    name: string;
    hash: string;
    tguid?: string | number;
    signInAttemptsCount: number;
    settings: IUserSettings;
    photo?: IPhoto;
}