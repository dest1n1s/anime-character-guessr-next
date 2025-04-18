import { MongoClient } from 'mongodb';
import fs from 'fs';

const CATEGORIES = [
	'按歌声合成软件分类',
	'按表情特征分类',
	'按非职业身份分类',
	'按感情取向特征分类',
	'按疾病特征分类',
	'按所属社团分类',
	'按情结癖好分类',
	'按发色分类',
	'按瞳色分类',
	'按性格心理分类',
	'按种族分类'
];

function categoryFilter(category: string) {
	return CATEGORIES.includes(category);
}

// Function to recursively extract all category names from the nested structure
function extractCategoryNames(data: any, shallow = false): any[] {
	const categories: any[] = [];

	// Process subcategories recursively
	if (Array.isArray(data.subcategories) && data.subcategories.length > 0) {
		if (data.name && data.url && data.url.startsWith('/Category:') && categoryFilter(data.name)) {
			categories.push({
				name: data.name,
				subcategories: data.subcategories.map((subcategory: any) =>
					shallow
						? subcategory.name
						: {
								name: subcategory.name,
								characters: subcategory.pages.map((page: any) => page.name)
							}
				)
			});
		}
		for (const subcategory of data.subcategories) {
			categories.push(...extractCategoryNames(subcategory));
		}
	}

	return categories;
}

function getMoegirlCategories() {
	const data = JSON.parse(fs.readFileSync('data/attrs.json', 'utf8'));
	return extractCategoryNames(data);
}

async function main() {
	const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
	await client.connect();
	const db = client.db('anime');
	const collection = db.collection('characters');
	collection.createIndex({
		id: 1
	});
	collection.createIndex({
		'moegirl.name': 1
	});

	// Read mapping from data/bgm2moegirl.json
	const bgmMoegirlMapping = JSON.parse(fs.readFileSync('data/bgm2moegirl.json', 'utf8'));

	// Prepare bulk operations
	const bulkOperations = Object.entries(bgmMoegirlMapping).map(([bgmId, moegirlId]) => ({
		updateOne: {
			filter: { id: bgmId },
			update: { $set: { 'moegirl.name': moegirlId } },
			upsert: true
		}
	}));

	// Execute bulk update if there are operations to perform
	if (bulkOperations.length > 0) {
		await collection.bulkWrite(bulkOperations);
		console.log(`Updated ${bulkOperations.length} character records with Moegirl IDs`);
	} else {
		console.log('No Moegirl mappings found to update');
	}

	const categories = getMoegirlCategories();

	const characterTags: Record<string, string[]> = {};
	for (const category of categories) {
		for (const subCategory of category.subcategories) {
			for (const character of subCategory.characters) {
				characterTags[character] = [...(characterTags[character] || []), subCategory.name];
			}
		}
	}

	console.log(`Found ${Object.keys(characterTags).length} characters with Moegirl tags`);

	const tagBulkOperations = Object.entries(characterTags).map(([character, tags]) => ({
		updateOne: {
			filter: { 'moegirl.name': character },
			update: { $set: { 'moegirl.tags': tags } },
			upsert: true
		}
	}));

	if (tagBulkOperations.length > 0) {
		await collection.bulkWrite(tagBulkOperations);
		console.log(`Updated ${tagBulkOperations.length} character records with Moegirl tags`);
	} else {
		console.log('No Moegirl tags found to update');
	}
}

await main();
