export type CardRarity = 'Comum' | 'Raro' | 'Épico' | 'Lendário' | 'Mítico';

export type CardType = 'Monstro' | 'Magia' | 'Arma' | 'Artefato';

export type VisualStyle =
  | 'Fantasia Medieval'
  | 'Cyberpunk/Futurista'
  | 'Anime'
  | 'Pixel Art'
  | 'Manter Imagem Original';

export interface CardData {
  id: string;
  name: string;
  manaCost: number;
  type: CardType;
  subtype: string;
  specialAbility: string;
  flavorText: string;
  power: number | null;
  toughness: number | null;
  rarity: CardRarity;
  style: VisualStyle;
  element: string;
  imagePrompt?: string;
  imageSource?: string;
  originalImageUrl: string;
  generatedImageUrl?: string | null;
  activeImageUrl: string;
  createdAt: string;
}

export interface RarityConfig {
  id: CardRarity;
  label: string;
  borderColor: string;
  frameClass: string;
  badgeBg: string;
  badgeText: string;
  glowColor: string;
  symbolColor: string;
  description: string;
}

export const RARITIES: Record<CardRarity, RarityConfig> = {
  Comum: {
    id: 'Comum',
    label: 'Comum',
    borderColor: '#64748b',
    frameClass: 'border-slate-500 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 shadow-slate-900/50',
    badgeBg: 'bg-slate-700/80 border-slate-500',
    badgeText: 'text-slate-300',
    glowColor: 'rgba(100, 116, 139, 0.4)',
    symbolColor: '#94a3b8',
    description: 'Borda cinza metálica clássica',
  },
  Raro: {
    id: 'Raro',
    label: 'Raro',
    borderColor: '#38bdf8',
    frameClass: 'border-sky-500 bg-gradient-to-b from-sky-950 via-slate-900 to-slate-950 shadow-sky-900/40',
    badgeBg: 'bg-sky-950/80 border-sky-400',
    badgeText: 'text-sky-300',
    glowColor: 'rgba(56, 189, 248, 0.5)',
    symbolColor: '#38bdf8',
    description: 'Borda azul safira radiante',
  },
  Épico: {
    id: 'Épico',
    label: 'Épico',
    borderColor: '#c084fc',
    frameClass: 'border-purple-500 bg-gradient-to-b from-purple-950 via-slate-900 to-slate-950 shadow-purple-900/40',
    badgeBg: 'bg-purple-950/80 border-purple-400',
    badgeText: 'text-purple-300',
    glowColor: 'rgba(192, 132, 252, 0.55)',
    symbolColor: '#c084fc',
    description: 'Borda roxa ametista misteriosa',
  },
  Lendário: {
    id: 'Lendário',
    label: 'Lendário',
    borderColor: '#f59e0b',
    frameClass: 'border-amber-400 bg-gradient-to-b from-amber-950/60 via-slate-900 to-slate-950 shadow-amber-600/50',
    badgeBg: 'bg-amber-950/80 border-amber-400',
    badgeText: 'text-amber-300',
    glowColor: 'rgba(245, 158, 11, 0.65)',
    symbolColor: '#fbbf24',
    description: 'Borda dourada régia adornada',
  },
  Mítico: {
    id: 'Mítico',
    label: 'Mítico',
    borderColor: '#ec4899',
    frameClass: 'border-pink-500 foil-holographic shadow-pink-600/60',
    badgeBg: 'bg-slate-950/85 border-pink-400',
    badgeText: 'text-pink-200',
    glowColor: 'rgba(236, 72, 153, 0.75)',
    symbolColor: '#f43f5e',
    description: 'Borda prismática holográfica animada',
  },
};
