async function request(method, path, body) {
  const res = await fetch(path, {
    method,
    credentials: 'include',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  let data = {}
  try { data = await res.json() } catch (_) { /* empty body */ }

  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return data
}

export const api = {
  // Auth
  getMe:   ()     => request('GET',  '/auth/me'),
  logout:  ()     => request('POST', '/auth/logout'),

  // Catalog (public)
  getSkinsCatalog:    () => request('GET', '/api/catalog/skins'),
  getKnivesCatalog:   () => request('GET', '/api/catalog/knives'),
  getGlovesCatalog:   () => request('GET', '/api/catalog/gloves'),
  getAgentsCatalog:   () => request('GET', '/api/catalog/agents'),
  getStickersCatalog: () => request('GET', '/api/catalog/stickers'),

  // Player profile
  getProfile: () => request('GET', '/api/player/profile'),

  // Skins
  saveSkin:   (data) => request('PUT',    '/api/player/skins', data),
  deleteSkin: (data) => request('DELETE', '/api/player/skins', data),

  // Knife
  saveKnife:   (data) => request('PUT',    '/api/player/knife', data),
  deleteKnife: (data) => request('DELETE', '/api/player/knife', data),

  // Gloves
  saveGloves:   (data) => request('PUT',    '/api/player/gloves', data),
  deleteGloves: (data) => request('DELETE', '/api/player/gloves', data),

  // Agents
  saveAgents:   (data) => request('PUT',    '/api/player/agents', data),
  deleteAgents: ()     => request('DELETE', '/api/player/agents'),
}
