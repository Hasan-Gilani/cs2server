// Order from rarest to most common (contraband first)
export const RARITY_ORDER = [
  'rarity_contraband', 'rarity_immortal', 'rarity_ancient', 'rarity_legendary',
  'rarity_mythical', 'rarity_rare', 'rarity_uncommon', 'rarity_common',
]

/**
 * Extracts sorted unique rarities from a list of skin catalog items.
 */
export function extractRarities(skins) {
  const seen = new Map()
  for (const s of skins) {
    if (s.rarity && !seen.has(s.rarity.id)) seen.set(s.rarity.id, s.rarity)
  }
  return [...seen.values()].sort((a, b) => {
    const ai = RARITY_ORDER.indexOf(a.id)
    const bi = RARITY_ORDER.indexOf(b.id)
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  })
}

export default function RarityFilter({ rarities, selected, onToggle }) {
  if (!rarities || rarities.length <= 1) return null

  return (
    <div className="flex flex-wrap items-center gap-2 px-5 py-2.5 border-b border-white/[0.04] shrink-0">
      <span className="text-[10px] text-slate-500 uppercase tracking-[0.12em] mr-1 font-semibold">Rarity</span>
      {rarities.map(r => {
        const active = selected.size === 0 || selected.has(r.id)
        return (
          <button
            key={r.id}
            onClick={() => onToggle(r.id)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-200"
            style={{
              border:          `1px solid ${active ? r.color + '50' : r.color + '18'}`,
              backgroundColor: active ? r.color + '15' : 'transparent',
              color:           active ? r.color         : r.color + '60',
              boxShadow:       active ? `0 0 12px ${r.color}15` : 'none',
            }}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0 transition-all duration-200"
              style={{
                backgroundColor: active ? r.color : r.color + '40',
                boxShadow: active ? `0 0 6px ${r.color}60` : 'none',
              }}
            />
            {r.name}
          </button>
        )
      })}
      {selected.size > 0 && (
        <button
          onClick={() => onToggle(null)}
          className="px-2.5 py-1 rounded-lg text-[11px] text-slate-500 hover:text-white
                     border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-200"
        >
          Show all
        </button>
      )}
    </div>
  )
}
