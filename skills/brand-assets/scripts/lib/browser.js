/**
 * Headless Chromium helpers: rasterize SVG through a canvas & screenshot HTML.
 * @module browser
 */

import { chromium } from "playwright";

const INSTALL_HINT =
	"Chromium for Playwright is missing. Run `npx playwright install chromium` in this skill's directory, or set PLAYWRIGHT_BROWSERS_PATH to an existing install.";

/**
 * Run a callback with a fresh browser, closing it afterwards.
 * @template T
 * @param {(browser: import("playwright").Browser) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withBrowser(fn) {
	let browser;
	try {
		browser = await chromium.launch();
	} catch (error) {
		throw new Error(`${INSTALL_HINT}\n${error.message.split("\n")[0]}`, { cause: error });
	}
	try {
		return await fn(browser);
	} finally {
		await browser.close();
	}
}

/**
 * Whether Chromium can launch; tests use this to skip.
 * @returns {Promise<boolean>}
 */
export async function browserAvailable() {
	try {
		await withBrowser(async () => {});
		return true;
	} catch {
		return false;
	}
}

/**
 * Set an SVG's width & height attributes so the browser rasterizes at the target size.
 * @param {string} svg
 * @param {number} width
 * @param {number} height
 * @returns {string}
 */
export function sizeSvg(svg, width, height) {
	return svg.replace(/<svg\b([^>]*)>/, (match, attrs) => {
		const rest = attrs.replace(/\s(width|height)="[^"]*"/g, "");
		return `<svg${rest} width="${width}" height="${height}">`;
	});
}

/**
 * Rasterize SVG markup to straight RGBA pixels at one size.
 * @param {import("playwright").Browser} browser
 * @param {string} svg
 * @param {{ width: number, height: number, scheme?: "light" | "dark" }} options
 * @returns {Promise<{ width: number, height: number, data: Uint8Array }>}
 */
export async function rasterize(browser, svg, { width, height, scheme = "light" }) {
	const page = await browser.newPage({ colorScheme: scheme });
	try {
		const markup = sizeSvg(svg, width, height);
		const data = await page.evaluate(
			async ({ markup, width, height }) => {
				const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml" }));
				const img = new Image(width, height);
				img.src = url;
				await img.decode();
				const canvas = document.createElement("canvas");
				canvas.width = width;
				canvas.height = height;
				const ctx = canvas.getContext("2d");
				ctx.drawImage(img, 0, 0, width, height);
				URL.revokeObjectURL(url);
				return Array.from(ctx.getImageData(0, 0, width, height).data);
			},
			{ markup, width, height },
		);
		return { width, height, data: Uint8Array.from(data) };
	} finally {
		await page.close();
	}
}

/**
 * Screenshot an HTML document.
 * @param {import("playwright").Browser} browser
 * @param {string} html
 * @param {{ path: string, scheme?: "light" | "dark", forcedColors?: boolean, width?: number, height?: number, fullPage?: boolean, baseURL?: string }} options
 */
export async function screenshot(browser, html, { path, scheme = "light", forcedColors = false, width = 1200, height = 800, fullPage = true }) {
	const page = await browser.newPage({ colorScheme: scheme, forcedColors: forcedColors ? "active" : "none", viewport: { width, height } });
	try {
		await page.setContent(html, { waitUntil: "load" });
		await page.evaluate(() => document.fonts.ready);
		await page.screenshot({ path, fullPage, omitBackground: false });
	} finally {
		await page.close();
	}
}
