import React from 'react';
import { ItemCategory } from '../types';

interface CategoryChipsProps {
  categories: ItemCategory[];
  selectedCategory: string | null;
  onSelect: (categoryId: string | null) => void;
}

export const CategoryChips: React.FC<CategoryChipsProps> = ({
  categories,
  selectedCategory,
  onSelect,
}) => {
  if (categories.length === 0) return null;

  return (
    <div className="category-chips">
      <span className="category-chips-label">Categories:</span>
      <button
        type="button"
        className={`chip ${selectedCategory === null ? 'chip-active' : ''}`}
        onClick={() => onSelect(null)}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          className={`chip ${selectedCategory === cat.id ? 'chip-active' : ''}`}
          onClick={() => onSelect(cat.id)}
        >
          {cat.title}
        </button>
      ))}
    </div>
  );
};
