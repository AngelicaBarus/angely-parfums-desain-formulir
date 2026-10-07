const GEMS = ['g0', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'g10']

// Kepala spray. Parent mengirim fungsi (onSpray) dan state (pressed) lewat props.
export default function SprayHead({ onSpray, pressed, tipRef }) {
  return (
    <button
      type="button"
      className={'head' + (pressed ? ' pressed' : '')}
      aria-label="Tekan kepala spray"
      onPointerDown={onSpray}
      onClick={onSpray}
    >
      <span className="cap">
        {GEMS.map((g) => (
          <i key={g} className={'gem ' + g} />
        ))}
      </span>
      <span className="noz" />
      <span className="tip" ref={tipRef} />
      <span className="ring" />
    </button>
  )
}