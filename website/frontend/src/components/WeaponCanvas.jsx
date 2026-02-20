import React, { Suspense, useEffect, useState, useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Html, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

/* ── Error boundary (DOM-level, outside Canvas) ────────────────────────── */
class CanvasErrorBoundary extends React.Component {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

/* ── Rewrite Steam CDN URLs to our CORS proxy ─────────────────────────── */
function proxyUrl(url) {
  if (!url) return url
  const steamPrefix = 'https://cdn.steamstatic.com/'
  if (url.startsWith(steamPrefix)) {
    return '/proxy/sticker/' + url.slice(steamPrefix.length)
  }
  return url
}

/* ── Per-weapon sticker slot offset coefficients (from LielXD) ────────── */
// xf/yf: fraction of target mesh bbox size, df: fraction of size.z for z-offset
const SLOT_OFFSETS = {
  // ── Pistols ──
  weapon_cz75a: [
    { xf: 0.12, yf: 0.35, df: 1.4 },
    { xf: 0.35, yf: -0.1, df: 1.5 },
    { xf: 0.28, yf: 0.3, df: 1.6 },
    { xf: -0.07, yf: 0.335, df: 1.4 },
    { xf: 0, yf: 0, df: 0 },
  ],
  weapon_deagle: [
    { xf: 0.26, yf: -0.1, df: 1.4 },
    { xf: 0.16, yf: 0.3, df: 1.4 },
    { xf: 0.0, yf: 0.3, df: 1.4 },
    { xf: -0.28, yf: 0.3, df: 1.4 },
    { xf: 0, yf: 0, df: 0 },
  ],
  weapon_elite: [
    { xf: -0.2, yf: 0.3, df: 1.1 },
    { xf: 0, yf: 0, df: 0 },
    { xf: 0, yf: 0, df: 0 },
    { xf: 0, yf: 0, df: 0 },
    { xf: 0, yf: 0, df: 0 },
  ],
  weapon_fiveseven: [
    { xf: 0.23, yf: 0.26, df: 1.5 },
    { xf: 0.0, yf: 0.31, df: 1.5 },
    { xf: -0.28, yf: 0.3, df: 1.5 },
    { xf: 0.3, yf: -0.1, df: 1.5 },
    { xf: 0, yf: 0, df: 0 },
  ],
  weapon_glock: [
    { xf: 0.23, yf: 0.28, df: 1.3 },
    { xf: 0.0, yf: 0.31, df: 1.3 },
    { xf: -0.25, yf: 0.31, df: 1.3 },
    { xf: 0.28, yf: -0.1, df: 1.3 },
    { xf: 0, yf: 0, df: 0 },
  ],
  weapon_hkp2000: [
    { xf: 0.23, yf: 0.28, df: 1.3 },
    { xf: -0.05, yf: 0.33, df: 1.3 },
    { xf: -0.32, yf: 0.33, df: 1.3 },
    { xf: 0.28, yf: -0.1, df: 1.3 },
    { xf: 0, yf: 0, df: 0 },
  ],
  weapon_p250: [
    { xf: 0.23, yf: 0.28, df: 1.3 },
    { xf: -0.05, yf: 0.31, df: 1.3 },
    { xf: -0.35, yf: 0.31, df: 1.3 },
    { xf: 0.28, yf: -0.1, df: 1.3 },
    { xf: 0, yf: 0, df: 0 },
  ],
  weapon_taser: [
    { xf: 0.29, yf: 0.0, df: 1.1 },
    { xf: -0.4, yf: 0.3, df: 1.25 },
    { xf: 0.26, yf: 0.32, df: 1.2 },
    { xf: 0.0, yf: 0.32, df: 1.2 },
    { xf: -0.2, yf: 0.32, df: 1.2 },
  ],
  weapon_tec9: [
    { xf: 0.35, yf: 0.36, df: 0.9 },
    { xf: 0.15, yf: 0.35, df: 0.9 },
    { xf: -0.02, yf: 0.32, df: 0.9 },
    { xf: 0, yf: 0, df: 0 },
    { xf: 0, yf: 0, df: 0 },
  ],
  weapon_usp_silencer: [
    { xf: 0.4, yf: 0.26, df: 1.3 },
    { xf: 0.4, yf: -0.1, df: 1.2 },
    { xf: 0.26, yf: 0.28, df: 1.2 },
    { xf: 0.1, yf: 0.3, df: 1.2 },
    { xf: -0.18, yf: 0.4, df: 1.2 },
  ],
  weapon_revolver: [
    { xf: 0.2, yf: 0.25, df: 1.4 },
    { xf: 0.0, yf: 0.3, df: 1.4 },
    { xf: -0.2, yf: 0.3, df: 1.4 },
    { xf: 0.25, yf: -0.1, df: 1.4 },
    { xf: 0, yf: 0, df: 0 },
  ],

  // ── Rifles ──
  weapon_ak47: [
    { xf: 0.155, yf: 0.31, df: 1.0 },
    { xf: 0.065, yf: 0.3, df: 1.0 },
    { xf: -0.03, yf: 0.31, df: 1.0 },
    { xf: -0.165, yf: 0.335, df: 1.0 },
    { xf: 0.37, yf: 0.16, df: 1.0 },
  ],
  weapon_aug: [
    { xf: 0.38, yf: 0.25, df: 0.6 },
    { xf: 0.23, yf: 0.28, df: 0.6 },
    { xf: 0.08, yf: 0.33, df: 0.6 },
    { xf: -0.05, yf: 0.33, df: 0.6 },
    { xf: 0, yf: 0, df: 0 },
  ],
  weapon_famas: [
    { xf: -0.03, yf: 0.19, df: 1.0 },
    { xf: 0.15, yf: 0.17, df: 1.0 },
    { xf: 0.3, yf: 0.17, df: 1.0 },
    { xf: -0.12, yf: 0.17, df: 1.0 },
    { xf: 0, yf: 0, df: 0 },
  ],
  weapon_galilar: [
    { xf: 0.155, yf: 0.31, df: 0.8 },
    { xf: 0.065, yf: 0.3, df: 0.8 },
    { xf: -0.1, yf: 0.31, df: 0.8 },
    { xf: 0.39, yf: 0.19, df: 0.8 },
    { xf: 0, yf: 0, df: 0 },
  ],
  weapon_m4a1: [
    { xf: 0.0, yf: 0.2, df: 0.9 },
    { xf: 0.33, yf: 0.2, df: 0.9 },
    { xf: 0.1, yf: 0.1, df: 0.9 },
    { xf: -0.04, yf: 0.05, df: 0.9 },
    { xf: 0, yf: 0, df: 0 },
  ],
  weapon_m4a1_silencer: [
    { xf: 0.21, yf: 0.18, df: 0.9 },
    { xf: 0.09, yf: 0.05, df: 0.9 },
    { xf: 0.15, yf: 0.15, df: 0.9 },
    { xf: -0.01, yf: 0.22, df: 0.9 },
    { xf: -0.35, yf: 0.22, df: 0.9 },
  ],
  weapon_sg556: [
    { xf: 0.22, yf: 0.12, df: 1.0 },
    { xf: 0.15, yf: 0.125, df: 1.0 },
    { xf: 0.05, yf: 0.13, df: 1.0 },
    { xf: 0.1, yf: 0.34, df: 0.9 },
    { xf: 0, yf: 0, df: 0 },
  ],

  // ── SMGs ──
  weapon_bizon: [
    { xf: 0.08, yf: 0.25, df: 1.0 },
    { xf: -0.02, yf: 0.22, df: 1.0 },
    { xf: -0.12, yf: 0.25, df: 1.0 },
    { xf: -0.15, yf: 0.0, df: 1.0 },
    { xf: 0, yf: 0, df: 0 },
  ],
  weapon_mac10: [
    { xf: 0.3, yf: 0.33, df: 1.2 },
    { xf: 0.1, yf: 0.1, df: 1.2 },
    { xf: 0.05, yf: 0.33, df: 1.2 },
    { xf: -0.2, yf: 0.33, df: 1.2 },
    { xf: 0, yf: 0, df: 0 },
  ],
  weapon_mp5sd: [
    { xf: -0.14, yf: 0.26, df: 1.1 },
    { xf: 0.04, yf: 0.26, df: 1.1 },
    { xf: 0.14, yf: 0.26, df: 1.1 },
    { xf: 0.24, yf: 0.26, df: 1.1 },
    { xf: 0.32, yf: 0.26, df: 1.1 },
  ],
  weapon_mp7: [
    { xf: 0.27, yf: 0.23, df: 1.1 },
    { xf: 0.13, yf: 0.2, df: 1.1 },
    { xf: -0.05, yf: 0.24, df: 1.1 },
    { xf: 0.14, yf: -0.05, df: 1.1 },
    { xf: 0, yf: 0, df: 0 },
  ],
  weapon_mp9: [
    { xf: -0.03, yf: 0.33, df: 1.3 },
    { xf: -0.15, yf: 0.3, df: 1.3 },
    { xf: -0.33, yf: 0.31, df: 1.3 },
    { xf: -0.14, yf: 0.0, df: 1.3 },
    { xf: 0, yf: 0, df: 0 },
  ],
  weapon_p90: [
    { xf: 0.32, yf: 0.0, df: 1.3 },
    { xf: 0.41, yf: -0.05, df: 1.3 },
    { xf: -0.08, yf: 0.0, df: 1.3 },
    { xf: -0.23, yf: 0.0, df: 1.3 },
    { xf: 0, yf: 0, df: 0 },
  ],
  weapon_ump45: [
    { xf: 0.1, yf: 0.3, df: 1.0 },
    { xf: 0.0, yf: 0.25, df: 1.0 },
    { xf: -0.1, yf: 0.27, df: 1.0 },
    { xf: -0.2, yf: 0.3, df: 1.0 },
    { xf: 0, yf: 0, df: 0 },
  ],

  // ── Machine guns ──
  weapon_m249: [
    { xf: 0.2, yf: -0.1, df: 0.3 },
    { xf: 0, yf: 0, df: 0 },
    { xf: 0, yf: 0, df: 0 },
    { xf: 0.09, yf: -0.12, df: 0.3 },
    { xf: 0.15, yf: -0.16, df: 0.3 },
  ],
  weapon_negev: [
    { xf: 0.15, yf: 0.17, df: 0.43 },
    { xf: 0.09, yf: 0.17, df: 0.43 },
    { xf: -0.03, yf: -0.28, df: 0.6 },
    { xf: -0.12, yf: 0.17, df: 0.43 },
    { xf: 0, yf: 0, df: 0 },
  ],

  // ── Snipers ──
  weapon_awp: [
    { xf: 0.36, yf: -0.08, df: 0.7 },
    { xf: 0.182, yf: 0.0, df: 0.7 },
    { xf: 0.12, yf: -0.03, df: 0.7 },
    { xf: 0.06, yf: 0.35, df: 0.7 },
    { xf: 0, yf: 0, df: 0 },
  ],
  weapon_g3sg1: [
    { xf: 0.43, yf: -0.02, df: 0.5 },
    { xf: 0.35, yf: 0.0, df: 0.5 },
    { xf: 0.2, yf: 0.09, df: 0.5 },
    { xf: 0.24, yf: 0.38, df: 0.5 },
    { xf: 0, yf: 0, df: 0 },
  ],
  weapon_scar20: [
    { xf: 0.26, yf: 0.04, df: 1.0 },
    { xf: 0.15, yf: -0.02, df: 1.0 },
    { xf: 0.085, yf: -0.1, df: 1.0 },
    { xf: 0.05, yf: 0.1, df: 1.0 },
    { xf: 0, yf: 0, df: 0 },
  ],
  weapon_ssg08: [
    { xf: 0.18, yf: 0.23, df: 0.9 },
    { xf: 0.09, yf: 0.28, df: 0.9 },
    { xf: 0.04, yf: 0.2, df: 0.9 },
    { xf: -0.01, yf: 0.33, df: 0.9 },
    { xf: 0, yf: 0, df: 0 },
  ],

  // ── Shotguns ──
  weapon_mag7: [
    { xf: 0.32, yf: 0.28, df: 1.1 },
    { xf: 0.2, yf: 0.2, df: 1.1 },
    { xf: 0.1, yf: 0.25, df: 1.1 },
    { xf: 0.0, yf: 0.25, df: 1.1 },
    { xf: 0.22, yf: -0.1, df: 1.1 },
  ],
  weapon_nova: [
    { xf: 0.32, yf: 0.03, df: 1.2 },
    { xf: 0.13, yf: 0.25, df: 1.2 },
    { xf: 0.04, yf: 0.25, df: 1.2 },
    { xf: -0.03, yf: 0.25, df: 1.2 },
    { xf: 0, yf: 0, df: 0 },
  ],
  weapon_sawedoff: [
    { xf: 0.26, yf: 0.24, df: 1.4 },
    { xf: 0.16, yf: 0.25, df: 1.4 },
    { xf: 0.04, yf: 0.25, df: 1.4 },
    { xf: -0.22, yf: 0.22, df: 1.4 },
    { xf: 0, yf: 0, df: 0 },
  ],
  weapon_xm1014: [
    { xf: 0.12, yf: 0.23, df: 1.0 },
    { xf: 0.05, yf: 0.23, df: 1.0 },
    { xf: -0.03, yf: 0.23, df: 1.0 },
    { xf: -0.08, yf: 0.2, df: 1.0 },
    { xf: 0, yf: 0, df: 0 },
  ],
}

// Generic fallback for weapons not in the table
const DEFAULT_SLOT_OFFSETS = [
  { xf: 0.15, yf: 0.25, df: 1.0 },
  { xf: 0.05, yf: 0.25, df: 1.0 },
  { xf: -0.05, yf: 0.25, df: 1.0 },
  { xf: -0.15, yf: 0.25, df: 1.0 },
  { xf: 0, yf: 0, df: 0 },
]

/* ── Find the best mesh for sticker placement (largest by surface area) ── */
function getStickerTargetMesh(root) {
  let best = null
  let bestScore = -Infinity
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.geometry || !obj.material) return
    const matName = (obj.material.name || '').toLowerCase()
    if (matName.includes('scope') || matName.includes('bare_arm')) return
    obj.geometry.computeBoundingBox?.()
    const bb = obj.geometry.boundingBox
    if (!bb) return
    const sz = new THREE.Vector3()
    bb.getSize(sz)
    const score = sz.x * sz.y + sz.x * sz.z + sz.y * sz.z
    if (score > bestScore) { bestScore = score; best = obj }
  })
  if (!best) {
    root.traverse((obj) => {
      if (!best && obj.isMesh && obj.geometry) best = obj
    })
  }
  return best
}

/* ── Single sticker plane — manages its own texture via React state ───── */
function StickerPlane({ position, size, imageUrl }) {
  const [tex, setTex] = useState(null)
  const matRef = useRef()

  useEffect(() => {
    if (!imageUrl) { setTex(null); return }
    let cancelled = false
    const loader = new THREE.TextureLoader()
    loader.load(proxyUrl(imageUrl), (t) => {
      if (cancelled) return
      t.colorSpace = THREE.SRGBColorSpace
      t.needsUpdate = true
      setTex(t)
    })
    return () => { cancelled = true }
  }, [imageUrl])

  useEffect(() => {
    if (matRef.current) matRef.current.needsUpdate = true
  }, [tex])

  return (
    <mesh position={position}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial
        ref={matRef}
        map={tex}
        transparent
        opacity={tex ? 1 : 0}
        side={THREE.DoubleSide}
        depthWrite={false}
        depthTest={true}
        polygonOffset
        polygonOffsetFactor={-1}
      />
    </mesh>
  )
}

/* ── Inner weapon model ────────────────────────────────────────────────── */
function WeaponModel({ weaponId, paintId, stickers, legacyModel }) {
  const { scene } = useGLTF(`/models/${weaponId}.glb`)
  const groupRef = useRef()

  // Clone scene once, center + scale — also save model bbox for sticker placement
  const { processed, scaleFactor, modelSize, modelHalfZ } = useMemo(() => {
    const clone = scene.clone(true)

    // GLB files for regular weapons contain two child meshes (legacy + current).
    // Knives, gloves, and taser only have one child — skip removal for those.
    const isKnife = weaponId.startsWith('weapon_knife') || weaponId === 'weapon_bayonet'
    const isTaser = weaponId === 'weapon_taser'
    if (!isKnife && !isTaser && clone.children.length >= 2) {
      if (legacyModel) {
        clone.remove(clone.children[1])   // keep child 0 (legacy model)
      } else {
        clone.remove(clone.children[0])   // keep child 1 (current model)
      }
    }

    clone.updateMatrixWorld(true)
    const bbox = new THREE.Box3().setFromObject(clone)
    const size = new THREE.Vector3()
    bbox.getSize(size)
    const center = new THREE.Vector3()
    bbox.getCenter(center)
    clone.position.sub(center)
    const maxDim = Math.max(size.x, size.y, size.z)
    const sf = maxDim > 0 ? 2 / maxDim : 1
    return { processed: clone, scaleFactor: sf, modelSize: size, modelHalfZ: size.z * 0.5 }
  }, [scene, legacyModel, weaponId])

  // Apply skin texture + metalness map imperatively
  useEffect(() => {
    if (!paintId || !processed) return
    let live = true
    const loader = new THREE.TextureLoader()

    const applyMaps = (colorTex, metalTex) => {
      if (!live) return
      processed.traverse(obj => {
        if (!obj.isMesh) return
        const n = (obj.material?.name ?? '').toLowerCase()
        if (n.includes('bare_arm') || n.includes('scope')) return
        obj.material.map = colorTex
        if (metalTex) {
          obj.material.metalnessMap = metalTex
          obj.material.metalness = 1.0
        }
        obj.material.needsUpdate = true
      })
    }

    // Load color texture
    const onColorLoaded = (colorTex) => {
      if (!live) return
      colorTex.flipY = false
      colorTex.colorSpace = THREE.SRGBColorSpace
      colorTex.wrapS = colorTex.wrapT = THREE.RepeatWrapping

      // Try metalness map (linear color space — NOT sRGB)
      const onMetal = (mt) => {
        if (!live) return
        mt.flipY = false
        mt.colorSpace = THREE.LinearSRGBColorSpace
        mt.wrapS = mt.wrapT = THREE.RepeatWrapping
        applyMaps(colorTex, mt)
      }
      const onNoMetal = () => { if (live) applyMaps(colorTex, null) }

      loader.load(`/textures/${weaponId}/${paintId}_metal.png`, onMetal, undefined,
        () => loader.load(`/textures/${weaponId}/${paintId}_metal.webp`, onMetal, undefined, onNoMetal))
    }

    loader.load(`/textures/${weaponId}/${paintId}.png`, onColorLoaded, undefined,
      () => loader.load(`/textures/${weaponId}/${paintId}.webp`, onColorLoaded))

    return () => { live = false }
  }, [weaponId, paintId, processed])

  // Compute sticker placements from per-weapon offset table
  // Uses the overall model bbox (centered at origin in group space) for positioning
  const stickerPlacements = useMemo(() => {
    if (!stickers || !modelSize) return []

    const offsets = SLOT_OFFSETS[weaponId] || DEFAULT_SLOT_OFFSETS
    // Sticker size: ~8% of model's longest dimension
    const stickerDim = Math.max(modelSize.x, modelSize.y, modelSize.z) * 0.08

    return stickers.map((s, i) => {
      if (!s?.image) return null
      const coeff = offsets[i]
      if (!coeff || (coeff.xf === 0 && coeff.yf === 0 && coeff.df === 0)) return null

      // Model is centered at origin — offsets are fractions of model size
      const px = coeff.xf * modelSize.x
      const py = coeff.yf * modelSize.y
      const pz = modelHalfZ + 0.05 // just in front of the +Z face

      return {
        pos: [px, py, pz],
        dim: stickerDim,
        image: s.image,
      }
    }).filter(Boolean)
  }, [stickers, modelSize, modelHalfZ, weaponId])

  return (
    <group ref={groupRef} scale={scaleFactor}>
      <primitive object={processed} />
      {stickerPlacements.map((p, i) => (
        <StickerPlane
          key={`${p.image}-${i}`}
          position={p.pos}
          size={p.dim}
          imageUrl={p.image}
        />
      ))}
    </group>
  )
}

/* ── Public component ──────────────────────────────────────────────────── */
export default function WeaponCanvas({ weaponId, paintId, stickers = [], legacyModel = false }) {
  if (!weaponId) return null

  return (
    <div className="w-full h-full" style={{ background: '#131920', minHeight: 300 }}>
      <CanvasErrorBoundary
        key={`${weaponId}-${legacyModel}`}
        fallback={
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: '#131920', minHeight: 300 }}
          >
            <p className="text-slate-500 text-sm">3D model not available for this weapon</p>
          </div>
        }
      >
        <Canvas
          camera={{ fov: 45, near: 0.01, far: 200, position: [0, 0.3, 2.8] }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          style={{ width: '100%', height: '100%' }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={0.4} />

          <Suspense fallback={null}>
            <Environment files="/models/environment.hdr" />
          </Suspense>

          <Suspense
            fallback={
              <Html center>
                <p className="text-slate-400 text-sm whitespace-nowrap">Loading model…</p>
              </Html>
            }
          >
            <WeaponModel
              weaponId={weaponId}
              paintId={paintId}
              stickers={stickers}
              legacyModel={legacyModel}
            />
          </Suspense>

          <OrbitControls
            target={[0, 0, 0]}
            makeDefault
            enablePan={false}
            enableDamping
            minPolarAngle={Math.PI * 0.15}
            maxPolarAngle={Math.PI * 0.85}
            minDistance={1}
            maxDistance={8}
          />
        </Canvas>
      </CanvasErrorBoundary>
    </div>
  )
}
