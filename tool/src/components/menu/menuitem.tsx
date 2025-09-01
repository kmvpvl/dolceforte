import { Types } from "@betypes/common";
import "./menuitem.css";
import { IMealOption, IMenuItem } from "@betypes/meal";
import Proto, { IProtoProps, IProtoState, ViewModeCode } from "../proto";
import { ReactNode } from "react";
import Radio from "../radio";
import { products } from "../app/meals.json";
import articleImages from "../app/images.json";
import { IOrderItemAmount } from "@betypes/order";
import MLString from "../../model/mlstring";

export interface IMenuItemProps extends IProtoProps {
	mealId?: Types.ObjectId;
	defaultValue?: IMenuItem;
	admin?: boolean;
	viewMode?: ViewModeCode;
	editMode?: boolean;
	onSave?: (newValue: IMenuItem) => void;
	onChange?: (newValue: IMenuItem) => void;
	onViewModeChange?: (oldValue: ViewModeCode, newValue: ViewModeCode) => void;
	onClick?: (menuItem: IMenuItem) => void;
}
export interface IMenuItemState extends IProtoState {
    editMode: boolean;
    value: IMenuItem;
    changed?: boolean;
    viewMode: ViewModeCode;
}

export default class MenuItem extends Proto<IMenuItemProps, IMenuItemState> {
    constructor(props: IMenuItemProps) {
        super(props);
        this.state = {
            value: this.props.defaultValue ? JSON.parse(JSON.stringify(this.props.defaultValue)) : this.new(),
            viewMode: this.props.viewMode !== undefined ? this.props.viewMode : ViewModeCode.normal,
            editMode: this.props.editMode !== undefined ? this.props.editMode : false,
        };
        for (const option of this.state.value.options) {
            if (option.includeOptions !== undefined) option.includeOptions = option.includeOptions.filter(incOption => incOption.default !== undefined && incOption.default);
        }
        this.state.value.containers = this.props.defaultValue?.containers.filter(container => container.default !== undefined && container.default) || [];
    }
    
    static article(menuItem: IMenuItem): string{
        const artArr = [];
        artArr.push(menuItem.mealId? products.find(p => p.id === menuItem?.mealId)?.article || "" : "");
        menuItem.options.forEach(option => {
            artArr.push(option.article);
            if (option.includeOptions !== undefined) {
                for (const incOption of option.includeOptions) {
                    artArr.push(incOption.article);
                    if (incOption.includeOptions !== undefined) {
                        for (const opt of incOption.includeOptions) {
                            artArr.push(opt.article);
                        }
                    }
                }
            }
        });
        if (menuItem.containers.length > 0) artArr.push(menuItem.containers[0].article);
        return artArr.join("");
    }

    static articleName(menuItem: IMenuItem, language: string): string {
        const meal = products.find(p => p.id === menuItem?.mealId);
        if (meal === undefined) return "";
        let art = new MLString(meal.name).toString(language);
        const art1 = [];
        for (const option of menuItem.options) {
            //art += ", " + new MLString(option.name).toString(language);
            if (option.includeOptions !== undefined) {
                for (const incOption of option.includeOptions) {
                    art1.push(new MLString(incOption.name).toString(language));
                }
            }
        };
        for (const container of menuItem.containers) {
            art1.push(new MLString(container.name).toString(language));
            art1.push(`${container.weight}g`);
        }
        return `${art} (${art1.join(", ")})`;
    }

    static amount(menuItem: IMenuItem): IOrderItemAmount {
        let sum = menuItem.basePrice || 0;
        let sumDeposit = 0;
        for (const option of menuItem.options) {
            for (const incOption of option.includeOptions || []) {
                if (incOption.amount !== undefined) {
                    sum += incOption.amount;
                }
            }
        }
        for (const container of menuItem.containers) {
            sum = sum * container.weight/100;
            if (container.amount !== undefined) {
                if (container.deposit) sumDeposit += container.amount;
                else sum += container.amount;
            }
        }
        return { deposit: sumDeposit, product: sum };
    }

    new(): IMenuItem {
        return {
            options: [],
            containers: [],
            mealId: this.props.mealId,
        };
    }

    get value(): IMenuItem {
        return this.state.value;
    }
    componentDidUpdate(prevProps: Readonly<IMenuItemProps>, prevState: Readonly<IMenuItemState>, snapshot?: any): void {
        if (prevProps.defaultValue !== this.props.defaultValue) {
            const newValue = this.props.defaultValue ? JSON.parse(JSON.stringify(this.props.defaultValue)) : this.new();
            for (const option of newValue.options) {
                if (option.includeOptions !== undefined) option.includeOptions = option.includeOptions.filter((incOption: any) => incOption.default !== undefined && incOption.default);
            }
            newValue.containers = this.props.defaultValue?.containers.filter(container => container.default !== undefined && container.default) || [];
            this.setState({
                value: newValue,
            });
        }
    }
    onCheckOptions(chapter: Types.IMLString, label: Types.IMLString, checked: boolean) {
        const newState = this.state;
        const option = this.value?.options.find(opt => this.toString(chapter) === this.toString(opt.name));
        console.log("Option found:", option);
        if (option !== undefined) option.includeOptions = [];
        const optOrigin = this.props.defaultValue?.options.find(opt => this.toString(chapter) === this.toString(opt.name));
        if (optOrigin !== undefined) {
            const incOptionOrigin = optOrigin.includeOptions?.find(opt => this.toString(opt.name) === this.toString(label));
            if (incOptionOrigin !== undefined && option !== undefined) {
                option.includeOptions?.push(JSON.parse(JSON.stringify(incOptionOrigin)));
            }
        }
        if (option?.includeOptions?.length === 0) {
            console.log("No include options selected, removing includeOptions array");
        }
        this.setState(newState);

    }
    onCheckContainerOptions(label: Types.IMLString, checked: boolean) {
        const newState = this.state;
        const containerOrigin = this.props.defaultValue?.containers.find(c => this.toString(c.name) === this.toString(label));
        if (containerOrigin !== undefined) {
            newState.value.containers = [JSON.parse(JSON.stringify(containerOrigin))];
        }
        this.setState(newState);
    }
    render(): ReactNode {
        const product = products.find(p => p.id === this.value.mealId);
        const photo = articleImages.find(photo => {
            if (new RegExp(photo.regexp).test(MenuItem.article(this.value))) {
                return true;
            }
            return false;
        });
        const amount = MenuItem.amount(this.value);
        return <div className="menuitem-container">
            {product !== undefined? <div><div className="menuitem-title">{this.toString(product.name)} {amount.product} RSD/{this.ML("pc")}</div><span>{this.ML("Container deposit (refundable)")} {amount.deposit} RSD/{this.ML("pc")} </span></div> : null}
            {this.props.defaultValue?.options.map((option, index) => {
                const optVal = this.value.options.find(opt => this.toString(opt.name) === this.toString(option.name));
                return (<div key={index} className="menuitem-option">
                    <span className="menuitem-option-name">{this.toString(option.name)}</span>
                    {option.includeOptions? <div className="menuitem-option-include">
                        {option.includeOptions.map((includeOption, includeIndex) => (
                            <div key={includeIndex} className="menuitem-option-include-item">
                                <Radio
                                    lang={this.getLanguage()}
                                    key={`${this.value.mealId}-${index}-${includeIndex}`}
                                    label={includeOption.name}
                                    checked={optVal?.includeOptions?.find((opt: IMealOption) => this.toString(opt.name) === this.toString(includeOption.name))!== undefined}
                                    onChange={(label, checked) => {
                                        console.log("Include option changed:", label, checked);
                                        this.onCheckOptions(option.name, label, checked);
                                    }}
                                />
                                {includeOption.amount !== undefined && includeOption.amount > 0 ? <span> +{includeOption.amount} {includeOption.currency? this.toString(includeOption.currency) : null}</span> : null}   
                            </div>
                        ))}
                    </div> : null}
                </div>);
            })}
            <div className="menuitem-option">
                <div className="menuitem-option-name">{this.ML("Packaging")}</div>
                <div className="menuitem-containers-list">
                    {this.props.defaultValue?.containers?.map((container, index) => (
                        <div key={index} className="menuitem-option-include-item">
                            <Radio
                                key={`${this.value.mealId}-container-${index}`}
                                label={`${this.toString(container.name)} (${container.weight}g) ${container.amount > 0? `+${container.amount} ${container.currency ? this.toString(container.currency) : null} `: ""}${container.deposit? `${this.ML("deposit")}` :""}`}
                                checked={this.value.containers?.find(c => this.toString(c.name) === this.toString(container.name)) !== undefined}
                                onChange={(label, checked) => {
                                    console.log("Container option changed:", label, checked);
                                    this.onCheckContainerOptions(container.name, checked);
                                }}
                            />
                        </div>
                    ))}
                </div>
            </div>
            <div className="menuitem-article">
                <div>{this.ML("Article")}: {MenuItem.article(this.value)}</div>
                <div><img src={photo?.url} alt={MenuItem.article(this.value)} /></div>

            </div>
        </div>
    }
}