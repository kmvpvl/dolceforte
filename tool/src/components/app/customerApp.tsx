import { ReactNode } from "react";
import Proto, { IProtoProps, IProtoState, ProtoErrorCode, ServerStatusCode, ViewModeCode } from "../proto";
import "./customerApp.css";
import Pending from "../pending";
import Toaster, { ToastType } from "../toast";
import Pinger from "../pinger/pinger";
import React from "react";
import Login from "../auth/login";
import { IPhoto } from "@betypes/common";
import { IOrder } from "@betypes/order";
import User from "../user/user";
import LangSelector from "./langselector";
import Logo from "./logo";
import { menuItems, products } from "./meals.json";
import MLString from "../../model/mlstring";
import MenuItem from "../menu/menuitem";
import { IMenuItem } from "@betypes/meal";
import Order from "../order/order";
import { getCookie, setCookie } from "../../model/tools";
export interface ICustomerAppProps extends IProtoProps {
	initMealId?: number;
}

type CustomerAppMode = "products" | "order";

export interface ICustomerAppState extends IProtoState {
	needSignIn?: boolean;
	mealId?: number;
	order: IOrder;
	mode: CustomerAppMode;
}

export default class CustomerApp extends Proto<ICustomerAppProps, ICustomerAppState> {
	menuItemRef = React.createRef<MenuItem>();
	orderItemNoteRef = React.createRef<HTMLTextAreaElement>();
	orderItemQuantityRef = React.createRef<HTMLInputElement>();
	state: Readonly<ICustomerAppState> = {
		needSignIn: false,
		mealId: this.props.initMealId !== undefined ? this.props.initMealId : products[0].id,
		order: {
			items: [],
		},
		mode: "products"
	};
	protected toasterRef = React.createRef<Toaster>();
	protected pingerRef = React.createRef<Pinger>();
	selectProduct(productId?: number): void {
		console.log("Selected product:", productId);
		this.setState({...this.state, mealId: productId});
	}

	componentDidMount(): void {
		document.title = "COODFort: Customer tool";
		if (getCookie("customer_order")) {
			try {
				const order = JSON.parse(getCookie("customer_order") as string) as IOrder;
				this.setState({ ...this.state, order: order });
			} catch (e) {
				console.error("Error parsing order from cookie:", e);
			}
		}
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
					onCreateAccountPressed={(username, password, email, phone, photo) => {
						this.createAccount(username, password, email, phone, photo);
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
	createAccount(username: string, password: string, email: string, phone?: string, photo?: IPhoto) {
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
				phone: phone,
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
				<Logo viewMode={ViewModeCode.maximized} />
				<div className="preview-contacts">
					{this.state.mode === "order" ? <span onClick={() => this.setState({ ...this.state, mode: "products" })}>&lt;</span> : null}
					<span onClick={event => {
						event.preventDefault();
						if (this.state.mode === "products" && this.state.order.items.length !== 0) {
							this.setState({ ...this.state, mode: "order" });
						}
					}}>
						<Order defaultValue={this.state.order} mode="compact"/>
					</span>
					<User
						defaultValue={this.state.user}
						onSignOut={() => {
							this.setState({ ...this.state, user: undefined });
							this.init();
						}}
					/>
					<a href={`tel:${process.env.CF_PHONE}`} className="df-call">
						{process.env.CF_PHONE_VIEW}
					</a>
				</div>
				{this.state.mode === "order"? 
					<><Order 
						defaultValue={this.state.order} 
						mode="detailed"
					/>
					<div></div>
					</>
				: 
					<><div className="customerapp-navi">
					{products.map(product => {
						return (
							<span 
								key={product.id} 
								className={`df-button-tiramisu${product.id === this.state.mealId ? "-inverse" : ""}`}
								onClick={product.id === this.state.mealId ? undefined : this.selectProduct.bind(this, product.id)}
							>
								{new MLString(product.name).toString()}
							</span>
						);
					})}
				</div>
				<MenuItem 
					defaultValue={this.state.mealId !== undefined ? menuItems.find(item => item.mealId === this.state.mealId) : undefined} 
					ref={this.menuItemRef}
				/>
					<div className="customerapp-orderitem">
						<input type="number" className="customerapp-orderitem-quantity" placeholder={this.ML("Quantity")} defaultValue={10} ref={this.orderItemQuantityRef} />
						<span 
							className="df-button-tiramisu-inverse"
							onClick={() => {
								if (this.menuItemRef.current?.value !== undefined && this.orderItemQuantityRef.current?.value !== undefined && parseInt(this.orderItemQuantityRef.current?.value) > 0) {
									this.addToOrder(this.menuItemRef.current?.value, parseInt(this.orderItemQuantityRef.current.value, 10),
										this.orderItemNoteRef.current?.value);
								}
							}}
						>{this.ML("Add to order")}</span>
						<textarea className="customerapp-orderitem-note" placeholder={this.ML("Add note...")} ref={this.orderItemNoteRef} />
					</div>
				</>}
			</div>
		);
	}
	addToOrder(menuItem: IMenuItem, quantity: number, note?: string) {
    // Example: Save order data to cookie whenever order changes
		const nState = this.state;
		nState.order.items.push({ menuItem: JSON.parse(JSON.stringify(menuItem)), count: quantity, comment: note });
		this.setState(nState, () => {
			setCookie("customer_order", JSON.stringify(this.state.order), 7);
		});
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
				<LangSelector
					onChange={newLang => {
						window.location.href = `${window.location.pathname}?lang=${newLang}`;
					}}
				/>
			</div>
		);
	}
}
