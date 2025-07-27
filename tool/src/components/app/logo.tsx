import { ReactNode } from "react";
import "./logo.css";
import React from "react";
import { ViewModeCode } from "../proto";

export interface ILogoProps {
	onClick?: () => void;
	className?: string;
	width?: string;
	viewMode?: ViewModeCode;
}
export interface ILogoState {
	viewMode: ViewModeCode;
}

export default class Logo extends React.Component<ILogoProps, ILogoState> {
	state: Readonly<ILogoState> = {
		viewMode: this.props.viewMode === undefined ? ViewModeCode.normal : this.props.viewMode,
	};
	render(): ReactNode {
		return (
			<div
				className={`logo-container ${this.props.className !== undefined ? this.props.className : ""}`}
				onClick={event => {
					if (this.props.onClick !== undefined) this.props.onClick();
				}}>
				<div style={this.props.width !== undefined ? { width: this.props.width } : {}}>
					<img src="./exp.svg" />
				</div>
				{this.state.viewMode !== ViewModeCode.compact ? <div className="cinzel-regular">DolceForte</div> : <></>}
			</div>
		);
	}
}
