import { useState, useEffect, useMemo } from 'react'
import { api } from '../api/client'
import { useToast } from '../hooks/useToast'
import RarityFilter, { extractRarities, RARITY_ORDER } from '../components/RarityFilter'

export default function AgentsPage() {
  const { push } = useToast()

  const [catalog, setCatalog] = useState([])
  const [agents, setAgents] = useState({ agent_ct: null, agent_t: null })
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState({ ct: null, t: null })
  const [rarityFilter, setRarityFilter] = useState(new Set())

  useEffect(() => {
    Promise.all([api.getAgentsCatalog(), api.getProfile()])
      .then(([catalog, profile]) => {
        setCatalog(catalog)
        setAgents(profile.agents)
        setPending({ ct: profile.agents.agent_ct, t: profile.agents.agent_t })
      })
      .catch(e => push(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [])

  const agentRarities = useMemo(() => extractRarities(catalog), [catalog])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return catalog
      .filter(a => !q || a.name?.toLowerCase().includes(q))
      .filter(a => rarityFilter.size === 0 || rarityFilter.has(a.rarity?.id))
      .sort((a, b) => {
        const ai = RARITY_ORDER.indexOf(a.rarity?.id)
        const bi = RARITY_ORDER.indexOf(b.rarity?.id)
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
      })
  }, [catalog, search, rarityFilter])

  // bymykel agents.json uses team.id = 'counter-terrorists' / 'terrorists'
  const ctAgents = filtered.filter(a => a.team?.id === 'counter-terrorists')
  const tAgents = filtered.filter(a => a.team?.id === 'terrorists')
  const allAgents = filtered

  async function handleSave() {
    setSaving(true)
    try {
      await api.saveAgents({ agent_ct: pending.ct || null, agent_t: pending.t || null })
      setAgents({ agent_ct: pending.ct, agent_t: pending.t })
      push('Agents saved!')
    } catch (e) {
      push(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    setSaving(true)
    try {
      await api.deleteAgents()
      setAgents({ agent_ct: null, agent_t: null })
      setPending({ ct: null, t: null })
      push('Agents removed.')
    } catch (e) {
      push(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-500">Loading…</div>

  const agentList = ctAgents.length + tAgents.length > 0
    ? { CT: ctAgents, T: tAgents }
    : { All: allAgents }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="flex flex-wrap items-center gap-3 px-5 py-3.5 border-b border-white/[0.04] shrink-0"
        style={{ background: 'linear-gradient(180deg, rgba(18,22,31,0.6), transparent)' }}>
        <h2 className="font-bold text-lg text-white">Agents</h2>

        <div className="text-xs text-slate-400 space-x-3">
          <span>
            CT:{' '}
            <span className="text-accent">
              {catalog.find(a =>
                a.model_player?.replace('characters/models/', '').replace('.vmdl', '') === agents.agent_ct
              )?.name ?? '—'}
            </span>
          </span>

          <span>
            T:{' '}
            <span className="text-accent">
              {catalog.find(a =>
                a.model_player?.replace('characters/models/', '').replace('.vmdl', '') === agents.agent_t
              )?.name ?? '—'}
            </span>
          </span>

        </div>

        <div className="flex-1" />
        <input
          type="search"
          placeholder="Search agents…"
          value={search}
          onChange={e => { setSearch(e.target.value); setRarityFilter(new Set()) }}
          className="input w-52"
        />
      </div>

      <RarityFilter
        rarities={agentRarities}
        selected={rarityFilter}
        onToggle={id => setRarityFilter(prev => {
          if (id === null) return new Set()
          const next = new Set(prev)
          next.has(id) ? next.delete(id) : next.add(id)
          return next
        })}
      />

      {/* Pending selection controls */}
      <div className="px-5 py-3 bg-panel/30 border-b border-border flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 w-6">CT:</label>
          <input
            type="text"
            value={
              catalog.find(a =>
                a.model_player?.replace('characters/models/', '').replace('.vmdl', '') === pending.ct
              )?.name ?? ''
            }

            onChange={e => setPending(p => ({ ...p, ct: e.target.value || null }))}
            placeholder="Agent model name…"
            className="input w-64 text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 w-6">T:</label>
          <input
            type="text"
            value={
              catalog.find(a =>
                a.model_player?.replace('characters/models/', '').replace('.vmdl', '') === pending.t
              )?.name ?? ''
            }

            onChange={e => setPending(p => ({ ...p, t: e.target.value || null }))}
            placeholder="Agent model name…"
            className="input w-64 text-xs"
          />
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
          {saving ? 'Saving…' : 'Save'}
        </button>
        {(agents.agent_ct || agents.agent_t) && (
          <button onClick={handleRemove} disabled={saving} className="btn-danger text-sm">
            Remove all
          </button>
        )}
      </div>

      {/* Agent list */}
      <div className="flex-1 overflow-y-auto p-5 space-y-8">
        {Object.entries(agentList).map(([side, list]) => (
          <div key={side}>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] mb-4"
              style={{ color: side === 'CT' ? '#5b99d2' : side === 'T' ? '#de9b35' : '#64748b' }}>
              {side} Agents
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {list.map(agent => {
                const modelId = agent.model_player?.replace('characters/models/', '')?.replace('.vmdl', '')
                const isEquippedCT = agents.agent_ct === modelId
                const isEquippedT = agents.agent_t === modelId
                const isEquipped = isEquippedCT || isEquippedT
                const rc = agent.rarity?.color ?? '#b0c3d9'
                const badgeColor = isEquippedCT ? '#5b99d2' : '#de9b35'
                return (
                  <button
                    key={agent.id}
                    onClick={() => {
                      if (side === 'CT' || agent.team?.id === 'counter-terrorists') {
                        setPending(p => ({ ...p, ct: modelId }))
                      } else {
                        setPending(p => ({ ...p, t: modelId }))
                      }
                    }}
                    className="group relative rounded-xl overflow-hidden text-left transition-all duration-300
                               hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: `linear-gradient(165deg, ${rc}10 0%, #12161f 35%, #12161f 100%)`,
                      border: `1px solid ${isEquipped ? rc + '50' : rc + '15'}`,
                      boxShadow: isEquipped ? `0 0 20px ${rc}20` : 'none',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = rc + '60'
                      e.currentTarget.style.boxShadow = `0 4px 30px ${rc}20, 0 0 60px ${rc}08`
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = isEquipped ? rc + '50' : rc + '15'
                      e.currentTarget.style.boxShadow = isEquipped ? `0 0 20px ${rc}20` : 'none'
                    }}
                  >
                    <div className="h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${rc}, transparent)` }} />
                    {isEquipped && (
                      <span
                        className="absolute top-3 right-2 text-[10px] font-bold uppercase tracking-wider rounded-md px-2 py-0.5 z-10 backdrop-blur-sm"
                        style={{
                          background: `${badgeColor}18`,
                          border: `1px solid ${badgeColor}40`,
                          color: badgeColor,
                          boxShadow: `0 0 10px ${badgeColor}20`,
                        }}
                      >
                        {isEquippedCT ? 'CT' : 'T'}
                      </span>
                    )}
                    {agent.image && (
                      <div className="relative p-3">
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                          style={{ background: `radial-gradient(ellipse at 50% 60%, ${rc}08, transparent 70%)` }} />
                        <img src={agent.image} alt={agent.name}
                          className="w-full h-32 object-contain group-hover:scale-110 transition-all duration-300
                                     drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
                          loading="lazy" />
                      </div>
                    )}
                    <div className="px-3 pb-3">
                      <div className="h-[1px] w-full mb-1.5"
                        style={{ background: `linear-gradient(90deg, transparent, ${rc}90, ${rc}, ${rc}90, transparent)` }} />
                      <p className="text-[13px] font-medium text-white leading-snug line-clamp-2">{agent.name}</p>
                      {agent.rarity && (
                        <p className="text-[11px] mt-0.5 font-medium" style={{ color: rc }}>{agent.rarity.name}</p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
