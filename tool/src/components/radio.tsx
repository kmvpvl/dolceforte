import { Types } from "@betypes/common";
import "./radio.css";
import React from "react";
import Proto, { IProtoProps, IProtoState } from "./proto";

export interface IRadioProps extends IProtoProps{
	label: Types.IMLString;
	checked?: boolean;
	onChange: (label: Types.IMLString, checked: boolean) => void;
}

export interface IRadioState extends IProtoState{
	checked: boolean;
}

export default class Radio extends Proto<IRadioProps, IRadioState> {
	state = {
		checked: this.props.checked || false
	};

    componentDidUpdate(prevProps: Readonly<IRadioProps>, prevState: Readonly<IRadioState>, snapshot?: any): void {
        if (this.state.checked !== this.props.checked) {
            this.setState({ checked: this.props.checked || false });
        }   
    }

	render() {
		const { label } = this.props;
		const { checked } = this.state;
        
		return (
			<span className={`radio ${checked ? "checked" : ""}`} onClick={() => {
				this.setState({ checked: !checked });
				this.props.onChange(label, !checked);
			}}>
                <svg className="radio-icon" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" className="radio-circle" />
                    {checked && <circle cx="12" cy="12" r="6" className="radio-inner-circle" />}
                </svg>
				<span className="radio-label">{this.toString(label)}</span>
			</span>
		);
	}
}