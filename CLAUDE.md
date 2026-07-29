# AI Prompt Manager

Gestionnaire de prompts IA multi-utilisateurs. Monorepo : `backend/` (NestJS) + `frontend/` (Angular).

## Règles générales

- TypeScript strict. **Aucun `any`**, aucun `!` non-null non justifié par un commentaire.
- Code concis. Pas de commentaires qui paraphrasent le code.
- **Pas de dead code** : rien de non-appelé, pas d'export inutilisé, pas de scaffolding « pour plus tard ».
- Pas de sur-ingénierie : pas de CQRS, pas d'event bus, pas d'interface à une seule implémentation,
  pas de config pour une valeur qui ne change jamais.
- Nommage, code et commentaires en **anglais**. Messages affichés à l'utilisateur en **français**.
- Commits en conventional commits (`feat:`, `fix:`, `chore:`…), validés par commitlint.

## Backend — NestJS

- Un module par domaine : `auth`, `users`, `folders`, `prompts`, `tags`, `export`.
- Chaque module : `[m].module.ts`, `[m].controller.ts`, `[m].service.ts`, `dto/`,
  - `guards/` ou `strategies/` si nécessaire.
- **Le controller ne fait que du routing HTTP.** Zéro logique métier, zéro Prisma.
- Le service porte la logique métier et les accès Prisma.
- `PrismaModule` et `RedisModule` sont globaux.
- DTOs avec `class-validator`. `ValidationPipe` global :
  `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`.
- Filtre d'exception global mappant les erreurs Prisma connues (P2002 → 409, P2025 → 404).
- **Toute ressource est scopée par `userId`.** Une ressource qui n'appartient pas à l'utilisateur
  courant lève `NotFoundException`, jamais `ForbiddenException` (ne pas leaker l'existence).
- Variables d'env validées au boot (`@nestjs/config` + schéma Zod). L'app refuse de démarrer si une manque.

## Frontend — Angular

- **Standalone components** exclusivement. Pas de `NgModule`.
- **Signals** pour l'état. Pas de state manager externe (pas de NgRx, pas de store maison).
- **Typed reactive forms** (`FormGroup<{...}>`). Pas de `FormsModule`/`ngModel`.
- Organisation par feature : `src/app/features/<feature>/{components,services,models}`.
- `src/app/shared/` pour l'UI générique réutilisée par ≥ 2 features. Une seule feature l'utilise → elle y reste.
- `src/app/core/` pour les interceptors, guards et services applicatifs singleton.
- Un service par ressource, exposant des signals en lecture seule (`asReadonly()`).
- Tailwind CSS. Thème sombre par défaut, UI sobre et dense, orientée productivité.
- États `loading` / `error` visibles à l'écran. Toasts sur les actions utilisateur.
- `ChangeDetectionStrategy.OnPush` partout. Control flow natif (`@if`, `@for`), pas de `*ngIf`/`*ngFor`.

## Tests

- **Tous les endpoints API sont couverts par des tests e2e** contre une base de test dédiée.
- Tests unitaires obligatoires sur : parsing/interpolation des `{{variables}}`,
  rotation et révocation des refresh tokens.
- Pas de test sur les getters triviaux ni sur le framework lui-même.

## Commandes

`task` est le point d'entrée (voir `taskfile.yml`). Ne pas lancer les commandes npm brutes
quand une tâche existe.

## Priorité des règles

Ce fichier prime sur tout skill de simplification (ponytail inclus). La structure
modulaire NestJS et la couverture e2e des endpoints sont des exigences de soutenance,
pas de l'over-engineering : elles ne sont pas négociables. Ponytail s'applique
_à l'intérieur_ d'une méthode de service, pas à la structure des modules.
