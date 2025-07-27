import { ReactNode } from "react";
import "./pending.css";
import React from "react";

export interface IPendingProps {}
export interface IPendingState {
	deepCount: number;
}

export default class Pending extends React.Component<IPendingProps, IPendingState> {
	state: IPendingState = {
		deepCount: 0,
	};
	incUse() {
		const nState = this.state;
		nState.deepCount += 1;
		this.setState(nState);
	}
	decUse() {
		const nState = this.state;
		nState.deepCount -= 1;
		this.setState(nState);
	}
	render(): ReactNode {
		return (
			<>
				{this.state.deepCount > 0 ? (
					<div className="pending-container">
						<span></span>
						<span onClick={event => this.decUse()}>Loading...</span>
					</div>
				) : (
					<></>
				)}
			</>
		);
	}
}
