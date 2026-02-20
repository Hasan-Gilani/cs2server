import { useState, useEffect, useMemo } from 'react'
import { api } from '../api/client'
import { useToast } from '../hooks/useToast'
import SkinCard from '../components/SkinCard'
import SkinConfigModal from '../components/SkinConfigModal'
import RarityFilter, { extractRarities, RARITY_ORDER } from '../components/RarityFilter'

export default function KnifePage() {
  const { push } = useToast()

  const [catalog,      setCatalog]      = useState([])
  const [playerKnives, setPlayerKnives] = useState([])  // {weapon_team, knife}[]
  const [playerSkins,  setPlayerSkins]  = useState([])  // skin rows from wp_player_skins
  const [stickerMap,   setStickerMap]   = useState({})
  const [selectedId,   setSelectedId]   = useState(null) // selected knife weapon.id
  const [modalSkin,    setModalSkin]    = useState(null)
  const [search,       setSearch]       = useState('')
  const [rarityFilter, setRarityFilter] = useState(new Set())
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    Promise.all([api.getKnivesCatalog(), api.getProfile(), api.getStickersCatalog()])
      .then(([cat, profile, stickers]) => {
        setCatalog(cat)
        setPlayerKnives(profile.knives)
        setPlayerSkins(profile.skins)
        const firstId = cat.find(s => s.weapon?.id?.startsWith('weapon_knife'))?.weapon?.id
        setSelectedId(firstId ?? null)
        const m = {}
        for (const s of stickers) m[s.def_index] = s
        setStickerMap(m)
      })
      .catch(e => push(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [])

  // Deduplicated knife type list for the sidebar — one entry per knife model
  const knifeTypes = useMemo(() => {
    const seen = new Set()
    const result = []
    for (const s of catalog) {
      const wid = s.weapon?.id
      if (!wid?.startsWith('weapon_knife') || seen.has(wid)) continue
      seen.add(wid)
      result.push({ weaponId: wid, name: s.weapon?.name ?? wid, defindex: s.weapon_defindex })
    }
    return result
  }, [catalog])

  // All skins for the selected knife type (for rarity extraction)
  const knifeTypeSkins = useMemo(() =>
    catalog.filter(s => s.weapon?.id === selectedId),
  [catalog, selectedId])

  const knifeRarities = useMemo(() => extractRarities(catalog), [catalog])

  // Skins for the currently selected knife type, filtered by search + rarity
  const visibleSkins = useMemo(() => {
    const q = search.toLowerCase()
    return knifeTypeSkins
      .filter(s => !q || s.name.toLowerCase().includes(q))
      .filter(s => rarityFilter.size === 0 || rarityFilter.has(s.rarity?.id))
      .sort((a, b) => {
        const ai = RARITY_ORDER.indexOf(a.rarity?.id)
        const bi = RARITY_ORDER.indexOf(b.rarity?.id)
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
      })
  }, [knifeTypeSkins, search, rarityFilter])

  // Which knife type is equipped per team: { 2: 'weapon_knife_karambit', 3: ... }
  const equippedKnifeByTeam = useMemo(() => {
    const m = {}
    for (const k of playerKnives) m[k.weapon_team] = k.knife
    return m
  }, [playerKnives])

  // Skin equipped map: `defindex_team` → skin row (same as WeaponsPage)
  const equippedMap = useMemo(() => {
    const m = {}
    for (const s of playerSkins) m[`${s.weapon_defindex}_${s.weapon_team}`] = s
    return m
  }, [playerSkins])

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
    return null
  }

  async function handleApply(data) {
    // Save the skin paint AND set the knife type for the configured team(s)
    const teams = data.weapon_team === 0 ? [2, 3] : [data.weapon_team]
    try {
      await api.saveSkin(data)
      await Promise.all(teams.map(t => api.saveKnife({ weapon_team: t, knife: selectedId })))

      setPlayerSkins(prev => {
        const di = data.weapon_defindex
        const filtered = prev.filter(s => !(
          s.weapon_defindex === di &&
          (teams.includes(s.weapon_team) || s.weapon_team === 0 || s.weapon_team === 1)
        ))
        const newRows = teams.map(t => ({ ...data, weapon_team: t, weapon_stattrak: data.weapon_stattrak ? 1 : 0 }))
        return [...filtered, ...newRows]
      })
      setPlayerKnives(prev => {
        const filtered = prev.filter(k => !teams.includes(k.weapon_team))
        return [...filtered, ...teams.map(t => ({ weapon_team: t, knife: selectedId }))]
      })
      push('Knife skin applied!')
    } catch (e) {
      push(e.message, 'error')
      throw e
    }
  }

  async function handleRemove(data) {
    try {
      await api.deleteSkin({ weapon_defindex: data.weapon_defindex, weapon_team: 0 })
      setPlayerSkins(prev => prev.filter(s => s.weapon_defindex !== data.weapon_defindex))
      push('Knife skin removed.')
    } catch (e) {
      push(e.message, 'error')
      throw e
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-500">Loading…</div>

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">

      {/* Info bar */}
      <div className="px-5 py-2.5 border-b border-accent/10 text-xs text-slate-400 flex items-center gap-2 shrink-0"
        style={{ background: 'linear-gradient(90deg, rgba(228,174,57,0.04), transparent 50%)' }}>
        <span className="text-accent font-bold text-sm">i</span>
        Pick a knife type, then choose a skin. Applying a skin also equips that knife type.
        Use <span className="font-mono bg-accent/10 text-accent px-1.5 py-0.5 rounded text-[11px]">!wp</span> in-game to sync.
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside className="w-56 shrink-0 border-r border-white/[0.04] overflow-y-auto"
          style={{ background: 'linear-gradient(180deg, rgba(18,22,31,0.8), rgba(12,16,24,0.95))' }}>
          <p className="px-4 pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-accent/60">Knife Type</p>
          {knifeTypes.map(k => {
            const equippedT  = equippedKnifeByTeam[2] === k.weaponId
            const equippedCT = equippedKnifeByTeam[3] === k.weaponId
            const isActive = selectedId === k.weaponId
            return (
              <button
                key={k.weaponId}
                onClick={() => { setSelectedId(k.weaponId); setSearch(''); setRarityFilter(new Set()) }}
                className={`w-full text-left px-4 py-2 text-[13px] transition-all duration-200 flex items-center justify-between gap-1
                  ${isActive
                    ? 'text-accent font-medium'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'}`}
                style={isActive ? {
                  background: 'linear-gradient(90deg, rgba(228,174,57,0.1), transparent)',
                  boxShadow: 'inset 2px 0 0 #e4ae39',
                } : {}}
              >
                <span className="truncate">{k.name}</span>
                <span className="flex gap-1 shrink-0">
                  {equippedT  && <span className="w-1.5 h-1.5 rounded-full bg-team-t" title="T equipped" style={{ boxShadow: '0 0 6px rgba(222,155,53,0.5)' }} />}
                  {equippedCT && <span className="w-1.5 h-1.5 rounded-full bg-team-ct" title="CT equipped" style={{ boxShadow: '0 0 6px rgba(91,153,210,0.5)' }} />}
                </span>
              </button>
            )
          })}
        </aside>

        {/* Main — skin grid */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Toolbar */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.04] shrink-0"
            style={{ background: 'linear-gradient(180deg, rgba(18,22,31,0.6), transparent)' }}>
            <h2 className="font-bold text-lg text-white">
              {knifeTypes.find(k => k.weaponId === selectedId)?.name ?? 'Knife'}
            </h2>
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
            rarities={knifeRarities}
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
  )
}
