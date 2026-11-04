import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const app = express();
const port = 3000;

// Body parser limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to get Gemini client
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Helper to download an external image and convert to Base64 to eliminate CORS issues
async function fetchImageAsBase64(url: string, timeoutMs = 16000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!response.ok) {
      console.warn(`[Pollinations] Resposta HTTP ${response.status} (${response.statusText}) ao baixar imagem.`);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    if (contentType.includes('text') || contentType.includes('json') || buffer.length < 500) {
      console.warn(`[Pollinations] Resposta inválida: content-type ${contentType}, tamanho ${buffer.length} bytes.`);
      return null;
    }

    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch (err: any) {
    console.warn('[Pollinations] Falha na requisição fetch:', err?.message || err);
    return null;
  }
}

// Helper to download image from Pollinations AI with model=flux and automatic fallback
async function downloadPollinationsImage(cleanPrompt: string): Promise<string | null> {
  const encoded = encodeURIComponent(cleanPrompt);

  // 1. Tentativa primária com model=flux conforme solicitado
  const fluxUrl = `https://image.pollinations.ai/prompt/${encoded}?model=flux&width=768&height=560&nologo=true`;
  console.log(`[Pollinations] Tentativa 1 (model=flux, prompt: "${cleanPrompt}", len: ${cleanPrompt.length}): ${fluxUrl}`);

  const fluxImage = await fetchImageAsBase64(fluxUrl, 18000);
  if (fluxImage) {
    console.log('[Pollinations] Sucesso no download da imagem com model=flux.');
    return fluxImage;
  }

  // 2. Fallback / Retry com modelo padrão e dimensões (se Flux retornar 402, 422, 503 ou timeout)
  const fallbackUrl1 = `https://image.pollinations.ai/prompt/${encoded}?width=768&height=560&nologo=true`;
  console.warn(`[Pollinations] Tentativa 1 (Flux) falhou. Tentando fallback 1 (modelo padrão com dimensões): ${fallbackUrl1}`);

  const fallback1Image = await fetchImageAsBase64(fallbackUrl1, 15000);
  if (fallback1Image) {
    console.log('[Pollinations] Sucesso no download da imagem (fallback 1 padrão).');
    return fallback1Image;
  }

  // 3. Fallback / Retry semântico direto
  const fallbackUrl2 = `https://image.pollinations.ai/prompt/${encoded}`;
  console.warn(`[Pollinations] Fallback 1 falhou. Tentando fallback 2 (URL semântica direta): ${fallbackUrl2}`);

  const fallback2Image = await fetchImageAsBase64(fallbackUrl2, 15000);
  if (fallback2Image) {
    console.log('[Pollinations] Sucesso no download da imagem (fallback 2 semântico).');
    return fallback2Image;
  }

  console.warn('[Pollinations] Todas as tentativas falharam. Usando foto original como fallback visual.');
  return null;
}

// Proxy endpoint to prevent CORS taint when saving/exporting Pollinations AI images
app.get('/api/proxy-image', async (req, res) => {
  const imageUrl = req.query.url as string;
  if (!imageUrl) {
    return res.status(400).send('URL não fornecida');
  }

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return res.status(response.status).send('Erro ao buscar imagem externa');
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (err: any) {
    res.status(500).send(err.message || 'Erro no proxy de imagem');
  }
});

// In-memory cache for discovered Gemini models and models that hit 429 quota
let cachedModels: { list: string[]; timestamp: number } | null = null;
const exhaustedModels = new Set<string>();

// Helper to query available models on the user's Gemini API key dynamically
async function getAvailableGeminiModels(apiKey: string): Promise<string[]> {
  const now = Date.now();
  if (cachedModels && now - cachedModels.timestamp < 10 * 60 * 1000) {
    return cachedModels.list.filter((m) => !exhaustedModels.has(m));
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!res.ok) {
      console.warn(`[Gemini ListModels] HTTP ${res.status}: ${await res.text()}`);
      return [];
    }
    const data: any = await res.json();
    const models: any[] = data.models || [];

    // Filter models supporting generateContent, strictly excluding audio, tts, embedding
    const valid = models
      .filter((m) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
      .map((m) => m.name.replace(/^models\//, ''))
      .filter((name) => {
        const lower = name.toLowerCase();
        return (
          !lower.includes('embedding') &&
          !lower.includes('tts') &&
          !lower.includes('audio') &&
          !lower.includes('aqa') &&
          !lower.includes('imagen')
        );
      });

    // Preference scoring: prioritize fast multimodal models with gemini-flash-lite-latest at the very top
    const priority = (name: string) => {
      if (name === 'gemini-flash-lite-latest' || name.includes('flash-lite-latest')) return 100;
      if (name.includes('flash-lite')) return 90;
      if (name.includes('2.5-flash') || name.includes('2.0-flash')) return 12;
      if (name.includes('flash') && !name.includes('3.8')) return 10;
      if (name.includes('2.5-pro') || name.includes('2.0-pro')) return 9;
      if (name.includes('pro') && !name.includes('3.8')) return 8;
      if (name.includes('flash')) return 7;
      if (name.includes('pro')) return 6;
      return 5;
    };

    valid.sort((a, b) => priority(b) - priority(a));
    console.log('[Gemini] Modelos visuais disponíveis descobertos dinamicamente:', valid);
    cachedModels = { list: valid, timestamp: now };
    return valid.filter((m) => !exhaustedModels.has(m));
  } catch (err: any) {
    console.warn('[Gemini] Erro ao listar modelos dinamicamente:', err?.message || err);
    return [];
  }
}

// Clean and extract valid JSON from LLM output
function extractJsonString(raw: string): string {
  let cleaned = (raw || '').trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '').trim();
  }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned;
}

// Extract user directives from user notes (e.g. "Nome: X", weapons, poses, scenery)
function extractUserDirectives(notes?: string): {
  overrideName?: string;
  visualAdditions: string[];
} {
  if (!notes || typeof notes !== 'string') return { visualAdditions: [] };
  const trimmed = notes.trim();
  let overrideName: string | undefined;

  // 1. Explicit name patterns: "Nome: Trevor Philips", "Name: Trevor Philips", "Personagem: ...", "Chamado de ..."
  const explicitMatch = trimmed.match(/(?:nome|name|personagem|chamado(?:\s+de)?)\s*[:=-]\s*([^\n,.;]+)/i);
  if (explicitMatch && explicitMatch[1]) {
    overrideName = explicitMatch[1].trim();
  } else {
    // 2. Leading character name before actions: "Major Kusanagi segurando...", "Goku em...", "Trevor com..."
    const leadingNameMatch = trimmed.match(
      /^([A-ZÀ-Ú][a-zà-ú0-9_]+(?:\s+[A-ZÀ-Ú][a-zà-ú0-9_]+){0,3})\s+(?:segurando|com|wielding|holding|in|em|vestindo|wearing|lutando|fighting)/i
    );
    if (leadingNameMatch && leadingNameMatch[1]) {
      overrideName = leadingNameMatch[1].trim();
    } else {
      // 3. If user provided a short string that looks like just a character name without verbs
      const words = trimmed.split(/\s+/);
      if (words.length <= 4 && !/[.,;!?]/.test(trimmed)) {
        const lower = trimmed.toLowerCase();
        const actionWords = ['segurando', 'com', 'faz', 'fazer', 'holding', 'com uma', 'com um', 'em chamas'];
        if (!actionWords.some((w) => lower.includes(w))) {
          overrideName = trimmed;
        }
      }
    }
  }

  // 2. Visual elements: weapons, items, vehicles, scenery, effects
  const visualAdditions: string[] = [];
  const lower = trimmed.toLowerCase();

  // Bazooka / RPG / Rocket Launcher
  if (
    lower.includes('bazuca') ||
    lower.includes('bazooka') ||
    lower.includes('lança-foguetes') ||
    lower.includes('lança foguetes') ||
    lower.includes('rpg') ||
    lower.includes('rocket launcher')
  ) {
    visualAdditions.push('holding a heavy military bazooka rocket launcher on his shoulder, ready to fire');
  }
  // Swords / Blades
  if (lower.includes('espada') || lower.includes('sword') || lower.includes('katana') || lower.includes('lâmina')) {
    visualAdditions.push('wielding an epic sharp glowing blade');
  }
  // Guns / Firearms
  if (lower.includes('pistola') || lower.includes('revólver') || lower.includes('gun') || lower.includes('arma de fogo') || lower.includes('revolver')) {
    visualAdditions.push('holding a powerful firearm handgun');
  }
  if (lower.includes('metralhadora') || lower.includes('fuzil') || lower.includes('rifle') || lower.includes('shotgun') || lower.includes('escopeta')) {
    visualAdditions.push('holding an assault rifle weapon');
  }
  // Axe / Hammer
  if (lower.includes('machado') || lower.includes('axe')) {
    visualAdditions.push('wielding a massive battle axe');
  }
  if (lower.includes('martelo') || lower.includes('hammer') || lower.includes('marreta')) {
    visualAdditions.push('wielding a heavy war hammer');
  }
  // Wings / Fire / Elements
  if (lower.includes('asas de fogo') || lower.includes('fire wings')) {
    visualAdditions.push('majestic wings of blazing fire spreading wide');
  } else if (lower.includes('asas') || lower.includes('wings')) {
    visualAdditions.push('majestic large wings');
  }
  if (lower.includes('em chamas') || lower.includes('fogo') || lower.includes('flames') || lower.includes('blaze')) {
    visualAdditions.push('engulfed in cinematic flames and blazing embers');
  }
  if (lower.includes('raio') || lower.includes('trovão') || lower.includes('lightning') || lower.includes('eletricidade')) {
    visualAdditions.push('crackling with bright electric lightning bolts');
  }
  // Scenery & Vehicles
  if (lower.includes('castelo') || lower.includes('castle')) {
    visualAdditions.push('imposing dark fantasy castle in the background');
  }
  if (lower.includes('carro') || lower.includes('car') || lower.includes('veículo') || lower.includes('veiculo')) {
    visualAdditions.push('iconic sports muscle car in background');
  }
  if (lower.includes('los santos') || lower.includes('california') || lower.includes('cidade') || lower.includes('desert') || lower.includes('deserto')) {
    visualAdditions.push('sun-drenched open desert urban background');
  }

  // Extract explicit "segurando X" or "com X" phrases
  const holdingMatch = trimmed.match(/(?:segurando|com|holding|wielding)\s+([^,.;\n]+)/i);
  if (holdingMatch && holdingMatch[1]) {
    const rawHolding = holdingMatch[1].trim();
    if (!visualAdditions.some((v) => v.toLowerCase().includes(rawHolding.toLowerCase()))) {
      visualAdditions.push(`holding ${rawHolding}`);
    }
  }

  return { overrideName, visualAdditions };
}

// Helper to get essential style prefix in English for Pollinations
function getEssentialStylePrefix(style: string): string {
  switch (style) {
    case 'Pixel Art':
      return '16-bit retro pixel art of';
    case 'Anime':
      return '2D Japanese anime illustration of';
    case 'Cyberpunk/Futurista':
      return 'cyberpunk sci-fi concept art of';
    case 'Fantasia Medieval':
      return 'dark medieval fantasy oil painting of';
    default:
      return `${style.toLowerCase()} style trading card art of`;
  }
}

// Translate common Portuguese visual instructions and ideas into descriptive English keywords
function translateUserNotesToEnglish(notes: string): string {
  let text = notes.trim();

  // Strip conversational leading words like "Faça...", "Desenhe...", "Nome: X"
  text = text
    .replace(/(?:nome|name|personagem)\s*[:=-]\s*[^\n,.;]+/i, '')
    .replace(/^(?:faça|fazer|desenhe|crie|quero|gostaria de ver|coloque|bote)\s+(?:que\s+|ele\s+|ela\s+|o\s+|a\s+)?(?:seja\s+|esteja\s+)?/i, '')
    .trim();

  const dict: [RegExp, string][] = [
    [/\bsegurando uma espada laser\b/gi, 'wielding a glowing laser katana sword'],
    [/\bsegurando espada laser\b/gi, 'wielding a glowing laser katana sword'],
    [/\bespada laser\b/gi, 'glowing laser katana blade'],
    [/\bsegurando uma bazuca\b/gi, 'holding a heavy military rocket launcher bazooka on shoulder'],
    [/\bsegurando bazuca\b/gi, 'holding a heavy military rocket launcher bazooka on shoulder'],
    [/\blança-foguetes|lança foguetes|bazuca|bazooka|rpg\b/gi, 'heavy military rocket launcher bazooka on shoulder'],
    [/\bem neo-tóquio|em neo tóquio|em neotokyo|em neo tokyo|neo-tóquio|neo tóquio\b/gi, 'in futuristic neon-lit Neo-Tokyo'],
    [/\bem los santos\b/gi, 'in sun-drenched Los Santos'],
    [/\bno deserto|em um deserto|num deserto\b/gi, 'in sun-drenched open desert'],
    [/\bno castelo|em um castelo|num castelo\b/gi, 'in dark gothic fantasy castle'],
    [/\bno espaço|no cosmos\b/gi, 'in deep cosmic space with nebulae'],
    [/\bna cidade|numa cidade\b/gi, 'in a futuristic cyberpunk cityscape with neon lights'],
    [/\bem chamas|em fogo\b/gi, 'engulfed in cinematic blazing flames and embers'],
    [/\bcom asas de fogo\b/gi, 'with majestic blazing fire wings spreading wide'],
    [/\bcom asas\b/gi, 'with majestic large wings'],
    [/\bcom armadura de titânio|armadura de titânio\b/gi, 'wearing high-tech titanium armor'],
    [/\bcom armadura\b/gi, 'wearing ornate heavy battle armor'],
    [/\bcom olhos vermelhos\b/gi, 'with glowing red cybernetic eyes'],
    [/\bcom olhos brilhantes\b/gi, 'with intense glowing eyes'],
    [/\bsegurando uma espada|com uma espada\b/gi, 'wielding an epic sharp glowing sword blade'],
    [/\bsegurando espada\b/gi, 'wielding an epic sharp glowing sword blade'],
    [/\bsegurando uma pistola|com uma pistola\b/gi, 'holding a futuristic handgun firearm'],
    [/\bsegurando um rifle|com um rifle|com fuzil\b/gi, 'holding a tactical assault rifle'],
    [/\bsegurando um machado|com machado\b/gi, 'wielding a massive battle axe'],
    [/\bsegurando um martelo|com martelo\b/gi, 'wielding a heavy war hammer'],
    [/\bsegurando\b/gi, 'wielding'],
    [/\bvestindo\b/gi, 'wearing'],
    [/\bcom\b/gi, 'with'],
    [/\bem\b/gi, 'in'],
    [/\bde\b/gi, 'of'],
  ];

  for (const [pattern, replacement] of dict) {
    text = text.replace(pattern, replacement);
  }

  return text.replace(/\s+/g, ' ').trim();
}

// Clean and truncate imagePrompt for Pollinations (prioritizing user custom ideas over photo, max 280 chars)
function buildCleanImagePrompt(
  basePrompt: string,
  style: string,
  cardName?: string,
  subtype?: string,
  userNotes?: string,
  maxLen = 350
): string {
  const stylePrefix = getEssentialStylePrefix(style);
  const mandatorySuffix = 'masterpiece, trading card game art, detailed illustration';

  let promptContent = (basePrompt || '').trim();

  // Se o Gemini gerou o imagePrompt multimodal, ele já contém a fusão objeto da foto + texto do usuário
  if (promptContent) {
    // Garante que o prefixo de estilo em inglês esteja na frente
    const prefixWord = stylePrefix.toLowerCase().replace(/^(16-bit|2d)\s+/i, '').split(' ')[0];
    if (!promptContent.toLowerCase().includes(prefixWord)) {
      promptContent = `${stylePrefix} of ${promptContent}`;
    }
  } else {
    // Fallback caso basePrompt venha vazio
    let subject = `${cardName || 'Mystical Relic'}, ${subtype || 'Artifact'}`;
    if (userNotes) {
      subject = `${subject}, ${translateUserNotesToEnglish(userNotes)}`;
    }
    promptContent = `${stylePrefix} of ${subject}`;
  }

  // Se o usuário forneceu texto opcional e porventura o modelo omitiu palavras-chave, mescla-as
  if (userNotes && typeof userNotes === 'string' && userNotes.trim() !== '') {
    const translatedNotes = translateUserNotesToEnglish(userNotes);
    if (translatedNotes) {
      const sampleWords = translatedNotes.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const containsUserWords = sampleWords.some((w) => promptContent.toLowerCase().includes(w));
      if (!containsUserWords) {
        promptContent = promptContent.replace(/,?\s*masterpiece.*$/i, '');
        promptContent = `${promptContent}, ${translatedNotes}`;
      }
    }
  }

  // Garante a presença rigorosa do sufixo obrigatório solicitado: "masterpiece, trading card game art, detailed illustration"
  promptContent = promptContent.replace(/,?\s*masterpiece.*$/i, '');
  promptContent = `${promptContent}, ${mandatorySuffix}`;

  // Sanitiza quebras de linha e pontuações complexas que quebram URLs
  let sanitized = promptContent
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/["'`\\/|(){}[\]<>#@$%^*~=+:;?&_!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Limite respeitando o sufixo obrigatório
  if (sanitized.length > maxLen) {
    const budgetForBody = maxLen - mandatorySuffix.length - 2;
    let body = sanitized.substring(0, budgetForBody);
    const lastComma = body.lastIndexOf(',');
    if (lastComma > 40) {
      body = body.substring(0, lastComma);
    }
    sanitized = `${body.trim()}, ${mandatorySuffix}`;
  }

  console.log(`[ImageGen Fused Prompt] (${sanitized.length} chars): "${sanitized}"`);
  return sanitized;
}

// Free Multimodal Vision Backup via Pollinations OpenAI-compatible endpoint
async function generateCardWithPollinationsOpenAI(params: {
  cleanBase64: string;
  cleanMime: string;
  targetType: string;
  targetRarity: string;
  targetStyle: string;
  userNotes?: string;
}): Promise<any> {
  const { cleanBase64, cleanMime, targetType, targetRarity, targetStyle, userNotes } = params;

  console.log('[Pollinations Vision] Acionando visão computacional multimodal gratuita...');

  const systemInstruction = `Você é um lendário designer e mestre de cartas colecionáveis (TCG / Magic: The Gathering) dotado de visão computacional aguçada.

======================================================================
DIRETRIZ DE FUSÃO MULTIMODAL CRIATIVA E OBRIGATÓRIA (IMAGEM + TEXTO + ESTILO + TIPO):
Você DEVE realizar uma FUSÃO criativa e obrigatória entre o objeto/sujeito real da imagem enviada e o texto opcional fornecido pelo usuário (userNotes):

1. PRESERVAÇÃO DA SILHUETA E FORMA FÍSICA DO OBJETO DA FOTO:
   - Examine a foto enviada e identifique o OBJETO, CRIATURA ou SUJEITO CENTRAL, sua silhueta física, estrutura e formato exato (ex: se a foto é uma xícara, garrafa, pedra, ferramenta, instrumento, gato, pessoa, etc.).
   - O objeto/sujeito central da nova ilustração DEVE OBRIGATORIAMENTE ser esse mesmo objeto/sujeito ou sua versão fantástica/temática, PRESERVANDO a estrutura e formato físico presente na foto (ex: se a foto é uma xícara, a arte DEVE ser uma xícara ou cálice com aquela exata curvatura, alça e proporção).
   - É ESTRITAMENTE PROIBIDO ignorar o objeto da foto e gerar cenários genéricos ou vazios (como corredores, salões ou templos sem o objeto principal). O objeto transformado da foto DEVE estar em destaque supremo no centro da arte!

2. FUSÃO COM O TEMA, ESTILO VISUAL E TIPO DA CARTA:
   - Transforme o objeto/sujeito da foto fundindo-o com:
     a) O tema e lore descritos no campo de texto opcional (ex: se a foto é uma xícara e o texto é "Relíquia mística ancestral imbuída com essência arcana", a xícara torna-se um cálice ancestral místico relíquia brilhando com essência arcana);
     b) O Estilo Visual escolhido: "${targetStyle}";
     c) O Tipo de Carta: "${targetType}" (ex: se for Artefato, transforme o objeto em um artefato mágico; se for Arma, em uma arma ou lâmina mágica; se for Monstro, em uma criatura que incorpore aquela forma).
   - Se o usuário especificou um nome no texto opcional (ex: "Nome: X"), use rigorosamente esse nome na chave "name".

3. ESTRUTURA RIGOROSA DO "imagePrompt":
   O campo "imagePrompt" DEVE ser gerado em INGLÊS seguindo RIGOROSAMENTE esta estrutura de fusão:
   "[Estilo Visual em inglês] of [Objeto/sujeito principal da foto original transformado tematicamente preservando seu formato físico e silhueta], [Elementos e poderes descritos no texto opcional do usuário], masterpiece, trading card game art, detailed illustration"
======================================================================

Responda EXCLUSIVAMENTE um objeto JSON válido (sem comentários ou texto fora do JSON) com as chaves:
- name: string (Nome em PT-BR. Se o usuário forneceu um nome nas notas, use RIGOROSAMENTE esse nome)
- manaCost: number (inteiro de 1 a 10)
- type: string (Exatamente "${targetType}")
- subtype: string (Subtipo evocativo em PT-BR inspirado na fusão do objeto com o tema)
- specialAbility: string (Regra de TCG em PT-BR temática ao objeto transformado e às notas do usuário, com palavras-chave entre colchetes como [Eco Arcano], [Proteção], [Investida], [Acelerar], [Vínculo Vital] ou [Golpe Fatal])
- flavorText: string (Frase de lore marcante em itálico em PT-BR)
- power: number ou null (inteiro de 1 a 16 para Monstro/Arma, null para Magia/Artefato)
- toughness: number ou null (inteiro de 1 a 16 para Monstro/Arma, null para Magia/Artefato)
- element: string ("Fogo", "Água", "Trovão", "Trevas", "Luz", "Natureza", "Arcano" ou "Neutro")
- imagePrompt: string (Prompt em INGLÊS seguindo RIGOROSAMENTE a estrutura: "[Estilo Visual] of [Objeto/sujeito da foto transformado tematicamente preservando o formato], [Elementos do texto opcional], masterpiece, trading card game art, detailed illustration")`;

  const userPrompt = `Analise detalhadamente esta imagem enviada. Crie a carta TCG com Tipo: ${targetType}, Raridade: ${targetRarity}, Estilo: ${targetStyle}.${userNotes ? `\n>>> NOTAS E PEDIDOS DO JOGADOR COM PRIORIDADE MÁXIMA: "${userNotes}" <<<` : ''}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 35000);

  const response = await fetch('https://text.pollinations.ai/openai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    signal: controller.signal,
    body: JSON.stringify({
      model: 'openai',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: systemInstruction,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: userPrompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${cleanMime};base64,${cleanBase64}`,
              },
            },
          ],
        },
      ],
    }),
  });
  clearTimeout(timer);

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Falha no backup Pollinations OpenAI: HTTP ${response.status} - ${errorBody.slice(0, 150)}`);
  }

  const result: any = await response.json();
  const rawText = result.choices?.[0]?.message?.content || '{}';
  const parsed = JSON.parse(extractJsonString(rawText));
  console.log('[Pollinations Vision] Sucesso na análise de visão computacional:', parsed.name);
  return parsed;
}

// POST /api/generate-card (Multimodal Vision with Dynamic Model Discovery + Free Vision Fallback)
app.post('/api/generate-card', async (req, res) => {
  try {
    const { imageBase64, imageMimeType, style, rarity, type, userNotes } = req.body;

    if (!imageBase64 || typeof imageBase64 !== 'string' || imageBase64.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Nenhuma imagem foi recebida. Por favor, envie uma foto ou desenho antes de gerar a carta.',
      });
    }

    // Clean and normalize base64
    let cleanBase64 = imageBase64;
    let cleanMime = imageMimeType || 'image/jpeg';

    if (imageBase64.includes('base64,')) {
      const parts = imageBase64.split('base64,');
      cleanBase64 = parts[1].trim();
      const mimeMatch = parts[0].match(/data:([^;]+);/);
      if (mimeMatch) {
        cleanMime = mimeMatch[1];
      }
    }
    cleanBase64 = cleanBase64.replace(/\s+/g, '');

    const targetType = type || 'Monstro';
    const targetRarity = rarity || 'Lendário';
    const targetStyle = style || 'Fantasia Medieval';

    const prompt = `Você é um lendário designer e mestre de cartas colecionáveis (TCG / Magic: The Gathering) dotado de visão computacional aguçada.

======================================================================
DIRETRIZ DE FUSÃO MULTIMODAL CRIATIVA E OBRIGATÓRIA (IMAGEM + TEXTO + ESTILO + TIPO):
Você DEVE realizar uma FUSÃO criativa e obrigatória entre o objeto/sujeito real da imagem enviada e o texto opcional fornecido pelo jogador (userNotes):

1. PRESERVAÇÃO DA SILHUETA E FORMA FÍSICA DO OBJETO DA FOTO:
   - Examine a foto enviada e identifique o OBJETO, CRIATURA ou SUJEITO CENTRAL, sua silhueta física, estrutura e formato exato (ex: se a foto é uma xícara, garrafa, pedra, ferramenta, instrumento, gato, pessoa, etc.).
   - O objeto/sujeito central da nova ilustração DEVE OBRIGATORIAMENTE ser esse mesmo objeto/sujeito ou sua versão fantástica/temática, PRESERVANDO com precisão seu formato físico, silhueta e proporções presentes na foto (ex: se a foto é uma xícara de café, a arte DEVE ser uma xícara ou cálice com aquele exato formato cerâmico/metálico, curvatura e alça).
   - É TOTALMENTE PROIBIDO ignorar o objeto da foto e gerar cenários genéricos ou vazios (como corredores, salões, ruínas ou templos sem o objeto principal). O objeto transformado da foto DEVE estar em destaque supremo no centro da arte!

2. FUSÃO COM O TEMA, ESTILO VISUAL E TIPO DA CARTA:
   - Reinterprete e transforme o objeto da foto fundindo-o com:
     a) O tema e lore descritos no campo de texto opcional (ex: se a foto é uma xícara e o texto é "Relíquia mística ancestral imbuída com essência arcana", a xícara torna-se um cálice ancestral místico relíquia brilhando com essência arcana e runas antigas);
     b) O Estilo Visual selecionado: "${targetStyle}";
     c) O Tipo de Carta: "${targetType}" (ex: se Artefato, o objeto é um artefato lendário; se Arma, uma arma forjada; se Monstro, uma criatura que incorpora aquela forma e silhueta).
   - Se o usuário especificou um nome no texto opcional (ex: "Nome: X"), use rigorosamente esse nome na chave "name".

3. ESTRUTURA RIGOROSA E OBRIGATÓRIA DO "imagePrompt":
   O campo "imagePrompt" DEVE ser gerado em INGLÊS seguindo ESTRITAMENTE esta estrutura de fusão:
   "[Estilo Visual em inglês] of [Objeto/sujeito principal da foto original transformado tematicamente preservando seu formato físico e silhueta], [Elementos, poderes, auras e materiais descritos no texto opcional do usuário], masterpiece, trading card game art, detailed illustration"
======================================================================

PARÂMETROS DA CARTA SELECIONADOS:
- Tipo: ${targetType} (Monstro, Magia, Arma ou Artefato)
- Raridade: ${targetRarity} (Comum, Raro, Épico, Lendário ou Mítico)
- Estilo Visual: ${targetStyle}
${userNotes ? `\n>>> NOTAS E IDEIAS OPCIONAIS DO JOGADOR (FUSÃO OBRIGATÓRIA): "${userNotes}" <<<\n` : ''}

REGRAS DE RETORNO EM JSON ESTRUTURADO:
1. "name": Nome da carta em Português do Brasil (PT-BR). Se o jogador especificou um nome nas notas, use RIGOROSAMENTE esse nome. Senão, crie um nome épico inspirado no objeto/sujeito da foto transformado.
2. "manaCost": Custo numérico de mana (inteiro entre 1 e 10).
3. "type": Deve ser exatamente '${targetType}'.
4. "subtype": Subtipo evocativo em PT-BR (ex: "Relíquia Ancestral", "Cálice Arcano", "Mascote Guerreiro", "Lâmina Sagrada", "Constructo Místico").
5. "specialAbility": Texto de regras TCG coerente, envolvente e balanceado em PT-BR, temático ao objeto transformado e às notas do jogador. Use palavras-chave entre colchetes como [Eco Arcano], [Proteção], [Investida], [Acelerar], [Vínculo Vital] ou [Golpe Fatal].
6. "flavorText": Frase de lore marcante em itálico em PT-BR sobre o objeto ou história descrita.
7. "power" e "toughness": Inteiros entre 1 e 16 para Monstro e Arma; null para Magia e Artefato.
8. "element": Afinidade elemental ("Fogo", "Água", "Trovão", "Trevas", "Luz", "Natureza", "Arcano" ou "Neutro").
9. "imagePrompt": Prompt em INGLÊS seguindo RIGOROSAMENTE a estrutura: "[Estilo Visual] of [Objeto/sujeito da foto transformado tematicamente preservando o formato], [Elementos do texto opcional], masterpiece, trading card game art, detailed illustration".`;

    let cardData: any = null;
    const apiKey = process.env.GEMINI_API_KEY;
    let ai: GoogleGenAI | null = null;

    // 1. Tentar modelos Gemini disponíveis na conta (gemini-flash-lite-latest como modelo principal)
    if (apiKey) {
      try {
        ai = getGeminiClient();
      } catch (e) {
        console.warn('[Gemini] Falha ao inicializar cliente:', e);
      }

      let candidateModels: string[] = [];
      try {
        candidateModels = await getAvailableGeminiModels(apiKey);
      } catch {
        candidateModels = [];
      }

      // Priorizar fixamente 'gemini-flash-lite-latest' como primeiro modelo da fila
      const otherValidModels = candidateModels.filter(
        (m) =>
          m !== 'gemini-flash-lite-latest' &&
          !m.toLowerCase().includes('tts') &&
          !m.toLowerCase().includes('audio') &&
          !m.toLowerCase().includes('embedding')
      );

      candidateModels = ['gemini-flash-lite-latest', ...otherValidModels];

      // Se a listagem não trouxe modelos adicionais, preencher com fallbacks conhecidos
      if (candidateModels.length === 1) {
        candidateModels.push('gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-pro');
      }

      if (ai) {
        for (const modelName of candidateModels) {
          if (exhaustedModels.has(modelName)) {
            continue;
          }

        try {
          console.log(`[Gemini] Tentando visão computacional com modelo: ${modelName}...`);
          const cardResponse = await ai.models.generateContent({
            model: modelName,
            contents: {
              parts: [
                { inlineData: { data: cleanBase64, mimeType: cleanMime } },
                { text: prompt },
              ],
            },
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  manaCost: { type: Type.INTEGER },
                  type: { type: Type.STRING },
                  subtype: { type: Type.STRING },
                  specialAbility: { type: Type.STRING },
                  flavorText: { type: Type.STRING },
                  power: { type: Type.INTEGER },
                  toughness: { type: Type.INTEGER },
                  element: { type: Type.STRING },
                  imagePrompt: { type: Type.STRING },
                },
                required: ['name', 'manaCost', 'type', 'subtype', 'specialAbility', 'flavorText', 'imagePrompt'],
              },
            },
          });

          const rawText = cardResponse?.text || '{}';
          cardData = JSON.parse(extractJsonString(rawText));
          if (cardData && cardData.name) {
            console.log(`[Gemini] Sucesso na análise visual com ${modelName}: "${cardData.name}"`);
            break;
          }
        } catch (geminiErr: any) {
          const errMsg = geminiErr?.message || '';
          console.warn(`[Gemini] Modelo ${modelName} falhou:`, errMsg);

          // Se for 429 ou cota esgotada, marque o modelo para não re-tentar
          if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota')) {
            console.warn(`[Gemini] Cota esgotada para ${modelName}. Pulando para o próximo modelo.`);
            exhaustedModels.add(modelName);
          }
          // Se for 404, modelo não existe nesta versão da API
          if (errMsg.includes('404') || errMsg.includes('not found')) {
            exhaustedModels.add(modelName);
          }
          // Prossegue para testar o próximo modelo
        }
      }
    }
  }

    // 2. Se nenhum modelo Gemini teve sucesso (cota 429, 503, 404 ou sem chave), usar o Backup Multimodal Gratuito Pollinations OpenAI
    if (!cardData || !cardData.name) {
      console.log('[Multimodal] Modelos Gemini indisponíveis ou com cota excedida. Acionando backup multimodal Pollinations OpenAI...');
      cardData = await generateCardWithPollinationsOpenAI({
        cleanBase64,
        cleanMime,
        targetType,
        targetRarity,
        targetStyle,
        userNotes,
      });
    }

    // Enforce User Overrides from userNotes in post-processing
    if (userNotes && typeof userNotes === 'string' && userNotes.trim() !== '') {
      const { overrideName } = extractUserDirectives(userNotes);
      if (overrideName && cardData.name !== overrideName) {
        console.log(`[Override] Aplicando nome solicitado pelo usuário: "${overrideName}" (substituindo "${cardData.name}")`);
        cardData.name = overrideName;
      }
    }

    // Sanitize stats based on type
    const isCombatType =
      cardData.type === 'Monstro' ||
      cardData.type === 'Arma' ||
      targetType === 'Monstro' ||
      targetType === 'Arma';

    if (!isCombatType) {
      cardData.power = null;
      cardData.toughness = null;
    } else {
      if (cardData.power === null || cardData.power === undefined) {
        cardData.power = Math.max(1, (cardData.manaCost || 3) - 1);
      }
      if (cardData.toughness === null || cardData.toughness === undefined) {
        cardData.toughness = Math.max(1, cardData.manaCost || 3);
      }
    }

    // GERAÇÃO REAL DE NOVA IMAGEM POR IA (SAÍDA VISUAL)
    let generatedImageBase64: string | null = null;
    let imageSource = 'original';

    if (targetStyle !== 'Manter Imagem Original') {
      const rawPrompt = cardData.imagePrompt || `${cardData.name}, ${cardData.subtype}`;
      const cleanPrompt = buildCleanImagePrompt(rawPrompt, targetStyle, cardData.name, cardData.subtype, userNotes, 350);
      console.log(`[ImageGen] Prompt para Pollinations (${cleanPrompt.length} chars, estilo "${targetStyle}"): "${cleanPrompt}"`);

      // 1. Tentar primeiro via SDK do Gemini (com timeout rápido de 3s)
      if (ai) {
        try {
          const imagePromise = ai.models.generateContent({
            model: 'gemini-2.0-flash-preview-image-generation',
            contents: cleanPrompt,
            config: {
              responseModalities: ['TEXT', 'IMAGE'],
            },
          });
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('SDK image gen timeout')), 3000)
          );
          const imgRes: any = await Promise.race([imagePromise, timeoutPromise]);
          for (const part of imgRes.candidates?.[0]?.content?.parts ?? []) {
            if (part.inlineData?.data) {
              const outMime = part.inlineData.mimeType ?? 'image/png';
              generatedImageBase64 = `data:${outMime};base64,${part.inlineData.data}`;
              imageSource = 'gemini-sdk';
              break;
            }
          }
        } catch {
          // SDK de imagem não disponível ou demorou, prossegue para Pollinations
        }
      }

      // 2. Pollinations AI com URL limpa e direta, sem parâmetros extras e com retry automático
      if (!generatedImageBase64) {
        const downloaded = await downloadPollinationsImage(cleanPrompt);
        if (downloaded) {
          generatedImageBase64 = downloaded;
          imageSource = 'pollinations';
        } else {
          console.warn('[Pollinations] Download não concluído. Usando foto enviada como fallback visual.');
        }
      }
    }

    const finalActiveImage =
      targetStyle === 'Manter Imagem Original'
        ? imageBase64
        : (generatedImageBase64 || imageBase64);

    const card = {
      id: 'card_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: cardData.name || 'Guardião do Imaginarium',
      manaCost: typeof cardData.manaCost === 'number' ? cardData.manaCost : 4,
      type: cardData.type || targetType,
      subtype: cardData.subtype || 'Criatura Mística',
      specialAbility:
        cardData.specialAbility ||
        'Quando esta carta entra no campo de batalha, conjura uma barreira de proteção.',
      flavorText:
        cardData.flavorText ||
        'Seu eco ressoa entre as dimensões do Imaginarium.',
      power: isCombatType ? (cardData.power ?? 3) : null,
      toughness: isCombatType ? (cardData.toughness ?? 3) : null,
      rarity: targetRarity,
      style: targetStyle,
      element: cardData.element || 'Arcano',
      imagePrompt: cardData.imagePrompt || '',
      originalImageUrl: imageBase64,
      generatedImageUrl: generatedImageBase64,
      activeImageUrl: finalActiveImage,
      imageSource,
      createdAt: new Date().toISOString(),
    };

    return res.status(200).json({
      success: true,
      card,
    });
  } catch (err: any) {
    console.error('Erro na chamada multimodal do Gemini:', err?.message || err);
    const errMsg = err?.message || '';
    const is503 = errMsg.includes('503') || errMsg.includes('overloaded') || errMsg.includes('Service Unavailable');
    const userMessage = is503
      ? 'Os servidores do Gemini estão com alta demanda temporária (Erro 503). Por favor, aguarde alguns instantes e clique em "Gerar Carta Mágica" novamente.'
      : `Falha ao analisar a imagem com a IA: ${errMsg || 'Erro desconhecido'}. Por favor, tente novamente.`;

    return res.status(500).json({
      success: false,
      error: userMessage,
    });
  }
});

// Setup Vite or Static serving
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[Card Imaginarium] Servidor rodando em http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Falha ao iniciar servidor:', err);
});
