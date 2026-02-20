import { useState, useEffect } from 'react'
import { WEAPON_TEAMS } from '../lib/weapons'
import { api } from '../api/client'
import WeaponCanvas from './WeaponCanvas'

const WEAR_LABELS = [
  { label: 'Factory New',    min: 0.00, max: 0.07 },
  { label: 'Minimal Wear',   min: 0.07, max: 0.15 },
  { label: 'Field-Tested',   min: 0.15, max: 0.38 },
  { label: 'Well-Worn',      min: 0.38, max: 0.45 },
  { label: 'Battle-Scarred', min: 0.45, max: 1.00 },
]

const ALL_TEAMS = [
  { value: 0, label: 'Both' },
  { value: 2, label: 'T'    },
  { value: 3, label: 'CT'   },
]

function getWearLabel(wear) {
  return WEAR_LABELS.find(w => wear <= w.max)?.label ?? 'Battle-Scarred'
}

function getAvailableTeams(weaponId) {
  const side = WEAPON_TEAMS[weaponId] ?? 'both'
  if (side === 't')  return [{ value: 2, label: 'T' }]
  if (side === 'ct') return [{ value: 3, label: 'CT' }]
  return ALL_TEAMS
}

function getDefaultTeam(weaponId, currentConfig) {
  const side = WEAPON_TEAMS[weaponId] ?? 'both'
  if (side === 't')  return 2
  if (side === 'ct') return 3
  return currentConfig?.weapon_team ?? 0
}

// Module-level cache so we only fetch once per session
let _stickerCache = null
let _stickerMap = null

// Default sticker positions — centered on weapon body (x: 0.35–0.65)
const DEFAULT_POSITIONS = [0, 1, 2, 3, 4].map((_, i) => ({
  x: 0.35 + i * 0.075,
  y: 0.1,
  scale: 1,
  rotation: 0,
}))

export default function SkinConfigModal({ skin, currentConfig, onApply, onRemove, onClose }) {
  const weaponId       = skin.weapon?.id
  const paintId        = skin.paint_index ? String(skin.paint_index) : null
  const availableTeams = getAvailableTeams(weaponId)
  const defaultTeam    = getDefaultTeam(weaponId, currentConfig)

  const [team,      setTeam]      = useState(defaultTeam)
  const [wear,      setWear]      = useState(currentConfig?.weapon_wear       ?? 0.000001)
  const [seed,      setSeed]      = useState(currentConfig?.weapon_seed       ?? 0)
  const [nametag,   setNametag]   = useState(currentConfig?.weapon_nametag    ?? '')
  const [stattrak,  setStattrak]  = useState(!!currentConfig?.weapon_stattrak)
  const [saving,    setSaving]    = useState(false)

  // Sticker state: array of 5 kit IDs (0 = empty)
  const [stickerSlots, setStickerSlots] = useState(() =>
    [0, 1, 2, 3, 4].map(i => currentConfig?.[`weapon_sticker_${i}`] ?? 0)
  )
  const [activeSlot,    setActiveSlot]    = useState(null)
  const [stickerSearch, setStickerSearch] = useState('')
  const [stickerList,   setStickerList]   = useState(_stickerCache ?? [])
  const [stickerMap,    setStickerMap]    = useState(_stickerMap ?? {})

  // Sticker 3D positions (preview only — NOT saved to DB)
  const [stickerPositions, setStickerPositions] = useState(
    () => DEFAULT_POSITIONS.map(p => ({ ...p }))
  )

  useEffect(() => {
    if (_stickerCache) return
    api.getStickersCatalog()
      .then(data => {
        _stickerCache = data
        _stickerMap = {}
        for (const s of data) _stickerMap[s.def_index] = s
        setStickerList(data)
        setStickerMap(_stickerMap)
      })
      .catch(() => {})
  }, [])

  const filteredStickers = stickerSearch.length < 2
    ? stickerList.slice(0, 60)
    : stickerList
        .filter(s => s.name.toLowerCase().includes(stickerSearch.toLowerCase()))
        .slice(0, 100)

  const clampedWear = Math.min(Math.max(wear, skin.min_float ?? 0), skin.max_float ?? 1)

  // Build stickers array for WeaponCanvas (positions handled by per-weapon offset table)
  const stickersForCanvas = stickerSlots.map((kitId) => {
    if (!kitId) return null
    const sticker = stickerMap[kitId]
    if (!sticker?.image) return null
    return { image: sticker.image }
  })

  function selectSticker(slot, defIndex) {
    setStickerSlots(prev => prev.map((v, i) => i === slot ? defIndex : v))
    setActiveSlot(null)
    setStickerSearch('')
  }

  function clearSticker(slot) {
    setStickerSlots(prev => prev.map((v, i) => i === slot ? 0 : v))
    setActiveSlot(null)
    setStickerSearch('')
  }

  function updateStickerPos(slot, key, value) {
    setStickerPositions(prev =>
      prev.map((p, i) => (i === slot ? { ...p, [key]: value } : p))
    )
  }

  async function handleApply() {
    setSaving(true)
    try {
      const payload = {
        weapon_defindex: skin.weapon_defindex,
        weapon_paint_id: Number(skin.paint_index),
        weapon_team:     team,
        weapon_wear:     clampedWear,
        weapon_seed:     Number(seed),
        weapon_nametag:  nametag,
        weapon_stattrak: stattrak,
      }
      stickerSlots.forEach((id, i) => { payload[`weapon_sticker_${i}`] = id })
      await onApply(payload)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    setSaving(true)
    try {
      await onRemove({ weapon_defindex: skin.weapon_defindex, weapon_team: team })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden animate-slide-up"
        style={{
          background: 'linear-gradient(135deg, rgba(18,22,31,0.98), rgba(12,16,24,0.99))',
          border: '1px solid rgba(228,174,57,0.1)',
          boxShadow: '0 0 80px rgba(0,0,0,0.6), 0 0 40px rgba(228,174,57,0.04), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >

        {/* Header */}
        <div className="flex items-start gap-4 p-5 border-b border-white/[0.06] shrink-0"
          style={{ background: 'linear-gradient(180deg, rgba(228,174,57,0.03), transparent)' }}>
          <img src={skin.image} alt={skin.name} className="w-24 h-16 object-contain shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-slate-100 leading-snug">{skin.name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Float range: {skin.min_float ?? 0} – {skin.max_float ?? 1}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 text-xl leading-none">×</button>
        </div>

        {/* Body: two columns */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Left: 3D Canvas — explicit height for reliable rendering */}
          <div className="w-[55%] shrink-0 border-r border-border relative" style={{ height: 420 }}>
            <WeaponCanvas
              weaponId={weaponId}
              paintId={paintId}
              stickers={stickersForCanvas}
              legacyModel={!!skin.legacy_model}
            />
            <p className="absolute top-2 right-2 text-[10px] text-slate-600 pointer-events-none select-none">
              Drag to orbit · Scroll to zoom
            </p>
          </div>

          {/* Right: Config panel */}
          <div className="w-[45%] overflow-y-auto p-4 space-y-4">

            {/* Team */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Team</label>
              <div className="flex gap-2">
                {availableTeams.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setTeam(t.value)}
                    className={`flex-1 py-1.5 rounded text-sm font-medium border transition-colors
                      ${team === t.value
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border text-slate-400 hover:border-slate-500'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Wear */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-xs text-slate-400 uppercase tracking-wider">Wear</label>
                <span className="text-xs font-mono text-accent">
                  {clampedWear.toFixed(6)} — {getWearLabel(clampedWear)}
                </span>
              </div>
              <input
                type="range"
                min={skin.min_float ?? 0}
                max={skin.max_float ?? 1}
                step="0.000001"
                value={clampedWear}
                onChange={e => setWear(parseFloat(e.target.value))}
                className="w-full accent-accent"
              />
              <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                {WEAR_LABELS.map(w => <span key={w.label}>{w.label}</span>)}
              </div>
            </div>

            {/* Seed */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">
                Pattern seed (0–1000)
              </label>
              <input
                type="number"
                min={0} max={1000}
                value={seed}
                onChange={e => setSeed(Math.min(1000, Math.max(0, parseInt(e.target.value) || 0)))}
                className="input w-32"
              />
            </div>

            {/* Nametag */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">
                Nametag
              </label>
              <input
                type="text"
                maxLength={128}
                placeholder="Optional"
                value={nametag}
                onChange={e => setNametag(e.target.value)}
                className="input"
              />
            </div>

            {/* StatTrak */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-300">StatTrak™</label>
              <button
                onClick={() => setStattrak(v => !v)}
                className={`w-11 h-6 rounded-full transition-colors relative overflow-hidden
                  ${stattrak ? 'bg-accent' : 'bg-border'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform
                  ${stattrak ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>

            {/* Stickers */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">
                Stickers
              </label>
              <div className="flex gap-1.5">
                {stickerSlots.map((kitId, i) => {
                  const sticker = kitId ? stickerMap[kitId] : null
                  const isActive = activeSlot === i
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        setActiveSlot(isActive ? null : i)
                        setStickerSearch('')
                      }}
                      title={sticker ? sticker.name : `Slot ${i + 1}`}
                      className={`flex-1 aspect-square border rounded flex items-center justify-center p-1 transition-colors relative group
                        ${isActive
                          ? 'border-accent bg-accent/10'
                          : 'border-border hover:border-slate-500 bg-surface/40'}`}
                    >
                      {sticker
                        ? <img src={sticker.image} alt={sticker.name} className="w-full h-full object-contain" />
                        : <span className="text-slate-600 text-lg leading-none">+</span>
                      }
                      <span className="absolute bottom-0.5 left-0 right-0 text-center text-[8px] text-slate-600 leading-none">
                        {i + 1}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Sticker picker panel */}
              {activeSlot !== null && (
                <div className="mt-2 border border-border rounded-md p-2 bg-surface/60">
                  <div className="flex gap-2 mb-2">
                    <input
                      type="search"
                      placeholder="Search stickers… (type 2+ chars)"
                      value={stickerSearch}
                      onChange={e => setStickerSearch(e.target.value)}
                      className="input flex-1 text-xs"
                      autoFocus
                    />
                    {stickerSlots[activeSlot] ? (
                      <button
                        onClick={() => clearSticker(activeSlot)}
                        className="btn-ghost text-xs px-2"
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                  {stickerList.length === 0 ? (
                    <p className="text-slate-500 text-xs py-2 text-center">Loading stickers…</p>
                  ) : (
                    <div className="grid grid-cols-6 gap-1 max-h-44 overflow-y-auto">
                      {filteredStickers.map(s => (
                        <button
                          key={s.def_index}
                          onClick={() => selectSticker(activeSlot, s.def_index)}
                          title={s.name}
                          className={`aspect-square border rounded p-0.5 transition-colors
                            ${stickerSlots[activeSlot] === s.def_index
                              ? 'border-accent bg-accent/10'
                              : 'border-transparent hover:border-slate-500'}`}
                        >
                          <img
                            src={s.image}
                            alt={s.name}
                            className="w-full h-full object-contain"
                            loading="lazy"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                  {stickerSearch.length > 0 && stickerSearch.length < 2 && (
                    <p className="text-slate-600 text-[10px] mt-1">Type at least 2 characters to search</p>
                  )}
                </div>
              )}

              {/* Position controls — disabled (positions are auto-placed per weapon) */}
              {activeSlot !== null && stickerSlots[activeSlot] > 0 && (
                <div className="mt-2 space-y-1.5 border border-border rounded-md p-2 bg-surface/40 opacity-40 pointer-events-none select-none">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                    Sticker position (auto-placed)
                  </label>
                  {[
                    { key: 'x',        label: 'Along',  min: 0,    max: 1,    step: 0.01 },
                    { key: 'y',        label: 'Height', min: -0.5, max: 0.5,  step: 0.01 },
                    { key: 'scale',    label: 'Size',   min: 0.3,  max: 2.5,  step: 0.05 },
                    { key: 'rotation', label: 'Rotate', min: 0,    max: 6.28, step: 0.05 },
                  ].map(({ key, label, min, max, step }) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 w-10 shrink-0">{label}</span>
                      <input
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={stickerPositions[activeSlot][key]}
                        disabled
                        className="flex-1 accent-accent"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t border-border shrink-0">
          <button onClick={handleApply} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Saving…' : 'Apply'}
          </button>
          {currentConfig && (
            <button onClick={handleRemove} disabled={saving} className="btn-danger">
              Remove
            </button>
          )}
          <button onClick={onClose} className="btn-ghost">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
