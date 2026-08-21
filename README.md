# SMC la Réussite

Deux dossiers livrés séparément :

- **`smc-backend/`** — API Node.js/Express + Supabase + FedaPay (auth admin,
  import QCM, paiement vérifié serveur, OTP, quiz).
- **`smc-frontend/`** — Interface React (Vite + Tailwind) consommant cette
  API, avec l'identité visuelle jaune/indigo.

## Ordre de mise en route

1. Suivre `smc-backend/README.md` : créer le projet Supabase, exécuter
   `sql/schema.sql`, configurer `.env`, créer le compte admin, lancer le
   serveur (`npm run dev`, port 4000 par défaut).
2. Suivre `smc-frontend/README.md` : `npm install`, configurer
   `VITE_API_URL` vers l'adresse du back-end, lancer (`npm run dev`, port
   5173 par défaut).

## Remarque sur ce livrable

Le front-end a été vérifié avec `esbuild` (résolution de tous les imports
internes, syntaxe JSX valide) plutôt qu'avec un build Vite complet, faute
d'accès réseau dans l'environnement où ce code a été généré — `npm install`
puis `npm run build`/`npm run dev` sont donc à exécuter une première fois
chez vous pour confirmer le build final, mais aucune erreur structurelle
n'a été détectée.
