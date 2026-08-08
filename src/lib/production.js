// Shared vat/cycle math: a "scaled" item is produced in one batch sized to
// the whole target amount; a "cycles" item is split into several base-size
// batches plus one partial remainder batch if the target isn't an exact
// multiple of the recipe's base quantity. Returns one scale factor per
// actual batch, so callers (starting production, printing ingredient
// summaries) treat each batch as its own unit instead of one combined total.
export function getVatScales(targetVolume, baseQuantity, productionMode) {
  if (productionMode !== 'cycles') return [targetVolume / baseQuantity]
  const fullCycles = Math.floor(targetVolume / baseQuantity)
  const remainder = Math.round((targetVolume % baseQuantity) * 100) / 100
  const scales = Array(fullCycles).fill(1)
  if (remainder > 0) scales.push(remainder / baseQuantity)
  return scales
}
