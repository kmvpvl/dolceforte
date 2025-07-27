import Proto, { IProtoProps, IProtoState } from "../proto";
import "./avatar.css";
import React from "react";

export interface IAvatarProps extends IProtoProps {
	onChange?: (newValue: string) => void;
	defaultValue?: string;
}

export interface IAvatarState extends IProtoState {
	value?: string;
}

export default class Avatar extends Proto<IAvatarProps, IAvatarState> {
	state = {
		value: this.props.defaultValue,
	};
	get value(): string | undefined {
		return this.state.value;
	}
	render(): React.ReactNode {
		return (
			<div
				className="avatar-container"
				onDragEnter={event => {
					event.preventDefault();
					event.dataTransfer.dropEffect = "copy";
					event.currentTarget.classList.toggle("ready-to-drop", true);
					console.log("Enter");
				}}
				onDragLeave={event => {
					console.log("leave");
					event.preventDefault();
					event.currentTarget.classList.toggle("ready-to-drop", false);
				}}
				onDragEnd={event => {
					console.log("end");
					event.preventDefault();
					event.currentTarget.classList.toggle("ready-to-drop", false);
				}}
				onDragOver={event => {
					console.log("Over");
					event.preventDefault();
					event.dataTransfer.dropEffect = "copy";
				}}
				onDrop={event => {
					console.log("Drop");
					const dt = event.dataTransfer;
					const files = dt.files;
					this.editModeLoadImages(files);
					event.preventDefault();
					event.currentTarget.classList.toggle("ready-to-drop", false);
				}}>
				{this.state.value !== undefined ? (
					<img src={this.state.value} alt="Avatar" />
				) : (
					<label>
						{this.ML("Drop your photo here")}
						<input
							type="file"
							id="inputImages"
							hidden
							multiple
							accept="image/*"
							onChange={event => {
								const files = event.currentTarget.files;
								if (files) this.editModeLoadImages(files);
								event.currentTarget.value = "";
							}}></input>
					</label>
				)}
			</div>
		);
	}
	protected editModeLoadImages(files: FileList) {
		for (let i = 0; i < files.length; i++) {
			const file = files[i];

			if (!file.type.startsWith("image/")) {
				continue;
			}
			const reader = new FileReader();
			reader.onload = () => {
				const src = reader.result;
				if (src) {
					const nState = this.state;
					(nState.value = src.toString()), this.setState(nState);
					if (this.props.onChange !== undefined) this.props.onChange(nState.value);
				}
			};
			reader.readAsDataURL(file);
		}
	}
}
