import JobCategory from "../models/JobCategory.js";
import Job from "../models/Job.js";
import { createCrudController } from "./crudFactory.js";

const { getAll, create } = createCrudController(JobCategory);

export { getAll as getJobCategories, create as createJobCategory };

export async function updateJobCategory(req, res) {
  try {
    const category = await JobCategory.findByIdAndUpdate(req.params.id, { name: req.body.name }, { new: true, runValidators: true });
    if (!category) {
      return res.status(404).json({ message: "Not found" });
    }
    res.json(category);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "มีหมวดหมู่ชื่อนี้อยู่แล้ว" });
    throw err;
  }
}

// A category that postings still use is kept, so no job silently loses its category.
export async function deleteJobCategory(req, res) {
  const category = await JobCategory.findById(req.params.id);
  if (!category) {
    return res.status(404).json({ message: "Not found" });
  }
  const inUse = await Job.countDocuments({ category: category._id });
  if (inUse > 0) {
    return res.status(409).json({ message: `ยังมีประกาศงาน ${inUse} รายการที่ใช้หมวดหมู่นี้อยู่ ไม่สามารถลบได้` });
  }
  await JobCategory.findByIdAndDelete(category._id);
  res.status(204).send();
}
