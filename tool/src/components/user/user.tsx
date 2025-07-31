import { Types } from "@betypes/common";
import { IUser } from "@betypes/user";
import "./user.css";
import React, { ReactNode } from "react";
import Proto, { IProtoProps, IProtoState } from "../proto";
import { ToastType } from "../toast";

export interface IUserProps extends IProtoProps {
	id?: Types.ObjectId;
	defaultValue?: IUser;
}

export interface IUserState extends IProtoState {
	value?: IUser;
}

export default class User extends Proto<IUserProps, IUserState> {
	state = {
		value: this.props.defaultValue,
	};
	componentDidMount(): void {
		this.loadUserInfo();
	}
	loadUserInfo() {
		if (this.props.id === undefined) return;
		this.serverCommand(
			"user/view",
			JSON.stringify({ id: this.props.id }),
			res => {
				if (res.ok) {
					this.setState({ ...this.state, value: res.user });
				}
			},
			err => {}
		);
	}
	render(): ReactNode {
		return (
			<span
				className="user-container"
				onClick={event => {
					this.props.toaster?.current?.addToast({
						modal: true,
						type: ToastType.info,
						message: this.ML("Are you sure you want to log off?"),
						buttons: [
							{
								text: this.ML("Yes"),
								callback: (() => {
									this.logoff();
									location.reload();
								}).bind(this),
							},
							{ text: this.ML("No"), callback: () => {} },
						],
					});
				}}>
				{this.state.value?.photo?.url !== undefined ? (
					<span className="circle-img-container">
						<img src={this.state.value?.photo?.url} />
					</span>
				) : (
					<></>
				)}
				<span>{this.state.value?.name}</span>
			</span>
		);
	}
}
