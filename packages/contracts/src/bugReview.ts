export const BUG_REVIEW_STATES = {
  NEW: "New",
  VERIFY: "Verify",
  DUPLICATE: "Duplicate",
  NOT_APPLICABLE: "Not Applicable",
  NEED_MORE_INFORMATION: "Need more information",
} as const;

export const BUG_REVIEW_STATE_VALUES = Object.values(BUG_REVIEW_STATES);

export type BugReviewState =
  (typeof BUG_REVIEW_STATES)[keyof typeof BUG_REVIEW_STATES];

export const BUG_REVIEW_TRANSITIONS: Readonly<
  Record<BugReviewState, readonly BugReviewState[]>
> = {
  [BUG_REVIEW_STATES.NEW]: BUG_REVIEW_STATE_VALUES,
  [BUG_REVIEW_STATES.VERIFY]: [
    BUG_REVIEW_STATES.NEW,
    BUG_REVIEW_STATES.DUPLICATE,
    BUG_REVIEW_STATES.NOT_APPLICABLE,
    BUG_REVIEW_STATES.NEED_MORE_INFORMATION,
  ],
  [BUG_REVIEW_STATES.DUPLICATE]: [BUG_REVIEW_STATES.NEW],
  [BUG_REVIEW_STATES.NOT_APPLICABLE]: [BUG_REVIEW_STATES.NEW],
  [BUG_REVIEW_STATES.NEED_MORE_INFORMATION]: [
    BUG_REVIEW_STATES.NEW,
    BUG_REVIEW_STATES.VERIFY,
    BUG_REVIEW_STATES.DUPLICATE,
    BUG_REVIEW_STATES.NOT_APPLICABLE,
  ],
};

export function isBugReviewState(value: unknown): value is BugReviewState {
  return BUG_REVIEW_STATE_VALUES.includes(value as BugReviewState);
}

export function canTransitionBugReviewState(
  current: unknown,
  next: BugReviewState
) {
  if (current === next) return true;
  // Unknown legacy states can always be recovered without migrating old data.
  if (!isBugReviewState(current)) return next === BUG_REVIEW_STATES.NEW;
  return BUG_REVIEW_TRANSITIONS[current].includes(next);
}

const LEGACY_BUG_REVIEW_STATE_ALIASES: Readonly<Record<string, BugReviewState>> = {
  new: BUG_REVIEW_STATES.NEW,
  open: BUG_REVIEW_STATES.NEW,
  verify: BUG_REVIEW_STATES.VERIFY,
  triaged: BUG_REVIEW_STATES.VERIFY,
  duplicate: BUG_REVIEW_STATES.DUPLICATE,
  "not applicable": BUG_REVIEW_STATES.NOT_APPLICABLE,
  "need more information": BUG_REVIEW_STATES.NEED_MORE_INFORMATION,
};

export function normalizeBugReviewState(
  state: unknown,
  legacyStatus?: unknown
): BugReviewState | string {
  const value = String(state || legacyStatus || BUG_REVIEW_STATES.NEW).trim();
  return LEGACY_BUG_REVIEW_STATE_ALIASES[value.toLowerCase()] || value;
}

export function legacyVulnerabilityStatusForReviewState(state: BugReviewState) {
  if (state === BUG_REVIEW_STATES.VERIFY) return "triaged";
  if (
    state === BUG_REVIEW_STATES.DUPLICATE ||
    state === BUG_REVIEW_STATES.NOT_APPLICABLE
  ) return "closed";
  return "open";
}
