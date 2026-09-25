# AI Prompt Manager

Gestionnaire de prompts IA multi-utilisateurs : sauvegarder, organiser, réutiliser.

- `backend/` — NestJS + Prisma + PostgreSQL + Redis
- `frontend/` — Angular 22 (standalone + signals) + Tailwind
- `k8s/` — manifestes K3s, namespace `prompt-manager`

## Prérequis

- Node.js 22+
- Docker (Postgres + Redis locaux)
- [Task](https://taskfile.dev) (`brew install go-task`)
- Claude Code (optionnel) : `npm i -g typescript-language-server typescript` pour le plugin
  `typescript-lsp`. Les skills du projet sont dans `.claude/skills/`.

## Installation

```bash
task install     # deps racine + front + back, puis hooks git (husky)
cp backend/.env.example backend/.env
```

## Développement

```bash
task infra       # démarre Postgres + Redis via docker-compose.dev.yml
task dev         # infra + backend (Prisma generate/push) + frontend
```

- Frontend : http://localhost:4200
- API : http://localhost:3000/api
- Health : http://localhost:3000/health (hors préfixe `/api`, sans dépendance BDD)

## Commandes

```bash
task --list      # toutes les tâches disponibles
task lint        # eslint front + back
task test        # tests unitaires
task infra-down  # arrête les bases locales
task clean       # supprime node_modules et dist
```

## Qualité

- `pre-commit` → `lint-staged` (eslint --fix + prettier sur les fichiers stagés)
- `commit-msg` → `commitlint` (conventional commits)

Chaque package a sa propre config ESLint et son `.lintstagedrc.json` ; lint-staged
exécute chaque commande depuis le dossier du package concerné.
