import React, { ReactNode } from "react";
import "./toast.css";
/** ToastUID is type of unique identificator of the toast. It's used in events referenced with Toasts */
type ToastUID = number;

/** Properties of ReactJS component Toaster */
export interface IToasterProps {
	/** The count of places to arrange the toasts. This property is the count of toasts which are visible simultaneously*/
	placesCount: number;
}
interface IToastButton {
	default?: boolean;
	text: string;
	callback: () => void;
}
/**Interface for new toast creation */
interface IToast {
	/** One of three types: info, warning, or error*/
	type: ToastType;
	/**Reserved for future use */
	code?: number;
	/**Main message of toast. It's always visible if the toast is visible */
	message: string | ReactNode;
	/**Extra message. If description is defined then Toast has ∴ button. User can see the description if ∴ button clicked by user. */
	description?: string | ReactNode;
	/**Count of seconds when the toast will be dissapeared without the user interaction. If autohide is undefined and the type of Toast is info, then Toaster set the 3 seconds to autohide as default */
	autohide?: number;
	/**If this parameter is set true then the Toast won't be deleted from Toaster on hide event. It will be marked as shown and will be saved in the Toaster for future use */
	saveInHistory?: boolean;
	/**If Toaster has at least one not shown modal Toast then Toaster covers all accessible area and prohibit interaction with other elements on page. Use modal parameter if you want stop user interaction while user reads the message and close the Toast */
	modal?: boolean;
	/**Buttons and their callback functions */
	buttons?: IToastButton[];
}
/** Added extra properties for queue in Toaster */
interface IToastExtProps extends IToast {
	shown: boolean;
	uid: ToastUID;
}

export interface IToasterState {
	toasts: Array<IToastExtProps>;
}
export enum ToastType {
	error = "error",
	warning = "warning",
	info = "info",
	success = "success",
}

export default class Toaster extends React.Component<IToasterProps, IToasterState> {
	private toastCounter: ToastUID = 0;
	state: IToasterState = {
		toasts: [],
	};
	public addToast(toast: IToast) {
		const nState: IToasterState = this.state;
		const extToast: IToastExtProps = {
			shown: false,
			uid: this.toastCounter++,
			...toast,
		};
		if (extToast.autohide === undefined && (extToast.type === ToastType.info || extToast.type === ToastType.success) && !extToast.modal) extToast.autohide = 5;
		nState.toasts.push(extToast);
		this.setState(nState);
		if (extToast.autohide !== undefined) {
			setTimeout(this.onHide.bind(this, extToast.uid), extToast.autohide * 1000);
		}
	}
	onHide(uidToast: ToastUID) {
		const nState: IToasterState = this.state;
		const found = nState.toasts.findIndex(toast => toast.uid === uidToast);
		if (found !== -1) {
			if (nState.toasts[found].saveInHistory) {
				nState.toasts[found].shown = true;
			} else nState.toasts.splice(found, 1);
		}
		this.setState(nState);
	}
	render(): React.ReactNode {
		const countModal = this.state.toasts.filter(t => !t.shown && t.modal).length;
		const countToShow = this.state.toasts.filter(t => !t.shown).length;
		return (
			<div className={`toasts-container${countModal > 0 ? "-modal" : ""}`} style={countToShow === 0 ? { display: "none" } : {}}>
				{countModal > 0 ? <div className="toasts-fade"></div> : <></>}
				<div className="toast-container-center">
					{this.props.placesCount < countToShow ? <span className="toast-container-count-label">Hide all {countToShow > 9 ? "9+" : countToShow}</span> : <></>}
					{this.state.toasts
						.filter(toast => !toast.shown)
						.filter((t, i) => i < this.props.placesCount && t)
						.map(toast => (
							<Toast key={toast.uid} {...toast} onHide={this.onHide.bind(this)} />
						))}
				</div>
			</div>
		);
	}
}

export interface IToastProps extends IToast {
	onHide?: (uid: ToastUID) => void;
	uid: ToastUID;
}
export interface IToastState {
	showDescription: boolean;
}

export class Toast extends React.Component<IToastProps, IToastState> {
	state: IToastState = {
		showDescription: false,
	};
	toggleDescription() {
		const nState: IToastState = this.state;
		nState.showDescription = !nState.showDescription;
		nState.showDescription = this.props.description !== undefined ? nState.showDescription : false;
		this.setState(nState);
	}
	onButtonClick(button: IToastButton) {
		if (this.props.onHide) this.props.onHide(this.props.uid);
		button.callback();
	}
	render(): React.ReactNode {
		return (
			<div className={`toast-container-${this.props.type}`}>
				<span
					onClick={() => {
						if (this.props.onHide) this.props.onHide(this.props.uid);
					}}
					className="toast-close-button">
					<span>+</span>
				</span>
				{/*<span className="toast-copy-button"></span>*/}
				{this.props.description !== undefined ? (
					<span onClick={this.toggleDescription.bind(this)} className={`toast-description-button${this.state.showDescription ? "-selected" : ""}`}>
						<span>∴</span>
					</span>
				) : (
					<></>
				)}
				<div className="toast-message">{this.props.message}</div>
				{this.state.showDescription ? <div className="toast-description">{this.props.description}</div> : <></>}
				{this.props.buttons !== undefined ? (
					<div className="toast-buttons-container">
						{this.props.buttons.map((button, idx) => (
							<button className={button.default ? "default" : ""} key={idx} onClick={this.onButtonClick.bind(this, button)}>
								{button.text}
							</button>
						))}
					</div>
				) : (
					<></>
				)}
			</div>
		);
	}
}
