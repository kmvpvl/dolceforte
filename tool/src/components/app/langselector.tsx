import Proto, { IProtoProps, IProtoState } from "../proto";
import "./langselector.css"
import React, { ReactNode } from "react";

export interface ILangSelectorProps extends IProtoProps{
    onChange?: (lang: string) => void;
    defaultValue?: string;
}
export interface ILangSelectorState extends IProtoState{
    value: string;
}

export default class LangSelector extends Proto<ILangSelectorProps, ILangSelectorState> {
    state: Readonly<ILangSelectorState> = {
        value: this.props.defaultValue ? this.props.defaultValue : this.getLanguage()
    };

    render(): ReactNode {
        return (
            <div className="lang-selector-container">
                {process.env.LANGUAGES?.split(",").map(lang => (
                    <span 
                        key={lang} 
                        onClick={() => this.props.onChange?.(lang)}
                        className={`lang-selector-item ${this.state.value === lang ? "selected" : ""}`}>
                        {lang.toUpperCase()}
                    </span>
                ))}
            </div>
        );
    }
}