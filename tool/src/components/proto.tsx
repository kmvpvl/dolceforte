import React from "react";
import { Types } from "@betypes/common";
import { IUser } from "@betypes/user";
import MLString, { mlStrings } from "../model/mlstring";
import Toaster, { ToastType } from "./toast";
import Pending from "./pending";

export enum ProtoErrorCode {
	serverNotAvailable,
	httpError,
	authDataExpected,
	serverBroken,
}
class ProtoError extends Error {
	protected _code: ProtoErrorCode;
	protected _httpCode?: number;
	protected _serverError?: Types.IDocumentError;
	constructor(code: ProtoErrorCode, message: string, httpCode?: number, serverError?: Types.IDocumentError) {
		super(message);
		this._code = code;
		this._httpCode = httpCode;
		this._serverError = serverError;
	}
	get json() {
		return {
			code: this._code,
			message: this.message,
			httpCode: this._httpCode,
			serverError: this._serverError,
		};
	}
}
export enum ServerStatusCode {
	connecting,
	notAvailable,
	connected,
}

export interface IProtoProps {
	lang?: string;
	toaster?: React.RefObject<Toaster | null>;
	onSingIn?: (user: IUser) => void;
	onSignOut?: () => void;
	onSignError?: (err: ProtoError) => void;
}

export interface IProtoState {
	serverStatus?: ServerStatusCode;
	signedIn?: boolean;
	user?: IUser;
	lang?: string;
}
export default class Proto<IProps extends IProtoProps, IState extends IProtoState> extends React.Component<IProps, IState> {
	protected pendingRef: React.RefObject<Pending | null> = React.createRef();

	private get token(): string | undefined {
		const ls = localStorage.getItem("cftoken");
		return ls ? (ls as string) : undefined;
	}

	private getTokenPair(token?: string | null): [string | undefined, string | undefined] {
		if ((token === undefined || token === null) && this.token !== undefined) token = this.token;
		if (token) {
			const token_parts = token.split(":");
			const password = token_parts.pop();
			if (password !== undefined) {
				const login = token_parts.join(":");
				return [login, password];
			}
		}
		return [undefined, undefined];
	}

	login(token?: string, sucesscb?: (res: any) => void, failcb?: (err: ProtoError) => void) {
		if (token !== undefined) localStorage.setItem("cftoken", token);
		this.serverCommand(
			"user/view",
			undefined,
			res => {
				if (res.ok) {
					const nState: IState = this.state;
					nState.user = res.user;
					nState.signedIn = true;
					this.setState(nState);
					if (this.props.onSingIn !== undefined) this.props.onSingIn(res.user);
				}
				if (sucesscb !== undefined) sucesscb(res);
			},
			err => {
				if (this.props.onSignError !== undefined) this.props.onSignError(err);
				if (failcb !== undefined) failcb(err);
			}
		);
	}

	logoff() {
		localStorage.removeItem("cftoken");
		this.setState({ ...this.state, user: undefined });
		if (this.props.onSignOut !== undefined) this.props.onSignOut();
	}

	protected getLanguage(): string {
		if (window.Telegram?.WebApp.initDataUnsafe?.user?.language_code !== undefined) return window.Telegram.WebApp.initDataUnsafe.user.language_code;
		if (this.props.lang !== undefined) return this.props.lang;
		const params: string[] = window.location.search.substring(1).split("&");
		let lang = window.navigator.language.split("-")[0];
		const lang_param = params.filter(v => v.split("=")[0] === "lang");
		if (lang_param !== undefined && lang_param.length > 0) lang = lang_param[0].split("=")[1];
		return lang;
	}

	protected toString(mlString?: Types.IMLString, lang?: string): string {
		if (mlString === undefined) return "";
		const mls = new MLString(mlString);
		return mls.toString(lang === undefined ? this.getLanguage() : lang);
	}

	protected ML(str?: string, lang?: string): string {
		if (lang === undefined) {
			lang = this.getLanguage();
		}
		if (str === undefined) {
			console.warn("Empty or undefined string");
			return ``;
		}
		if (lang === undefined) return str;
		if (!mlStrings.has(str)) {
			console.warn(`String '${str}' is absent`);
			return str;
		}
		const el = mlStrings.get(str);
		if (!el?.has(lang)) return str;
		if (el.get(lang) === undefined) return str;
		return el.get(lang) as string;
	}

	protected serverFetch(command: string, method: string, headers?: HeadersInit, body?: BodyInit, successcb?: (res: any) => void, failcb?: (err: ProtoError) => void) {
		const nStatus: IState = this.state;
		nStatus.serverStatus = ServerStatusCode.connecting;
		this.setState(nStatus);

		const h: Headers = new Headers([["Content-Type", "application/json; charset=utf-8"]]);
		if (headers) {
			const oheaders = new Headers(headers);
			for (const [h1, h2] of oheaders.entries()) {
				h.append(h1, h2);
			}
		}
		this.pendingRef.current?.incUse();
		fetch(`${process.env.SERVER_BASE_URL}/${command}`, {
			method: method,
			headers: h,
			body: body,
		})
			.then(res => {
				if (!res.ok) return Promise.reject(res);
				return res.json();
			})
			.then(v => {
				this.pendingRef.current?.decUse();
				if (process.env.MODE === "development") console.log(`command = '${command}', body = '${body}', response = `, v);
				if (this.state.serverStatus !== ServerStatusCode.connected) {
					const nStatus: IState = this.state;
					nStatus.serverStatus = ServerStatusCode.connected;
					this.setState(nStatus);
				}

				if (successcb) successcb(v);
			})
			.catch(v => {
				this.pendingRef.current?.decUse();
				if (v instanceof Error) {
					if (this.state.serverStatus !== ServerStatusCode.notAvailable) {
						const nStatus: IState = this.state;
						nStatus.serverStatus = ServerStatusCode.notAvailable;
						this.setState(nStatus);
					}
					if (failcb) {
						const err = new ProtoError(ProtoErrorCode.serverNotAvailable, v.message);
						if (process.env.MODE === "development") console.log(`command = '${command}', body = '${body}', response = `, err.json);
						failcb(new ProtoError(ProtoErrorCode.serverNotAvailable, v.message));
					}
				} else {
					v.json()
						.then((j: any) => {
							let errCode = ProtoErrorCode.httpError;
							if (v.status === 500) errCode = ProtoErrorCode.serverBroken;
							if (v.status === 401) errCode = ProtoErrorCode.authDataExpected;
							const err = new ProtoError(errCode, v.statusText, v.status, j);
							if (process.env.MODE === "development") console.log(`command = '${command}', body = '${body}', response = `, err.json);
							if (this.state.serverStatus !== ServerStatusCode.connected) {
								const nStatus: IState = this.state;
								nStatus.serverStatus = ServerStatusCode.connected;
								this.setState(nStatus);
							}
							if (failcb) failcb(err);
						})
						.catch((err: any) => {
							if (process.env.MODE === "development") console.log(`command = '${command}', body = '${body}', response = `, err.json);
							debugger;
						});
				}
			});
	}

	protected serverCommand(command: string, body?: BodyInit, successcb?: (res: any) => void, failcb?: (err: ProtoError) => void, token?: string, addHeaders?: HeadersInit) {
		const [login, password] = this.getTokenPair(token === undefined ? this.token : token);
		const headers: Headers = new Headers();
		if (addHeaders !== undefined) {
			for (const [key, value] of Object.entries(addHeaders)) {
				headers.append(key, value);
			}
		}

		if (window.Telegram !== undefined && "user" in window.Telegram?.WebApp.initDataUnsafe) {
			headers.append("cf-tguid", window.Telegram.WebApp.initDataUnsafe.user.id.toString());
			headers.append("cf-tgquerycheckstring", window.Telegram.WebApp.initData);
		} else {
			if (password === undefined && login === undefined) {
				if (failcb !== undefined) failcb(new ProtoError(ProtoErrorCode.authDataExpected, "Both login and password are undefined. Call to server didn't take place"));
				this.props.toaster?.current?.addToast({
					type: ToastType.error,
					message: "Both login and password are undefined. Call to server didn't take place",
					description: `command = '${command}'; body = '${body}'`,
				});
				return;
			} else {
				headers.append("cf-login", login !== undefined ? login : "");
				headers.append("cf-password", password !== undefined ? password : "");
			}
		}

		this.serverFetch(command, "POST", headers, body, successcb, failcb);
	}
	protected isHTML(str: string): boolean {
		const doc = new DOMParser().parseFromString(str, "text/html");
		const ret = Array.from(doc.body.childNodes).some(node => node.nodeType === 1);
		return ret;
	}

	protected toCurrency(x: number): string {
		return Intl.NumberFormat(this.getLanguage(), { minimumFractionDigits: 2 }).format(x);
	}

	protected relativeDate(event: string | Date): string {
		let dif = (new Date().getTime() - new Date(event).getTime()) / 1000;
		if (dif < 60) return this.ML("just now");
		dif = dif / 60;
		if (dif < 60) return `${Math.round(dif)} ${this.ML("min ago")}`;
		dif = dif / 60;
		if (dif < 24) return `${Math.round(dif)} ${this.ML("hours ago")}`;
		dif = dif / 24;
		if (dif < 30.5) return `${Math.round(dif)} ${this.ML("days ago")}`;
		dif = dif / 30.5;
		if (dif < 12) return `${Math.round(dif)} ${this.ML("months ago")}`;
		dif = dif / 12;
		return `${Math.round(dif)} ${this.ML("years ago")}`;
	}
}

export enum ViewModeCode {
	compact = "compact",
	normal = "normal",
	maximized = "maximized",
}
