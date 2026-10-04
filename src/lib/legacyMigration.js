import { base44 } from '@/api/base44Client';

const LEGACY_ID_FIELDS = ['legacy_id', 'base44_id', 'legacy_user_id', 'external_id'];

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePhone(value) {
  return String(value || '').replace(/[^0-9]/g, '').replace(/^0+/, '');
}

function firstValue(record, fields) {
  for (const field of fields) {
    if (record?.[field] !== undefined && record[field] !== null && record[field] !== '') return record[field];
  }
  return null;
}

function addIndex(index, key, value) {
  if (!key) return;
  const values = index.get(key) || [];
  values.push(value);
  index.set(key, values);
}

function indexUsers(users) {
  const byEmail = new Map();
  const byPhone = new Map();
  users.forEach((user) => {
    addIndex(byEmail, normalize(user.email), user);
    addIndex(byPhone, normalizePhone(user.phone || user.whatsapp_number), user);
  });
  return { byEmail, byPhone };
}

function findCanonicalUser(legacyUser, users, indexes) {
  const explicitUid = firstValue(legacyUser, ['firebase_uid', 'auth_uid', 'linked_firebase_uid']);
  if (explicitUid) return users.find((user) => user.id === explicitUid) || null;
  const emailMatches = indexes.byEmail.get(normalize(legacyUser.email)) || [];
  if (emailMatches.length === 1 && emailMatches[0].id !== legacyUser.id) return emailMatches[0];
  const phoneMatches = indexes.byPhone.get(normalizePhone(legacyUser.phone || legacyUser.whatsapp_number)) || [];
  if (phoneMatches.length === 1 && phoneMatches[0].id !== legacyUser.id) return phoneMatches[0];
  return null;
}

function isLegacyUser(user, canonicalIds) {
  return Boolean(
    firstValue(user, LEGACY_ID_FIELDS) ||
    user.legacy_source === 'base44' ||
    user.source === 'base44' ||
    (user.id && !canonicalIds.has(user.id) && user.migrated_from)
  );
}

export async function scanLegacyFirestore({ maxUsers = 1000, maxShops = 2000, maxProducts = 5000, maxActivity = 20000 } = {}) {
  const [users, shops, products, activities] = await Promise.all([
    base44.entities.User.list('-created_date', maxUsers),
    base44.entities.Shop.list('-created_date', maxShops),
    base44.entities.Product.list('-created_date', maxProducts),
    base44.entities.UserActivity.list('-created_date', maxActivity)
  ]);
  const canonicalIds = new Set(users.filter((user) => user.firebase_uid === user.id || user.auth_uid === user.id).map((user) => user.id));
  const indexes = indexUsers(users);
  const activityEmailByUser = new Map();
  activities.forEach((activity) => {
    const legacyId = String(activity.user_id || '');
    const email = normalize(activity.created_by);
    if (legacyId && !legacyId.startsWith('guest_') && email.includes('@')) activityEmailByUser.set(legacyId, email);
  });
  const userLinks = [];
  const byLegacyUserId = new Map();
  const legacyOwnerIds = new Set(shops.map((shop) => String(shop.user_id || shop.owner_id || shop.vendor_id || '')).filter(Boolean));
  const legacyUsers = users.filter((user) => isLegacyUser(user, canonicalIds) || legacyOwnerIds.has(user.id));
  legacyUsers.forEach((legacyUser) => {
    const activityEmail = activityEmailByUser.get(legacyUser.id);
    const canonical = activityEmail
      ? (indexes.byEmail.get(activityEmail) || []).find((candidate) => candidate.id !== legacyUser.id)
      : findCanonicalUser(legacyUser, users, indexes);
    const legacyId = String(firstValue(legacyUser, LEGACY_ID_FIELDS) || legacyUser.id);
    if (canonical && canonical.id !== legacyUser.id) {
      userLinks.push({ legacyId, legacyDocId: legacyUser.id, firebaseUid: canonical.id, email: canonical.email || legacyUser.email || activityEmail, match: activityEmail ? 'activity_email' : 'email_or_phone' });
      byLegacyUserId.set(legacyUser.id, canonical.id);
      byLegacyUserId.set(legacyId, canonical.id);
    }
  });
  activityEmailByUser.forEach((email, legacyId) => {
    if (byLegacyUserId.has(legacyId)) return;
    const matches = (indexes.byEmail.get(email) || []).filter((candidate) => candidate.id !== legacyId);
    if (matches.length === 1) {
      userLinks.push({ legacyId, legacyDocId: null, firebaseUid: matches[0].id, email, match: 'activity_email' });
      byLegacyUserId.set(legacyId, matches[0].id);
    }
  });

  const shopLinks = shops.flatMap((shop) => {
    const legacyOwner = String(shop.user_id || shop.owner_id || shop.vendor_id || '');
    const firebaseUid = byLegacyUserId.get(legacyOwner);
    return firebaseUid ? [{ shopId: shop.id, legacyOwner, firebaseUid }] : [];
  });
  const shopIds = new Set(shopLinks.map((link) => link.shopId));
  const productLinks = products.flatMap((product) => {
    const legacyOwner = String(product.owner_id || product.user_id || product.vendor_id || '');
    const firebaseUid = byLegacyUserId.get(legacyOwner) || shopLinks.find((link) => link.shopId === product.shop_id)?.firebaseUid;
    return firebaseUid ? [{ productId: product.id, shopId: product.shop_id || null, legacyOwner, firebaseUid }] : [];
  });

  return {
    scanned: { users: users.length, shops: shops.length, products: products.length, userActivity: activities.length },
    links: { users: userLinks, shops: shopLinks, products: productLinks },
    ambiguousUsers: users.filter((user) => (isLegacyUser(user, canonicalIds) || legacyOwnerIds.has(user.id)) && !userLinks.some((link) => link.legacyDocId === user.id)).map((user) => ({ id: user.id, email: user.email || null, phone: user.phone || user.whatsapp_number || null }))
  };
}

export async function executeLegacyFirestoreMigration(report) {
  const now = new Date().toISOString();
  let writes = 0;
  for (const link of report.links.users) {
    if (link.legacyDocId) await base44.entities.User.update(link.legacyDocId, { linked_firebase_uid: link.firebaseUid, migration_status: 'linked', migration_source: 'base44', migrated_at: now });
    const canonical = await base44.entities.User.get(link.firebaseUid);
    const legacy = await base44.entities.User.get(link.legacyDocId);
    await base44.entities.User.update(link.firebaseUid, { legacy_user_ids: [...new Set([...(canonical?.legacy_user_ids || []), link.legacyId])], migration_status: 'linked', migrated_at: now, ...(legacy?.profiles ? { legacy_profiles: legacy.profiles } : {}) });
    await base44.entities.MigrationLink.update(`${link.legacyId}_user`, { type: 'user', legacy_id: link.legacyId, firebase_uid: link.firebaseUid, status: 'linked', migrated_at: now });
    writes += link.legacyDocId ? 3 : 2;
  }
  for (const link of report.links.shops) {
    await base44.entities.Shop.update(link.shopId, { user_id: link.firebaseUid, legacy_user_id: link.legacyOwner, migration_source: 'base44', migrated_at: now });
    await base44.entities.MigrationLink.update(`${link.shopId}_shop`, { type: 'shop', legacy_id: link.shopId, firebase_uid: link.firebaseUid, status: 'linked', migrated_at: now });
    writes += 2;
  }
  for (const link of report.links.products) {
    await base44.entities.Product.update(link.productId, { owner_id: link.firebaseUid, vendor_id: link.firebaseUid, legacy_owner_id: link.legacyOwner, migration_source: 'base44', migrated_at: now });
    await base44.entities.MigrationLink.update(`${link.productId}_product`, { type: 'product', legacy_id: link.productId, firebase_uid: link.firebaseUid, shop_id: link.shopId || null, status: 'linked', migrated_at: now });
    writes += 2;
  }
  return { writes, linked: report.links };
}
