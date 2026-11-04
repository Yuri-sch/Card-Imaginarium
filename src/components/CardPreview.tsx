import React from 'react';
import { CardRenderer } from './CardRenderer';
import { CardData } from '../types/card';

interface CardPreviewProps {
  card: CardData;
  isEditable?: boolean;
  onCardChange?: (updatedCard: CardData) => void;
  scale?: number;
  className?: string;
  id?: string;
}

export const CardPreview: React.FC<CardPreviewProps> = (props) => {
  return <CardRenderer {...props} />;
};

export default CardPreview;
