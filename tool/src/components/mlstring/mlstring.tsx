import "./mlstring.css";
import React, { RefObject } from "react";
import { Types } from "@betypes/common";
import { ViewModeCode } from "../proto";

export interface IMLStringEditorProps {
	defaultValue?: Types.IMLString;
	caption?: string;
	onChange?: (newMLString: Types.IMLString) => void;
	className?: string;
	viewMode?: ViewModeCode;
}

export interface IMLStringEditorState {
	value: Types.IMLString;
	viewMode: ViewModeCode;
	curLanguageIndex: number;
}

export default class MLStringEditor extends React.Component<IMLStringEditorProps, IMLStringEditorState> {
	state: IMLStringEditorState = {
		value: this.props.defaultValue !== undefined ? this.props.defaultValue : "",
		viewMode: this.props.viewMode !== undefined ? this.props.viewMode : ViewModeCode.compact,
		curLanguageIndex: -1,
	};
	compactEditRef: RefObject<HTMLInputElement | null> = React.createRef();
	compactNewLangRef: RefObject<HTMLSelectElement | null> = React.createRef();
	componentDidUpdate(prevProps: Readonly<IMLStringEditorProps>, prevState: Readonly<IMLStringEditorState>, snapshot?: any): void {
		if (this.state.viewMode === ViewModeCode.compact) {
			if (typeof this.state.value === "object" && this.state.value.values.filter(el => el[0] === "").length > 0) {
				this.compactNewLangRef.current?.focus();
			}
		}
	}
	get value(): Types.IMLString {
		return this.state.value;
	}
	get languages(): Array<string> {
		return (process.env.LANGUAGES !== undefined ? process.env.LANGUAGES : "en,ru,sr").split(",");
	}
	renderCompact(): React.ReactNode {
		const ret = (
			<div className="mlstring-editor-compact">
				<span>{this.props.caption}</span>
				<span>
					{typeof this.state.value !== "string" ? (
						<span
							onClick={event => {
								this.setState({ ...this.state, curLanguageIndex: -1 });
							}}
							className={this.state.curLanguageIndex === -1 ? "selected" : ""}>
							default
						</span>
					) : (
						<></>
					)}
					{typeof this.state.value !== "string" ? (
						this.state.value.values.map((v, idx) => {
							if (this.state.curLanguageIndex === idx || v[0] === "")
								return (
									<select
										key={`sel_${idx}`}
										ref={this.compactNewLangRef}
										defaultValue={v[0]}
										onChange={event => {
											const nState = this.state;
											(nState.value as any).values[idx][0] = event.currentTarget.value;
											this.setState(nState);
											if (this.props.onChange !== undefined) this.props.onChange(this.value);
											if (event.currentTarget.value !== "") this.compactEditRef.current?.focus();
										}}>
										<option key={-1}></option>
										{this.languages.map((v, i) => (
											<option key={i} value={v}>
												{v}
											</option>
										))}
									</select>
								);
							else
								return (
									<span
										data-idx={idx}
										key={idx}
										onClick={event => {
											const idx_str = event.currentTarget.getAttribute("data-idx");
											if (idx_str) this.setState({ ...this.state, curLanguageIndex: parseInt(idx_str) });
										}}>
										{v[0]}
									</span>
								);
						})
					) : (
						<></>
					)}
					<label>|</label>
					<span onClick={this.addNewLanguage.bind(this)}>+</span>
					{this.state.curLanguageIndex > -1 ? (
						<span
							onClick={event => {
								const nState = this.state;
								(nState.value as any).values.splice(this.state.curLanguageIndex, 1);
								nState.curLanguageIndex = -1;
								if (this.props.onChange !== undefined) this.props.onChange(this.value);
								this.setState(nState);
							}}>
							<span style={{ transform: "rotate(45deg)", display: "block" }}>+</span>
						</span>
					) : (
						<></>
					)}
				</span>
				<input
					type="text"
					ref={this.compactEditRef}
					key={this.state.curLanguageIndex}
					defaultValue={typeof this.state.value === "string" ? (this.state.value as string) : this.state.curLanguageIndex === -1 ? this.state.value?.default : this.state.value.values[this.state.curLanguageIndex][1]}
					onChange={event => {
						const nState = this.state;
						if (nState.curLanguageIndex === -1) {
							if (typeof nState.value === "string") nState.value = event.currentTarget.value;
							else (nState.value as any).default = event.currentTarget.value;
						} else (nState.value as any).values[this.state.curLanguageIndex][1] = event.currentTarget.value;
						//this.setState(nState);
						if (this.props.onChange !== undefined) this.props.onChange(this.value);
					}}
				/>
			</div>
		);
		return ret;
	}
	addNewLanguage() {
		if (this.state.value !== undefined) {
			const nState = this.state;
			if (typeof nState.value !== "object") {
				(nState.value as any) = {
					default: nState.value,
					values: [["", ""]],
				};
			} else {
				if ((nState.value as any).values.filter((v: any) => v[0] === "").length === 0) (nState.value as any).values.push(["", ""]);
			}
			nState.curLanguageIndex = (nState.value as any).values.length - 1;
			this.setState(nState);
		}
	}
	render(): React.ReactNode {
		if (this.state.viewMode === ViewModeCode.compact) return this.renderCompact();
		return (
			<div className={`mlstring-editor-container has-caption ${this.props.className}`}>
				<div className="caption">{this.props.caption}</div>
				<div className="toolbar">
					<span onClick={this.addNewLanguage.bind(this)}>+</span>
				</div>
				<div className="mlstring-editor-default">
					<input
						defaultValue={typeof this.state.value === "string" ? (this.state.value as string) : this.state.value?.default}
						onChange={event => {
							const nState = this.state;

							if (typeof nState.value === "object") {
								nState.value.default = event.currentTarget.value;
							} else {
								(nState.value as any) = {
									default: event.currentTarget.value,
									values: [],
								};
							}
							if (this.props.onChange !== undefined) this.props.onChange(this.value);
							this.setState(nState);
						}}
					/>
				</div>
				{this.state.value !== undefined && (this.state.value as any).values !== undefined ? (
					(this.state.value as any).values.map((langString: any, idx: any) => (
						<div className="mlstring-editor-value" key={idx}>
							<div className="mlstring-editor-value-toolbar">
								<span
									data-value-index={idx}
									onClick={event => {
										const index = event.currentTarget.getAttribute("data-value-index");
										const nState = this.state;
										(nState.value as any).values.splice(index, 1);
										if (this.props.onChange !== undefined) this.props.onChange(this.value);
										this.setState(nState);
									}}>
									✖
								</span>
							</div>
							<select
								data-value-index={idx}
								defaultValue={langString[0]}
								onChange={event => {
									const index = event.currentTarget.getAttribute("data-value-index");
									const nState = this.state;
									if (index) {
										(nState.value as any).values[index][0] = event.currentTarget.value;
										if (this.props.onChange !== undefined) this.props.onChange(this.value);
										this.setState(nState);
									}
								}}>
								<option key={-1}></option>
								{this.languages.map((v, i) => (
									<option key={i} value={v}>
										{v}
									</option>
								))}
							</select>
							<input
								data-value-index={idx}
								defaultValue={langString[1]}
								onChange={event => {
									const index = event.currentTarget.getAttribute("data-value-index");
									const nState = this.state;
									if (index) {
										(nState.value as any).values[index][1] = event.currentTarget.value;
										if (this.props.onChange !== undefined) this.props.onChange(this.value);
										this.setState(nState);
									}
								}}></input>
						</div>
					))
				) : (
					<></>
				)}
			</div>
		);
	}
}
