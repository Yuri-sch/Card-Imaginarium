import React, { useState, useRef } from 'react';
import { CardData, CardRarity, CardType } from '../types/card';
import {
  Sparkles,
  Swords,
  Shield,
  Wand2,
  Gem,
  Layers,
  Edit3,
  Check,
  Image as ImageIcon,
} from 'lucide-react';

export interface CardRendererProps {
  card: CardData;
  isEditable?: boolean;
  onCardChange?: (updatedCard: CardData) => void;
  compact?: boolean;
  scale?: number;
  className?: string;
  id?: string;
  onClick?: () => void;
}

// Visual themes for the M15 physical card frame according to Rarity
export interface M15RarityTheme {
  outerBorderGradient: string;
  borderClass?: string;
  pinlineColor: string;
  pinlineBorderClass: string;
  artBevelBorder: string;
  gemFill: string;
  gemBorder: string;
  gemShadow: string;
  highlightGlow: string;
  nameColorClass: string;
  accentBadge: string;
  cardShadowClass: string;
  hasStamp: boolean;
  stampClass: string;
  effectType: 'none' | 'traditional-foil' | 'starlight-glitter' | 'legendary-gold' | 'prismatic-holo';
  hasShine: boolean;
}

export const M15_THEMES: Record<CardRarity, M15RarityTheme> = {
  Comum: {
    // Cinza Aço / Pedra Fosca simples, sem reflexo metálico, sem animação foil, sem aura externa
    outerBorderGradient:
      'linear-gradient(135deg, #334155 0%, #475569 40%, #64748b 70%, #334155 100%)',
    pinlineColor: '#64748b',
    pinlineBorderClass: 'border-slate-500',
    artBevelBorder: '#475569',
    gemFill: 'linear-gradient(135deg, #94a3b8 0%, #64748b 50%, #334155 100%)',
    gemBorder: '#cbd5e1',
    gemShadow: 'rgba(100, 116, 139, 0.3)',
    highlightGlow: 'rgba(100, 116, 139, 0.1)',
    nameColorClass: 'text-slate-900',
    accentBadge: 'text-slate-700',
    cardShadowClass: 'shadow-[0_15px_35px_rgba(0,0,0,0.85)]',
    hasStamp: false, // Comum NÃO possui selo holográfico oval
    stampClass: '',
    effectType: 'none',
    hasShine: false, // Sem brilho metálico
  },
  Raro: {
    // Azul Safira Metálico limpo com reflexo discreto e elegante (máx 0.12 opacidade)
    outerBorderGradient:
      'linear-gradient(135deg, #0c2340 0%, #1e40af 25%, #38bdf8 50%, #1d4ed8 75%, #0f172a 100%)',
    pinlineColor: '#38bdf8',
    pinlineBorderClass: 'border-sky-400',
    artBevelBorder: '#0284c7',
    gemFill: 'linear-gradient(135deg, #7dd3fc 0%, #0284c7 50%, #1e3a8a 100%)',
    gemBorder: '#bae6fd',
    gemShadow: 'rgba(56, 189, 248, 0.5)',
    highlightGlow: 'rgba(56, 189, 248, 0.25)',
    nameColorClass: 'text-slate-950',
    accentBadge: 'text-sky-900',
    cardShadowClass: 'shadow-[0_18px_40px_rgba(14,116,144,0.25),0_18px_40px_rgba(0,0,0,0.85)]',
    hasStamp: true,
    stampClass: 'silver-stamp-gradient',
    effectType: 'traditional-foil',
    hasShine: true,
  },
  Épico: {
    // Roxo Ametista Profundo limpo na moldura (Efeito Secret Rare exclusivamente no Art Box)
    outerBorderGradient:
      'linear-gradient(135deg, #2e0854 0%, #7e22ce 25%, #c084fc 50%, #6b21a8 75%, #18052e 100%)',
    pinlineColor: '#c084fc',
    pinlineBorderClass: 'border-purple-400',
    artBevelBorder: '#9333ea',
    gemFill: 'linear-gradient(135deg, #e879f9 0%, #a855f7 50%, #4c1d95 100%)',
    gemBorder: '#f5d0fe',
    gemShadow: 'rgba(192, 132, 252, 0.5)',
    highlightGlow: 'rgba(192, 132, 252, 0.3)',
    nameColorClass: 'text-slate-950',
    accentBadge: 'text-purple-950',
    cardShadowClass: 'shadow-[0_18px_40px_rgba(126,34,206,0.28),0_18px_40px_rgba(0,0,0,0.85)]',
    hasStamp: true,
    stampClass: 'amethyst-stamp-gradient',
    effectType: 'starlight-glitter',
    hasShine: false, // Sem brilho sobre a carta: moldura e texto 100% limpos
  },
  Lendário: {
    // Ouro Real 24k com alto contraste e Aura Mística Dourada Suavizada (~45% de redução)
    outerBorderGradient:
      'linear-gradient(135deg, #78350f 0%, #b45309 15%, #f59e0b 30%, #fef08a 45%, #f59e0b 60%, #92400e 75%, #fef9c3 88%, #78350f 100%)',
    borderClass: 'border-gold-24k',
    pinlineColor: '#eab308',
    pinlineBorderClass: 'border-amber-400',
    artBevelBorder: '#d97706',
    gemFill: 'linear-gradient(135deg, #fef08a 0%, #eab308 50%, #78350f 100%)',
    gemBorder: '#fef9c3',
    gemShadow: 'rgba(234, 179, 8, 0.6)',
    highlightGlow: 'rgba(234, 179, 8, 0.35)',
    nameColorClass: 'text-slate-950',
    accentBadge: 'text-amber-950',
    cardShadowClass: 'aura-legendary shadow-[0_20px_45px_rgba(0,0,0,0.9)]',
    hasStamp: true,
    stampClass: 'gold-stamp-gradient',
    effectType: 'legendary-gold',
    hasShine: true,
  },
  Mítico: {
    // Holográfico Prismático multicromático animado (arco-íris) na moldura
    outerBorderGradient:
      'linear-gradient(135deg, #ff007f 0%, #00ffff 20%, #ffe600 40%, #9333ea 60%, #3b82f6 80%, #ff007f 100%)',
    borderClass: 'foil-holographic',
    pinlineColor: '#f43f5e',
    pinlineBorderClass: 'border-pink-400',
    artBevelBorder: '#e11d48',
    gemFill: 'linear-gradient(135deg, #fda4af 0%, #f43f5e 50%, #881337 100%)',
    gemBorder: '#ffe4e6',
    gemShadow: 'rgba(244, 63, 94, 0.85)',
    highlightGlow: 'rgba(236, 72, 153, 0.55)',
    nameColorClass: 'text-slate-950',
    accentBadge: 'text-pink-950',
    cardShadowClass: 'aura-mythic shadow-[0_20px_45px_rgba(0,0,0,0.9)]',
    hasStamp: true,
    stampClass: 'holo-stamp-gradient',
    effectType: 'prismatic-holo',
    hasShine: true,
  },
};

export const CardRenderer: React.FC<CardRendererProps> = ({
  card,
  isEditable = false,
  onCardChange,
  compact = false,
  className = '',
  id = 'card-to-export',
  onClick,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const theme = M15_THEMES[card.rarity] || M15_THEMES['Raro'];
  const hasCombatStats = card.type === 'Monstro' || card.type === 'Arma';

  // Handle 3D Tilt and Dynamic Interactive Foil calculation on mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isEditing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const percentX = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const percentY = Math.max(0, Math.min(100, (y / rect.height) * 100));

    // Dynamic 3D tilt
    const maxTilt = compact ? 3.5 : 6;
    const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -maxTilt;
    const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * maxTilt;

    setTilt({ x: rotateX, y: rotateY });
    setMousePos({ x: percentX, y: percentY });
    setIsHovered(true);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setMousePos({ x: 50, y: 50 });
    setIsHovered(false);
  };

  const handleFieldChange = (field: keyof CardData, value: any) => {
    if (!onCardChange) return;
    onCardChange({
      ...card,
      [field]: value,
    });
  };

  // Toggle between active generated image and original image
  const handleToggleImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onCardChange) return;
    const nextImg =
      card.activeImageUrl === card.generatedImageUrl
        ? card.originalImageUrl
        : (card.generatedImageUrl || card.originalImageUrl);
    handleFieldChange('activeImageUrl', nextImg);
  };

  // Watermark icon based on Card Type
  const renderCardTypeWatermark = () => {
    const iconClass = compact ? 'w-20 h-20 text-slate-800' : 'w-28 h-28 text-slate-800';
    switch (card.type) {
      case 'Monstro':
        return <Swords className={iconClass} />;
      case 'Magia':
        return <Wand2 className={iconClass} />;
      case 'Arma':
        return <Shield className={iconClass} />;
      case 'Artefato':
        return <Gem className={iconClass} />;
      default:
        return <Layers className={iconClass} />;
    }
  };

  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      {/* Edit Mode Toggle Header Bar if editable */}
      {isEditable && (
        <div className="w-full max-w-[420px] mb-3 flex items-center justify-between px-3 py-1.5 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700/70 text-xs text-slate-300 shadow-md">
          <div className="flex items-center gap-1.5 font-medium">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: theme.pinlineColor }}
            />
            <span className="font-card-title text-[11px] text-slate-200">
              {isEditing ? 'Modo de Edição Ativo' : `Molde M15 • ${card.rarity}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {card.generatedImageUrl && card.originalImageUrl && (
              <button
                type="button"
                onClick={handleToggleImage}
                title="Alternar entre ilustração IA e foto original"
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] border border-slate-600 transition"
              >
                <ImageIcon className="w-3 h-3 text-cyan-400" />
                <span>
                  {card.activeImageUrl === card.generatedImageUrl ? 'Ver Original' : 'Ver Arte IA'}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg font-semibold text-[11px] transition ${
                isEditing
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600'
              }`}
            >
              {isEditing ? (
                <>
                  <Check className="w-3 h-3" />
                  <span>Concluir</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3 h-3" />
                  <span>Editar Textos</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PHYSICAL CARD CONTAINER: Magic: The Gathering (M15 Standard)  */}
      {/* ============================================================== */}
      <div
        id={id}
        ref={cardRef}
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: !isEditing
            ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`
            : 'none',
          transition: isHovered ? 'transform 0.05s ease-out' : 'transform 0.4s ease-out',
        }}
        className={`group relative select-none bg-[#111111] flex flex-col justify-between overflow-hidden ${
          compact
            ? 'w-full min-h-[490px] rounded-[16px] p-[7px] cursor-pointer hover:-translate-y-1'
            : 'w-[370px] sm:w-[410px] min-h-[580px] sm:min-h-[610px] rounded-[20px] p-[9px] sm:p-[10px]'
        } ${theme.cardShadowClass}`}
      >

        {/* ============================================================== */}
        {/* FULL-CARD CONTINUOUS AMBIENT FOIL                              */}
        {/* Active across card only for Raro, Lendário e Mítico            */}
        {/* Épico e Comum têm moldura e pergaminho 100% limpos            */}
        {/* ============================================================== */}
        {card.rarity !== 'Comum' && card.rarity !== 'Épico' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-25">
            {/* 1. Continuous Foil Ambient Sheen (Specific to each rarity) */}
            {card.rarity === 'Raro' && (
              <div className="absolute inset-0 sheen-sapphire-subtle mix-blend-screen" />
            )}
            {card.rarity === 'Lendário' && (
              <div className="absolute inset-0 foil-card-gold mix-blend-overlay opacity-30" />
            )}
            {card.rarity === 'Mítico' && (
              <div className="absolute inset-0 foil-holographic mix-blend-color-dodge opacity-20" />
            )}

            {/* 2. Continuous diagonal foil light sweep */}
            <div className="card-ambient-foil-sweep mix-blend-screen" />

            {/* 3. Additional shimmer sweep on hover */}
            {theme.hasShine && <div className="card-shine" />}
          </div>
        )}

        {/* ============================================================== */}
        {/* M15 INNER COLORED PHYSICAL BORDER (Themed by Rarity)           */}
        {/* ============================================================== */}
        <div
          className={`relative z-10 w-full h-full flex flex-col justify-between rounded-[13px] shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.6)] ${
            compact ? 'p-[5px]' : 'p-[6px] sm:p-[7px]'
          } ${theme.effectType === 'prismatic-holo' ? 'foil-holographic' : ''} ${
            theme.borderClass || ''
          }`}
          style={{
            background:
              theme.effectType === 'prismatic-holo' || theme.borderClass
                ? undefined
                : theme.outerBorderGradient,
          }}
        >
          {/* Subtle Outer Bevel Pinline Contour */}
          <div
            className="absolute inset-[3px] rounded-[10px] pointer-events-none border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.35)]"
          />

          {/* ========================================================== */}
          {/* 1. TITLE BAR: Authentic Chamfered 3D Plaque               */}
          {/* ========================================================== */}
          <div
            className={`relative z-10 flex items-center justify-between rounded-[8px] mtg-plate-parchment border border-black/30 shadow-md ${
              compact ? 'px-2.5 py-1' : 'px-3 py-1.5'
            }`}
            style={{
              borderColor: theme.pinlineColor,
              boxShadow: `0 2px 4px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.9), 0 0 0 1px ${theme.pinlineColor}88`,
            }}
          >
            {/* Title Left: Card Name */}
            <div className="relative z-10 flex-1 mr-2 flex items-center overflow-hidden">
              {isEditing ? (
                <input
                  type="text"
                  value={card.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className="w-full bg-white/90 text-slate-950 font-card-title font-bold text-sm sm:text-base px-1.5 py-0.5 rounded border border-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              ) : (
                <h3
                  className={`font-card-title font-black text-[#131211] tracking-wide truncate drop-shadow-[0_1px_0_rgba(255,255,255,0.8)] ${
                    compact ? 'text-xs sm:text-[13px]' : 'text-sm sm:text-[15px]'
                  }`}
                  title={card.name}
                >
                  {card.name}
                </h3>
              )}
            </div>

            {/* Title Right: Authentic 3D Mana Orb */}
            <div className="relative z-10 shrink-0 flex items-center">
              {isEditing ? (
                <div className="flex items-center gap-1 bg-white/90 px-1.5 py-0.5 rounded border border-slate-400">
                  <span className="text-[10px] text-slate-600 font-bold">Mana:</span>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={card.manaCost}
                    onChange={(e) =>
                      handleFieldChange('manaCost', parseInt(e.target.value) || 0)
                    }
                    className="w-8 text-center bg-transparent text-slate-950 font-bold text-xs focus:outline-none"
                  />
                </div>
              ) : (
                <div
                  className={`relative flex items-center justify-center rounded-full mtg-mana-orb border-[1.5px] border-[#5c370b]/60 shadow-md text-[#1a1205] font-card-title font-black ${
                    compact
                      ? 'w-6 h-6 text-[11px]'
                      : 'w-7 h-7 sm:w-7.5 sm:h-7.5 text-xs sm:text-[13px]'
                  }`}
                  title={`Custo de Mana: ${card.manaCost}`}
                >
                  <span className="absolute top-0.5 left-1 w-2 h-1 bg-white/60 rounded-full blur-[0.5px]" />
                  <span className="relative z-10 drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]">
                    {card.manaCost}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================== */}
          {/* 2. ART BOX: 100% CLEAN - NO FLOATING BADGES OR OVERLAYS   */}
          {/* Framed solely by the inner metallic chamfer of rarity     */}
          {/* Bottom 6% cropped out to hide any residual stamp/watermark */}
          {/* ========================================================== */}
          <div
            className={`relative my-[5px] w-full ${
              compact ? 'h-[185px] sm:h-[195px]' : 'h-[225px] sm:h-[245px]'
            } rounded-[7px] overflow-hidden bg-black shadow-[inset_0_2px_8px_rgba(0,0,0,0.85),0_2px_4px_rgba(0,0,0,0.35)] group/art ${
              card.rarity === 'Lendário'
                ? 'art-box-gold-aura'
                : card.rarity === 'Mítico'
                ? 'art-box-mythic-aura'
                : ''
            }`}
            style={{
              border: `2px solid ${theme.pinlineColor}`,
            }}
          >
            {/* Deep inner shadow bevel for authentic physical card depth */}
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_2px_6px_rgba(0,0,0,0.9),inset_0_-1px_3px_rgba(0,0,0,0.7)] z-10" />

            {/* Raro: Brilho sutil acetinado na arte reagindo suavemente ao mouse (máx 0.08) */}
            {card.rarity === 'Raro' && (
              <div
                className="absolute inset-0 pointer-events-none foil-traditional z-20 mix-blend-screen transition-opacity duration-300 ease-out"
                style={{
                  opacity: isHovered ? 0.08 : 0,
                  backgroundPosition: `${mousePos.x}% ${mousePos.y}%`,
                }}
              />
            )}

            {/* Épico: Yu-Gi-Oh! Secret Rare / Prismatic Foil (EXCLUSIVAMENTE NO ART BOX, OPACIDADE 0.24) */}
            {card.rarity === 'Épico' && (
              <>
                <div
                  className="absolute inset-0 pointer-events-none interactive-foil-epic z-20 transition-opacity duration-300 ease-out"
                  style={{
                    opacity: isHovered ? 0.24 : 0,
                    backgroundPosition: `${mousePos.x * 1.5}% ${mousePos.y * 1.5}%`,
                  }}
                />
                {/* Hotspot de luz Secret Rare estelar que acompanha o cursor em tempo real */}
                <div
                  className="absolute inset-0 pointer-events-none z-21 transition-opacity duration-300 ease-out mix-blend-color-dodge"
                  style={{
                    opacity: isHovered ? 0.18 : 0,
                    background: `radial-gradient(circle 220px at ${mousePos.x}% ${mousePos.y}%, rgba(240, 171, 252, 0.8) 0%, rgba(192, 132, 252, 0.3) 30%, transparent 70%)`,
                  }}
                />
              </>
            )}

            {/* Lendário: Golden Prismatic Foil (EXCLUSIVAMENTE NO ART BOX, OPACIDADE 0.22) */}
            {card.rarity === 'Lendário' && (
              <>
                <div
                  className="absolute inset-0 pointer-events-none interactive-foil-legendary z-20 transition-opacity duration-300 ease-out"
                  style={{
                    opacity: isHovered ? 0.22 : 0,
                    backgroundPosition: `${mousePos.x * 1.5}% ${mousePos.y * 1.5}%`,
                  }}
                />
                {/* Hotspot de luz dourada especular que acompanha o cursor em tempo real */}
                <div
                  className="absolute inset-0 pointer-events-none z-21 transition-opacity duration-300 ease-out mix-blend-color-dodge"
                  style={{
                    opacity: isHovered ? 0.14 : 0,
                    background: `radial-gradient(circle 220px at ${mousePos.x}% ${mousePos.y}%, rgba(254, 240, 138, 0.7) 0%, rgba(245, 158, 11, 0.2) 30%, transparent 70%)`,
                  }}
                />
                <div className="absolute inset-0 pointer-events-none border border-amber-300/30 rounded-[5px] shadow-[inset_0_0_6px_rgba(234,179,8,0.2)] z-22" />
              </>
            )}

            {/* Mítico: Multi-chromatic Rainbow Holographic Foil (EXCLUSIVAMENTE NO ART BOX, OPACIDADE 0.24) */}
            {card.rarity === 'Mítico' && (
              <>
                <div
                  className="absolute inset-0 pointer-events-none interactive-foil-mythic z-20 transition-opacity duration-300 ease-out"
                  style={{
                    opacity: isHovered ? 0.24 : 0,
                    backgroundPosition: `${mousePos.x * 1.5}% ${mousePos.y * 1.5}%`,
                  }}
                />
                {/* Hotspot de luz prismática multicromática que acompanha o cursor em tempo real */}
                <div
                  className="absolute inset-0 pointer-events-none z-21 transition-opacity duration-300 ease-out mix-blend-color-dodge"
                  style={{
                    opacity: isHovered ? 0.16 : 0,
                    background: `radial-gradient(circle 220px at ${mousePos.x}% ${mousePos.y}%, rgba(255, 255, 255, 0.75) 0%, rgba(236, 72, 153, 0.3) 25%, rgba(56, 189, 248, 0.2) 45%, transparent 70%)`,
                  }}
                />
                <div className="absolute inset-0 pointer-events-none border border-pink-300/30 rounded-[5px] shadow-[inset_0_0_6px_rgba(236,72,153,0.2)] z-22" />
              </>
            )}

            {/* Art Image with bottom 6% cropped out */}
            <img
              src={card.activeImageUrl || card.originalImageUrl}
              alt={card.name}
              crossOrigin="anonymous"
              style={{
                objectPosition: 'center top',
                transform: 'scale(1.06)',
              }}
              className={`w-full h-full object-cover transition-transform duration-700 group-hover/art:scale-110 ${
                card.style === 'Pixel Art' ? 'image-rendering-pixelated' : ''
              }`}
            />
          </div>

          {/* ========================================================== */}
          {/* 3. TYPE BAR: Authentic Chamfered Plaque & Gem Symbol       */}
          {/* ========================================================== */}
          <div
            className={`relative z-10 flex items-center justify-between rounded-[7px] mtg-plate-parchment border border-black/30 shadow-md ${
              compact ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
            }`}
            style={{
              borderColor: theme.pinlineColor,
              boxShadow: `0 2px 4px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.9), 0 0 0 1px ${theme.pinlineColor}88`,
            }}
          >
            {/* Type Bar Left: Type — Subtype */}
            <div className="flex-1 flex items-center gap-1.5 overflow-hidden">
              {isEditing ? (
                <div className="flex items-center gap-1 w-full">
                  <select
                    value={card.type}
                    onChange={(e) =>
                      handleFieldChange('type', e.target.value as CardType)
                    }
                    className="bg-white text-slate-900 text-xs px-1.5 py-0.5 rounded border border-slate-400 font-bold"
                  >
                    <option value="Monstro">Monstro</option>
                    <option value="Magia">Magia</option>
                    <option value="Arma">Arma</option>
                    <option value="Artefato">Artefato</option>
                  </select>
                  <span className="text-slate-600 font-bold">—</span>
                  <input
                    type="text"
                    value={card.subtype}
                    onChange={(e) => handleFieldChange('subtype', e.target.value)}
                    className="flex-1 bg-white text-slate-900 text-xs px-1.5 py-0.5 rounded border border-slate-400 font-medium focus:outline-none"
                    placeholder="Subtipo (ex: Dragão Ancião)"
                  />
                </div>
              ) : (
                <div
                  className={`flex items-center gap-1 font-card-title text-[#141311] truncate font-extrabold tracking-wide drop-shadow-[0_1px_0_rgba(255,255,255,0.7)] ${
                    compact ? 'text-[11px]' : 'text-[11.5px] sm:text-[12.5px]'
                  }`}
                >
                  <span>{card.type}</span>
                  <span className="text-[#555047] font-serif font-black">—</span>
                  <span className="text-[#2b2721] font-semibold">{card.subtype}</span>
                </div>
              )}
            </div>

            {/* Type Bar Right: Faceted Cut-Gem Rarity Symbol */}
            <div
              className="ml-2 pl-2 border-l border-black/20 flex items-center gap-1.5 shrink-0"
              title={`Raridade: ${card.rarity}`}
            >
              <div
                className="relative w-3.5 h-3.5 rotate-45 rounded-[2px] flex items-center justify-center shadow-sm"
                style={{
                  background: theme.gemFill,
                  border: `1px solid ${theme.gemBorder}`,
                  boxShadow: `0 0 6px ${theme.gemShadow}`,
                }}
              >
                <div className="w-1 h-1 -rotate-45 bg-white/80 rounded-full" />
              </div>
              <span
                className="font-card-title font-bold text-[9.5px] tracking-wider hidden sm:inline"
                style={{ color: '#222' }}
              >
                {card.rarity.toUpperCase()}
              </span>
            </div>
          </div>

          {/* ========================================================== */}
          {/* 4. RULES BOX: Aged Light Parchment with Watermark & Lore   */}
          {/* ========================================================== */}
          <div
            className={`relative my-[5px] flex-1 rounded-[7px] mtg-rules-parchment border shadow-inner flex flex-col justify-between overflow-hidden ${
              compact
                ? 'p-2 min-h-[115px] sm:min-h-[125px]'
                : 'p-3 min-h-[145px] sm:min-h-[155px]'
            }`}
            style={{
              borderColor: theme.pinlineColor,
              boxShadow: `inset 0 2px 6px rgba(0,0,0,0.3), inset 0 0 12px rgba(120,90,50,0.1), 0 2px 4px rgba(0,0,0,0.35)`,
            }}
          >
            {/* Watermark symbol in background matching Card Type */}
            <div className="absolute right-2 bottom-1 opacity-[0.08] pointer-events-none select-none">
              {renderCardTypeWatermark()}
            </div>

            {/* Special Ability Text (Regras / Rules) */}
            <div
              className={`relative z-10 leading-relaxed text-[#151413] ${
                compact ? 'text-[10.5px] line-clamp-3' : 'text-[11.5px] sm:text-[12px]'
              }`}
            >
              {isEditing ? (
                <textarea
                  rows={3}
                  value={card.specialAbility}
                  onChange={(e) =>
                    handleFieldChange('specialAbility', e.target.value)
                  }
                  className="w-full bg-white/95 text-slate-900 text-xs p-1.5 rounded border border-slate-400 focus:outline-none"
                  placeholder="Texto da habilidade especial..."
                />
              ) : (
                <p className="whitespace-pre-line tracking-tight font-sans font-medium">
                  {card.specialAbility.split(/(\[[^\]]+\])/g).map((part, i) =>
                    part.startsWith('[') && part.endsWith(']') ? (
                      <span
                        key={i}
                        className="font-serif font-black text-[#111111] bg-black/5 px-1 py-0.5 rounded border border-black/10 mr-1 inline-block"
                      >
                        {part.replace(/\[|\]/g, '')}
                      </span>
                    ) : (
                      <span key={i}>{part}</span>
                    )
                  )}
                </p>
              )}
            </div>

            {/* Subtle Tapered Ornamental Divider Line */}
            <div className="relative z-10 my-1 flex items-center justify-center">
              <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#8c7b64]/60 to-transparent" />
              <div className="w-1.5 h-1.5 rotate-45 bg-[#786650] absolute" />
            </div>

            {/* Flavor Lore Text (História em itálico autêntica) */}
            <div
              className={`relative z-10 leading-snug font-card-flavor text-[#3d372e] italic ${
                compact ? 'text-[10px] line-clamp-2' : 'text-[11px] sm:text-[11.5px]'
              }`}
            >
              {isEditing ? (
                <textarea
                  rows={2}
                  value={card.flavorText}
                  onChange={(e) => handleFieldChange('flavorText', e.target.value)}
                  className="w-full bg-white/95 text-slate-900 font-card-flavor text-xs p-1.5 rounded border border-slate-400 focus:outline-none italic"
                  placeholder="Texto de lore (história em itálico)..."
                />
              ) : (
                <p>"{card.flavorText}"</p>
              )}
            </div>
          </div>

          {/* ========================================================== */}
          {/* 5. M15 BOTTOM CURVE, SECURITY OVAL STAMP & P/T PLAQUE      */}
          {/* ========================================================== */}
          <div className="relative mt-0.5 px-1 flex items-end justify-between text-[9px] text-[#222222] font-mono leading-none">
            {/* Left Flank: Collector Information */}
            <div
              className={`flex flex-col gap-0.5 text-[#1a1918] font-semibold ${
                compact ? 'text-[7.5px] sm:text-[8.5px]' : 'text-[8.5px] sm:text-[9.5px]'
              }`}
            >
              <div className="flex items-center gap-1">
                <span>042/150</span>
                <span>•</span>
                <span className="font-card-title font-bold text-[#111]">
                  IMAGINARIUM
                </span>
                <span>•</span>
                <span>PT</span>
              </div>
              <span className="text-[#3a352e] text-[7.5px] font-normal">
                #{card.id.substring(card.id.length - 6).toUpperCase()}
              </span>
            </div>

            {/* Center: M15 Security Oval Stamp (COMUM has NO stamp) */}
            {theme.hasStamp && (
              <div
                className={`absolute left-1/2 -translate-x-1/2 bottom-0 ${
                  compact ? 'w-5 h-3' : 'w-6 h-3.5 sm:w-7 sm:h-4'
                } rounded-full ${theme.stampClass} border border-white/60 shadow-[0_1px_3px_rgba(0,0,0,0.5)] flex items-center justify-center overflow-hidden z-20`}
                title={`Selo de Autenticidade M15 (${card.rarity})`}
              >
                {/* Shimmer sweep line */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -rotate-45" />
                {/* Miniature emblem */}
                <Sparkles
                  className={`${compact ? 'w-2 h-2' : 'w-2.5 h-2.5'} text-white/90 drop-shadow-sm`}
                />
              </div>
            )}

            {/* Right Flank: Power / Toughness Plaque (Overlap on Combat Cards) */}
            {hasCombatStats ? (
              <div className="relative z-30 -mr-1 -mb-1">
                {isEditing ? (
                  <div className="flex items-center gap-1 mtg-pt-box px-2 py-1 rounded-[6px] border border-black/40 shadow-md">
                    <Swords className="w-3 h-3 text-red-600" />
                    <input
                      type="number"
                      value={card.power ?? 0}
                      onChange={(e) =>
                        handleFieldChange('power', parseInt(e.target.value) || 0)
                      }
                      className="w-6 text-center bg-transparent text-slate-950 font-bold focus:outline-none"
                    />
                    <span className="text-slate-600 font-bold">/</span>
                    <Shield className="w-3 h-3 text-blue-600" />
                    <input
                      type="number"
                      value={card.toughness ?? 0}
                      onChange={(e) =>
                        handleFieldChange('toughness', parseInt(e.target.value) || 0)
                      }
                      className="w-6 text-center bg-transparent text-slate-950 font-bold focus:outline-none"
                    />
                  </div>
                ) : (
                  <div
                    className={`flex items-center gap-1 rounded-[6px] mtg-pt-box border shadow-md font-card-title font-black text-[#141311] ${
                      compact ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
                    }`}
                    style={{
                      borderColor: theme.pinlineColor,
                      boxShadow: `0 3px 6px rgba(0,0,0,0.45), inset 0 1px 1px rgba(255,255,255,0.9), 0 0 0 1px ${theme.pinlineColor}`,
                    }}
                    title={`Poder: ${card.power} | Resistência: ${card.toughness}`}
                  >
                    <span className="text-red-700 drop-shadow-[0_1px_0_rgba(255,255,255,0.8)]">
                      {card.power ?? 0}
                    </span>
                    <span className="text-[#6d5b43] font-serif font-black text-xs">/</span>
                    <span className="text-blue-700 drop-shadow-[0_1px_0_rgba(255,255,255,0.8)]">
                      {card.toughness ?? 0}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div
                className={`flex flex-col items-end gap-0.5 text-[#222] font-semibold ${
                  compact ? 'text-[7px]' : 'text-[8px] sm:text-[9px]'
                }`}
              >
                <span>ILUS. IA</span>
                <span className="text-[#3a352e] text-[6.5px]">™ & © 2025 WIZARDS / CI</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardRenderer;
