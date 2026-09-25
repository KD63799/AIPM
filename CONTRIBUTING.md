# Contribuer

Merci de votre intérêt ! Quelques règles pour que chaque contribution soit facile à relire.

## Mettre en place l’environnement

Suivez la section « Développement » du [README](README.md). `task install` installe aussi les
hooks git : ESLint et Prettier sur les fichiers modifiés, commitlint sur le message de commit.

## Avant d’ouvrir une pull request

1. Partez de `main`, sur une branche dédiée.
2. Écrivez les tests avec le code :
   - tout endpoint ajouté ou modifié a ses tests e2e (`backend/test/*.e2e-spec.ts`) ;
   - la logique pure (analyse des variables, arbre des dossiers…) a ses tests unitaires.
3. Vérifiez que `task ci` passe : lint, tests unitaires, tests e2e.
4. Messages de commit en [Conventional Commits](https://www.conventionalcommits.org/fr/) :
   `feat: …`, `fix: …`, `docs: …`, `chore: …`.

## Règles de code

Elles sont détaillées dans [CLAUDE.md](CLAUDE.md) et valent pour tout le monde, humains
compris. En résumé :

- TypeScript strict, aucun `any`, pas de code mort ni d’abstraction « pour plus tard » ;
- nommage, code et commentaires en anglais, textes affichés en français ;
- backend : le controller route, le service porte la logique, toute ressource est limitée à
  son propriétaire (404, jamais 403) ;
- frontend : composants standalone en `OnPush`, état en signals, formulaires réactifs typés.

## Signaler un bug ou proposer une idée

Ouvrez une issue avec les étapes pour reproduire, le résultat attendu et le résultat obtenu.
Pour une faille de sécurité, voyez [SECURITY.md](SECURITY.md).
