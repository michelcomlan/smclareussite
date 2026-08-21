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

  // Quiz
  getQuestions: (qcm_id, achat_id, token_acces) =>
    requete(`/quiz/${qcm_id}?achat_id=${achat_id}&token_acces=${token_acces}`),
  soumettreQuiz: (qcm_id, achat_id, token_acces, reponses) =>
    requete(`/quiz/${qcm_id}/soumettre`, {
      method: 'POST',
      body: JSON.stringify({ achat_id, token_acces, reponses }),
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
