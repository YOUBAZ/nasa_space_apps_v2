import { useEffect, useState } from 'react'
import type { ElonPose } from './poses'
import { ELON_HEAD_URL } from './head'
import { elonFit, elonPhotoUrl } from './photos'
import './elon.css'

const SKIN = '#f1c9a5'
const SKIN_ANGRY = '#f08a6e'
const SHIRT = '#17171b'
const HAIR = '#3b2a20'

/**
 * The Flight Director and tutorial coach, a parody of Elon Musk.
 * Each pose is a whole, real NASA photograph of him with the background cut away. The game only moves
 * the photograph as one piece (bob, bounce, shake) and draws its effects beside it; it never redraws,
 * recolours or bends him. If the photo cannot load, the drawn cartoon below stands in.
 */
export function Elon({ pose = 'idle', size = 180 }: { pose?: ElonPose; size?: number }) {
  const [broken, setBroken] = useState(false)
  useEffect(() => { setBroken(false) }, [pose])
  if (broken) return <ElonFlat pose={pose} size={size} />
  const fit = elonFit(pose, size)
  return (
    <div role="img" aria-label="Elon Musk (parody)" className={`elon elon-photo elon-${pose}`} style={{ width: size, height: size * 1.3 }}>
      <span className="elon-shadow" aria-hidden="true" />
      <div className="elon-figure" style={{ width: fit.width, height: fit.height, left: (size - fit.width) / 2 }}>
        <img key={pose} src={elonPhotoUrl(pose)} alt="" draggable={false} onError={() => setBroken(true)} />
        {pose === 'tantrum' && (
          <svg className="elon-steam" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" fill="none" stroke="#f64137" strokeWidth="2.6" strokeLinecap="round">
            <path d="M20 9 l-8 -8 M14 22 l-11 -3 M56 5 l7 -9 M63 17 l11 -5" />
            <path d="M2 99 q-7 -3 -5 -10 M99 99 q7 -3 5 -10" />
          </svg>
        )}
      </div>
    </div>
  )
}

/** The drawn stand-in, used only when the photographs cannot load. */
export function ElonFlat({ pose = 'idle', size = 180 }: { pose?: ElonPose; size?: number }) {
  const angry = pose === 'tantrum'
  const happy = pose === 'celebrate'
  const skin = angry ? SKIN_ANGRY : SKIN
  return (
    <svg viewBox="0 0 200 260" width={size} height={(size * 260) / 200} className={`elon elon-${pose}`} role="img" aria-label="Elon Musk (parody)">
      <ellipse cx="100" cy="250" rx="52" ry="7" fill="#000" opacity="0.35" />
      <g className="elon-body">
        {/* legs */}
        <g className="elon-leg-l"><rect x="78" y="168" width="20" height="62" rx="9" fill="#2e2e32" /><rect x="70" y="222" width="32" height="14" rx="7" fill="#0b0b0d" /></g>
        <g className="elon-leg-r"><rect x="102" y="168" width="20" height="62" rx="9" fill="#2e2e32" /><rect x="98" y="222" width="32" height="14" rx="7" fill="#0b0b0d" /></g>
        {/* arms sit behind the torso */}
        <g className="elon-arm-l"><rect x="52" y="104" width="18" height="62" rx="9" fill={SHIRT} /><circle cx="61" cy="170" r="10" fill={skin} /></g>
        <g className="elon-arm-r"><rect x="130" y="104" width="18" height="62" rx="9" fill={SHIRT} /><circle cx="139" cy="170" r="10" fill={skin} /></g>
        {/* torso: black tee with a small rocket */}
        <path d="M66 104 q34 -14 68 0 l4 74 q-38 10 -76 0 z" fill={SHIRT} stroke="#444447" strokeWidth="1.5" />
        <path d="M100 124 c7 5 8 14 6 22 h-12 c-2 -8 -1 -17 6 -22 z" fill="#f64137" />
        <circle cx="100" cy="136" r="2.6" fill="#fff" />
        {/* head */}
        <g className="elon-head">
          <rect x="91" y="88" width="18" height="18" rx="6" fill={skin} />
          <path d="M66 56 q0 -40 34 -40 q34 0 34 40 q0 38 -34 40 q-34 -2 -34 -40 z" fill={skin} />
          {/* swept hair */}
          <path d="M64 52 q-4 -44 40 -42 q34 2 32 40 q-10 -22 -30 -22 q-16 0 -26 8 q-10 6 -16 16 z" fill={HAIR} />
          {/* brows */}
          <path d={angry ? 'M78 50 l16 6 M122 50 l-16 6' : 'M78 52 q8 -4 16 0 M106 52 q8 -4 16 0'} stroke={HAIR} strokeWidth="3.5" strokeLinecap="round" fill="none" />
          {/* eyes */}
          <circle cx="86" cy="62" r="3.6" fill="#17171b" />
          <circle cx="114" cy="62" r="3.6" fill="#17171b" />
          {/* mouth */}
          {angry
            ? <path d="M84 78 q16 -8 32 0 q-2 14 -16 14 q-14 0 -16 -14 z" fill="#5a1410" stroke="#17171b" strokeWidth="1.5" />
            : happy
              ? <path d="M84 76 q16 16 32 0 z" fill="#fff" stroke="#17171b" strokeWidth="2" strokeLinejoin="round" />
              : pose === 'shrug'
                ? <path d="M88 82 q12 -5 24 0" stroke="#17171b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                : <path d="M86 78 q10 8 26 1" stroke="#17171b" strokeWidth="2.5" fill="none" strokeLinecap="round" />}
          {/* the real face sits over the drawn one; if the photo cannot load, the drawing shows */}
          <image href={ELON_HEAD_URL} x="52" y="-6" width="98" height="116" preserveAspectRatio="xMidYMid meet" />
        </g>
      </g>
      {angry && (
        <g className="elon-steam" fill="none" stroke="#f64137" strokeWidth="3" strokeLinecap="round">
          <path d="M40 30 l-12 -10 M32 46 l-16 -2 M160 30 l12 -10 M168 46 l16 -2" />
        </g>
      )}
    </svg>
  )
}
