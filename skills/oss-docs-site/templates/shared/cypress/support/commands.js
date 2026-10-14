import "cypress-axe";

import { A11Y_TAGS } from "./config.js";

/**
 * Emulate media features through the DevTools protocol (Chromium only).
 * `Cypress.automation` is undocumented: recheck on Cypress upgrades.
 */
Cypress.Commands.add("emulateMedia", (features) =>
	Cypress.automation("remote:debugger:protocol", {
		command: "Emulation.setEmulatedMedia",
		params: { features },
	}),
);

/** Log each violation with its first selector. */
function logViolations(violations) {
	cy.task(
		"log",
		`${violations.length} accessibility violation${violations.length === 1 ? "" : "s"}`,
	);
	cy.task(
		"table",
		violations.map(({ id, impact, help, nodes }) => ({
			id,
			impact,
			help,
			nodes: nodes.length,
			first: nodes[0]?.target.join(" "),
		})),
	);
}

/**
 * Run axe (WCAG 2.2 AA) on the current page.
 *
 * @param {{ contrast?: boolean }} [options] `contrast: false` in forced colors,
 *   where axe measures the emulation, not what a reader sees
 */
Cypress.Commands.add("checkPageA11y", ({ contrast = true } = {}) => {
	cy.injectAxe();
	cy.checkA11y(
		null,
		{
			runOnly: { type: "tag", values: A11Y_TAGS },
			rules: { "color-contrast": { enabled: contrast } },
		},
		logViolations,
	);
});
