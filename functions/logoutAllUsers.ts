import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Vérifier que l'utilisateur est admin
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Incrémenter la version de session globale
    const newSessionVersion = Date.now();

    // Récupérer tous les utilisateurs
    const users = await base44.asServiceRole.entities.User.list();
    
    // Mettre à jour tous les utilisateurs avec la nouvelle version de session
    const updatePromises = users.map(u => 
      base44.asServiceRole.entities.User.update(u.id, {
        session_version: newSessionVersion
      })
    );

    await Promise.all(updatePromises);

    return Response.json({ 
      success: true, 
      message: `${users.length} utilisateurs seront déconnectés`,
      count: users.length,
      session_version: newSessionVersion
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});