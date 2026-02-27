const BASE = '/api';

function getUserId() {
  let id = localStorage.getItem('thm_user_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('thm_user_id', id);
  }
  return id;
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-User-ID': getUserId(),
      ...options.headers,
    },
    ...options,
  });

  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status });
  return data;
}

export const api = {
  getCurrentTownHall: () => request('/townhalls/current'),

  getVoteStatus: (townhallId) =>
    request(`/votes/status?townhallId=${townhallId}`),

  submitVote: (townHallId, rating) =>
    request('/votes', {
      method: 'POST',
      body: JSON.stringify({ townHallId, rating }),
    }),

  getResults: (townHallId) =>
    request(`/townhalls/${townHallId}/results`),
};

export const adminApi = {
  getTownHalls: (token) =>
    request('/admin/townhalls', { headers: { Authorization: `Bearer ${token}` } }),

  createTownHall: (token, data) =>
    request('/admin/townhalls', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }),

  updateTownHall: (token, id, data) =>
    request(`/admin/townhalls/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }),

  deleteTownHall: (token, id) =>
    request(`/admin/townhalls/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }),

  downloadExport: async (token) => {
    const res = await fetch(`${BASE}/admin/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'town-hall-votes.csv';
    a.click();
    URL.revokeObjectURL(url);
  },
};
