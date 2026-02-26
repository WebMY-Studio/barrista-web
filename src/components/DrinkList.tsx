import type { FC } from 'react';
import { Drink } from '../types';
import { Edit, Trash2 } from 'lucide-react';
import { getDrinkImageUrl } from '../services/api';

const DRINK_PLACEHOLDER = "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="#e8e8e8"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#999" font-size="12" font-family="sans-serif">No photo</text></svg>'
);

interface DrinkListProps {
  drinks: Drink[];
  onEdit: (drink: Drink) => void;
  onDelete: (id: string) => void;
  onImageError?: (drinkId: string) => void;
}

export const DrinkList: FC<DrinkListProps> = ({ drinks, onEdit, onDelete, onImageError }) => {
  if (drinks.length === 0) {
    return <div className="empty-state">No drinks. Add your first drink or clear the filter.</div>;
  }

  return (
    <div className="drink-list">
      {drinks.map((drink) => (
        <div key={drink.id} className="drink-card">
          <img
            src={getDrinkImageUrl(drink.id)}
            alt=""
            className="drink-card-image"
            onError={(e) => {
              e.currentTarget.src = DRINK_PLACEHOLDER;
              onImageError?.(drink.id);
            }}
          />
          <span className="drink-id">{drink.id}</span>
          <h3 className="drink-title">{drink.title}</h3>
          {drink.categories.length > 0 && (
            <div className="drink-categories">
              {drink.categories.map((c) => (
                <span key={c} className="drink-category-tag">{c}</span>
              ))}
            </div>
          )}
          <div className="drink-card-actions">
            <button onClick={() => onEdit(drink)} className="btn-icon" title="Edit">
              <Edit size={14} />
            </button>
            <button onClick={() => onDelete(drink.id)} className="btn-icon btn-danger" title="Delete">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
