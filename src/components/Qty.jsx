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
        <span dir="ltr" className="inline-block">
          {parseFloat(value.toFixed(2))}
        </span>
        {unit ? ` ${unit}` : ''}
      </span>
    )
  }

  return (
    <span className={className}>
      {/* Isolated from the surrounding RTL text so the whole number and the
          stacked fraction render left-to-right in their natural order
          ("1½") instead of the digits getting reordered by the bidi
          algorithm - the unit word stays outside, in normal RTL flow. */}
      {/* align-middle here (not just on the inner fraction span, which has no
          effect since it's a flex item, not an inline box) - without it, an
          inline-flex box defaults to aligning its *bottom* edge with the
          surrounding text's baseline, which floats the whole ~1.3-line-tall
          fraction stack high above the adjacent word instead of centering
          the bar against it. */}
      <span dir="ltr" className="inline-flex items-center align-middle">
        {split.num === 0 ? (
          split.whole
        ) : (
          <>
            {split.whole > 0 && <span>{split.whole}</span>}
            <span className="inline-flex flex-col items-center leading-none text-[0.65em] mx-0.5">
              <span>{split.num}</span>
              <span className="border-t border-current px-0.5">{split.den}</span>
            </span>
          </>
        )}
      </span>
      {unit ? ` ${unit}` : ''}
    </span>
  )
}
