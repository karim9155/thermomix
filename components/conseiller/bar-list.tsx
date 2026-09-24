/**
 * Horizontal bars for one measure across a few categories — regions,
 * age groups (J6, J7). Built as a real <table>: the label and value
 * columns ARE the table view, and the bar is a visual aid in between.
 *
 * One series, one hue (the brand green, validated against the white
 * surface), so there is no legend: the section title names the measure.
 * Each bar also carries a native tooltip with its exact figures.
 */
export function BarList({
  rows,
  valueLabel,
  format = (value) => String(value),
  detail,
}: {
  rows: { label: string; value: number }[]
  /** Column header for the value, e.g. "Chiffre d'affaires". */
  valueLabel: string
  format?: (value: number) => string
  /** Secondary text per row, e.g. "12 ventes". */
  detail?: (index: number) => string
}) {
  const max = Math.max(0, ...rows.map((row) => row.value))

  if (rows.length === 0 || max === 0) {
    return <p className="admin-empty">Aucune donnée sur cette période.</p>
  }

  return (
    <table className="bar-list">
      <thead>
        <tr>
          <th scope="col">Catégorie</th>
          <th scope="col" aria-hidden="true" />
          <th scope="col" className="advisor-num">
            {valueLabel}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => {
          const width = max > 0 ? (row.value / max) * 100 : 0
          const tooltip = `${row.label} : ${format(row.value)}${detail ? ` · ${detail(index)}` : ''}`
          return (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              <td className="bar-list-track" title={tooltip} aria-hidden="true">
                {row.value > 0 ? <span style={{ width: `${Math.max(width, 1.5)}%` }} /> : null}
              </td>
              <td className="advisor-num">
                <strong>{format(row.value)}</strong>
                {detail ? <div className="admin-muted advisor-table-sub">{detail(index)}</div> : null}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
