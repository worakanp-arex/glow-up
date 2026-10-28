// A family message stays on the home page for this long after it was marked as
// read, then the usual welcome returns (the message remains in the profile's
// history). The server applies the same window when it picks the latest message.
export const READ_MESSAGE_VISIBLE_MS = 10 * 60 * 1000;
