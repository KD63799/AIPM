import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { parseVariableNames } from '../src/prompts/prompt-variables';

const DEMO_EMAIL = 'demo@prompt-manager.local';
const DEMO_PASSWORD = 'demo1234';

type SeedPrompt = {
  title: string;
  description?: string;
  content: string;
  folder?: string;
  tags: string[];
  isFavorite?: boolean;
  usageCount?: number;
  defaults?: Record<string, string>;
};

const FOLDERS = [
  { name: 'Développement', parent: null },
  { name: 'Rédaction', parent: null },
  { name: 'Revue de code', parent: 'Développement' },
] as const;

const TAGS = [
  { name: 'claude', color: '#8b5cf6' },
  { name: 'chatgpt', color: '#10b981' },
  { name: 'refactoring', color: '#f59e0b' },
  { name: 'documentation', color: '#3b82f6' },
  { name: 'analyse', color: '#ef4444' },
] as const;

const PROMPTS: SeedPrompt[] = [
  {
    title: 'Revue de code critique',
    description: 'Relecture exigeante, sans complaisance',
    folder: 'Revue de code',
    tags: ['claude', 'refactoring'],
    isFavorite: true,
    usageCount: 42,
    defaults: { language: 'TypeScript', severity: 'bloquants et majeurs' },
    content: `Tu es un relecteur senior en {{language}}.
Relis le code ci-dessous et signale uniquement les problèmes {{severity}}.
Pour chacun : le fichier, la ligne, pourquoi c'est un problème, et le correctif minimal.
Ne commente pas le style si un formateur automatique s'en charge.

\`\`\`{{language}}
{{code}}
\`\`\``,
  },
  {
    title: 'Générer des tests unitaires',
    description: 'Couvre les cas limites, pas seulement le chemin heureux',
    folder: 'Développement',
    tags: ['refactoring'],
    usageCount: 17,
    defaults: { framework: 'Jest' },
    content: `Écris des tests {{framework}} pour la fonction suivante.
Couvre : le cas nominal, les entrées vides, les valeurs limites et les erreurs attendues.
Un test = une assertion logique. Pas de mock de ce que tu peux instancier réellement.

{{code}}`,
  },
  {
    title: 'Message de commit',
    description: 'Conventional commits à partir du diff',
    folder: 'Développement',
    tags: ['documentation'],
    usageCount: 128,
    isFavorite: true,
    content: `Rédige un message de commit en conventional commits pour ce diff.
Sujet à l'impératif, 72 caractères maximum, sans point final.
Corps uniquement si le "pourquoi" n'est pas évident à la lecture du diff.

{{diff}}`,
  },
  {
    title: 'Analyse de logs',
    description: 'Trouver la cause racine dans un dump',
    folder: 'Développement',
    tags: ['analyse'],
    usageCount: 8,
    content: `Voici un extrait de logs de production.
Identifie la cause racine, pas seulement le symptôme le plus visible.
Donne : la séquence d'événements, l'hypothèse la plus probable, et ce qu'il faut vérifier pour la confirmer.

{{logs}}`,
  },
  {
    title: 'Expliquer un concept',
    description: 'Vulgarisation calibrée sur un niveau',
    folder: 'Rédaction',
    tags: ['documentation', 'chatgpt'],
    usageCount: 63,
    defaults: { niveau: 'développeur junior', longueur: '300 mots' },
    content: `Explique {{concept}} à un {{niveau}}.
Longueur : {{longueur}}.
Commence par une analogie concrète, puis le mécanisme réel, puis une erreur fréquente.
Pas de jargon non défini.`,
  },
  {
    title: "Résumé d'article",
    description: 'Synthèse structurée avec les points saillants',
    folder: 'Rédaction',
    tags: ['analyse'],
    isFavorite: true,
    usageCount: 91,
    defaults: { longueur: '5 points' },
    content: `Résume le texte suivant en {{longueur}}.
Garde les chiffres et les noms propres. Signale explicitement ce que l'auteur affirme sans le démontrer.

{{texte}}`,
  },
  {
    title: 'Traduction technique',
    description: 'Traduction qui préserve la terminologie',
    folder: 'Rédaction',
    tags: ['documentation'],
    usageCount: 24,
    defaults: { source_lang: 'anglais', target_lang: 'français' },
    content: `Traduis ce texte technique de {{source_lang}} vers {{target_lang}}.
Conserve les termes techniques établis dans la langue cible ; ne traduis pas les identifiants de code.
Si un terme n'a pas d'équivalent consacré, garde l'original entre parenthèses.

{{texte}}`,
  },
  {
    title: 'Brainstorming produit',
    description: 'Générer des pistes sans filtre, tri ensuite',
    tags: ['chatgpt'],
    usageCount: 5,
    content: `Propose 10 idées de fonctionnalités pour un gestionnaire de prompts.
Cinq incrémentales, cinq qui changeraient la nature du produit.
Pour chacune : une phrase, et ce qu'elle coûterait à maintenir.
Ne filtre pas à ce stade.`,
  },
];

const adapter = new PrismaPg({ connectionString: requireEnv('DATABASE_URL') });
const prisma = new PrismaClient({ adapter });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set — copy .env.example to .env first`);
  return value;
}

async function main(): Promise<void> {
  // Cascades wipe folders, prompts, tags, versions and variables of the demo user.
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });

  const user = await prisma.user.create({
    data: { email: DEMO_EMAIL, passwordHash: await argon2.hash(DEMO_PASSWORD) },
  });

  const folderIds = new Map<string, string>();
  for (const folder of FOLDERS) {
    const created = await prisma.folder.create({
      data: {
        userId: user.id,
        name: folder.name,
        parentId: folder.parent ? folderIds.get(folder.parent) : null,
      },
    });
    folderIds.set(folder.name, created.id);
  }

  const tagIds = new Map<string, string>();
  for (const tag of TAGS) {
    const created = await prisma.tag.create({
      data: { userId: user.id, name: tag.name, color: tag.color },
    });
    tagIds.set(tag.name, created.id);
  }

  for (const prompt of PROMPTS) {
    await prisma.prompt.create({
      data: {
        userId: user.id,
        title: prompt.title,
        description: prompt.description,
        content: prompt.content,
        folderId: prompt.folder ? folderIds.get(prompt.folder) : null,
        isFavorite: prompt.isFavorite ?? false,
        usageCount: prompt.usageCount ?? 0,
        lastUsedAt: prompt.usageCount ? new Date() : null,
        lastVersion: 1,
        versions: {
          create: { versionNumber: 1, title: prompt.title, content: prompt.content },
        },
        tags: {
          create: prompt.tags.map((name) => ({ tagId: requireTag(tagIds, name) })),
        },
        variables: {
          create: parseVariableNames(prompt.content).map((name) => ({
            name,
            defaultValue: prompt.defaults?.[name] ?? null,
          })),
        },
      },
    });
  }

  const variableCount = await prisma.promptVariable.count();
  console.log(
    `Seeded ${DEMO_EMAIL} / ${DEMO_PASSWORD} — ` +
      `${FOLDERS.length} folders, ${TAGS.length} tags, ${PROMPTS.length} prompts, ${variableCount} variables`,
  );
}

function requireTag(tagIds: Map<string, string>, name: string): string {
  const id = tagIds.get(name);
  if (!id) throw new Error(`Unknown tag in seed data: ${name}`);
  return id;
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
