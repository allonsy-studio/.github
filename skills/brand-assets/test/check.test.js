import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { assertNoErrors, checkSvg } from "../scripts/lib/check.js";
import { HERE } from "./helpers.js";

const errors = (svg, options) => checkSvg(svg, options).filter((f) => f.level === "error").map((f) => f.message);
const ok = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><title>x</title><style>@media (prefers-color-scheme:dark){}</style><rect width="64" height="64"/></svg>';

describe("checkSvg", () => {
	it("passes the skill's own builds", () => {
		for (const name of ["dashly-wordmark.svg", "dashly-favicon.svg"]) {
			const svg = readFileSync(path.join(HERE, "golden", name), "utf8");
			assert.deepEqual(errors(svg, { square: name.includes("favicon") }), []);
		}
	});

	it("refuses text, fonts, external files, & script", () => {
		assert.match(errors(ok.replace("<rect", "<text>a</text><rect"))[0], /<text>/);
		assert.match(errors(ok.replace("@media", "@font-face{} @media"))[0], /font or stylesheet/);
		assert.match(errors(ok.replace("<rect", '<image href="https://x.test/a.png"/><rect'))[0], /external file/);
		assert.match(errors(ok.replace("<rect", '<rect onclick="x()"/><rect'))[0], /script/);
	});

	it("needs a viewBox, & a square one for icons", () => {
		assert.match(errors(ok.replace(' viewBox="0 0 64 64"', ""))[0], /No viewBox/);
		assert.match(errors(ok.replace("0 0 64 64", "0 0 64 32"), { square: true })[0], /must be square/);
		assert.deepEqual(errors(ok.replace("0 0 64 64", "0 0 64 32")), []);
	});

	it("warns on a missing title & missing dark mode", () => {
		const findings = checkSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 9"/>');
		assert.deepEqual(findings.map((f) => f.level), ["warning", "warning"]);
	});

	it("rejects files that are not SVG", () => {
		assert.deepEqual(errors("<html></html>"), ["Not an SVG document."]);
	});
});

describe("assertNoErrors", () => {
	it("lists every error under the file name", () => {
		assert.throws(() => assertNoErrors("logo.svg", checkSvg("<svg><text>a</text></svg>")), /logo\.svg cannot ship as an <img>:\n.*<text>.*\n.*No viewBox/s);
		assert.doesNotThrow(() => assertNoErrors("ok.svg", checkSvg(ok)));
	});
});
