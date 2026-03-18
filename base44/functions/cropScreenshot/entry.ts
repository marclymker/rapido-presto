import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { file_url } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'file_url requis' }, { status: 400 });
    }

    // Télécharger l'image
    const imageResponse = await fetch(file_url);
    const imageBlob = await imageResponse.blob();
    const arrayBuffer = await imageBlob.arrayBuffer();
    const imageData = new Uint8Array(arrayBuffer);

    // Utiliser l'IA pour détecter et découper les marges noires
    const prompt = `Analyse cette image et détecte si elle contient des marges noires (screenshots avec bandes noires en haut/bas).
Si oui, fournis les coordonnées exactes pour découper ces marges noires.
Réponds UNIQUEMENT avec un JSON dans ce format:
{
  "has_black_margins": true/false,
  "crop_needed": true/false,
  "top_margin_percent": 0-100,
  "bottom_margin_percent": 0-100,
  "description": "explication courte"
}`;

    const analysisResponse = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          has_black_margins: { type: "boolean" },
          crop_needed: { type: "boolean" },
          top_margin_percent: { type: "number" },
          bottom_margin_percent: { type: "number" },
          description: { type: "string" }
        }
      }
    });

    const analysis = analysisResponse;

    // Si pas besoin de crop, retourner l'URL originale
    if (!analysis.crop_needed) {
      return Response.json({
        success: true,
        cropped: false,
        original_url: file_url,
        file_url: file_url,
        message: "Aucune marge noire détectée"
      });
    }

    // Sinon, on demande à l'IA de générer une version sans marges
    const cropPrompt = `Prends cette image et supprime complètement les marges noires en haut et en bas. 
Garde uniquement le contenu principal de l'image, sans aucune bande noire.
Retourne une image propre et recadrée.`;

    const generatedImage = await base44.integrations.Core.GenerateImage({
      prompt: cropPrompt,
      existing_image_urls: [file_url]
    });

    return Response.json({
      success: true,
      cropped: true,
      original_url: file_url,
      file_url: generatedImage.url,
      analysis: analysis,
      message: `Marges noires détectées et supprimées (${analysis.description})`
    });

  } catch (error) {
    console.error('Erreur crop screenshot:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});