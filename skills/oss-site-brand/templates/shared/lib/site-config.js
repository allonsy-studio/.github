// Site settings: a custom key in the project's package.json, read as written.
// The scaffold fills in the key from the skill's package.json (skill.settingsKey).

/** The package.json key for the settings. */
export const CONFIG_KEY = "{{SETTINGS_KEY}}";

/** @param {Record<string, any>} pkg a parsed package.json */
export const studioEnabled = (pkg) => pkg?.[CONFIG_KEY]?.studio !== false;
