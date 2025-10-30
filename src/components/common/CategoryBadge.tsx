/**
 * CategoryBadge Component
 * 
 * Reusable badge component for displaying expense categories with consistent
 * styling and color coding across the application.
 * 
 * Usage:
 *   <CategoryBadge category="Travel" />
 *   <CategoryBadge category="Meals & Entertainment" size="sm" />
 */

import React from 'react';

interface CategoryBadgeProps {
  category: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const categoryColors: Record<string, string> = {
  'Travel': 'bg-blue-100 text-blue-800',
  'Meals & Entertainment': 'bg-purple-100 text-purple-800',
  'Accommodation': 'bg-indigo-100 text-indigo-800',
  'Supplies': 'bg-green-100 text-green-800',
  'Shipping': 'bg-orange-100 text-orange-800',
  'Technology': 'bg-cyan-100 text-cyan-800',
  'Marketing': 'bg-pink-100 text-pink-800',
  'Professional Services': 'bg-teal-100 text-teal-800',
  'Other': 'bg-gray-100 text-gray-800'
};

const sizeClasses = {
  xs: 'px-1.5 py-0.5 text-[10px]',
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base'
};

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  category,
  size = 'sm',
  className = ''
}) => {
  const colorClass = categoryColors[category] || categoryColors['Other'];

  return (
    <span 
      className={`
        ${sizeClasses[size]} 
        ${colorClass} 
        font-medium rounded-full whitespace-nowrap inline-block
        ${className}
      `}
    >
      {category}
    </span>
  );
};

