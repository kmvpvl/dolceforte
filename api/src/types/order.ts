import { Types } from "./common";
import { IMealOption, IMealRequisites } from "./meal";

export interface IOrderItem extends Types.IDocument {}
export interface IOrderItem extends IMealRequisites {
    order_id?: Types.ObjectId;
    option: IMealOption;
    count: number;
    comment?: string;
}

export interface IOrder extends Types.IDocument {
    items: IOrderItem[];
    discount: number;
    comment?: string;
    esId?: string;
}
