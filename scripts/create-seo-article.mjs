const args = process.argv.slice(2);

function readArg(name) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
}

const slug = readArg('slug');
const keyword = readArg('keyword');
const intent = readArg('intent');
const related = readArg('related') ?? '';

if (!slug || !keyword || !intent || !related) {
  console.error(`Usage:
  npm run create:article -- --slug "mi-slug" --keyword "keyword principal" --intent "intencion de busqueda" --related "web-development,ai-automation"

Required:
  --slug      URL slug without accents or trailing slash
  --keyword   primary keyword
  --intent    search intent in one sentence
  --related   comma-separated service product IDs
`);
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const title = keyword.charAt(0).toUpperCase() + keyword.slice(1);
const relatedIds = related
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error('Slug must be lowercase, URL-safe, and use hyphens only.');
  process.exit(1);
}

if (relatedIds.length < 2) {
  console.error('Provide at least two related service IDs.');
  process.exit(1);
}

const draft = `{
  slug: '${slug}',
  title: '${title}',
  metaTitle: '${title} | Maiatesta',
  metaDescription:
    'Escribe una descripción única de 90-160 caracteres para ${keyword}, con Quito/Ecuador y beneficio claro.',
  h1: '${title}',
  publishDate: '${today}',
  updatedDate: '${today}',
  primaryKeyword: '${keyword}',
  searchIntent:
    '${intent}',
  excerpt:
    'Resume la respuesta principal en 1-2 frases útiles para un dueño de pyme en Quito o Ecuador.',
  sections: [
    {
      heading: 'Respuesta corta',
      body: [
        'Explica la respuesta directa sin relleno.',
        'Incluye contexto local de Quito, Pichincha o Ecuador cuando aporte valor.',
      ],
    },
    {
      heading: 'Qué debe revisar una pyme',
      body: [
        'Describe criterios prácticos de decisión.',
        'Evita promesas falsas y enfoca el siguiente paso.',
      ],
    },
    {
      heading: 'Cuándo pedir ayuda',
      body: [
        'Explica cuándo conviene cotizar con Maiatesta.',
        'Conecta la necesidad con servicios reales.',
      ],
    },
  ],
  faqs: [
    {
      question: 'Pregunta frecuente local 1',
      answer: 'Respuesta breve, directa y útil.',
    },
    {
      question: 'Pregunta frecuente local 2',
      answer: 'Respuesta breve, directa y útil.',
    },
    {
      question: 'Pregunta frecuente local 3',
      answer: 'Respuesta breve, directa y útil.',
    },
  ],
  relatedServiceIds: ${JSON.stringify(relatedIds)},
  ctaMessage:
    'Hola Maiatesta, leí la guía sobre ${keyword} y quiero una recomendación para mi empresa en Quito.',
},`;

console.log(draft);
console.log(`
Checklist before publishing:
- Add '${slug}' to src/data/articleRoutes.ts.
- Paste the object into src/data/articlePages.ts.
- Replace every placeholder with specific, helpful copy.
- Run npm run build && npm run check:seo.
- Confirm the article links to related services and has a WhatsApp CTA.
`);
