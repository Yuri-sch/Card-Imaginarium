import React, { useRef, useState } from 'react';
import { CardData } from '../types/card';
import { CardRenderer } from './CardRenderer';
import { toPng } from 'html-to-image';
import {
  X,
  Download,
  Trash2,
  Share2,
  Check,
  Copy,
  Sparkles,
} from 'lucide-react';

interface CardModalProps {
  card: CardData | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (cardId: string) => void;
  onCardUpdated?: (card: CardData) => void;
}

export const CardModal: React.FC<CardModalProps> = ({
  card,
  isOpen,
  onClose,
  onDelete,
  onCardUpdated,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const modalExportRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !card) return null;

  const handleExportPng = async () => {
    const node = document.getElementById('modal-card-render');
    if (!node) return;

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
        console.warn('Falha com cssRules de fontes no modal, aplicando fallback com skipFonts: true', fontErr);
        dataUrl = await toPng(node, {
          cacheBust: true,
          skipFonts: true,
          pixelRatio: 2,
          quality: 0.98,
        });
      }

      const link = document.createElement('a');
      const filename = `${card.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_tcg.png`;
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export card image:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyStats = () => {
    const text = `🎴 ${card.name} (${card.rarity})
Custo: ${card.manaCost} | Tipo: ${card.type} — ${card.subtype}
Habilidade: ${card.specialAbility}
"${card.flavorText}"
${card.power !== null ? `Ataque / Defesa: ${card.power}/${card.toughness}` : ''}
Criado no Card Imaginarium`;

    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative max-w-2xl w-full bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-8 shadow-2xl flex flex-col items-center gap-6 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Card Imaginarium • Galeria</span>
          </div>
          <h2 className="font-card-title text-xl sm:text-2xl font-bold text-slate-100">
            {card.name}
          </h2>
        </div>

        {/* The Card Render Component */}
        <div className="w-full flex justify-center py-2">
          <CardRenderer
            id="modal-card-render"
            card={card}
            isEditable={true}
            onCardChange={(updated) => onCardUpdated && onCardUpdated(updated)}
          />
        </div>

        {/* Modal Actions */}
        <div className="w-full max-w-[420px] flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={handleCopyStats}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            {copiedText ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-400" />
                <span>Copiar Lore</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleExportPng}
            disabled={isExporting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-card-title font-bold uppercase tracking-wider shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Exportando...' : 'Baixar Imagem'}</span>
          </button>

          {onDelete && (
            <button
              type="button"
              onClick={() => {
                onDelete(card.id);
                onClose();
              }}
              className="p-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 transition"
              title="Excluir da coleção"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
