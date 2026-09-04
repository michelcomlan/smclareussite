const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

async function requete(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // réponse sans corps (ex. 204)
  }

  if (!res.ok) {
    const message = data?.error || `Erreur ${res.status}`;
    throw new Error(message);
  }
  return data;
}

/**
 * Comme "requete", mais pour l'envoi de fichiers (FormData) : ne force
 * PAS le Content-Type, pour laisser le navigateur définir automatiquement
 * la frontière "multipart/form-data; boundary=...".
 */
async function requeteMultipart(path, formData, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    method: options.method || 'POST',
    body: formData,
    headers: { ...(options.headers || {}) },
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // réponse sans corps
  }

  if (!res.ok) {
    const message = data?.error || `Erreur ${res.status}`;
    throw new Error(message);
  }
  return data;
}

function authHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  // Catalogue public
  listerQcm: (filtres = {}) => {
    const params = new URLSearchParams(filtres);
    return requete(`/qcm?${params.toString()}`);
  },
  getQcm: (id) => requete(`/qcm/${id}`),
  listerFilieres: () => requete('/qcm/filieres'),
  listerMatieres: () => requete('/qcm/matieres'),

  // Comptes étudiants
  inscrireEtudiant: (payload) =>
    requete('/etudiant/inscription', { method: 'POST', body: JSON.stringify(payload) }),
  reconnecterEtudiant: (telephone) =>
    requete('/etudiant/reconnexion', { method: 'POST', body: JSON.stringify({ telephone }) }),
  rechercherEtudiantAdmin: (token, telephone) =>
    requete(`/etudiant/admin/recherche?telephone=${encodeURIComponent(telephone)}`, {
      headers: authHeader(token),
    }),
  rechercherEtudiantParCode: (token, code) =>
    requete(`/etudiant/admin/par-code?code=${encodeURIComponent(code)}`, {
      headers: authHeader(token),
    }),
  getEtudiant: (id) => requete(`/etudiant/${id}`),
  apercuGratuit: () => requete('/etudiant/apercu-gratuit/questions'),

  // Abonnement
  initierAbonnement: (etudiant_id, telephone) =>
    requete('/abonnement/initier', {
      method: 'POST',
      body: JSON.stringify({ etudiant_id, telephone }),
    }),
  statutAbonnement: (abonnement_id) => requete(`/abonnement/statut/${abonnement_id}`),
  abonnementActif: (etudiant_id) => requete(`/abonnement/actif/${etudiant_id}`),

  // Cours par chapitre
  listerCours: (etudiant_id) => requete(`/cours?etudiant_id=${etudiant_id}`),
  getCours: (id, etudiant_id) => requete(`/cours/${id}?etudiant_id=${etudiant_id}`),
  listerCoursAdmin: (token) => requete('/cours/admin/liste', { headers: authHeader(token) }),
  creerCours: (token, payload) =>
    requete('/cours/admin', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify(payload),
    }),
  publierCours: (token, id) =>
    requete(`/cours/admin/${id}/publier`, { method: 'PATCH', headers: authHeader(token) }),
  supprimerCours: (token, id) =>
    requete(`/cours/admin/${id}`, { method: 'DELETE', headers: authHeader(token) }),

  // Paiement
  initierPaiement: (qcm_id, telephone) =>
    requete('/payment/initier', {
      method: 'POST',
      body: JSON.stringify({ qcm_id, telephone }),
    }),
  statutPaiement: (achat_id) => requete(`/payment/statut/${achat_id}`),

  // OTP + retrouver mes achats
  demanderOtp: (telephone) =>
    requete('/otp/demander', { method: 'POST', body: JSON.stringify({ telephone }) }),
  verifierOtp: (telephone, code) =>
    requete('/otp/verifier', { method: 'POST', body: JSON.stringify({ telephone, code }) }),
  retrouverAchats: (tokenOtp) =>
    requete('/payment/retrouver', { headers: authHeader(tokenOtp) }),

  // Quiz — accès par achat unitaire (ancien modèle) ou par abonnement étudiant (nouveau)
  getQuestions: (qcm_id, { achat_id, token_acces, etudiant_id } = {}) => {
    const params = new URLSearchParams();
    if (achat_id) params.set('achat_id', achat_id);
    if (token_acces) params.set('token_acces', token_acces);
    if (etudiant_id) params.set('etudiant_id', etudiant_id);
    return requete(`/quiz/${qcm_id}?${params.toString()}`);
  },
  soumettreQuiz: (qcm_id, { achat_id, token_acces, etudiant_id }, reponses) =>
    requete(`/quiz/${qcm_id}/soumettre`, {
      method: 'POST',
      body: JSON.stringify({ achat_id, token_acces, etudiant_id, reponses }),
    }),

  // Admin
  loginAdmin: (identifiant, motDePasse) =>
    requete('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifiant, motDePasse }),
    }),
  listerQcmAdmin: (tokenAdmin) => requete('/qcm/admin/all', { headers: authHeader(tokenAdmin) }),
  previewImport: (tokenAdmin, texte) =>
    requete('/qcm/admin/preview-import', {
      method: 'POST',
      headers: authHeader(tokenAdmin),
      body: JSON.stringify({ texte }),
    }),
  creerQcm: (tokenAdmin, payload) =>
    requete('/qcm/admin', {
      method: 'POST',
      headers: authHeader(tokenAdmin),
      body: JSON.stringify(payload),
    }),
  previewImportQcu: (tokenAdmin, formData) =>
    requeteMultipart('/qcm/admin/preview-import-qcu', formData, { headers: authHeader(tokenAdmin) }),
  creerQcmQcu: (tokenAdmin, formData) =>
    requeteMultipart('/qcm/admin/qcu', formData, { headers: authHeader(tokenAdmin) }),
  modifierQcm: (tokenAdmin, id, updates) =>
    requete(`/qcm/admin/${id}`, {
      method: 'PATCH',
      headers: authHeader(tokenAdmin),
      body: JSON.stringify(updates),
    }),
  supprimerQcm: (tokenAdmin, id) =>
    requete(`/qcm/admin/${id}`, { method: 'DELETE', headers: authHeader(tokenAdmin) }),
  dashboardAdmin: (tokenAdmin) =>
    requete('/qcm/admin/stats/dashboard', { headers: authHeader(tokenAdmin) }),
};
