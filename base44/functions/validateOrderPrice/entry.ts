import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { z } from 'npm:zod@3.24.2';

const validateOrderPriceSchema = z.object({
  cartItemIds: z.array(z.string()).min(1).max(50),
  paymentSplit: z.enum(['full', 'split']).optional().default('full')
});

function validateInput(schema, data) {
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

/**
 * SÉCURITÉ CRITIQUE: Validation des prix côté serveur
 * Empêche la manipulation des montants par le client
 */

function applyClientMargin(price) {
  return Math.round(price * 1.10);
}

function calculateDeliveryFee(clientCommune, shopCommune) {
  const hour = new Date().getHours();
  const sameCommune = clientCommune === shopCommune;
  
  if (hour >= 8 && hour < 11) {
    return sameCommune ? 300 : 500;
  } else if (hour >= 12 && hour < 15) {
    return sameCommune ? 400 : 750;
  } else if (hour >= 16 && hour < 21) {
    return sameCommune ? 300 : 500;
  } else if (hour >= 21 && hour < 23) {
    return sameCommune ? 500 : 750;
  }
  return sameCommune ? 400 : 600;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    // SÉCURITÉ: Validation Zod des entrées
    const validation = validateInput(validateOrderPriceSchema, body);
    if (!validation.success) {
      return Response.json({ error: validation.error, details: validation.details }, { status: 400 });
    }

    const { cartItemIds, paymentSplit } = validation.data;

    // Récupérer les articles du panier depuis la base de données
    const cartItems = await Promise.all(
      cartItemIds.map(id => base44.entities.CartItem.filter({ id, user_id: user.id }))
    );
    const validCartItems = cartItems.flat().filter(item => item);

    if (validCartItems.length === 0) {
      return Response.json({ error: 'No valid cart items found' }, { status: 404 });
    }

    // RECALCULER tous les prix côté serveur
    let subtotal = 0;
    const itemsByShop = {};

    for (const cartItem of validCartItems) {
      // Récupérer le produit depuis la DB pour le prix RÉEL
      const products = await base44.entities.Product.filter({ id: cartItem.product_id });
      const product = products[0];

      if (!product || !product.is_available) {
        return Response.json({ 
          error: `Produit ${cartItem.product_name} non disponible` 
        }, { status: 400 });
      }

      // Prix RÉEL depuis la base de données (avec marge)
      const realPrice = applyClientMargin(product.promo_price || product.price);
      
      // Calculer le total des personnalisations
      let customizationPrice = 0;
      if (cartItem.customization) {
        if (cartItem.customization.color?.additional_price) {
          customizationPrice += cartItem.customization.color.additional_price;
        }
        if (cartItem.customization.size?.additional_price) {
          customizationPrice += cartItem.customization.size.additional_price;
        }
        if (cartItem.customization.text_price) {
          customizationPrice += cartItem.customization.text_price;
        }
        if (cartItem.customization.arrangement?.additional_price) {
          customizationPrice += cartItem.customization.arrangement.additional_price;
        }
      }

      const itemTotal = (realPrice + customizationPrice) * cartItem.quantity;
      subtotal += itemTotal;

      // Grouper par boutique
      if (!itemsByShop[cartItem.shop_id]) {
        itemsByShop[cartItem.shop_id] = {
          shop_region: cartItem.shop_region,
          items: []
        };
      }
      itemsByShop[cartItem.shop_id].items.push({
        ...cartItem,
        verified_price: realPrice,
        verified_customization_price: customizationPrice,
        verified_total: itemTotal
      });
    }

    // Calculer les frais de livraison
    let deliveryFee = 0;
    if (subtotal < 3000) {
      for (const shopId in itemsByShop) {
        const shopRegion = itemsByShop[shopId].shop_region;
        deliveryFee += calculateDeliveryFee(user.region, shopRegion);
      }
    }

    // Balance due (frais d'annulation précédente)
    const pendingBalance = user.pending_balance || 0;

    // Total
    const baseTotal = subtotal + deliveryFee + pendingBalance;
    const finalTotal = paymentSplit === 'split' ? baseTotal / 2 : baseTotal;

    return Response.json({
      success: true,
      validation: {
        subtotal,
        deliveryFee,
        pendingBalance,
        baseTotal,
        finalTotal,
        paymentSplit,
        itemsByShop,
        freeDelivery: subtotal >= 3000
      }
    });

  } catch (error) {
    console.error('Price validation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});