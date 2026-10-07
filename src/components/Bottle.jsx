// Botol kristal. Teks label diterima lewat props.
export default function Bottle({ title, type }) {
  return (
    <div className="bottle-wrap">
      <div className="bl shape rim" />
      <div className="bl shape glass" />
      <div className="bl shape liquid" />
      <div className="bl shape pleats" />
      <div className="bl shape baseband" />
      <div className="bl hl hl1" />
      <div className="bl hl hl2" />
      <div className="bl shape sheen" />
      <div className="label">
        <b>{title}</b>
        <i>{type}</i>
      </div>
    </div>
  )
}