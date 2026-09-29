import FamilyMission from "../models/FamilyMission.js";
import FamilyMissionLog from "../models/FamilyMissionLog.js";
import FamilyLink from "../models/FamilyLink.js";
import { notifyUser } from "../services/notificationService.js";
import { checkAndAwardRewards } from "../services/rewardService.js";
import { insertOnce } from "../utils/insertOnce.js";
import { toBangkokDateKey } from "../utils/dateKey.js";
import { createCrudController } from "./crudFactory.js";

const { getAll, create, update, remove } = createCrudController(FamilyMission);
export { getAll as listFamilyMissions, create as createFamilyMission, update as updateFamilyMission, remove as deleteFamilyMission };

async function findMyActiveLink(req) {
  return req.user.role === "family"
    ? FamilyLink.findOne({ familyUser: req.user.id, status: "active" })
    : FamilyLink.findOne({ recoveringUser: req.user.id, status: "active" });
}

export async function myTodayFamilyMissions(req, res) {
  const link = await findMyActiveLink(req);
  if (!link) return res.json([]);

  const dateKey = toBangkokDateKey(new Date());
  const [missions, logs] = await Promise.all([
    FamilyMission.find({ active: true }),
    FamilyMissionLog.find({ familyLink: link._id, dateKey }),
  ]);
  const logByMission = new Map(logs.map((log) => [log.familyMission.toString(), log]));

  res.json(
    missions.map((mission) => {
      const log = logByMission.get(mission._id.toString());
      return {
        mission,
        userConfirmed: log?.userConfirmed || false,
        familyConfirmed: log?.familyConfirmed || false,
        completed: log?.completed || false,
      };
    })
  );
}

export async function confirmFamilyMission(req, res) {
  const mission = await FamilyMission.findOne({ _id: req.body.familyMissionId, active: true });
  if (!mission) {
    return res.status(404).json({ message: "ไม่พบภารกิจนี้" });
  }

  const link = await findMyActiveLink(req);
  if (!link) {
    return res.status(403).json({ message: "ยังไม่มีการเชื่อมโยงครอบครัวที่ใช้งานอยู่" });
  }

  const dateKey = toBangkokDateKey(new Date());
  const identity = { familyLink: link._id, familyMission: mission._id, dateKey };
  await insertOnce(FamilyMissionLog, identity, { recoveringUser: link.recoveringUser });

  const isFamily = req.user.role === "family";
  const update = isFamily
    ? { familyConfirmed: true, familyConfirmedAt: new Date() }
    : { userConfirmed: true, userConfirmedAt: new Date() };

  let log = await FamilyMissionLog.findOneAndUpdate(identity, { $set: update }, { new: true });

  if (log.userConfirmed && log.familyConfirmed && !log.completed) {
    log.completed = true;
    log.completedAt = new Date();
    log.pointsAwarded = mission.points;
    await log.save();

    await notifyUser(link.recoveringUser, `ภารกิจครอบครัว "${mission.title}" สำเร็จแล้ว!`, "reward", { link: "/streak" });
    await notifyUser(link.familyUser, `ภารกิจครอบครัว "${mission.title}" สำเร็จแล้ว!`, "reward", { link: "/family/dashboard" });
    await checkAndAwardRewards(link.recoveringUser);
  }

  res.json(log);
}
