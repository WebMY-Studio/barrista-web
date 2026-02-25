import React from 'react';
import { Drink } from '../types';
import { Edit, Trash2 } from 'lucide-react';

interface DrinkListProps {
  drinks: Drink[];
  onEdit: (drink: Drink) => void;
  onDelete: (id: string) => void;
}

export const DrinkList: React.FC<DrinkListProps> = ({ drinks, onEdit, onDelete }) => {
  if (drinks.length === 0) {
    return <div className="empty-state">No drinks. Add your first drink or clear the filter.</div>;
  }

  return (
    <div className="drink-list">
      {drinks.map((drink) => (
        <div key={drink.id} className="drink-card">
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
