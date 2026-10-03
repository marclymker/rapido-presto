import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Fuseau horaire de Port-au-Prince, Haïti (UTC-5)
const HAITI_TIMEZONE = 'America/Port-au-Prince';

/**
 * Formate une date au fuseau horaire de Port-au-Prince
 * @param {Date|string} date - La date à formatter
 * @param {string} formatStr - Le format de sortie (format date-fns)
 * @returns {string} - La date formatée
 */
export function formatHaitiDate(date, formatStr = "d MMMM yyyy 'à' HH:mm") {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Convertir au fuseau horaire d'Haïti
  const haitiDate = new Date(dateObj.toLocaleString('en-US', { timeZone: HAITI_TIMEZONE }));

  return format(haitiDate, formatStr, { locale: fr });
}

/**
 * Obtient l'heure actuelle à Port-au-Prince
 * @returns {Date} - Date et heure actuelle à Port-au-Prince
 */
export function getHaitiTime() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: HAITI_TIMEZONE }));
}