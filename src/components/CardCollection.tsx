import React, { useState } from 'react';
import { CardData, RARITIES } from '../types/card';
import { CardRenderer } from './CardRenderer';
import {
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  Sparkles,
  Archive,
  Plus,
} from 'lucide-react';

interface CardCollectionProps {
  cards: CardData[];
  onSelectCard: (card: CardData) => void;
  onDeleteCard: (cardId: string) => void;
  onExportCard: (card: CardData) => void;
  onNavigateToForge: () => void;
}

export const CardCollection: React.FC<CardCollectionProps> = ({
  cards,
  onSelectCard,
  onDeleteCard,
  onExportCard,
  onNavigateToForge,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRarity, setSelectedRarity] = useState<string>('Todas');
  const [selectedType, setSelectedType] = useState<string>('Todos');

  // Filtered list
  const filteredCards = cards.filter((card) => {
    const matchesSearch =
      card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.subtype.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.specialAbility.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRarity =
      selectedRarity === 'Todas' || card.rarity === selectedRarity;
    const matchesType = selectedType === 'Todos' || card.type === selectedType;

    return matchesSearch && matchesRarity && matchesType;
  });

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Archive className="w-6 h-6 text-amber-400" />
            <h1 className="font-card-title text-2xl sm:text-3xl font-extrabold text-amber-100">
              Minha Coleção Arcana
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {cards.length === 1
              ? '1 carta física forjada no seu grimório pessoal'
              : `${cards.length} cartas físicas forjadas no seu grimório pessoal`}
          </p>
        </div>

        <button
          onClick={onNavigateToForge}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-card-title font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition self-start md:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Nova Carta</span>
        </button>
      </div>

      {/* Filter and Search Controls */}
      {cards.length > 0 && (
        <div className="my-6 flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por nome, criatura ou habilidade..."
              className="w-full bg-slate-900/90 border border-slate-800 focus:border-amber-400/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400/50 transition"
            />
          </div>

          {/* Rarity filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {['Todas', 'Mítico', 'Lendário', 'Épico', 'Raro', 'Comum'].map(
              (r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedRarity(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition border cursor-pointer ${
                    selectedRarity === r
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                      : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border-slate-800'
                  }`}
                >
                  {r}
                </button>
              )
            )}
          </div>

          {/* Type filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {['Todos', 'Monstro', 'Magia', 'Arma', 'Artefato'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition border cursor-pointer ${
                  selectedType === t
                    ? 'bg-slate-200 text-slate-950 border-white shadow-md'
                    : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border-slate-800'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Cards Grid or Empty State */}
      {cards.length === 0 ? (
        <div className="flex-1 min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl my-6">
          <div className="w-20 h-20 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-amber-400 mb-4 shadow-inner">
            <Archive className="w-10 h-10 stroke-[1.5]" />
          </div>
          <h3 className="font-card-title text-xl font-bold text-slate-200">
            Sua Coleção está Vazia
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mt-1 mb-6">
            Você ainda não guardou nenhuma carta no seu grimório. Envie uma foto
            ou imagem e desperte seu primeiro card lendário!
          </p>
          <button
            onClick={onNavigateToForge}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-card-title font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Forjar Minha Primeira Carta</span>
          </button>
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center text-center p-8 text-slate-400">
          <Filter className="w-8 h-8 text-slate-600 mb-2" />
          <p className="text-sm font-medium">
            Nenhuma carta encontrada com esses filtros.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedRarity('Todas');
              setSelectedType('Todos');
            }}
            className="mt-3 text-xs text-amber-400 underline underline-offset-4 cursor-pointer"
          >
            Limpar todos os filtros
          </button>
        </div>
      ) : (
        /* Real MTG M15 Miniature Cards Grid with discrete actions below each card */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-7 my-4">
          {filteredCards.map((card) => {
            return (
              <div
                key={card.id}
                className="flex flex-col items-center group/collection-item"
              >
                {/* 1. Complete Physical MTG M15 Card (Miniature) */}
                <div className="w-full flex justify-center">
                  <CardRenderer
                    card={card}
                    compact={true}
                    isEditable={false}
                    onClick={() => onSelectCard(card)}
                    className="w-full max-w-[340px]"
                  />
                </div>

                {/* 2. Discrete Action Bar Placed OUTSIDE / BELOW the Physical Card */}
                <div className="w-full max-w-[340px] mt-2.5 px-3 py-1.5 bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-xl shadow-lg flex items-center justify-between text-xs text-slate-400 transition">
                  {/* Left: View / Destacar */}
                  <button
                    type="button"
                    onClick={() => onSelectCard(card)}
                    title="Visualizar carta em tamanho real e editar"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-amber-500 hover:text-slate-950 text-slate-300 font-semibold text-[11px] transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-400 group-hover:text-inherit" />
                    <span>Visualizar</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {/* Middle: Export / Baixar */}
                    <button
                      type="button"
                      onClick={() => onExportCard(card)}
                      title="Baixar imagem em alta resolução"
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-cyan-600 hover:text-white text-slate-300 text-[11px] transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-400 group-hover:text-white" />
                      <span className="hidden sm:inline">Baixar</span>
                    </button>

                    {/* Right: Delete / Excluir */}
                    <button
                      type="button"
                      onClick={() => onDeleteCard(card.id)}
                      title="Excluir carta da coleção"
                      className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-900/80 text-slate-400 hover:text-rose-200 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CardCollection;
