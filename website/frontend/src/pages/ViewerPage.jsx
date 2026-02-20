import { useState, useEffect, useMemo } from 'react'
import { api } from '../api/client'
import { WEAPON_CATEGORIES, WEAPON_NAMES } from '../lib/weapons'
import WeaponCanvas from '../components/WeaponCanvas'

// Strip "Weapon | " prefix from skin names for compact display
function shortName(name) {
  const idx = name.indexOf('|')
  return idx >= 0 ? name.slice(idx + 1).trim() : name
}

export default function ViewerPage() {
  const [catalog, setCatalog]           = useState([])
  const [selectedWeapon, setSelectedWeapon] = useState('weapon_ak47')
  const [selectedSkin, setSelectedSkin] = useState(null) // full skin object or null
  const [search, setSearch]             = useState('')
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    api.getSkinsCatalog()
      .then(setCatalog)
      .finally(() => setLoading(false))
  }, [])

  // Skins for the selected weapon
  const weaponSkins = useMemo(
    () => catalog.filter(s => (s.weapon?.id ?? '') === selectedWeapon),
    [catalog, selectedWeapon]
  )

  // Search-filtered skin list
  const visibleSkins = useMemo(() => {
    const q = search.toLowerCase()
    return q ? weaponSkins.filter(s => s.name.toLowerCase().includes(q)) : weaponSkins
  }, [weaponSkins, search])

  function handleWeaponChange(wid) {
    setSelectedWeapon(wid)
    setSelectedSkin(null)
    setSearch('')
  }

  const paintId = selectedSkin?.paint_index ? String(selectedSkin.paint_index) : null

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">

      {/* ── Left: weapon sidebar ── */}
      <aside className="w-44 shrink-0 border-r border-border overflow-y-auto bg-panel/50">
        {Object.entries(WEAPON_CATEGORIES).map(([cat, weapons]) => (
          <div key={cat}>
            <p className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {cat}
            </p>
            {weapons.map(wid => (
              <button
                key={wid}
                onClick={() => handleWeaponChange(wid)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors
                  ${selectedWeapon === wid
                    ? 'bg-accent/10 text-accent font-medium'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'}`}
              >
                {WEAPON_NAMES[wid] ?? wid}
              </button>
            ))}
          </div>
        ))}
      </aside>

      {/* ── Center: 3D canvas ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Toolbar */}
        <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-border bg-surface/50 text-sm">
          <span className="font-semibold text-slate-200">
            {WEAPON_NAMES[selectedWeapon] ?? selectedWeapon}
          </span>
          {selectedSkin && (
            <>
              <span className="text-slate-600">·</span>
              <span
                className="px-1.5 py-0.5 rounded text-xs font-medium"
                style={{ color: selectedSkin.rarity?.color ?? '#aaa' }}
              >
                {shortName(selectedSkin.name)}
              </span>
            </>
          )}
          <div className="flex-1" />
          {selectedSkin && (
            <button
              onClick={() => setSelectedSkin(null)}
              className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1 rounded hover:bg-white/5"
            >
              Clear skin
            </button>
          )}
          <span className="text-slate-600 text-xs hidden sm:block">Drag to orbit · Scroll to zoom</span>
        </div>

        {/* 3D canvas — takes all remaining space */}
        <div className="flex-1 min-h-0">
          <WeaponCanvas weaponId={selectedWeapon} paintId={paintId} legacyModel={!!selectedSkin?.legacy_model} />
        </div>
      </div>

      {/* ── Right: skin list ── */}
      <aside className="w-56 shrink-0 border-l border-border flex flex-col bg-panel/50">

        {/* Search */}
        <div className="px-3 py-2 border-b border-border shrink-0">
          <input
            type="search"
            placeholder="Search skins…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input w-full text-sm"
          />
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
            Loading…
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">

            {/* "Default" option — shows bare weapon */}
            <button
              onClick={() => setSelectedSkin(null)}
              className={`w-full px-3 py-2 text-sm text-left transition-colors
                ${!selectedSkin
                  ? 'bg-accent/10 text-accent'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'}`}
            >
              Default (no skin)
            </button>

            {visibleSkins.length === 0 ? (
              <p className="px-3 py-4 text-slate-500 text-sm">No skins found.</p>
            ) : visibleSkins.map(skin => (
              <button
                key={skin.id}
                onClick={() => setSelectedSkin(skin)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 text-left transition-colors group
                  ${selectedSkin?.id === skin.id ? 'bg-accent/10' : 'hover:bg-white/5'}`}
              >
                <img
                  src={skin.image}
                  alt=""
                  className="w-12 h-8 object-contain shrink-0 rounded"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <p
                    className="text-xs font-medium truncate leading-tight"
                    style={{
                      color: selectedSkin?.id === skin.id
                        ? '#e4ae39'
                        : (skin.rarity?.color ?? '#94a3b8'),
                    }}
                  >
                    {shortName(skin.name)}
                  </p>
                  {skin.rarity?.name && (
                    <p className="text-[10px] text-slate-600 truncate leading-tight">
                      {skin.rarity.name}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </aside>
    </div>
  )
}
