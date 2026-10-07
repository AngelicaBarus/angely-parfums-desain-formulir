import HangingLamp from './HangingLamp.jsx'
import Bottle from './Bottle.jsx'
import SprayHead from './SprayHead.jsx'

function Pedestal() {
  return (
    <div className="pedestal">
      <div className="ped-body" />
      <div className="ped-top" />
    </div>
  )
}

// Rangkaian display: lampu + alas + botol + kepala spray.
export default function PerfumeDisplay({ displayRef, tipRef, pressed, onSpray }) {
  return (
    <div className="display" ref={displayRef}>
      <HangingLamp />
      <div className="spot" />
      <div className="pool" />

      <Pedestal />

      <div className="bottle-shadow" />
      <div className="bottle-reflect" />

      <Bottle title="EAU DE ROSE" type="PARFUM" />
      <div className="collar" />

      <SprayHead onSpray={onSpray} pressed={pressed} tipRef={tipRef} />
    </div>
  )
}