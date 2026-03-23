Deno.serve(async (req) => {
  const url = new URL(req.url);
  
  // Vérifier si c'est le fichier de vérification Google
  if (url.pathname === '/google2665276976d944ab.html') {
    return new Response('google-site-verification: google2665276976d944ab.html', {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    });
  }
  
  return Response.json({ error: 'Not found' }, { status: 404 });
});