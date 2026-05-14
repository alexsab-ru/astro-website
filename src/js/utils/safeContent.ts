import { getCollection, getEntry } from 'astro:content';

import { hasContentCollection, hasContentEntry } from '@/content-config/fs';

export const getSafeCollection = async (collection: string) => {
	if (!hasContentCollection(collection)) return [];

	try {
		return await getCollection(collection as never);
	} catch (error) {
		if (error instanceof Error && error.message.includes('does not exist or is empty')) return [];
		throw error;
	}
};

export const getSafeEntry = async (collection: string, id: string) => {
	if (!hasContentEntry(collection, id)) return undefined;

	try {
		return await getEntry(collection as never, id);
	} catch (error) {
		if (error instanceof Error && error.message.includes('was not found')) return undefined;
		throw error;
	}
};
