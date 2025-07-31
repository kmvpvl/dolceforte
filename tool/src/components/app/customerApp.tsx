import { ReactNode } from "react";
import Proto, { IProtoProps, IProtoState, ProtoErrorCode, ServerStatusCode } from "../proto";
import "./customerApp.css";
import Pending from "../pending";
import Toaster, { ToastType } from "../toast";
import Pinger from "../pinger/pinger";
import React from "react";
import Login from "../auth/login";
import { IPhoto } from "@betypes/common";
import User from "../user/user";
import LangSelector from "./langselector";
export interface ICustomerAppProps extends IProtoProps {}

export interface ICustomerAppState extends IProtoState {
	needSignIn?: boolean;
}

export default class CustomerApp extends Proto<ICustomerAppProps, ICustomerAppState> {
	state: Readonly<ICustomerAppState> = {
		needSignIn: false,
	};
	protected toasterRef = React.createRef<Toaster>();
	protected pingerRef = React.createRef<Pinger>();
	componentDidMount(): void {
		document.title = "COODFort: Customer tool";
	}
	init(token?: string): void {
		this.login(
			token,
			res => {},
			err => {
				switch (err.json.code) {
					case ProtoErrorCode.authDataExpected:
						console.log("Unauthorized user");
						this.setState({ ...this.state, serverStatus: ServerStatusCode.connected, needSignIn: true });
						break;
					case ProtoErrorCode.httpError:
						switch (err.json.httpCode) {
							case 404:
								// new user
								break;
							case 401:
								// existing user wrong login
								break;
							default:
						}
						break;
					case ProtoErrorCode.serverBroken:
						this.setState({ ...this.state, serverStatus: ServerStatusCode.notAvailable });
						break;
					case ProtoErrorCode.serverNotAvailable:
					default:
						this.setState({ ...this.state, serverStatus: ServerStatusCode.notAvailable });
						break;
				}
			}
		);
	}
	renderSignIn(): ReactNode {
		return (
			<div className="customerapp-signin">
				<Login
					onSignInPressed={(username, password) => {
						this.signIn(username, password);
					}}
					onCreateAccountPressed={(username, password, email, photo) => {
						this.createAccount(username, password, email, photo);
					}}
					onForgotPasswordPressed={email => {
						this.forgotPassword(email);
					}}
				/>
			</div>
		);
	}
	signIn(username: string, password: string) {
		this.init(`${username}:${password}`);
	}
	createAccount(username: string, password: string, email: string, photo?: IPhoto) {
		this.pendingRef.current?.incUse();
		const headers: Headers = new Headers();
		headers.append("cf-login", username);
		headers.append("cf-password", password);
		this.serverCommand(
			"user/new",
			JSON.stringify({
				login: username,
				password: password,
				name: username,
				photo: photo,
				email: email,
			}),
			res => {
				this.pendingRef.current?.decUse();
				if (res.ok) {
					this.setState({ ...this.state, needSignIn: true });
					this.toasterRef.current?.addToast({ message: "Account created successfully", type: ToastType.success });
				} else {
					this.toasterRef.current?.addToast({ message: `Error: ${res.error.message}`, type: ToastType.error });
				}
			},
			err => {
				this.pendingRef.current?.decUse();
				this.toasterRef.current?.addToast({ message: `Error: ${err.message}`, type: ToastType.error });
			},
			`${username}:${password}`
		);
	}
	forgotPassword(email: string) {
		throw new Error("Method not implemented.");
	}
	renderMain(): ReactNode {
		return (
			<div className="customerapp-main">
				<h1>Welcome to the Customer App</h1>
				<User defaultValue={this.state.user} />
			</div>
		);
	}
	render(): ReactNode {
		let content: ReactNode | undefined;
		switch (this.state.serverStatus) {
			case ServerStatusCode.connected:
				content = this.state.needSignIn ? this.renderSignIn() : this.renderMain();
				break;
			case ServerStatusCode.notAvailable:
				content = <div className="customerapp-error">Server is not available</div>;
				break;
			default:
				content = <div className="customerapp-loading">Loading...</div>;
		}
		return (
			<div className="customerapp-container">
				{content}
				<Pending ref={this.pendingRef} />
				<Toaster placesCount={3} ref={this.toasterRef} />
				<Pinger
					ref={this.pingerRef}
					onConnect={() => {
						this.init();
					}}
					onDisconnect={() => {
						console.error("Disconnected from server");
						this.setState({ ...this.state, serverStatus: ServerStatusCode.notAvailable });
					}}
				/>
				<LangSelector />
			</div>
		);
	}
}
