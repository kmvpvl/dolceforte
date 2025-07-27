import { ReactNode } from "react";
import "./pinger.css";
import Proto, { IProtoProps, IProtoState, ServerStatusCode } from "../proto";

export interface IPingerProps extends IProtoProps {
	pingFrequency?: number;
	onDisconnect?: () => void;
	onConnect?: () => void;
}
export interface IPingerState extends IProtoState {
	serverVersion?: string;
	extended?: boolean;
}

export default class Pinger extends Proto<IPingerProps, IPingerState> {
	state: IPingerState = {};
	protected intervalPing?: NodeJS.Timeout;
	protected NAIntervalPing?: NodeJS.Timeout;
	componentDidMount(): void {
		this.ping();
		if (this.intervalPing === undefined) this.intervalPing = setInterval(this.ping.bind(this), this.props.pingFrequency === undefined ? (process.env.MODE === "production" ? 30000 : 120000) : this.props.pingFrequency);
	}
	get serverStatus() {
		return this.state.serverStatus;
	}
	ping() {
		const lStatus = this.state.serverStatus;
		this.serverFetch(
			"version",
			"GET",
			undefined,
			undefined,
			res => {
				if (this.NAIntervalPing !== undefined) {
					clearInterval(this.NAIntervalPing);
					this.NAIntervalPing = undefined;
				}
				if (!res.ok) return;
				if (this.props.onConnect !== undefined && lStatus !== ServerStatusCode.connected) this.props.onConnect();
				const nState = this.state;
				nState.serverVersion = res.version;
				this.setState(nState);
			},
			err => {
				if (this.NAIntervalPing === undefined) {
					this.NAIntervalPing = setInterval(this.ping.bind(this), this.props.pingFrequency === undefined ? (process.env.MODE === "production" ? 2000 : 30000) : this.props.pingFrequency);
				}
				if (this.props.onDisconnect !== undefined && lStatus !== ServerStatusCode.notAvailable) this.props.onDisconnect();
			}
		);
	}
	toggleExtended() {
		const nState = this.state;
		nState.extended = !nState.extended;
		this.setState(nState);
	}
	render(): ReactNode {
		const legend = ["⚬", "⚠", "☉"];
		return (
			<span className="pinger-container" onClick={this.toggleExtended.bind(this)}>
				{this.state.serverStatus !== undefined ? (this.state.extended ? ServerStatusCode[this.state.serverStatus] : legend[this.state.serverStatus]) : "unknown"}
				{this.state.extended ? ` ${process.env.SERVER_BASE_URL} ${this.state.serverVersion} ${this.getLanguage()}` : ""}
				{this.state.extended ? process.env.MODE : ""}
			</span>
		);
	}
}
