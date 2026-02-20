import { useAuth } from '../hooks/useAuth'
import { Navigate } from 'react-router-dom'

export default function LoginPage() {
  const { user } = useAuth()
  if (user) return <Navigate to="/" replace />

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] p-8 overflow-hidden">
      {/* Animated background orbs */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full animate-glow-pulse"
        style={{
          top: '-200px', left: '50%', transform: 'translateX(-50%)',
          background: 'radial-gradient(circle, rgba(228,174,57,0.08) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full animate-glow-pulse"
        style={{
          bottom: '-100px', right: '-100px',
          background: 'radial-gradient(circle, rgba(91,153,210,0.05) 0%, transparent 70%)',
          filter: 'blur(40px)',
          animationDelay: '1s',
        }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundSize: '60px 60px',
          backgroundImage: 'linear-gradient(to right, #e4ae39 1px, transparent 1px), linear-gradient(to bottom, #e4ae39 1px, transparent 1px)',
        }}
      />

      {/* Horizontal scan line effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundSize: '100% 4px',
          backgroundImage: 'linear-gradient(0deg, transparent 50%, rgba(255,255,255,0.5) 50%)',
        }}
      />

      {/* Content card */}
      <div
        className="relative max-w-md w-full text-center space-y-10 p-12 rounded-2xl backdrop-blur-xl animate-slide-up"
        style={{
          background: 'linear-gradient(135deg, rgba(18,22,31,0.9) 0%, rgba(12,16,24,0.95) 100%)',
          border: '1px solid rgba(228,174,57,0.12)',
          boxShadow: '0 0 80px rgba(228,174,57,0.06), 0 25px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        {/* Top glow line */}
        <div
          className="absolute top-0 left-8 right-8 h-[1px]"
          style={{
            background: 'linear-gradient(90deg, transparent, #e4ae3960, transparent)',
            boxShadow: '0 0 10px #e4ae3930',
          }}
        />

        <div className="space-y-4">
          <h1 className="text-6xl font-black tracking-tight">
            <span
              className="text-accent"
              style={{ textShadow: '0 0 30px rgba(228,174,57,0.3), 0 0 60px rgba(228,174,57,0.1)' }}
            >
              CS2
            </span>
            <br />
            <span className="text-white text-4xl font-bold tracking-wide">SKIN CHANGER</span>
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
            Sign in with Steam to customize your weapon skins, knives, gloves and agents.
          </p>
        </div>

        <a
          href="/auth/steam"
          className="group inline-flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-base
                     text-white transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, #1b2838, #2a475e)',
            border: '1px solid #2a475e',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#66c0f4'
            e.currentTarget.style.boxShadow = '0 4px 30px rgba(102,192,244,0.2), 0 0 60px rgba(102,192,244,0.1)'
            e.currentTarget.style.transform = 'translateY(-2px)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = '#2a475e'
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          <img
            src="https://community.akamai.steamstatic.com/public/images/signinthroughsteam/sits_01.png"
            alt="Steam"
            className="h-8 group-hover:brightness-125 transition-all"
          />
          Sign in through Steam
        </a>

        <p className="text-xs text-slate-600 leading-relaxed">
          Selections are stored server-side and applied automatically when you connect.
        </p>
      </div>
    </div>
  )
}
