const FALLBACK_COLOR = '#b0c3d9'

function getBadgeStyle(label) {
  if (label?.includes('CT') && !label?.includes('T'))
    return { bg: 'rgba(91,153,210,0.15)', border: 'rgba(91,153,210,0.4)', color: '#5b99d2' }
  if (label?.includes('T') && !label?.includes('CT'))
    return { bg: 'rgba(222,155,53,0.15)', border: 'rgba(222,155,53,0.4)', color: '#de9b35' }
  return { bg: 'rgba(228,174,57,0.15)', border: 'rgba(228,174,57,0.4)', color: '#e4ae39' }
}

export default function SkinCard({ skin, equipped, equippedLabel, equippedConfig, stickerMap, onClick }) {
  const rc = skin.rarity?.color ?? FALLBACK_COLOR

  const appliedStickers = (equipped && equippedConfig && stickerMap)
    ? [0, 1, 2, 3, 4]
        .map(i => equippedConfig[`weapon_sticker_${i}`])
        .filter(id => id && stickerMap[id])
        .map(id => stickerMap[id])
    : []

  const badge = getBadgeStyle(equippedLabel)

  return (
    <button
      onClick={onClick}
      className="group relative rounded-xl overflow-hidden transition-all duration-300
                 hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98]
                 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      style={{
        background: `linear-gradient(165deg, ${rc}12 0%, #12161f 35%, #12161f 100%)`,
        border: `1px solid ${equipped ? rc + '50' : rc + '15'}`,
        boxShadow: equipped ? `0 0 20px ${rc}20, inset 0 1px 0 ${rc}15` : `inset 0 1px 0 ${rc}10`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = rc + '60'
        e.currentTarget.style.boxShadow = `0 4px 30px ${rc}25, 0 0 60px ${rc}10, inset 0 1px 0 ${rc}20`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = equipped ? rc + '50' : rc + '15'
        e.currentTarget.style.boxShadow = equipped ? `0 0 20px ${rc}20, inset 0 1px 0 ${rc}15` : `inset 0 1px 0 ${rc}10`
      }}
    >
      {/* Rarity color top strip */}
      <div className="h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${rc}, transparent)` }} />

      {/* Equipped badge */}
      {equipped && (
        <span
          className="absolute top-3 right-2 text-[10px] font-bold uppercase tracking-wider
                     rounded-md px-2 py-0.5 z-10 backdrop-blur-sm"
          style={{
            background: badge.bg,
            border: `1px solid ${badge.border}`,
            color: badge.color,
            boxShadow: `0 0 10px ${badge.color}20`,
          }}
        >
          {equippedLabel || 'Equipped'}
        </span>
      )}

      {/* Image area */}
      <div className="relative flex items-center justify-center p-3 h-44">
        {/* Radial glow behind weapon */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: `radial-gradient(ellipse at 50% 60%, ${rc}08, transparent 70%)` }}
        />

        {skin.image
          ? <img
              src={skin.image}
              alt={skin.name}
              className="w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]
                         group-hover:drop-shadow-[0_4px_20px_rgba(0,0,0,0.7)]
                         group-hover:scale-110 transition-all duration-300"
              loading="lazy"
            />
          : <span className="text-slate-600 text-xs">No image</span>
        }

        {/* Sticker thumbnails */}
        {appliedStickers.length > 0 && (
          <div className="absolute bottom-1.5 left-2 right-2 flex justify-center gap-1">
            {appliedStickers.map((s, i) => (
              <img
                key={i}
                src={s.image}
                alt={s.name}
                title={s.name}
                className="w-7 h-7 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                loading="lazy"
              />
            ))}
          </div>
        )}
      </div>

      {/* Info section */}
      <div className="px-3 pb-3 pt-0 space-y-1.5">
        {/* Rarity bar */}
        <div
          className="h-[1px] w-full rounded-full"
          style={{ background: `linear-gradient(90deg, transparent, ${rc}90, ${rc}, ${rc}90, transparent)` }}
        />
        <p className="text-[13px] text-white font-medium leading-snug line-clamp-2 group-hover:text-white/90">
          {skin.name}
        </p>
        <p className="text-[11px] font-medium" style={{ color: rc }}>
          {skin.rarity?.name ?? ''}
        </p>
      </div>
    </button>
  )
}
