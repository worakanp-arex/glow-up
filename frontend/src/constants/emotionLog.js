// How many days back (today included) a missed mood check-in can still be added.
// The server enforces a slightly looser limit; keep this the smaller of the two.
export const BACKFILL_WINDOW_DAYS = 7;
