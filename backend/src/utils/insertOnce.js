// Unique compound indexes are required on the identity fields supplied here.
export async function insertOnce(Model, identity, values = {}) {
  try {
    const result = await Model.updateOne(identity, { $setOnInsert: values }, { upsert: true, setDefaultsOnInsert: true });
    return Boolean(result.upsertedCount);
  } catch (err) {
    if (err.code === 11000) return false;
    throw err;
  }
}
