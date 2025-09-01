import "./preview.css";
import React from "react";
import Proto, { IProtoProps, IProtoState, ViewModeCode } from "../proto";
import Logo from "./logo";
import LangSelector from "./langselector";
import Meal from "../menu/meal";
import { IMeal } from "@betypes/meal";
import { products } from "./meals.json";

enum PreviewChapterCode {
	products = "Products",
	delivery = "Delivery",
	packaging = "Packaging",
	aboutUs = "About us",
}

export interface IPreviewProps extends IProtoProps {}
export interface IPreviewState extends IProtoState {
	chapter: PreviewChapterCode;
	productIndex: number;
	autoCarusel: boolean;
}
export default class Preview extends Proto<IPreviewProps, IPreviewState> {
	state: IPreviewState = {
		chapter: PreviewChapterCode.products,
		productIndex: 0,
		autoCarusel: true, // Automatically switch products
	};

	private timer: NodeJS.Timeout | null = null;

	componentDidMount(): void {
		document.title = "COODFort: Preview";
		this.startAutoCarousel();
	}

	componentWillUnmount(): void {
		this.stopAutoCarousel();
	}

	private startAutoCarousel(): void {
		if (this.state.autoCarusel) {
			this.timer = setInterval(() => {
				this.setState(prevState => ({
					productIndex: (prevState.productIndex + 1) % Object.keys(products).length,
				}));
			}, 3000);
		}
	}

	private stopAutoCarousel(): void {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
	}

	renderProducts(): React.ReactNode {
		return (
			<div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "0.5em", width: "100%", height: "100%" }}>
				<span
					className="button-left-right"
					onClick={() => {
						const newIndex = this.state.productIndex === 0 ? Object.keys(products).length - 1 : this.state.productIndex - 1;
						this.setState({ ...this.state, productIndex: newIndex });
						this.stopAutoCarousel();
					}}>
					←
				</span>
				<Meal admin={false} defaultValue={products[this.state.productIndex]} onClick={index => {
					this.stopAutoCarousel();
				}} />
				<span
					className="button-left-right"
					onClick={event => {
						const newIndex = this.state.productIndex === Object.keys(products).length - 1 ? 0 : this.state.productIndex + 1;
						this.setState({ ...this.state, productIndex: newIndex });
						this.stopAutoCarousel();
					}}>
					→
				</span>
			</div>
		);
	}

	renderDelivery(): React.ReactNode {
		return (
			<div className="preview-delivery">
				<h2>{this.ML(PreviewChapterCode.delivery)}</h2>
				<p>{this.ML("We offer fast and reliable delivery options.")}</p>
				{/* Delivery details would go here */}
			</div>
		);
	}

	renderPackaging(): React.ReactNode {
		return (
			<div className="preview-packaging">
				<h2>{this.ML(PreviewChapterCode.packaging)}</h2>
				<p>{this.ML("Our products are packaged with care to ensure quality.")}</p>
				{/* Packaging details would go here */}
			</div>
		);
	}

	renderAboutUs(): React.ReactNode {
		return (
			<div className="preview-about-us">
				<h2>{this.ML(PreviewChapterCode.aboutUs)}</h2>
				<p>{this.ML("Learn more about our company and values.")}</p>
				{/* About us details would go here */}
			</div>
		);
	}

	render(): React.ReactNode {
		return (
			<div className="preview-container">
				<Logo viewMode={ViewModeCode.maximized} />
				<div className="preview-contacts">
					<span className="df-button-bottlegreen">{this.ML("Order samples")}</span>
					<a href={`tel:${process.env.CF_PHONE}`} className="df-call">
						{process.env.CF_PHONE_VIEW}
					</a>
				</div>
				<div className="preview-navi">
					{Object.values(PreviewChapterCode).map(chapter => (
						<span
							key={chapter}
							className={`df-button-tiramisu${this.state.chapter === chapter ? "-inverse" : ""}`}
							onClick={() => {
								this.setState({ ...this.state, chapter });
								this.stopAutoCarousel();
							}}>
							{this.ML(chapter)}
						</span>
					))}
				</div>
				<div className="preview-content">
					{this.state.chapter === PreviewChapterCode.products && this.renderProducts()}
					{this.state.chapter === PreviewChapterCode.delivery && this.renderDelivery()}
					{this.state.chapter === PreviewChapterCode.packaging && this.renderPackaging()}
					{this.state.chapter === PreviewChapterCode.aboutUs && this.renderAboutUs()}
				</div>
				<LangSelector
					onChange={newLang => {
						window.location.href = `${window.location.pathname}?lang=${newLang}`;
					}}
				/>
			</div>
		);
	}
}

