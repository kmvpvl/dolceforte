import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { takeApartTelegramStartAppParams } from "./model/tools";
import CustomerApp from "./components/app/customerApp";
import Preview from "./components/app/preview";
const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
//debugger
window.Telegram?.WebApp.expand();

declare global {
	interface Window {
		Telegram?: {
			WebApp: {
				initData: string;
				initDataUnsafe: {
					auth_date: string;
					query_id: string;
					signature: string;
					hash: string;
					user: {
						id: number;
						language_code: string;
						last_name: string;
						first_name: string;
						photo_url?: string;
						username: string;
					};
					start_param?: string;
				};
				expand: () => void;
			};
		};
	}
}

function getContentByPath(): React.ReactNode {
	const path = window.location.pathname.substring(1);
	console.log("path", path);
	const params = new URLSearchParams(window.location.search);
	//let [eateryId, tableId] = takeApartTelegramStartAppParams(window.Telegram?.WebApp.initDataUnsafe.start_param !== undefined ? window.Telegram.WebApp.initDataUnsafe.start_param : "");
	if (window.Telegram?.WebApp.initDataUnsafe.start_param === undefined) {
		//eateryId = params.get("eateryId") ? parseInt(params.get("eateryId") as string) : undefined;
		//tableId = params.get("tableId") ? parseInt(params.get("tableId") as string) : undefined;
	}
	//debugger
	switch (path) {
		case "customer":
			return <CustomerApp />;
		case "admin":
		default:
			return <Preview />;
	}
}
root.render(<React.StrictMode>{getContentByPath()}</React.StrictMode>);
