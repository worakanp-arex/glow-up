const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

// Defence in depth on top of the SameSite=Lax login cookie: a browser always
// says which site a create/update/delete came from, so refuse the ones that did
// not come from our own front end. Clients that send no Origin (curl, server to
// server, the test suite) are not browsers acting on someone's behalf and pass.
export function requireOwnOrigin(allowedOrigin) {
  return function checkOrigin(req, res, next) {
    if (SAFE_METHODS.includes(req.method)) return next();
    const { origin } = req.headers;
    if (origin && origin !== allowedOrigin) {
      return res.status(403).json({ message: "Origin not allowed" });
    }
    next();
  };
}
