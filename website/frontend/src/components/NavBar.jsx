import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const SERVER_ADDRESS = '16.24.36.253:27015'
const SERVER_PASSWORD = 'tbs5v5cs2'

const LINKS = [
  { to: '/',       label: 'Weapons' },
  { to: '/knife',  label: 'Knife'   },
  { to: '/gloves', label: 'Gloves'  },
  { to: '/agents', label: 'Agents'  },
]

export default function NavBar() {
  const { user, logout } = useAuth()

  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-xl border-b border-white/[0.06]"
      style={{ background: 'linear-gradient(180deg, rgba(18,22,31,0.95) 0%, rgba(12,16,24,0.98) 100%)' }}
    >
      <div className="max-w-screen-xl mx-auto px-5 h-14 flex items-center gap-8">

        {/* Brand */}
        <span className="font-extrabold tracking-widest text-lg shrink-0 flex items-center gap-0.5">
          <span
            className="text-accent"
            style={{ textShadow: '0 0 20px rgba(228,174,57,0.4)' }}
          >
            CS2
          </span>
          <span className="text-white/80 font-semibold ml-1.5">SKINS</span>
        </span>

        {/* Nav links */}
        {user && (
          <nav className="flex gap-0.5">
            {LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `relative px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg
                   ${isActive
                     ? 'text-accent bg-accent/[0.08]'
                     : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'}`
                }
              >
                {({ isActive }) => (
                  <>
                    {label}
                    {isActive && (
                      <span
                        className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full"
                        style={{
                          background: 'linear-gradient(90deg, transparent, #e4ae39, transparent)',
                          boxShadow: '0 0 8px #e4ae3960',
                        }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="flex-1" />

        {/* Connect button */}
        <a
          href={`steam://connect/${SERVER_ADDRESS}/${SERVER_PASSWORD}`}
          className="group flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold
                     text-accent transition-all duration-200 shrink-0
                     border border-accent/20 bg-accent/[0.05]
                     hover:bg-accent/[0.12] hover:border-accent/40 hover:shadow-glow-accent-sm"
          title={`Connect to ${SERVER_ADDRESS}`}
        >
          {/* Play icon */}
          <svg className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
          Connect
        </a>

        {/* User */}
        {user && (
          <div className="flex items-center gap-3">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-8 h-8 rounded-lg ring-1 ring-white/10"
            />
            <span className="text-sm text-slate-300 hidden sm:block font-medium">{user.name}</span>
            <button onClick={logout} className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-1">
              Sign out
            </button>
          </div>
        )}
      </div>

      {/* Accent glow line */}
      <div
        className="h-[1px]"
        style={{
          background: 'linear-gradient(90deg, transparent 5%, #e4ae3950 30%, #e4ae39 50%, #e4ae3950 70%, transparent 95%)',
          boxShadow: '0 0 15px #e4ae3930, 0 0 40px #e4ae3915',
        }}
      />
    </header>
  )
}
