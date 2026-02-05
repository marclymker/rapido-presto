import { z } from 'npm:zod@3.24.2';

/**
 * SÉCURITÉ: Schémas de validation Zod pour les entrées utilisateur
 * Prévient les injections et données malformées
 */

// Validation pour validateOrderPrice
export const validateOrderPriceSchema = z.object({
  cartItemIds: z.array(z.string().uuid()).min(1).max(50),
  paymentSplit: z.enum(['full', 'split']).optional().default('full')
});

// Validation pour MonCash payment
export const moncashPaymentSchema = z.object({
  orderId: z.string().min(5).max(50).regex(/^RP\d+(-\w+)?$/),
  amount: z.number().positive().int().min(50).max(1000000),
  description: z.string().max(200).optional()
});

// Validation pour Square payment
export const squarePaymentSchema = z.object({
  sourceId: z.string().min(10).max(200),
  amount: z.number().positive().int().min(50).max(1000000),
  orderId: z.string().min(5).max(50)
});

// Validation pour annulation de commande
export const cancelOrderSchema = z.object({
  orderId: z.string().uuid(),
  reasonId: z.string().min(1).max(100),
  reasonLabel: z.string().min(1).max(200),
  reasonDetails: z.string().max(500).optional()
});

// Validation pour admin shops
export const adminShopActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'delete', 'list']),
  shopId: z.string().uuid().optional(),
  rejectionReason: z.string().max(500).optional()
});

// Fonction helper pour valider et retourner une erreur formatée
export function validateInput(schema, data) {
  try {
    return { success: true, data: schema.parse(data) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Données invalides',
        details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
    return { success: false, error: 'Erreur de validation' };
  }
}