// Adjectives and animals for generating random room names
const adjectives = [
  '快乐的', '愉快的', '神秘的', '迷人的', '聪明的', '可爱的', 
  '优雅的', '友好的', '温柔的', '勇敢的', '机智的', '独特的'
];

const animals = [
  '猫咪', '狐狸', '熊猫', '兔子', '企鹅', '猫头鹰', 
  '老虎', '狮子', '大象', '长颈鹿', '浣熊', '海豚'
];

/**
 * Generate a random room name
 */
export function generateRoomName(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  return `${adjective}${animal}`;
}

/**
 * Generate a random room ID (6 characters)
 */
export function generateRoomId(): string {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

/**
 * Validate a room ID format
 */
export function isValidRoomId(roomId: string): boolean {
  return /^[A-Z0-9]{6}$/.test(roomId);
}

/**
 * Generate a random player name if none provided
 */
export function generatePlayerName(): string {
  const names = [
    '匿名玩家', '神秘人', '路人甲', '观众', '小萌新', 
    '二次元', '三次元', '动漫迷', '追番者', '萌萌哒'
  ];
  
  return names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
} 