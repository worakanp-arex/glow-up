import JobCategory from "../models/JobCategory.js";
import { createCrudController } from "./crudFactory.js";

const { getAll, create } = createCrudController(JobCategory);

export { getAll as getJobCategories, create as createJobCategory };
