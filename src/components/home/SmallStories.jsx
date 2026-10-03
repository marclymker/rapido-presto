import React from 'react';
import { Link } from 'react-router-dom';
import { categoryToSlug } from '@/components/utils/urlHelpers';

const stories = [
  { id: 'Mariage', title: 'Mariage', icon: '💍' },
  { id: 'Pour Femme', title: 'Mode femme', icon: '👗' },
  { id: 'Boutique Fleurs', title: 'Fleurs', icon: '💐', badge: '45 min' },
  { id: 'Pour homme', title: 'Mode homme', icon: '👔' },
  { id: 'Electronics', title: 'Tech', icon: '📱' },
  { id: 'Bijoux', title: 'Bijoux', icon: '💎', badge: 'Nouveau' },
  { id: 'Maison', title: 'Maison', icon: '🏠' },
  { id: 'Bébé', title: 'Bébé', icon: '👶' },
  { id: 'Epicerie', title: 'Épicerie', icon: '🛒' },
  { id: 'Café', title: 'Café', icon: '☕' },
];

export default function SmallStories({ onCategorySelect }) {
  return (
    <section className="rp-stories" aria-label="Catégories populaires">
      <div className="rp-section-heading"><div><span className="rp-eyebrow">Découvrir</span><h2>Pour toi aujourd’hui</h2></div><span className="rp-scroll-hint">Glisser →</span></div>
      <div className="rp-stories-scroller no-scrollbar">
        {stories.map((item) => (
          <Link key={item.id} to={`?category=${categoryToSlug(item.id)}`} onClick={(event) => { event.preventDefault(); onCategorySelect?.(item.id); }} className="rp-story-item">
            <div className="rp-story-ring"><div className="rp-story-inner">{item.icon}</div>{item.badge && <span className="rp-story-badge">{item.badge}</span>}</div>
            <span>{item.title}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
