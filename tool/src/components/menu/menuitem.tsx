import { ReactNode } from "react";
import Proto, { IProtoProps, IProtoState, ViewModeCode } from "../proto";
import "./menuitem.css";
import Meal, { IMealProps, IMealState } from "./meal";
import { Types } from "@betypes/prototypes";
import { IMeal, IMealOption, IMenuItem } from "@betypes/eaterytypes";
import MLStringEditor from "../mlstring/mlstring";
import React from "react";

export interface IMenuItemProps extends IProtoProps {
	defaultValue?: IMenuItem;
	admin?: boolean;
	editMode?: boolean;
	onSave?: (newValue: IMenuItem) => void;
	onChange?: (newValue: IMenuItem) => void;
	onSelectOption?: (meal: IMeal, option: IMealOption) => void;
	onUp?: (menuItemId: Types.ObjectId) => void;
	onDown?: (menuItemId: Types.ObjectId) => void;
	onDelete?: (menuItemId: Types.ObjectId) => void;
	viewMode?: ViewModeCode;
	className?: string;
}
export interface IMenuItemState extends IProtoState {
	value: IMenuItem;
	editMode?: boolean;
	changed?: boolean;
	currentOptionSelected?: number;
	viewMode: ViewModeCode;
}

export default class MenuItem extends Proto<IMenuItemProps, IMenuItemState> {
	protected mealRef: React.RefObject<Meal | null> = React.createRef();
	optionIds: number[] = [];
	state: IMenuItemState = {
		value: this.props.defaultValue !== undefined ? this.props.defaultValue : this.new(),
		editMode: this.props.editMode,
		viewMode: this.props.viewMode !== undefined ? this.props.viewMode : ViewModeCode.normal,
	};
	new(): IMenuItem {
		return {
			options: [],
		};
	}
	hashOption(x: number): string {
		while (this.optionIds.length - 1 < x) this.optionIds.push(Math.random());
		return `${this.optionIds[x]}_${x}`;
	}
	renderEditMode(): ReactNode {
		return (
			<span className="menu-item-admin-container has-caption">
				<span className="caption">Menu item</span>
				<Meal mealId={this.state.value.mealId} />
				<div className="menu-item-admin-options-list-container has-caption">
					<span className="caption">Options</span>
					<div className="toolbar">
						<span
							onClick={event => {
								const nState = this.state;
								if (nState.value.options === undefined) nState.value.options = [];
								nState.value.options.push({
									name: "",
									amount: 0,
									currency: "",
								});
								this.setState(nState);
							}}>
							+
						</span>
						<span>?</span>
					</div>
					<div className="menu-item-admin-options-list">
						{this.state.value?.options?.map((option, idx) => (
							<span className="has-caption" key={this.hashOption(idx)}>
								<MLStringEditor
									defaultValue={option.name}
									caption="Option name"
									onChange={newValue => {
										const nState = this.state;
										if (nState.value === undefined) return;
										nState.changed = true;
										nState.value.options[idx].name = newValue;
										this.setState(nState);
										if (this.props.onChange !== undefined) this.props.onChange(this.state.value);
									}}
								/>
								<input
									type="number"
									placeholder="Amount"
									defaultValue={option.amount}
									onChange={event => {
										const nv = parseFloat(event.currentTarget.value);
										if (!isNaN(nv)) {
											const nState = this.state;
											nState.changed = true;
											nState.value.options[idx].amount = nv;
											this.setState(nState);
											if (this.props.onChange !== undefined) this.props.onChange(this.state.value);
										}
									}}></input>
								<MLStringEditor
									defaultValue={option.currency}
									caption="Currency"
									onChange={newValue => {
										const nState = this.state;
										if (nState.value === undefined) return;
										nState.changed = true;
										nState.value.options[idx].currency = newValue;
										this.setState(nState);
										if (this.props.onChange !== undefined) this.props.onChange(this.state.value);
									}}
								/>
								<span className="toolbar">
									{idx !== 0 ? (
										<span
											onClick={event => {
												//debugger
												this.state.value?.options.splice(idx - 1, 0, ...this.state.value?.options.splice(idx, 1));
												this.optionIds.splice(idx - 1, 0, ...this.optionIds.splice(idx, 1));
												this.setState(this.state);
												if (this.props.onChange !== undefined) this.props.onChange(this.state.value);
											}}>
											↑
										</span>
									) : (
										<></>
									)}
									{idx !== this.state.value?.options.length - 1 ? (
										<span
											onClick={event => {
												this.state.value?.options.splice(idx + 1, 0, ...this.state.value?.options.splice(idx, 1));
												this.optionIds.splice(idx + 1, 0, ...this.optionIds.splice(idx, 1));
												this.setState(this.state);
												if (this.props.onChange !== undefined) this.props.onChange(this.state.value);
											}}>
											↓
										</span>
									) : (
										<></>
									)}
									<span
										onClick={event => {
											const nState = this.state;
											nState.value.options.splice(idx, 1);
											if (this.props.onChange !== undefined) this.props.onChange(this.state.value);
											this.setState(nState);
										}}>
										<span style={{ transform: "rotate(45deg)", display: "block" }}>+</span>
									</span>
								</span>
							</span>
						))}
					</div>
				</div>
			</span>
		);
	}
	renderCompact(): ReactNode {
		return (
			<div className={`menu-item-compact ${this.props.className !== undefined ? this.props.className : ""}`}>
				<Meal mealId={this.state.value.mealId} viewMode={ViewModeCode.compact} />
			</div>
		);
	}
	render(): ReactNode {
		if (this.state.editMode) return this.renderEditMode();
		if (this.state.viewMode === ViewModeCode.compact) return this.renderCompact();
		return (
			<span className={`menu-item-container${this.state.viewMode === ViewModeCode.maximized ? " maximized" : ""}`}>
				<Meal mealId={this.state.value.mealId} ref={this.mealRef} onViewModeChange={(oldV, newV) => this.setState({ ...this.state, viewMode: newV })} />
				<div className="menu-item-options">
					{this.state.value.options?.map((option, idx) => (
						<span
							className={`menu-item-option${this.state.currentOptionSelected === idx ? " selected" : ""}`}
							key={idx}
							data-option-id={idx}
							onClick={event => {
								const optionId = event.currentTarget.attributes.getNamedItem("data-option-id")?.value;
								if (optionId !== undefined) {
									const nState = this.state;
									nState.currentOptionSelected = parseInt(optionId);
									this.setState(nState);
									if (this.props.onSelectOption && this.mealRef.current) this.props.onSelectOption(this.mealRef.current.value, this.state.value.options[parseInt(optionId)]);
								}
							}}
							style={this.state.viewMode === ViewModeCode.maximized ? { fontSize: "150%" } : {}}>
							<span style={{ gridRow: "1 / 3" }}>{this.state.currentOptionSelected === idx ? "☑" : "☐"}</span>
							<span className="menu-item-option-volume">{this.toString(option.name)}</span>
							<span className="menu-item-option-price">
								{this.toCurrency(option.amount)} {this.toString(option.currency)}
							</span>
						</span>
					))}
				</div>
			</span>
		);
	}
}
