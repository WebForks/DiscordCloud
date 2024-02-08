const config = {
	content: ['./src/**/*.{html,js,svelte,ts}'],

	theme: {
		extend: {}
	},

	plugins: [require('daisyui')],

	daisyui: {
		themes: [
			{
				dark: {
					...require("daisyui/src/theming/themes")["dark"],
					"base-100": "#22354E",
				},
			},
		],
	},
};

module.exports = config;
