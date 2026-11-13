/**
 * Why a mathematical rule declined, in a form a future hint system can show.
 *
 * Rules keep their existing contract: a plan, or null when they do not apply.
 * When they decline for a reason worth telling the student, they can also
 * report one of these rejections through a separate "explain" function, so no
 * caller has to change until hints exist.
 *
 * A rejection has a stable `reason` code, for code to test, and a plain
 * `message`, for students. This module knows nothing about the DOM or where
 * the message will be shown.
 */
export const REJECTION_REASONS = Object.freeze({
  NUMBER_TOO_LARGE: 'number-too-large'
});

const MESSAGES = Object.freeze({
  [REJECTION_REASONS.NUMBER_TOO_LARGE]: 'Number is too large'
});

/** Build a rejection for a known reason. */
export function createRejection(reason) {
  if (!Object.hasOwn(MESSAGES, reason)) throw new TypeError(`Unknown rejection reason: ${reason}`);
  return Object.freeze({ reason, message: MESSAGES[reason] });
}

/** The student-facing message for a reason code, such as one in an equality check result. */
export function describeRejection(reason) {
  return MESSAGES[reason] ?? null;
}
