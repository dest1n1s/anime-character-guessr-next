import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { rooms, addRoomEvent } from '$lib/server/gameStore';
import { isValidRoomId } from '$lib/server/utils';
import { getCharacterAppearances, generateFeedback, getCharacterDetails } from '$lib/api';
import type { GuessData, CharacterWithAppearances } from '$lib/types';

export const POST: RequestHandler = async ({ fetch, params, cookies, request }) => {
	try {
		const roomId = params.roomId || '';
		const playerId = cookies.get('playerId');

		// Validate inputs
		if (!roomId || !isValidRoomId(roomId)) {
			return json({ error: 'Invalid room ID' }, { status: 400 });
		}

		if (!playerId) {
			return json({ error: 'Missing player ID' }, { status: 400 });
		}

		// Check if the room exists
		const room = rooms.get(roomId);
		if (!room) {
			return json({ error: 'Room not found' }, { status: 404 });
		}

		// Find the player in the room
		const player = room.players.find((p) => p.id === playerId);
		if (!player) {
			return json({ error: 'Player not in room' }, { status: 403 });
		}

		// Check if the game is in progress
		if (room.gameState.status !== 'playing') {
			return json({ error: 'Game is not in progress' }, { status: 400 });
		}

		// Check if the player has used all their guesses
		if (!player.guesses) {
			player.guesses = []; // Initialize guesses array if it doesn't exist
		}

		if (player.guesses.length >= room.settings.maxAttempts) {
			return json({ error: 'You have used all your guesses' }, { status: 400 });
		}

		// Get the character from the request body
		const { characterId } = await request.json();
		if (!characterId) {
			return json({ error: 'Invalid character data' }, { status: 400 });
		}

		const character = await getCharacterDetails(characterId, fetch);

		// Get character appearances
		const appearances = await getCharacterAppearances(characterId, room.settings, fetch);

		// Record the time of the guess
		player.guessTime = Date.now();

		// Check if the guess is correct
		const isCorrect = characterId === room.answerCharacter?.id;
		let guessData: GuessData;

		if (isCorrect) {
			// Correct guess
			guessData = {
				icon: character.icon,
				name: character.name,
				nameCn: character.nameCn,
				gender: character.gender || '',
				genderFeedback: 'yes',
				latestAppearance: appearances.latestAppearance,
				latestAppearanceFeedback: '=',
				earliestAppearance: appearances.earliestAppearance,
				earliestAppearanceFeedback: '=',
				highestRating: appearances.highestRating,
				ratingFeedback: '=',
				appearancesCount: appearances.appearances.length,
				appearancesCountFeedback: '=',
				popularity: character.popularity || -1,
				popularityFeedback: '=',
				sharedAppearances: {
					first: appearances.appearances.length > 0 ? appearances.appearances[0].name : '',
					count: appearances.appearances.length
				},
				metaTags: appearances.metaTags,
				sharedMetaTags: appearances.metaTags,
				isAnswer: true
			};
		} else {
			// Incorrect guess - need to cast to CharacterWithAppearances for generateFeedback
			const characterWithAppearances: CharacterWithAppearances = {
				...character,
				...appearances
			};
			const feedback = generateFeedback(
				characterWithAppearances,
				room.answerCharacter as CharacterWithAppearances
			);
			guessData = {
				icon: character.icon,
				name: character.name,
				nameCn: character.nameCn,
				gender: character.gender || '',
				genderFeedback: feedback.gender.feedback,
				latestAppearance: appearances.latestAppearance,
				latestAppearanceFeedback: feedback.latestAppearanceFeedback,
				earliestAppearance: appearances.earliestAppearance,
				earliestAppearanceFeedback: feedback.earliestAppearanceFeedback,
				highestRating: appearances.highestRating,
				ratingFeedback: feedback.ratingFeedback,
				appearancesCount: appearances.appearances.length,
				appearancesCountFeedback: feedback.appearancesCountFeedback,
				popularity: character.popularity || -1,
				popularityFeedback: feedback.popularityFeedback,
				sharedAppearances: feedback.sharedAppearances,
				metaTags: appearances.metaTags,
				sharedMetaTags: feedback.sharedMetaTags,
				isAnswer: false
			};
		}

		// Save the guess to the player's guesses array
		player.guesses.push(guessData);

		// Also update currentGuess for compatibility
		player.currentGuess = guessData;

		// Notify all clients about the guess
		addRoomEvent(roomId, {
			type: 'playerGuessed',
			data: {
				playerId,
				playerName: player.name,
				guess: guessData,
				isCorrect,
				guessesRemaining: room.settings.maxAttempts - player.guesses.length
			}
		});

		if (isCorrect) {
			// Update player score - faster guesses get more points
			player.score += 1;

			// End round if someone guesses correctly, instead of ending the game
			room.gameState.status = 'roundEnd';

			// Notify all clients about the round end
			addRoomEvent(roomId, {
				type: 'roundEnd',
				data: {
					answer: room.answerCharacter,
					winner: player.id,
					playerName: player.name,
					currentRound: room.currentRound,
					totalRounds: room.totalRounds
				}
			});
		} else {
			// Check if all players have used all their guesses
			const allPlayersOutOfGuesses = room.players.every((p) => {
				return p.guesses && p.guesses.length >= room.settings.maxAttempts;
			});

			// End round if all players are out of guesses
			if (allPlayersOutOfGuesses) {
				room.gameState.status = 'roundEnd';

				addRoomEvent(roomId, {
					type: 'roundEnd',
					data: {
						answer: room.answerCharacter,
						winner: null, // No winner for this round
						currentRound: room.currentRound,
						totalRounds: room.totalRounds
					}
				});
			}
		}

		// Send room update to refresh player states
		addRoomEvent(roomId, {
			type: 'roomUpdate',
			data: {
				room: room
			}
		});

		return json({
			success: true,
			guess: guessData,
			isCorrect,
			guessesRemaining: room.settings.maxAttempts - player.guesses.length
		});
	} catch (error) {
		console.error('Error processing guess:', error);
		return json({ error: 'Failed to process guess' }, { status: 500 });
	}
};
