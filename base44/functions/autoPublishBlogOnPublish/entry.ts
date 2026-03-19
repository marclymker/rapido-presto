import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * Automation déclenchée quand un BlogArticle est mis à jour.
 * Si l'article vient d'être publié (is_published passe à true) et n'a pas encore été partagé,
 * on le publie automatiquement sur Facebook & Instagram.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data, old_data } = body;

    // Seulement sur update
    if (event?.type !== 'update') {
      return Response.json({ skipped: true });
    }

    // Vérifier que l'article vient d'être publié (is_published: false -> true)
    const justPublished = data?.is_published === true && old_data?.is_published === false;
    if (!justPublished) {
      return Response.json({ skipped: 'not just published' });
    }

    // Ne pas republier si déjà partagé
    if (data?.social_published_at) {
      return Response.json({ skipped: 'already shared' });
    }

    const articleId = event.entity_id;

    // Appeler la fonction de publication
    const result = await base44.asServiceRole.functions.invoke('publishBlogToSocial', {
      articleId
    });

    console.log('Auto-publish result:', JSON.stringify(result));
    return Response.json({ success: true, result });

  } catch (error) {
    console.error('autoPublishBlogOnPublish error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});