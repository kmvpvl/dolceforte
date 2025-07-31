import { IUser } from "@betypes/user";
import "./login.css";
import React, { FormEventHandler } from "react";
import Proto, { IProtoProps, IProtoState } from "../proto";
import { IPhoto } from "@betypes/common";
import Avatar from "./avatar";

enum LoginModeType {
	SignIn = "SignIn",
	CreateAccount = "CreateAccount",
	ForgotPassword = "ForgotPassword",
}

export interface ILoginProps extends IProtoProps {
	onSignInPressed?: (name: string, password: string) => void;
	onCreateAccountPressed?: (name: string, password: string, email: string, photo?: IPhoto) => void;
	onForgotPasswordPressed?: (email: string) => void;
	mode?: LoginModeType;
}

export interface ILoginState extends IProtoState {
	mode: LoginModeType;
}

export default class Login extends Proto<ILoginProps, ILoginState> {
	avatarRef = React.createRef<Avatar>();
	state: ILoginState = {
		mode: this.props.mode || LoginModeType.SignIn,
	};

	renderCreateAccount(): React.ReactNode {
		return (
			<form
				name="createAccount"
				className="login-create-account"
				onSubmit={event => {
					event.preventDefault();
					const formData = new FormData(event.currentTarget);
					const name = formData.get("username") as string;
					const password = formData.get("password") as string;
					const repeatPassword = formData.get("repeatPassword") as string;
					const photo = this.avatarRef.current?.value ? { url: this.avatarRef.current?.value } : undefined;
					const email = formData.get("email") as string;
					if (password !== repeatPassword) {
						// Handle password mismatch
					}
					if (this.props.onCreateAccountPressed) {
						this.props.onCreateAccountPressed(name, password, email, photo);
					}
				}}>
				<h2>{this.ML("Create Account")}</h2>
				<span>
					{this.ML("Profile Picture")}
					<Avatar ref={this.avatarRef} />
				</span>
				<input id="create-username" placeholder={this.ML("Name")} type="text" name="username" autoComplete="username" />
				<input id="create-password" type="password" placeholder={this.ML("Password")} name="password" autoComplete="new-password" />
				<input id="create-repeatPassword" type="password" placeholder={this.ML("Repeat Password")} name="repeatPassword" autoComplete="new-password" />
				<input id="create-email" type="email" placeholder={this.ML("E-mail")} name="email" autoComplete="email" />
				<button type="submit">{this.ML("Create Account")}</button>
				<button type="button" onClick={() => this.setState({ mode: LoginModeType.SignIn })}>
					{this.ML("I already have an account and want to access from a new device")}
				</button>
			</form>
		);
	}

	renderForgotPassword(): React.ReactNode {
		return (
			<form
				name="forgotPassword"
				className="login-forgot-password"
				onSubmit={event => {
					event.preventDefault();
					const formData = new FormData(event.currentTarget);
					const email = formData.get("email") as string;
					if (this.props.onForgotPasswordPressed) {
						this.props.onForgotPasswordPressed(email);
					}
				}}>
				<h2>{this.ML("Forgot Password")}</h2>
				<input type="email" placeholder={this.ML("E-mail")} name="email" />
				<button
					type="submit"
					onClick={() => {
						const email = (document.querySelector("input[name='email']") as HTMLInputElement).value;
						if (this.props.onForgotPasswordPressed) {
							this.props.onForgotPasswordPressed(email);
						}
					}}>
					{this.ML("Reset Password")}
				</button>
				<button type="button" onClick={() => this.setState({ mode: LoginModeType.SignIn })}>
					{this.ML("Back to Sign In")}
				</button>
			</form>
		);
	}

	renderSignIn() {
		return (
			<form
				name="signIn"
				className="login-sign-in"
				onSubmit={event => {
					event.preventDefault();
					const formData = new FormData(event.currentTarget);
					const username = formData.get("username") as string;
					const password = formData.get("password") as string;
					if (this.props.onSignInPressed) {
						this.props.onSignInPressed(username, password);
					}
				}}>
				<h2>{this.ML("Sign In")}</h2>
				<input type="text" id="signin-username" name="username" placeholder={this.ML("Username")} autoComplete="username" />
				<input id="signin-password" type="password" name="password" placeholder={this.ML("Password")} autoComplete="current-password" />
				<button type="submit">{this.ML("Login")}</button>
				<button type="button" onClick={() => this.setState({ mode: LoginModeType.CreateAccount })}>
					{this.ML("Create Account")}
				</button>
				<button type="button" onClick={() => this.setState({ mode: LoginModeType.ForgotPassword })}>
					{this.ML("Forgot Password")}
				</button>
			</form>
		);
	}
	render(): React.ReactNode {
		switch (this.state.mode) {
			case LoginModeType.SignIn:
				return this.renderSignIn();
			case LoginModeType.CreateAccount:
				return this.renderCreateAccount();
			case LoginModeType.ForgotPassword:
				return this.renderForgotPassword();
			default:
				return null;
		}
	}
}
