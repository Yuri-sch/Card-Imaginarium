import React, { useState, useRef } from 'react';
import { CardRarity, CardType, VisualStyle, RARITIES } from '../types/card';
import { optimizeUserImage } from '../utils/imageCompressor';
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  RefreshCw,
  Sliders,
  Feather,
  Wand2,
  Sword,
  Gem,
  Hammer,
  Palette,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface CardSidebarProps {
  imagePreview: string | null;
  onImageSelected: (dataUrl: string | null) => void;
  visualStyle: VisualStyle;
  onStyleChange: (style: VisualStyle) => void;
  rarity: CardRarity;
  onRarityChange: (rarity: CardRarity) => void;
  cardType: CardType;
  onTypeChange: (type: CardType) => void;
  userNotes: string;
  onNotesChange: (notes: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  generationStep: string;
}

export const CardSidebar: React.FC<CardSidebarProps> = ({
  imagePreview,
  onImageSelected,
  visualStyle,
  onStyleChange,
  rarity,
  onRarityChange,
  cardType,
  onTypeChange,
  userNotes,
  onNotesChange,
  onGenerate,
  isGenerating,
  generationStep,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File handling with automatic optimization
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!validTypes.includes(file.type)) {
      setValidationError('Formato inválido. Por favor, envie uma imagem JPEG, PNG ou WebP.');
      return;
    }

    try {
      setIsProcessingFile(true);
      setValidationError(null);
      // Automatically optimize user image to web-safe dimensions & format
      const optimized = await optimizeUserImage(file);
      onImageSelected(optimized.dataUrl);
    } catch (err: any) {
      console.error('Error optimizing image:', err);
      setValidationError('Não foi possível processar a imagem selecionada. Tente outra foto.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleClearImage = () => {
    onImageSelected(null);
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePreview) {
      setValidationError('Por favor, faça o upload de uma imagem antes de gerar a carta mágica!');
      return;
    }
    setValidationError(null);
    onGenerate();
  };

  const visualStyles: { id: VisualStyle; label: string; desc: string; icon: string }[] = [
    {
      id: 'Fantasia Medieval',
      label: 'Fantasia Medieval',
      desc: 'Pintura a óleo e estética mística clássica',
      icon: '🏰',
    },
    {
      id: 'Cyberpunk/Futurista',
      label: 'Cyberpunk/Futurista',
      desc: 'Neon pulsante, hologramas e alta tecnologia',
      icon: '⚡',
    },
    {
      id: 'Anime',
      label: 'Anime',
      desc: 'Traços expressivos, cores vívidas e cel-shading',
      icon: '✨',
    },
    {
      id: 'Pixel Art',
      label: 'Pixel Art',
      desc: 'Visual retrô 16-bits nostálgico de RPG',
      icon: '👾',
    },
    {
      id: 'Manter Imagem Original',
      label: 'Manter Original',
      desc: 'Preserva a foto original sem alteração de estilo',
      icon: '🖼️',
    },
  ];

  const cardTypes: { id: CardType; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'Monstro',
      label: 'Monstro',
      icon: <Sword className="w-4 h-4 text-rose-400" />,
      desc: 'Criatura de combate com Ataque e Defesa',
    },
    {
      id: 'Magia',
      label: 'Magia',
      icon: <Wand2 className="w-4 h-4 text-purple-400" />,
      desc: 'Feitiço ou encantamento com efeito imediato',
    },
    {
      id: 'Arma',
      label: 'Arma',
      icon: <Hammer className="w-4 h-4 text-amber-400" />,
      desc: 'Equipamento mortal com atributos de combate',
    },
    {
      id: 'Artefato',
      label: 'Artefato',
      icon: <Gem className="w-4 h-4 text-cyan-400" />,
      desc: 'Relíquia mística permanente de grande valor',
    },
  ];

  const raritiesList: { id: CardRarity; label: string; color: string; borderSample: string }[] = [
    { id: 'Comum', label: 'Comum', color: 'text-slate-300', borderSample: 'border-slate-500 bg-slate-800' },
    { id: 'Raro', label: 'Raro', color: 'text-sky-300', borderSample: 'border-sky-500 bg-sky-950' },
    { id: 'Épico', label: 'Épico', color: 'text-purple-300', borderSample: 'border-purple-500 bg-purple-950' },
    { id: 'Lendário', label: 'Lendário', color: 'text-amber-300', borderSample: 'border-amber-400 bg-amber-950' },
    { id: 'Mítico', label: 'Mítico', color: 'text-pink-300', borderSample: 'border-pink-500 foil-holographic' },
  ];

  return (
    <aside className="w-full lg:w-[410px] xl:w-[440px] shrink-0 bg-slate-900/90 backdrop-blur-xl border-r border-slate-800 p-5 overflow-y-auto max-h-[calc(100vh-4rem)] flex flex-col gap-6 shadow-2xl">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h2 className="font-card-title text-lg font-bold text-amber-300 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            Forja de Cartas
          </h2>
          <p className="text-xs text-slate-400">Configure os parâmetros mágicos para a IA</p>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
          Gemini Flash
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* 1. UPLOAD DE IMAGEM (FOCO EXCLUSIVO NO ENVIO DO USUÁRIO) */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-amber-400" />
              1. Envio de Imagem (Upload)
            </span>
            <span className="text-[10px] text-slate-400 normal-case">JPEG, PNG ou WebP</span>
          </label>

          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFiles(e.target.files)}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
          />

          {!imagePreview ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
                isDragging
                  ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
                  : 'border-slate-700 hover:border-amber-500/70 bg-slate-950/60 hover:bg-slate-950/90'
              }`}
            >
              <div className="w-14 h-14 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-amber-400 shadow-inner">
                {isProcessingFile ? (
                  <Loader2 className="w-7 h-7 animate-spin text-amber-400" />
                ) : (
                  <Upload className="w-7 h-7 animate-pulse" />
                )}
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-slate-200">
                  Arraste e solte uma imagem aqui
                </p>
                <p className="text-xs text-amber-400 font-medium underline underline-offset-2">
                  ou clique para selecionar do dispositivo
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Fotos, ilustrações, desenhos de personagens ou objetos
                </p>
              </div>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 p-2.5 flex items-center gap-3 shadow-md group">
              <img
                src={imagePreview}
                alt="Miniatura enviada"
                className="w-16 h-16 rounded-lg object-cover border border-slate-700 shrink-0 bg-slate-900"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">Imagem Pronta</p>
                <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  Carregada com sucesso
                </p>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                  Pronta para ser transformada em carta
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Substituir Imagem"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleClearImage}
                  title="Remover Imagem"
                  className="p-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 2. ESTILO VISUAL DA ARTE */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-amber-400" />
            2. Estilo Visual da Arte
          </label>
          <div className="grid grid-cols-1 gap-1.5">
            {visualStyles.map((item) => {
              const isSelected = visualStyle === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onStyleChange(item.id)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-left border transition-all ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-400 text-amber-200 shadow-sm shadow-amber-500/20 ring-1 ring-amber-400/50'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <span className="text-xl shrink-0">{item.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold leading-tight">{item.label}</p>
                    <p className="text-[11px] text-slate-400 truncate">{item.desc}</p>
                  </div>
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. RARIDADE DA CARTA */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Gem className="w-4 h-4 text-amber-400" />
              3. Raridade da Carta
            </span>
            <span className="text-[10px] text-slate-400">
              {RARITIES[rarity]?.description}
            </span>
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {raritiesList.map((r) => {
              const isSelected = rarity === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onRarityChange(r.id)}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all text-center ${
                    isSelected
                      ? 'border-amber-400 bg-slate-800 shadow-md ring-1 ring-amber-400/50 scale-105'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-md border flex items-center justify-center text-[10px] font-bold ${r.borderSample}`}
                  />
                  <span className={`text-[10px] font-bold ${r.color}`}>
                    {r.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. TIPO DE CARTA */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Sword className="w-4 h-4 text-amber-400" />
            4. Tipo de Carta
          </label>
          <div className="grid grid-cols-2 gap-2">
            {cardTypes.map((t) => {
              const isSelected = cardType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onTypeChange(t.id)}
                  className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-400 text-amber-200 shadow-sm ring-1 ring-amber-400/50'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700 shrink-0">
                    {t.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold leading-tight">{t.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-tight line-clamp-2">
                      {t.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. TEXTO OPCIONAL (POWRS / LORE) */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Feather className="w-4 h-4 text-amber-400" />
              5. Ideias Opcionais (Poderes ou Lore)
            </span>
            <span className="text-[10px] text-slate-500">Opcional</span>
          </label>
          <textarea
            rows={2}
            value={userNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Ex: Um guerreiro amaldiçoado que revive ao morrer; ou uma espada forjada em sangue de dragão..."
            className="w-full bg-slate-950/60 border border-slate-800 focus:border-amber-400 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400/50 resize-none transition"
          />
        </div>

        {/* Mensagem de validação amigável */}
        {validationError && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{validationError}</span>
          </div>
        )}

        {/* BOTÃO DE AÇÃO */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isGenerating || isProcessingFile}
            className={`w-full relative overflow-hidden py-3.5 px-4 rounded-xl font-card-title font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-all duration-300 shadow-xl ${
              isGenerating || isProcessingFile
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-[1.01] active:scale-[0.99] border border-amber-300 cursor-pointer'
            }`}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                <span className="text-xs normal-case font-sans">
                  {generationStep || 'Processando com IA...'}
                </span>
              </>
            ) : isProcessingFile ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span className="text-xs normal-case font-sans">Otimizando imagem...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5 text-slate-950" />
                <span>Gerar Carta Mágica</span>
              </>
            )}
          </button>
        </div>
      </form>
    </aside>
  );
};
