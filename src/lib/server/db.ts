import { MongoClient } from 'mongodb';

const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';

let isConnected = false;
const client = new MongoClient(mongodbUri);

export const initDb = async () => {
	if (isConnected) return;

	await client.connect();
	isConnected = true;
};

export const db = client.db('anime');

export const getCharacterMoegirlTags = async (characterId: number): Promise<string[]> => {
	const character = await db.collection('characters').findOne({ id: characterId.toString() });
	return character?.moegirl?.tags || [];
};

initDb().catch(console.error);
