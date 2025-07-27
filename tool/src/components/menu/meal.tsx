import "./meal.css";
import { ReactNode } from "react";
import Proto, { IProtoProps, IProtoState, ViewModeCode } from "../proto";

import { IMeal } from "@betypes/meal";
import MLStringEditor from "../mlstring/mlstring";
import Photos from "../photos/photos";
import Tags from "../tags/tags";
import { Types } from "@betypes/common";

export interface IMealProps extends IProtoProps {
	mealId?: Types.ObjectId;
	defaultValue?: IMeal;
	admin?: boolean;
	viewMode?: ViewModeCode;
	editMode?: boolean;
	onSave?: (newValue: IMeal) => void;
	onChange?: (newValue: IMeal) => void;
	onViewModeChange?: (oldValue: ViewModeCode, newValue: ViewModeCode) => void;
}

export interface IMealState extends IProtoState {
	editMode: boolean;
	value: IMeal;
	changed?: boolean;
	viewMode: ViewModeCode;
}

export default class Meal extends Proto<IMealProps, IMealState> {
	state: IMealState = {
		value: this.props.defaultValue ? this.props.defaultValue : this.new(),
		viewMode: this.props.viewMode !== undefined ? this.props.viewMode : ViewModeCode.normal,
		editMode: this.props.editMode !== undefined ? this.props.editMode : false,
	};

	componentDidMount(): void {
		if (this.props.defaultValue === undefined && this.props.mealId !== undefined) this.load();
	}

	new(): IMeal {
		const newMeal: IMeal = {
			name: "New meal",
			description: "Mew meal description. Add photo!",
			photos: [],
		};
		return newMeal;
	}

	protected load() {
		this.serverCommand(
			"meal/view",
			JSON.stringify({ id: this.props.mealId }),
			res => {
				if (!res.ok) return;
				const nState = this.state;
				nState.changed = false;
				nState.value = res.meal;
				this.setState(nState);
			},
			err => {}
		);
	}

	protected save() {
		this.serverCommand(
			"meal/update",
			JSON.stringify(this.state.value),
			res => {
				if (!res.ok) return;
				if (this.props.onSave !== undefined) this.props.onSave(res.meal);
				const nState = this.state;
				nState.value = res.meal;
				nState.changed = false;
				this.setState(nState);
			},
			err => {}
		);
	}

	get value(): IMeal {
		return this.state.value;
	}

	renderEditMode(): ReactNode {
		return (
			<div className="meal-admin-container has-caption">
				<div className="caption">MEAL: {this.toString(this.state.value.name)}</div>
				<div className="toolbar">
					<span
						onClick={event => {
							if (this.state.value.id !== undefined) {
								const nState = this.state;
								nState.value.blocked = true;
								this.setState(nState);
								this.save();
							}
						}}>
						<span style={{ transform: "rotate(45deg)", display: "block" }}>+</span>
					</span>
					<span
						onClick={event => {
							const nState = this.state;
							nState.editMode = false;
							this.setState(nState);
						}}>
						❖
					</span>
					<span
						onClick={event => {
							navigator.clipboard.writeText(JSON.stringify(this.state.value, undefined, 4));
						}}>
						⚯
					</span>
					<span onClick={this.save.bind(this)}>
						<i className="fa fa-save" style={this.state.changed ? { color: "red" } : {}} />
					</span>
				</div>
				<div className="meal-admin-requisites-container has-caption">
					<span className="caption">Requisites</span>
					<MLStringEditor
						defaultValue={this.state.value?.name}
						caption="Name"
						onChange={newVal => {
							const nState = this.state;
							nState.changed = true;
							nState.value.name = newVal;
							this.setState(nState);
						}}
					/>
					<MLStringEditor
						className="meal-admin-requisites-description"
						defaultValue={this.state.value?.description}
						caption="Description"
						onChange={newValue => {
							const nState = this.state;
							nState.value.description = newValue;
							nState.changed = true;
							this.setState(nState);
						}}
					/>
				</div>
				<Photos
					editMode={true}
					defaultValue={this.state.value.photos}
					onChange={newPhotos => {
						const nState = this.state;
						nState.value.photos = newPhotos;
						nState.changed = true;
						this.setState(nState);
					}}
				/>
			</div>
		);
	}

	renderCompact(): ReactNode {
		return (
			<div className="meal-container-compact">
				<span>{this.props.mealId !== undefined && this.state.value.id === undefined ? "" : this.toString(this.state.value.name)}</span>
			</div>
		);
	}

	render(): ReactNode {
		if (this.state.editMode) return this.renderEditMode();
		if (this.state.viewMode === ViewModeCode.compact) return this.renderCompact();
		return (
			<span
				className={`meal-container${this.state.viewMode === ViewModeCode.maximized ? " maximized" : ""}`}
				draggable={true}
				onDragStart={event => {
					event.dataTransfer.setData("coodfort/meal", JSON.stringify(this.state.value));
					console.log("dragstart", event);
				}}>
				<div className="meal-meal-name">
					<span>{this.props.mealId !== undefined && this.state.value.id === undefined ? "" : this.toString(this.state.value.name)}</span>
				</div>
				<div className="meal-meal-description">{this.props.mealId !== undefined && this.state.value.id === undefined ? "Loading..." : this.toString(this.state.value.description)}</div>
				{this.state.value.photos !== undefined ? <Photos defaultValue={this.state.value.photos} /> : <span />}
				<div className="meal-price-notice"><span>{this.ML("From 150 RSD/100g")}</span><span className="df-button-bottlegreen-inverse">{this.ML("Configure yours")}</span></div>
				<div className="context-toolbar">
					{this.props.admin ? (
						<span
							onClick={event => {
								const nState = this.state;
								nState.editMode = !this.state.editMode;
								this.setState(nState);
							}}>
							✎
						</span>
					) : (
						<></>
					)}
				</div>
			</span>
		);
	}
}
