Deno.serve(async (req) => {
  try {
    // Retourne uniquement les informations publiques Pusher (sécurisé pour le frontend)
    return Response.json({
      key: Deno.env.get('PUSHER_KEY'),
      cluster: Deno.env.get('PUSHER_CLUSTER')
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});