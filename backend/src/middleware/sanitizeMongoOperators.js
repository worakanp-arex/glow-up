function stripOperators(value) {
  if (Array.isArray(value)) {
    for (const item of value) stripOperators(item);
    return value;
  }
  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) {
      if (key.startsWith("$") || key.includes(".")) {
        delete value[key];
        continue;
      }
      stripOperators(value[key]);
    }
  }
  return value;
}

export function sanitizeMongoOperators(req, res, next) {
  stripOperators(req.query);
  stripOperators(req.body);
  stripOperators(req.params);
  next();
}
