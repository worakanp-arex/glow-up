import RiskAssessment from "../models/RiskAssessment.js";
import { createCrudController } from "./crudFactory.js";

const { getAll, getOne, create, update, remove } = createCrudController(RiskAssessment);

export {
  getAll as getRiskAssessments,
  getOne as getRiskAssessment,
  create as createRiskAssessment,
  update as updateRiskAssessment,
  remove as deleteRiskAssessment,
};
