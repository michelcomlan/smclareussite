# Guide de déploiement — SMC la Réussite

Correspond à l'étape 7 du cahier des charges. À suivre dans cet ordre :
back-end d'abord (le front a besoin de son URL), puis front, puis domaine.

## 0. Prérequis

- Le compte Supabase et le schéma SQL déjà en place (voir `smc-backend/README.md`, sections 1 à 3).
- Un compte GitHub avec ce code poussé dans un repo (Render/Vercel/Netlify se connectent à un repo Git — glisser-déposer un zip est aussi possible sur Netlify si vous préférez éviter Git).
- Le nom de domaine `smclareussite.com` déjà acheté (élément déjà disponible d'après le cahier des charges).

## 1. Déployer le back-end (Render)

1. Sur [render.com](https://render.com), **New > Web Service**, connecter le repo.
2. Render détecte `smc-backend/render.yaml` automatiquement (Blueprint) — sinon configurer manuellement :
   - Root directory : `smc-backend`
   - Build command : `npm install`
   - Start command : `npm start`
   - Plan : Free (suffisant au démarrage)
3. Renseigner les variables d'environnement marquées `sync: false` dans `render.yaml` (Render vous les demandera à la création) :
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (Supabase > Project Settings > API)
   - `FEDAPAY_SECRET_KEY`, `FEDAPAY_WEBHOOK_SECRET` (FedaPay > Développeurs) — commencer avec la **clé de test**
   - `FRONTEND_URL` : laisser vide pour l'instant, à remplir après l'étape 2 (obligatoire pour que CORS et les redirections FedaPay fonctionnent)
   - `SMS_PROVIDER` : laisser `console` tant qu'aucun fournisseur SMS n'est branché (voir `smc-backend/src/utils/smsSender.js`)
4. Déployer. Noter l'URL générée par Render, ex. `https://smc-la-reussite-backend.onrender.com`.
5. Vérifier que ça répond : ouvrir `https://<url-render>/api/health` dans un navigateur → doit afficher `{"status":"ok"}`.
6. Créer le compte admin en production : depuis un terminal avec les mêmes variables Supabase (ou via le Shell intégré de Render, onglet "Shell" du service) :
   ```bash
   node src/scripts/createAdmin.js sedonoumichel "UnMotDePasseTresSolide!2026"
   ```

⚠️ Remarque sur le plan gratuit Render : le service se met en veille après une
période d'inactivité, ce qui peut créer un délai de quelques secondes au
premier appel après une pause — gênant sur un flux de paiement si un
client tombe sur ce délai. À surveiller ; un plan payant supprime la veille
si le volume de ventes grandit (déjà signalé comme point de vigilance plus
tôt dans notre échange).

## 2. Déployer le front-end (Vercel)

1. Sur [vercel.com](https://vercel.com), **Add New > Project**, connecter le repo.
2. Root directory : `smc-frontend`. Vercel détecte Vite automatiquement (build command `npm run build`, output `dist`) ; `vercel.json` gère déjà la réécriture SPA.
3. Variable d'environnement à renseigner : `VITE_API_URL` = `https://<url-render>/api` (l'URL notée à l'étape 1).
4. Déployer. Noter l'URL générée, ex. `https://smc-la-reussite.vercel.app`.
5. Retourner sur Render (étape 1) et renseigner `FRONTEND_URL` avec cette URL, puis redéployer le back-end pour que CORS et les redirections de paiement fonctionnent.

*(Alternative Netlify : `netlify.toml` est déjà présent dans `smc-frontend/` si vous préférez cette plateforme — la procédure est équivalente : root directory `smc-frontend`, variable `VITE_API_URL`.)*

## 3. Connecter le domaine smclareussite.com

1. Chez le registrar (Namecheap, OVH…) : dans la gestion DNS du domaine.
2. Front (domaine principal) → suivre les instructions Vercel : **Project > Settings > Domains**, ajouter `smclareussite.com` et `www.smclareussite.com`. Vercel indique les enregistrements DNS exacts à créer (généralement un `A` vers Vercel + un `CNAME` pour `www`).
3. Back-end (sous-domaine dédié, ex. `api.smclareussite.com`) → dans Render, **Settings > Custom Domain**, ajouter `api.smclareussite.com`, puis créer le `CNAME` indiqué chez le registrar.
4. Une fois le DNS propagé (quelques minutes à quelques heures), mettre à jour :
   - `VITE_API_URL` sur Vercel → `https://api.smclareussite.com/api`
   - `FRONTEND_URL` sur Render → `https://smclareussite.com`
   - Redéployer les deux.
5. HTTPS est automatique sur Vercel et Render (certificat généré dès que le DNS pointe correctement) — couvre l'exigence HTTPS obligatoire du cahier des charges.

## 4. Configurer le webhook FedaPay en production

Une fois l'URL back-end définitive connue (`https://api.smclareussite.com`) :

1. Tableau de bord FedaPay > Développeurs > Webhooks.
2. URL : `https://api.smclareussite.com/api/payment/webhook`
3. Récupérer le secret de signature affiché → le renseigner dans `FEDAPAY_WEBHOOK_SECRET` sur Render.

## 5. Tests avant ouverture au public

Reprend les étapes 5, 6, 8 du cahier des charges :

1. Avec les clés **de test** FedaPay : faire un achat complet (catalogue → paiement simulé → quiz → score) pour valider tout le flux sans argent réel.
2. Une fois la validation KYC FedaPay obtenue, remplacer `FEDAPAY_SECRET_KEY` et `FEDAPAY_WEBHOOK_SECRET` par les clés **de production** sur Render, et redéployer.
3. Faire un achat réel avec le numéro Mobile Money du porteur de projet pour confirmer que l'argent réel est bien débité et que l'accès au quiz se débloque correctement.
4. Seulement après ce test réussi : ouverture au public.

## Récapitulatif des variables à renseigner en production

| Variable | Où | Valeur |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Render | Depuis Supabase |
| `FEDAPAY_SECRET_KEY`, `FEDAPAY_WEBHOOK_SECRET` | Render | Test puis production |
| `FRONTEND_URL` | Render | `https://smclareussite.com` |
| `JWT_SECRET` | Render | Généré automatiquement par `render.yaml` |
| `VITE_API_URL` | Vercel | `https://api.smclareussite.com/api` |
