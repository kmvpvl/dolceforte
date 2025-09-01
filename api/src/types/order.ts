import { Types } from "./common";
import { IMealOption, IMealRequisites, IMenuItem } from "./meal";

export interface IOrderItem extends Types.IDocument {}
export interface IOrderItem  {
    order_id?: Types.ObjectId;
    menuItem: IMenuItem;
    count: number;
    comment?: string;
}

export interface IOrderItemAmount {
    deposit: number;
    product: number;
}

export interface IDiscount {
    code: string;
    amount: number;
    type: "percentage" | "fixed";
}

export interface IOrder extends Types.IDocument {
    items: IOrderItem[];
    discount?: IDiscount;
    comment?: string;
    esId?: string;
}
