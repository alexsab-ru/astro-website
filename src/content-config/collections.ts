import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

import { getRegularCollectionNames, hasContentCollection } from './fs';
import { carsSchema, pageCollectionSchema, usedCarsSchema } from './schemas';

export type CollectionMeta = {
	name: string;
	title: string;
	description: string;
};

export const titleFromCollectionName = (name: string): string =>
	name
		.split('-')
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');

export const getContentCollections = (): CollectionMeta[] =>
	getRegularCollectionNames().map((name) => ({
		name,
		title: titleFromCollectionName(name),
		description: '',
	}));

const createGlobCollection = (collection: string, schema?: unknown) => defineCollection({
	loader: glob({
		base: `./src/content/${collection}`,
		pattern: '**/*.{md,mdx}',
		exclude: ['**/__*'],
	} as any),
	...(schema ? { schema } : {}),
});

export const pageCollections = Object.fromEntries(
	getContentCollections().map((collection) => [
		collection.name,
		createGlobCollection(collection.name, pageCollectionSchema),
	]),
);

export const seoCollections = hasContentCollection('seo')
	? { seo: createGlobCollection('seo') }
	: {};

export const vehicleCollections = {
	...(hasContentCollection('cars') ? { cars: createGlobCollection('cars', carsSchema) } : {}),
	...(hasContentCollection('used_cars') ? { used_cars: createGlobCollection('used_cars', usedCarsSchema) } : {}),
};
