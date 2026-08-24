export async function assessRisk(user, emotionLogs) {
  if (!emotionLogs.length) {
    return { riskScore: 0, level: "low", triggerFactors: "ยังไม่มีข้อมูลบันทึกอารมณ์เพียงพอสำหรับประเมิน" };
  }

  const avgCraving = emotionLogs.reduce((sum, l) => sum + (l.cravingLevel ?? 0), 0) / emotionLogs.length;
  const avgHappiness = emotionLogs.reduce((sum, l) => sum + l.happinessLevel, 0) / emotionLogs.length;

  let level = "low";
  if (avgCraving >= 7 || avgHappiness <= 2) level = "high";
  else if (avgCraving >= 4 || avgHappiness <= 4) level = "medium";

  const riskScore = Math.round(((avgCraving / 10) * 0.6 + ((7 - avgHappiness) / 7) * 0.4) * 100);

  return {
    riskScore,
    level,
    triggerFactors: `ค่าเฉลี่ยความอยากยา ${avgCraving.toFixed(1)}/10, ความสุขเฉลี่ย ${avgHappiness.toFixed(1)}/7 จาก ${emotionLogs.length} วันล่าสุด`,
  };
}
