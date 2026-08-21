# SMC la Réussite — Front-end

Interface React (Vite + Tailwind) consommant l'API du back-end (`smc-backend`).
Remplace le prototype à stockage local par de vrais appels API : le paiement,
l'accès au quiz et le score sont entièrement vérifiés côté serveur.

## Identité visuelle

- **Couleurs** : indigo profond (`#1E1B4B`) + jaune (`#FACC15`) sur fond crème,
  conformément à l'identité déjà validée dans le prototype.
- **Typographies** : *Fraunces* (titres, score), *Inter* (texte courant),
  *IBM Plex Mono* (prix, progression, données).
- **Élément signature** : les fiches QCM sont traitées comme des tickets
  d'examen perforés, avec un sceau circulaire indiquant le niveau (L/M) —
  cohérent avec l'idée d'acheter "un QCM à la fois".

## Installation

```bash
cd smc-frontend
npm install
cp .env.example .env
# renseigner VITE_API_URL si le back-end ne tourne pas sur localhost:4000
npm run dev
```

## Pages

| Route | Description |
|---|---|
| `/` | Catalogue public, filtrable par niveau/filière/matière |
| `/qcm/:id` | Fiche QCM + formulaire d'achat (redirige vers FedaPay) |
| `/paiement/retour` | Attend la confirmation serveur du paiement (polling), puis redirige vers le quiz |
| `/quiz/:qcmId` | Quiz une question à la fois, plein écran |
| `/resultat/:qcmId` | Score final avec détail bonne/mauvaise réponse |
| `/retrouver` | Retrouver ses achats via vérification par code SMS (OTP) |
| `/admin` | Connexion admin |
| `/admin/dashboard` | Ventes et revenu total |
| `/admin/qcm` | Liste des QCM, publier/dépublier, supprimer |
| `/admin/import` | Import d'un QCM (texte structuré) avec aperçu avant publication |

## Points d'attention pour la suite

- **Import QCM** : le champ de saisie du texte suit le format décrit dans le
  cahier des charges. Dès qu'un vrai export QCMmaker sera disponible, tester
  l'aperçu (`/admin/import`) avec ce texte réel — si le format diffère, seul
  `smc-backend/src/utils/qcmParser.js` doit être ajusté, pas cette interface.
- **FedaPay** : `QcmDetail.jsx` initie le paiement et redirige vers
  `paiement_url` renvoyée par le back-end ; `PaiementRetour.jsx` interroge
  ensuite `/api/payment/statut/:achat_id` jusqu'à confirmation. Aucune logique
  de paiement n'est traitée côté front.
- **Build de production** : `npm run build` génère `dist/`, à déployer sur
  Vercel ou Netlify comme prévu dans le cahier des charges. Penser à définir
  `VITE_API_URL` vers l'URL réelle du back-end déployé.
