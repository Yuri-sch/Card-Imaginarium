import React, { useState, useEffect } from 'react';
import {
  CardData,
  CardRarity,
  CardType,
  VisualStyle,
  RARITIES,
} from './types/card';
import { CardSidebar } from './components/CardSidebar';
import { CardRenderer } from './components/CardRenderer';
import { CardCollection } from './components/CardCollection';
import { CardModal } from './components/CardModal';
import { applyArtisticFilter } from './utils/canvasFilters';
import { toPng } from 'html-to-image';
import confetti from 'canvas-confetti';
import {
  Wand2,
  Archive,
  Download,
  BookmarkPlus,
  BookmarkCheck,
  Sparkles,
  AlertCircle,
  Info,
  RotateCcw,
  Upload,
  X,
  Palette,
} from 'lucide-react';

const STORAGE_KEY = 'card_imaginarium_collection_v1';

// Helper to convert remote image into base64 Data URL via local proxy to ensure CORS-safe PNG export
async function convertToDataUrlSafe(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  try {
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) return url;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(url);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('Erro ao converter imagem para DataURL, usando URL direta:', err);
    return url;
  }
}

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'forge' | 'collection'>('forge');

  // Sidebar inputs
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [visualStyle, setVisualStyle] = useState<VisualStyle>('Fantasia Medieval');
  const [rarity, setRarity] = useState<CardRarity>('Lendário');
  const [cardType, setCardType] = useState<CardType>('Monstro');
  const [userNotes, setUserNotes] = useState<string>('');

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);

  // Active generated/current card on the stage
  const [currentCard, setCurrentCard] = useState<CardData | null>(null);
  const [isSavedInCollection, setIsSavedInCollection] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Collection
  const [collection, setCollection] = useState<CardData[]>([]);

  // Modal spotlight
  const [modalCard, setModalCard] = useState<CardData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load collection from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCollection(parsed);
          if (parsed.length > 0 && !currentCard) {
            setCurrentCard(parsed[0]);
            setImagePreview(parsed[0].originalImageUrl);
          }
        }
      }
    } catch (e) {
      console.error('Falha ao carregar coleção do localStorage:', e);
    }
  }, []);

  // Save collection changes to localStorage
  const saveCollectionToStorage = (newCollection: CardData[]) => {
    setCollection(newCollection);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newCollection));
    } catch (e) {
      console.error('Falha ao salvar no localStorage:', e);
    }
  };

  // Check if current card is saved in collection
  useEffect(() => {
    if (!currentCard) {
      setIsSavedInCollection(false);
      return;
    }
    const exists = collection.some((c) => c.id === currentCard.id);
    setIsSavedInCollection(exists);
  }, [currentCard, collection]);

  // Generate Card Action (Single-pass multimodal analysis + AI image generation)
  const handleGenerateCard = async () => {
    if (!imagePreview) {
      setErrorMessage('Por favor, faça o upload de uma imagem no painel à esquerda antes de gerar a carta.');
      return;
    }

    let stepTimer1: any;
    let stepTimer2: any;

    try {
      setIsGenerating(true);
      setErrorMessage(null);
      setInfoNotice(null);

      // Informative steps
      setGenerationStep('Analisando imagem com Visão Computacional...');
      stepTimer1 = setTimeout(() => {
        setGenerationStep('Identificando sujeito e forjando atributos TCG...');
      }, 1200);
      stepTimer2 = setTimeout(() => {
        setGenerationStep('Gerando nova ilustração personalizada por IA...');
      }, 2500);

      const mimeType = imagePreview.startsWith('data:image/png')
        ? 'image/png'
        : imagePreview.startsWith('data:image/webp')
        ? 'image/webp'
        : 'image/jpeg';

      const response = await fetch('/api/generate-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imagePreview,
          imageMimeType: mimeType,
          style: visualStyle,
          rarity: rarity,
          type: cardType,
          userNotes: userNotes.trim() || undefined,
        }),
      });

      const responseText = await response.text();
      let data: any = null;

      try {
        data = JSON.parse(responseText);
      } catch (jsonParseErr) {
        console.error('Resposta não-JSON do servidor:', responseText.slice(0, 300));
        if (response.status === 413) {
          throw new Error('A imagem enviada excedeu o limite de tamanho. Por favor, envie uma foto menor.');
        }
        throw new Error(`O servidor retornou uma resposta inesperada (Código HTTP ${response.status}).`);
      }

      if (!response.ok || !data.success) {
        throw new Error(data?.error || `Falha ao processar carta com a IA (Código HTTP ${response.status}).`);
      }

      const generatedCard: CardData = data.card;

      if (data.notice) {
        setInfoNotice(data.notice);
      }

      // NOVO FLUXO DE IMAGEM IA:
      // Se o estilo NÃO for original e uma nova imagem IA foi gerada, aguardar carregamento completo
      if (visualStyle !== 'Manter Imagem Original' && generatedCard.generatedImageUrl) {
        setGenerationStep('Finalizando e carregando a nova arte da carta...');
        // Preload image in browser memory
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = generatedCard.generatedImageUrl!;
          setTimeout(resolve, 6000); // 6s max wait
        });

        // Convert to dataURL safely for offline and CORS-free download
        const safeDataUrl = await convertToDataUrlSafe(generatedCard.generatedImageUrl);
        generatedCard.generatedImageUrl = safeDataUrl;
        generatedCard.activeImageUrl = safeDataUrl;
      } else if (visualStyle !== 'Manter Imagem Original' && !generatedCard.generatedImageUrl) {
        // Fallback procedural visual style
        try {
          const filteredUrl = await applyArtisticFilter(imagePreview, visualStyle);
          generatedCard.generatedImageUrl = filteredUrl;
          generatedCard.activeImageUrl = filteredUrl;
        } catch (filterErr) {
          generatedCard.activeImageUrl = imagePreview;
        }
      } else {
        // Preserva a imagem original
        generatedCard.activeImageUrl = imagePreview;
      }

      setCurrentCard(generatedCard);
      setIsSavedInCollection(false);

      // Confetti celebration
      if (generatedCard.rarity === 'Mítico' || generatedCard.rarity === 'Lendário') {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#ec4899', '#38bdf8', '#c084fc', '#fef08a'],
        });
      }
    } catch (err: any) {
      console.error('Erro durante a geração da carta:', err);
      setErrorMessage(
        err.message || 'Ocorreu um erro ao comunicar com a API. Por favor, tente novamente.'
      );
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  // Save Card to Collection
  const handleSaveToCollection = () => {
    if (!currentCard) return;

    const existsIndex = collection.findIndex((c) => c.id === currentCard.id);
    let updated: CardData[];
    if (existsIndex >= 0) {
      updated = [...collection];
      updated[existsIndex] = currentCard;
    } else {
      updated = [currentCard, ...collection];
    }

    saveCollectionToStorage(updated);
    setIsSavedInCollection(true);

    confetti({
      particleCount: 40,
      spread: 50,
      origin: { y: 0.5 },
    });
  };

  // Export card as PNG image
  const handleExportCurrentCard = async () => {
    const node = document.getElementById('stage-card-render');
    if (!node || !currentCard) return;

    try {
      setIsExporting(true);
      let dataUrl: string;
      try {
        dataUrl = await toPng(node, {
          cacheBust: true,
          skipFonts: false,
          fontEmbedCSS: '',
          pixelRatio: 2,
          quality: 0.98,
        });
      } catch (fontErr) {
        console.warn('Falha com cssRules de fontes externas, aplicando fallback com skipFonts: true', fontErr);
        dataUrl = await toPng(node, {
          cacheBust: true,
          skipFonts: true,
          pixelRatio: 2,
          quality: 0.98,
        });
      }

      const link = document.createElement('a');
      const filename = `${currentCard.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_tcg.png`;
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Falha ao exportar imagem do card:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Delete Card from Collection
  const handleDeleteCard = (cardId: string) => {
    const updated = collection.filter((c) => c.id !== cardId);
    saveCollectionToStorage(updated);
    if (currentCard && currentCard.id === cardId) {
      setIsSavedInCollection(false);
    }
  };

  // Export from Collection item
  const handleExportFromCollection = async (card: CardData) => {
    setModalCard(card);
    setIsModalOpen(true);
  };

  // Quick reset to create a fresh new card
  const handleResetForge = () => {
    setImagePreview(null);
    setUserNotes('');
    setCurrentCard(null);
    setErrorMessage(null);
    setInfoNotice(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* APP NAVBAR */}
      <header className="sticky top-0 z-40 w-full bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 py-3 flex items-center justify-between shadow-xl">
        {/* Brand / Logo */}
        <div
          onClick={() => setActiveTab('forge')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-600 to-amber-700 p-[2px] shadow-lg shadow-amber-500/25 group-hover:scale-105 transition">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-400 group-hover:rotate-12 transition" />
            </div>
          </div>
          <div>
            <h1 className="font-card-title text-lg sm:text-xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100">
              Card Imaginarium
            </h1>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
              Cartas Colecionáveis TCG com IA Multimodal
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2">
          <nav className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('forge')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'forge'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Forja Mágica</span>
              <span className="sm:hidden">Forja</span>
            </button>

            <button
              onClick={() => setActiveTab('collection')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'collection'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Minha Coleção</span>
              <span className="sm:hidden">Coleção</span>
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-800 text-amber-300">
                {collection.length}
              </span>
            </button>
          </nav>
        </div>
      </header>

      {/* ERROR ALERT BANNER */}
      {errorMessage && (
        <div className="bg-rose-950/90 border-b border-rose-800/80 px-4 py-3 text-rose-200 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-lg z-30">
          <div className="flex items-center gap-2.5 max-w-4xl mx-auto">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs text-rose-300 hover:text-white font-semibold underline shrink-0"
          >
            Fechar
          </button>
        </div>
      )}

      {/* NOTICE INFO BANNER */}
      {infoNotice && (
        <div className="bg-amber-950/80 border-b border-amber-800/80 px-4 py-2 text-amber-200 text-xs flex items-center justify-between gap-3 shadow-md z-30">
          <div className="flex items-center gap-2 max-w-4xl mx-auto">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{infoNotice}</span>
          </div>
          <button
            onClick={() => setInfoNotice(null)}
            className="text-xs text-amber-300 hover:text-white underline shrink-0"
          >
            Dispensar
          </button>
        </div>
      )}

      {/* MAIN VIEW AREA */}
      {activeTab === 'forge' ? (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* LEFT SIDEBAR: Upload & Configuration Controls */}
          <CardSidebar
            imagePreview={imagePreview}
            onImageSelected={(dataUrl) => {
              setImagePreview(dataUrl);
              setErrorMessage(null);
            }}
            visualStyle={visualStyle}
            onStyleChange={setVisualStyle}
            rarity={rarity}
            onRarityChange={setRarity}
            cardType={cardType}
            onTypeChange={setCardType}
            userNotes={userNotes}
            onNotesChange={setUserNotes}
            onGenerate={handleGenerateCard}
            isGenerating={isGenerating}
            generationStep={generationStep}
          />

          {/* CENTRAL STAGE: Card Rendering & Action Bar */}
          <main className="flex-1 flex flex-col items-center justify-start p-4 sm:p-6 lg:p-8 overflow-y-auto bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative">
            {/* Ambient Background Glow matching rarity */}
            <div
              className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] rounded-full blur-[140px] pointer-events-none opacity-20 transition-all duration-700"
              style={{
                backgroundColor: currentCard
                  ? RARITIES[currentCard.rarity]?.borderColor || '#f59e0b'
                  : '#f59e0b',
              }}
            />

            {/* STAGE ACTION BAR (when a card exists) */}
            {currentCard && (
              <div className="w-full max-w-[440px] mb-4 flex items-center justify-between gap-2 px-3 py-2 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl z-20">
                <button
                  type="button"
                  onClick={handleSaveToCollection}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition ${
                    isSavedInCollection
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/60'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  }`}
                >
                  {isSavedInCollection ? (
                    <>
                      <BookmarkCheck className="w-4 h-4 text-emerald-400" />
                      <span>Salva na Coleção</span>
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="w-4 h-4" />
                      <span>Salvar na Coleção</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleExportCurrentCard}
                  disabled={isExporting}
                  className="flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                  title="Baixar como imagem PNG"
                >
                  <Download className="w-4 h-4 text-cyan-400" />
                  <span className="hidden sm:inline">
                    {isExporting ? 'Exportando...' : 'Baixar Imagem'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleResetForge}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/80 transition"
                  title="Limpar e criar nova carta"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* CARD PALCO CENTRAL */}
            {currentCard ? (
              <div className="relative z-10 flex flex-col items-center">
                <CardRenderer
                  id="stage-card-render"
                  card={currentCard}
                  isEditable={true}
                  onCardChange={(updated) => setCurrentCard(updated)}
                />
              </div>
            ) : (
              /* EMPTY WELCOME STAGE */
              <div className="max-w-lg w-full flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-3xl bg-slate-900/40 border border-dashed border-slate-800 my-auto shadow-2xl backdrop-blur-sm z-10">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 shadow-inner">
                  <Upload className="w-10 h-10 animate-bounce" />
                </div>

                <h2 className="font-card-title text-2xl sm:text-3xl font-extrabold text-amber-100 mb-3">
                  Envie sua Imagem para Começar
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">
                  Arraste e solte qualquer foto, desenho ou ilustração no painel à esquerda, configure a raridade e o estilo desejados, e clique em{' '}
                  <span className="text-amber-300 font-semibold">"Gerar Carta Mágica"</span>.
                </p>

                <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-1">
                    <span className="text-amber-400 text-xs font-bold">1. Visão Multimodal</span>
                    <p className="text-[11px] text-slate-400">Analisa sujeito, cores e pose</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-1">
                    <span className="text-amber-400 text-xs font-bold">2. Nova Arte por IA</span>
                    <p className="text-[11px] text-slate-400">Gera nova arte estilizada</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-1">
                    <span className="text-amber-400 text-xs font-bold">3. Forja Arcana TCG</span>
                    <p className="text-[11px] text-slate-400">Regras e lore balanceados</p>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      ) : (
        /* COLLECTION VIEW */
        <CardCollection
          cards={collection}
          onSelectCard={(card) => {
            setModalCard(card);
            setIsModalOpen(true);
          }}
          onDeleteCard={handleDeleteCard}
          onExportCard={handleExportFromCollection}
          onNavigateToForge={() => setActiveTab('forge')}
        />
      )}

      {/* FULLSCREEN SPOTLIGHT MODAL */}
      <CardModal
        card={modalCard}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalCard(null);
        }}
        onDelete={handleDeleteCard}
        onCardUpdated={(updated) => {
          setModalCard(updated);
          const index = collection.findIndex((c) => c.id === updated.id);
          if (index >= 0) {
            const nextCollection = [...collection];
            nextCollection[index] = updated;
            saveCollectionToStorage(nextCollection);
          }
          if (currentCard && currentCard.id === updated.id) {
            setCurrentCard(updated);
          }
        }}
      />
    </div>
  );
}
