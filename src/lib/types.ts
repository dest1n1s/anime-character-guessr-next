export interface Character {
	id: number;
	name: string;
	nameCn: string;
	icon: string | null;
	image: string | null;
	gender: string;
	popularity?: number;
	summary?: string;
	tags?: string[];
}

export interface Appearance {
	id: number;
	name: string;
	year: number;
	rating: number;
}

export interface CharacterAppearances {
	appearances: Appearance[];
	latestAppearance: number;
	earliestAppearance: number;
	highestRating: number;
	metaTags: string[];
}

export type CharacterWithAppearances = Character & CharacterAppearances;

export interface Feedback {
	gender: { feedback: string };
	popularityFeedback: string;
	appearancesCountFeedback: string;
	latestAppearanceFeedback: string;
	earliestAppearanceFeedback: string;
	ratingFeedback: string;
	sharedAppearances: {
		first: string;
		count: number;
	};
	sharedMetaTags: string[];
}

export interface GuessData {
	icon: string | null;
	name: string;
	nameCn: string;
	gender: string;
	genderFeedback: string;
	latestAppearance: number;
	latestAppearanceFeedback: string;
	earliestAppearance: number;
	earliestAppearanceFeedback: string;
	highestRating: number;
	ratingFeedback: string;
	appearancesCount: number;
	appearancesCountFeedback: string;
	popularity: number;
	popularityFeedback: string;
	sharedAppearances: {
		first: string;
		count: number;
	};
	metaTags: string[];
	sharedMetaTags: string[];
	isAnswer: boolean;
}

export interface GameSettings {
	startYear: number;
	endYear: number;
	topNSubjects: number;
	metaTags: string[];
	useIndex: boolean;
	indexId: string | null;
	addedSubjects: Subject[];
	mainCharacterOnly: boolean;
	characterNum: number;
	maxAttempts: number;
	enableHints: boolean;
	includeGame: boolean;
	timeLimit: number | null;
	subjectSearch: boolean;
}

export interface Subject {
	id: number;
	name: string;
	name_cn: string;
	type: string;
	image?: string;
}

export interface SearchResult {
	id: number;
	name: string;
	nameCn: string;
	icon: string | null;
	image: string | null;
	gender: string;
	popularity?: number;
}

export interface Hints {
	first: string | null;
	second: string | null;
}

// Multiplayer Types
export interface Player {
	id: string;
	name: string;
	isHost: boolean;
	isReady: boolean;
	score: number;
	currentGuess: GuessData | null;
	guessTime: number | null;
	guesses: GuessData[];
}

export interface Room {
	id: string;
	name: string;
	host: string;
	players: Player[];
	gameState: GameState;
	settings: GameSettings;
	currentRound: number;
	totalRounds: number;
	answerCharacter: Character | null;
}

export interface GameState {
	status: 'waiting' | 'playing' | 'roundEnd' | 'gameEnd';
	roundStartTime: number | null;
	timeRemaining: number | null;
}

export interface GameEvent {
	type:
		| 'roomUpdate'
		| 'gameStart'
		| 'roundStart'
		| 'roundEnd'
		| 'gameEnd'
		| 'playerJoined'
		| 'playerLeft'
		| 'playerGuessed'
		| 'playerReady'
		| 'playerUnready'
		| 'chat'
		| 'error';
	data: any;
	timestamp: number;
}
