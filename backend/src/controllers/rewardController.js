import Reward from "../models/Reward.js";
import UserReward from "../models/UserReward.js";
import { createCrudController } from "./crudFactory.js";

const { getAll, getOne, create, update, remove } = createCrudController(Reward);

export {
  getAll as listRewards,
  getOne as getReward,
  create as createReward,
  update as updateReward,
  remove as deleteReward,
};

export async function myRewards(req, res) {
  const userRewards = await UserReward.find({ user: req.user.id })
    .populate("reward")
    .sort({ earnedAt: -1 });
  res.json(userRewards);
}
