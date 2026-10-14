import { A11Y_MODES, MODES, VIEWPORTS } from "../support/config.js";

/** axe-core against every built page in light, dark, & forced-colors. */
const pages = Cypress.env("pages") || [];
const [width, height] = VIEWPORTS.desktop;

describe("accessibility", () => {
	pages.forEach((url) => {
		describe(url, () => {
			A11Y_MODES.forEach((mode) => {
				it(mode, () => {
					cy.viewport(width, height);
					cy.emulateMedia(MODES[mode]);
					cy.visit(url);
					cy.checkPageA11y({ contrast: mode !== "forced-colors" });
				});
			});
		});
	});
});
