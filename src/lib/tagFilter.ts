// Sentinel id for the "Untagged" filter option. Only ever appears in filter
// selections — never stored on a card.
export const UNTAGGED = "__untagged__";

export function matchesTagFilter(
  cardTags: string[],
  filter: string[],
): boolean {
  if (filter.length === 0) return true;
  if (filter.includes(UNTAGGED)) return cardTags.length === 0;
  return filter.every((id) => cardTags.includes(id));
}
