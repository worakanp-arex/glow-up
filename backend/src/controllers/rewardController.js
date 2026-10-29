import Reward from "../models/Reward.js";
import UserReward from "../models/UserReward.js";
import { createCrudController } from "./crudFactory.js";

const { getAll, getOne } = createCrudController(Reward);

export { getAll as listRewards, getOne as getReward };

const REWARD_FIELDS = ["name", "description", "icon", "pointsRequired"];

function rewardFields(body) {
  const fields = {};
  for (const key of REWARD_FIELDS) if (body[key] !== undefined) fields[key] = body[key];
  return fields;
}

export async function createReward(req, res) {
  const reward = await Reward.create(rewardFields(req.body));
  res.status(201).json(reward);
}

export async function updateReward(req, res) {
  const reward = await Reward.findByIdAndUpdate(req.params.id, rewardFields(req.body), { new: true, runValidators: true });
  if (!reward) {
    return res.status(404).json({ message: "Not found" });
  }
  res.json(reward);
}

// รางวัลคำนวณจากคะแนนรวม ดังนั้นการลบรางวัลหนึ่งจึงลบสำเนาที่ผู้คนถืออยู่ด้วย
// (ไม่เช่นนั้นรายการของพวกเขาจะมีรางวัลว่างเปล่า)
export async function deleteReward(req, res) {
  const reward = await Reward.findByIdAndDelete(req.params.id);
  if (!reward) {
    return res.status(404).json({ message: "Not found" });
  }
  await UserReward.deleteMany({ reward: reward._id });
  res.status(204).send();
}

export async function myRewards(req, res) {
  const userRewards = await UserReward.find({ user: req.user.id })
    .populate("reward")
    .sort({ earnedAt: -1 });
  res.json(userRewards.filter((userReward) => userReward.reward));
}
