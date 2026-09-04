# SMC la Réussite — Back-end

API REST (Node.js/Express + Supabase) pour la vente et le passage en ligne de QCM,
avec paiement Mobile Money via FedaPay.

Ce back-end correspond aux sections 3, 4, 5 et 6 du cahier des charges. Il remplace
le stockage local du prototype front-end par une vraie vérification serveur du
paiement, comme demandé.

## 1. Installation

```bash
cd smc-backend
npm install
cp .env.example .env
# puis remplir .env avec les vraies valeurs (Supabase, FedaPay, JWT)
```

## 2. Base de données

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Aller dans **SQL Editor**, coller le contenu de `sql/schema.sql`, exécuter.
3. Récupérer dans **Project Settings > API** :
   - `SUPABASE_URL`
   - `service_role key` (⚠️ PAS la clé `anon` — la clé `service_role` est secrète,
     à utiliser uniquement dans le `.env` du back-end, jamais côté front).

## 3. Créer le compte admin

Un seul compte admin, comme prévu dans le cahier des charges :

```bash
node src/scripts/createAdmin.js sedonoumichel "UnMotDePasseTresSolide!2026"
```

## 4. Lancer le serveur

```bash
npm run dev   # avec rechargement automatique
# ou
npm start
```

Le serveur écoute sur `http://localhost:4000` (configurable via `PORT`).

## 5. FedaPay — configuration du webhook

Dans le tableau de bord FedaPay (mode sandbox d'abord) :

- Renseigner l'URL du webhook : `https://<votre-domaine-back>/api/payment/webhook`
- Récupérer le secret de signature du webhook → `FEDAPAY_WEBHOOK_SECRET` dans `.env`
- Récupérer la clé secrète API (sandbox puis production après KYC) → `FEDAPAY_SECRET_KEY`

⚠️ **Point de vigilance à vérifier au moment du branchement réel** : le nom exact
du header de signature (`x-fedapay-signature` dans le code) et le nom de l'événement
de confirmation (`transaction.approved`) sont écrits d'après le principe standard
des webhooks de paiement. **Il faut les confirmer avec la documentation FedaPay
à jour** (ou un premier webhook de test réel) avant la mise en production, et
ajuster `src/routes/payment.js` en conséquence si besoin.

## 6. Format d'import QCM (vérifié sur un vrai fichier)

Le parseur (`src/utils/qcmParser.js`) a été confronté à un vrai export QCMmaker et
adapté en conséquence. Le format réel est un fichier `.json` contenant un tableau
d'objets `{ text, answer, domain, subCategory, difficulty, points, timeLimit }` —
chaque question a une seule réponse rédigée, ce n'est **pas** un QCM à choix
multiples. Le site fonctionne en mode « fiches de révision » : l'étudiant lit la
question, révèle la réponse rédigée, puis s'auto-évalue (« réussi » / « à revoir »).
Le score final est basé sur ces auto-évaluations.

## 7. Identification de l'étudiant sans compte utilisateur

Le cahier des charges ne prévoit pas de compte étudiant. Le mécanisme retenu ici :

- Après paiement confirmé, le serveur génère un `token_acces` unique pour l'achat.
- Le front doit conserver ce token (localStorage) pour accéder au quiz : `GET /api/quiz/:qcm_id?achat_id=...&token_acces=...`.
- Si l'étudiant change de navigateur, un flux de vérification par code SMS (OTP)
  permet de retrouver ses achats confirmés en toute sécurité :
  1. `POST /api/otp/demander { telephone }` → un code à 6 chiffres est envoyé par SMS (valable 10 min).
  2. `POST /api/otp/verifier { telephone, code }` → si le code est correct, renvoie un token temporaire (15 min).
  3. `GET /api/payment/retrouver` avec `Authorization: Bearer <token>` → liste les achats confirmés du numéro vérifié.

Le numéro utilisé pour la recherche vient uniquement du token vérifié, jamais
d'un paramètre modifiable par le client — impossible de consulter les achats
d'un autre numéro sans avoir reçu et saisi son code SMS.

⚠️ **Fournisseur SMS non branché** : par défaut (`SMS_PROVIDER=console`), les
codes sont affichés dans les logs serveur au lieu d'être envoyés par SMS —
pratique pour développer et tester tout le flux sans dépenser de crédits SMS,
mais **il faut choisir un fournisseur SMS réel (couvrant le Bénin, MTN/Moov)
et adapter `src/utils/smsSender.js`** avant l'ouverture au public. Voir les
instructions en bas de ce fichier.

## 8. Endpoints principaux

| Méthode | Route | Accès | Description |
|---|---|---|---|
| GET | `/api/qcm` | public | Catalogue (QCM publiés), filtrable |
| GET | `/api/qcm/filieres`, `/api/qcm/matieres` | public | Listes pour les filtres |
| POST | `/api/auth/login` | public | Connexion admin → JWT |
| GET | `/api/qcm/admin/all` | admin | Tous les QCM (publiés ou non) |
| POST | `/api/qcm/admin/preview-import` | admin | Aperçu du parsing sans enregistrer |
| POST | `/api/qcm/admin` | admin | Créer un QCM + questions |
| PATCH | `/api/qcm/admin/:id` | admin | Modifier (prix, publication...) |
| DELETE | `/api/qcm/admin/:id` | admin | Supprimer |
| GET | `/api/qcm/admin/stats/dashboard` | admin | Ventes + revenu total |
| POST | `/api/payment/initier` | public | Démarrer un paiement FedaPay |
| GET | `/api/payment/statut/:achat_id` | public | Polling du statut de paiement |
| POST | `/api/otp/demander` | public | Demander un code SMS pour un numéro |
| POST | `/api/otp/verifier` | public | Vérifier le code → token temporaire |
| GET | `/api/payment/retrouver` | token OTP | Retrouver ses achats (numéro vérifié) |
| POST | `/api/payment/webhook` | FedaPay | Confirmation serveur du paiement |
| GET | `/api/quiz/:qcm_id` | public + token | Questions sans les réponses |
| POST | `/api/quiz/:qcm_id/soumettre` | public + token | Soumission + score serveur |

## 9. Prochaines étapes suggérées (non couvertes par ce code)

- Choisir et brancher un vrai fournisseur SMS (voir section 7 ci-dessus).
- Adapter le front-end React existant pour consommer cette API (remplacer le
  stockage local par les appels `fetch`/`axios` vers ces routes).
- Ajouter une politique de remboursement / process de support en cas d'échec
  de paiement après débit.
- CGU, mentions légales, page de contact (coordonnées déjà fournies).
- Déploiement : back-end sur Render/Railway, front sur Vercel/Netlify, DNS du
  domaine `smclareussite.com` vers le front, sous-domaine (ex. `api.smclareussite.com`)
  vers le back-end, HTTPS partout (automatique sur ces plateformes).
