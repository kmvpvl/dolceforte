import { IOrder, IOrderItemAmount } from "@betypes/order";
import "./order.css"
import Proto, { IProtoProps, IProtoState } from "../proto";
import { Fragment, ReactNode } from "react";
import { products } from "../app/meals.json";
import MenuItem from "../menu/menuitem";
import MLString from "../../model/mlstring";

export interface IOrderProps extends IProtoProps{
	defaultValue?: IOrder;
    mode: "compact" | "detailed";
    onChange?: (newValue: IOrder) => void;
}

export interface IOrderState extends IProtoState{
	value: IOrder;
}

export default class Order extends Proto<IOrderProps, IOrderState> {
    state: Readonly<IOrderState> = {
        value: this.props.defaultValue || { items: [] }
    };
    get total(): IOrderItemAmount {
        let ret = { deposit: 0, product: 0 };
        for (const orderItem of this.state.value.items) {
            const amount = MenuItem.amount(orderItem.menuItem);
            ret.product += amount.product * orderItem.count;
            ret.deposit += amount.deposit * orderItem.count;
        }
        return ret;
    }
    renderCompact(): ReactNode {
        const total = this.total;
        return (
            <div className="order-compact-container"> 
                <div>Total: p = {total.product}; d = {total.deposit}</div>
                {/* Render order details here */}
            </div>
        );
    }
    renderDetailed(): ReactNode {
        const total = this.total;
        return (
            <div className="order-detailed-container">
                <div className="order-detailed-table">
                    <div>
                        <span>Article</span>
                        <span>Description</span>
                        <span>Price (incl.VAT)</span>
                        <span>Deposit (wo VAT)</span>
                        <span>Quantity</span>
                        <span>Total</span>
                    </div>
                {this.state.value.items.map((item, idx) => {
                    const amount = MenuItem.amount(item.menuItem);
                    return (
                        <div key={idx}>
                            <span>{MenuItem.article(item.menuItem)}</span>
                            <span>{MenuItem.articleName(item.menuItem, MLString.getLang())}</span>
                            <span>{this.toCurrency(amount.product)}</span>
                            <span>{this.toCurrency(amount.deposit)}</span>
                            <span>{item.count}</span>
                            <span>{this.toCurrency((amount.product + amount.deposit) * item.count)}</span>
                        </div>
                    );
                })}
                </div>
                <div className="order-detailed-summary">
                    <span>Total:</span>
                    <span>{this.toCurrency(total.product)}</span>
                    <span>{this.toCurrency(total.deposit)}</span>
                    <span>{this.state.value.items.reduce((sum, item) => sum + item.count, 0)}</span>
                    <span>{this.toCurrency(this.state.value.items.reduce((sum, item) => sum + (MenuItem.amount(item.menuItem).product + MenuItem.amount(item.menuItem).deposit) * item.count, 0))}</span>
                </div>
            </div>
        );
    }
    render(): ReactNode {
        return this.props.mode === "compact" ? this.renderCompact() : this.renderDetailed();
    }
}
