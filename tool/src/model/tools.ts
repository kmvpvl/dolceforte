import { Types } from "@betypes/common";

export function URI2DataURL(url: string, successCB: (res: string | ArrayBuffer | null) => void, failCB?: (err: any) => void) {
	fetch(url, { mode: "cors", headers: { referer: "" } })
		.then(res => {
			return res.blob();
		})
		.then(blob => {
			console.log("blob", blob);
			const reader = new FileReader();
			reader.onload = () => {
				successCB(reader.result);
			};
			reader.readAsDataURL(blob);
		})
		.catch(err => {
			if (failCB !== undefined) failCB(err);
		});
}

export function takeApartTelegramStartAppParams(startapp: string): Array<any> {
	let eateryId: Types.ObjectId | undefined;
	let tableId: Types.ObjectId | undefined;
	const pp = startapp.split("__");
	const map = pp.map(el => el.split("_"));
	const eId = map.filter(el => el[0] === "eateryId");
	if (eId.length > 0) eateryId = parseInt(eId[0][1]);
	const tId = map.filter(el => el[0] === "tableId");
	if (tId.length > 0) tableId = parseInt(tId[0][1]);
	return [eateryId, tableId];
}

export function revealTelegramStartAppParams(url_text: string): Array<any> {
	const url = new URL(url_text);
	const params_str = url.searchParams.get("startapp");
	if (!url.searchParams.has("startapp") || !params_str) return takeApartTelegramStartAppParams("");
	return takeApartTelegramStartAppParams(params_str);
}

// Helper to set a cookie
export function setCookie(name: string, value: string, days = 7) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

export function getCookie(name: string): string | null {
	return document.cookie.split('; ').reduce((r, v) => {
		const parts = v.split('=');
		return parts[0] === name ? decodeURIComponent(parts[1]) : r
	}, null as string | null);
}

export function deleteCookie(name: string) {
	setCookie(name, '', -1);
}
