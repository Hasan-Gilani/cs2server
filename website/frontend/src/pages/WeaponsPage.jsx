import { useState, useEffect, useMemo } from 'react'
import { api } from '../api/client'
import { useToast } from '../hooks/useToast'
import { WEAPON_CATEGORIES, WEAPON_NAMES } from '../lib/weapons'
import SkinCard from '../components/SkinCard'
import SkinConfigModal from '../components/SkinConfigModal'
import RarityFilter, { extractRarities, RARITY_ORDER } from '../components/RarityFilter'

export default function WeaponsPage() {
  const { push } = useToast()

  const [catalog,       setCatalog]       = useState([])
  const [playerSkins,   setPlayerSkins]   = useState([])
  const [stickerMap,    setStickerMap]    = useState({})
  const [selectedWeapon, setSelectedWeapon] = useState('weapon_ak47')
  const [search,        setSearch]        = useState('')
  const [rarityFilter,  setRarityFilter]  = useState(new Set())
  const [modalSkin,     setModalSkin]     = useState(null)
  const [loading,       setLoading]       = useState(true)

  useEffect(() => {
    Promise.all([api.getSkinsCatalog(), api.getProfile(), api.getStickersCatalog()])
      .then(([catalog, profile, stickers]) => {
        setCatalog(catalog)
        setPlayerSkins(profile.skins)
        const m = {}
        for (const s of stickers) m[s.def_index] = s
        setStickerMap(m)
      })
      .catch(e => push(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [])

  // All skins for the selected weapon (used for rarity extraction)
  const weaponSkins = useMemo(() =>
    catalog.filter(s => (s.weapon?.id ?? '') === selectedWeapon),
  [catalog, selectedWeapon])

  const weaponRarities = useMemo(() => extractRarities(catalog), [catalog])

  // Skins for the currently selected weapon, filtered by search + rarity
  const visibleSkins = useMemo(() => {
    const q = search.toLowerCase()
    return weaponSkins
      .filter(s => !q || s.name.toLowerCase().includes(q))
      .filter(s => rarityFilter.size === 0 || rarityFilter.has(s.rarity?.id))
      .sort((a, b) => {
        const ai = RARITY_ORDER.indexOf(a.rarity?.id)
        const bi = RARITY_ORDER.indexOf(b.rarity?.id)
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
      })
  }, [weaponSkins, search, rarityFilter])

  // Build a quick lookup: defindex+team → player skin row
  const equippedMap = useMemo(() => {
    const m = {}
    for (const s of playerSkins) {
      m[`${s.weapon_defindex}_${s.weapon_team}`] = s
    }
    return m
  }, [playerSkins])

  // weapon_id → defindex, built once from the enriched catalog
  const weaponDefindexMap = useMemo(() => {
    const m = {}
    for (const s of catalog) {
      const wid = s.weapon?.id
      if (wid && s.weapon_defindex != null && !(wid in m)) {
        m[wid] = s.weapon_defindex
      }
    }
    return m
  }, [catalog])

  function getEquipped(skin) {
    const di = skin.weapon_defindex
    const paintId = Number(skin.paint_index)
    const eT  = equippedMap[`${di}_2`]
    const eCT = equippedMap[`${di}_3`]
    const matchT  = eT  && Number(eT.weapon_paint_id)  === paintId
    const matchCT = eCT && Number(eCT.weapon_paint_id) === paintId

    if (matchT && matchCT) return { ...eT, weapon_team: 0, _label: 'T+CT' }
    if (matchT)            return { ...eT,  _label: 'T' }
    if (matchCT)           return { ...eCT, _label: 'CT' }

    // Legacy backward compat (old team=0 or team=1 entries)
    for (const t of [0, 1]) {
      const e = equippedMap[`${di}_${t}`]
      if (e && Number(e.weapon_paint_id) === paintId)
        return { ...e, weapon_team: 0, _label: 'Both' }
    }
    return null
  }

  async function handleApply(data) {
    try {
      await api.saveSkin(data)
      setPlayerSkins(prev => {
        const defindex = data.weapon_defindex
        // team=0 (Both) expands to two rows matching what the backend saves
        const teamsToSave = data.weapon_team === 0 ? [2, 3] : [data.weapon_team]
        // Remove: slots being replaced + legacy entries (0=old-both, 1=old-wrong-T)
        const filtered = prev.filter(s => !(
          s.weapon_defindex === defindex &&
          (teamsToSave.includes(s.weapon_team) || s.weapon_team === 0 || s.weapon_team === 1)
        ))
        const newRows = teamsToSave.map(t => ({
          ...data, weapon_team: t, weapon_stattrak: data.weapon_stattrak ? 1 : 0,
        }))
        return [...filtered, ...newRows]
      })
      push('Skin applied!')
    } catch (e) {
      push(e.message, 'error')
      throw e  // re-throw so SkinConfigModal keeps the modal open
    }
  }

  async function handleRemove(data) {
    try {
      // Send weapon_team=0 to remove all team entries for this weapon
      await api.deleteSkin({ weapon_defindex: data.weapon_defindex, weapon_team: 0 })
      setPlayerSkins(prev => prev.filter(s => s.weapon_defindex !== data.weapon_defindex))
      push('Skin removed.')
    } catch (e) {
      push(e.message, 'error')
      throw e
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">

      {/* Info bar */}
      <div className="px-5 py-2.5 border-b border-accent/10 text-xs text-slate-400 flex items-center gap-2 shrink-0"
        style={{ background: 'linear-gradient(90deg, rgba(228,174,57,0.04), transparent 50%)' }}>
        <span className="text-accent font-bold text-sm">i</span>
        After applying skins, type <span className="font-mono bg-accent/10 text-accent px-1.5 py-0.5 rounded text-[11px]">!wp</span> in game chat to sync changes in-game.
      </div>

      <div className="flex flex-1 overflow-hidden">

      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-white/[0.04] overflow-y-auto"
        style={{ background: 'linear-gradient(180deg, rgba(18,22,31,0.8), rgba(12,16,24,0.95))' }}>
        {Object.entries(WEAPON_CATEGORIES).map(([category, weapons]) => (
          <div key={category}>
            <p className="px-4 pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-accent/60">
              {category}
            </p>
            {weapons.map(wid => {
              const hasEquipped = [0,1,2,3].some(t => equippedMap[`${weaponDefindexMap[wid]}_${t}`])
              const isActive = selectedWeapon === wid
              return (
                <button
                  key={wid}
                  onClick={() => { setSelectedWeapon(wid); setSearch(''); setRarityFilter(new Set()) }}
                  className={`w-full text-left px-4 py-2 text-[13px] transition-all duration-200 flex items-center justify-between
                    ${isActive
                      ? 'text-accent font-medium'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'}`}
                  style={isActive ? {
                    background: 'linear-gradient(90deg, rgba(228,174,57,0.1), transparent)',
                    boxShadow: 'inset 2px 0 0 #e4ae39',
                  } : {}}
                >
                  <span>{WEAPON_NAMES[wid] ?? wid}</span>
                  {hasEquipped && (
                    <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0"
                      style={{ boxShadow: '0 0 6px rgba(228,174,57,0.5)' }} />
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </aside>

      {/* Main — skin grid */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.04] shrink-0"
          style={{ background: 'linear-gradient(180deg, rgba(18,22,31,0.6), transparent)' }}>
          <h2 className="font-bold text-lg text-white">{WEAPON_NAMES[selectedWeapon] ?? selectedWeapon}</h2>
          <span className="text-slate-500 text-sm">({visibleSkins.length} skins)</span>
          <div className="flex-1" />
          <input
            type="search"
            placeholder="Search skins…"
            value={search}
            onChange={e => { setSearch(e.target.value); setRarityFilter(new Set()) }}
            className="input w-52"
          />
        </div>
        <RarityFilter
          rarities={weaponRarities}
          selected={rarityFilter}
          onToggle={id => setRarityFilter(prev => {
            if (id === null) return new Set()
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
          })}
        />

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {visibleSkins.length === 0
            ? <p className="text-slate-500 text-sm">No skins found.</p>
            : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {visibleSkins.map(skin => {
                  const eq = getEquipped(skin)
                  return (
                    <SkinCard
                      key={skin.id}
                      skin={skin}
                      equipped={!!eq}
                      equippedLabel={eq?._label}
                      equippedConfig={eq}
                      stickerMap={stickerMap}
                      onClick={() => setModalSkin(skin)}
                    />
                  )
                })}
              </div>
            )
          }
        </div>
      </div>

      {/* Modal */}
      {modalSkin && (
        <SkinConfigModal
          skin={modalSkin}
          currentConfig={getEquipped(modalSkin)}
          onApply={handleApply}
          onRemove={handleRemove}
          onClose={() => setModalSkin(null)}
          weaponId={modalSkin.weapon?.id}
        />
      )}
      </div>
    </div>
  )
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64 text-slate-500">
      Loading catalog…
    </div>
  )
}
