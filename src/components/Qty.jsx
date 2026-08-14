import { splitQuantityFraction } from '@/lib/stepUtils'

// Renders a quantity as a proper stacked fraction (numerator over a
// horizontal line over the denominator) for common cooking fractions -
// halves/thirds/quarters - instead of a decimal or a slash form. Falls back
// to a plain rounded decimal for anything that isn't a recognized simple
// fraction.
export default function Qty({ value, unit, className = '' }) {
  // Falsy (including 0/NaN) renders nothing, matching how a quantity-less
  // ingredient ("קורט מלח") has always been displayed in this app - a
  // literal "0" reads as if none should be added, not "no set amount".
  if (!value) return null
  const split = splitQuantityFraction(value)

  if (!split) {
    return (
      <span className={className}>
        {parseFloat(value.toFixed(2))}
        {unit ? ` ${unit}` : ''}
      </span>
    )
  }

  return (
    <span className={className}>
      {split.num === 0 ? (
        split.whole
      ) : (
        <>
          {split.whole > 0 && <span>{split.whole}</span>}
          <span className="inline-flex flex-col items-center leading-none text-[0.65em] mx-0.5 align-middle relative -top-[0.1em]">
            <span>{split.num}</span>
            <span className="border-t border-current px-0.5">{split.den}</span>
          </span>
        </>
      )}
      {unit ? ` ${unit}` : ''}
    </span>
  )
}
