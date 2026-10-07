// Lampu gantung dengan tali tarik. State (on) dan aksi (onToggle) datang dari parent via props.
export default function SwitchLamp({ on, onToggle }) {
  return (
    <div className={'sw' + (on ? ' on' : '')}>
      <button
        type="button"
        className="sw-btn"
        onClick={onToggle}
        aria-pressed={on}
        aria-label={on ? 'Matikan lampu' : 'Nyalakan lampu'}
      >
        <i className="sw-cord" />
        <i className="sw-shade" />
        <i className="sw-bulb" />
        <i className="sw-pull" />
      </button>
      {!on && <p className="sw-hint">Nyalakan lampu untuk membuka formulir</p>}
    </div>
  )
}