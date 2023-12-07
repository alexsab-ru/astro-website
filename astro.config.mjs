import {defineConfig} from 'astro/config';
import tailwind from '@astrojs/tailwind';
import alpinejs from '@astrojs/alpinejs';

// https://astro.build/config
export default defineConfig({
	integrations: [
		tailwind({
			configFile: './tailwind.geely.js'
		}), 
		alpinejs()
	],
	site: 'https://alexsab-ru.github.io',
	base: '/astro-website'
});
