import { database } from '@/api/firebaseClient';

// Une seule application Firebase est utilisée dans tout le client.
// Cela évite les lectures croisées entre deux projets et simplifie les règles de sécurité.
export { database };
