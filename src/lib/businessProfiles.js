import { Utensils, Hotel, Ticket, Store } from 'lucide-react';

export const BUSINESS_PROFILES = {
  marketplace: {
    id: 'marketplace',
    label: 'Marketplace',
    shortLabel: 'Marchand',
    icon: Store,
    route: 'Dashboard',
    permissions: ['catalog.read', 'catalog.write', 'orders.read', 'orders.manage', 'stats.read'],
  },
  food: {
    id: 'food',
    label: 'Nourriture / POS',
    shortLabel: 'POS Nourriture',
    icon: Utensils,
    route: 'Dashboard',
    permissions: ['catalog.read', 'catalog.write', 'orders.read', 'orders.accept', 'orders.reject', 'orders.prepare'],
  },
  hospitality: {
    id: 'hospitality',
    label: 'Hôtel / Piscine',
    shortLabel: 'Hôtel / Piscine',
    icon: Hotel,
    route: 'Dashboard',
    permissions: ['inventory.read', 'inventory.write', 'availability.write', 'reservations.read', 'reservations.manage'],
  },
  tickets: {
    id: 'tickets',
    label: 'Tickets / Événements',
    shortLabel: 'Tickets',
    icon: Ticket,
    route: 'Dashboard',
    permissions: ['events.read', 'events.write', 'tickets.read', 'tickets.scan'],
  },
};

export const BUSINESS_PROFILE_IDS = Object.keys(BUSINESS_PROFILES);

export function getBusinessProfile(id) {
  return BUSINESS_PROFILES[id] || BUSINESS_PROFILES.marketplace;
}

export function hasBusinessPermission(user, permission, profileId = user?.current_profile) {
  const profile = user?.profiles?.[profileId];
  return Boolean(profile?.is_active && (profile.permissions || getBusinessProfile(profileId).permissions).includes(permission));
}
