import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
	if (!cookies.get('playerId')) {
		cookies.set('playerId', crypto.randomUUID(), {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'strict'
		});
	}

	const playerId = cookies.get('playerId')!;

	return {
		playerId
	};
};
