import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
	if (!cookies.get('playerId')) {
		cookies.set('playerId', crypto.randomUUID(), {
			path: '/',
			httpOnly: true,
			sameSite: 'strict',
			secure: false
		});
	}

	const playerId = cookies.get('playerId')!;

	return {
		playerId
	};
};
