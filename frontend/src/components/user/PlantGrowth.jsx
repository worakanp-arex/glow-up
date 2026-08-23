const STAGE_THRESHOLDS = [0, 1, 3, 7, 14, 30];

const STAGE_LABELS = [
  "เริ่มต้นวันนี้",
  "แตกหน่อแล้ว",
  "ต้นอ่อนกำลังโต",
  "เริ่มเป็นพุ่มไม้",
  "กลายเป็นต้นไม้เล็ก",
  "ต้นไม้ใหญ่แข็งแรง",
];

export function streakToStage(streak) {
  let stage = 0;
  for (let i = STAGE_THRESHOLDS.length - 1; i >= 0; i -= 1) {
    if (streak >= STAGE_THRESHOLDS[i]) {
      stage = i;
      break;
    }
  }
  return stage;
}

export function stageLabel(stage) {
  return STAGE_LABELS[stage] ?? STAGE_LABELS[0];
}

const POT = (
  <path d="M70 168 L60 190 Q100 200 140 190 L130 168 Z" fill="var(--color-ink-300)" />
);

const SOIL = <ellipse cx="100" cy="168" rx="32" ry="7" fill="var(--color-ink-400)" />;

function Leaf({ cx, cy, rx, ry, rotate = 0 }) {
  return (
    <ellipse
      cx={cx}
      cy={cy}
      rx={rx}
      ry={ry}
      fill="var(--color-success)"
      transform={`rotate(${rotate} ${cx} ${cy})`}
      opacity="0.9"
    />
  );
}

function StageArt({ stage }) {
  switch (stage) {
    case 0:
      return (
        <>
          {POT}
          {SOIL}
          <circle cx="100" cy="163" r="4" fill="var(--color-success)" />
        </>
      );
    case 1:
      return (
        <>
          {POT}
          {SOIL}
          <rect x="98" y="140" width="4" height="28" rx="2" fill="var(--color-success)" />
          <Leaf cx="90" cy="142" rx="10" ry="6" rotate={-30} />
          <Leaf cx="110" cy="142" rx="10" ry="6" rotate={30} />
        </>
      );
    case 2:
      return (
        <>
          {POT}
          {SOIL}
          <rect x="98" y="118" width="4" height="50" rx="2" fill="var(--color-success)" />
          <Leaf cx="86" cy="128" rx="13" ry="7" rotate={-25} />
          <Leaf cx="114" cy="128" rx="13" ry="7" rotate={25} />
          <Leaf cx="88" cy="148" rx="11" ry="6" rotate={-15} />
          <Leaf cx="112" cy="148" rx="11" ry="6" rotate={15} />
        </>
      );
    case 3:
      return (
        <>
          {POT}
          {SOIL}
          <rect x="97" y="98" width="5" height="70" rx="2.5" fill="var(--color-success)" />
          <Leaf cx="80" cy="108" rx="15" ry="8" rotate={-20} />
          <Leaf cx="120" cy="108" rx="15" ry="8" rotate={20} />
          <Leaf cx="82" cy="128" rx="14" ry="7" rotate={-15} />
          <Leaf cx="118" cy="128" rx="14" ry="7" rotate={15} />
          <Leaf cx="86" cy="148" rx="12" ry="6" rotate={-10} />
          <Leaf cx="114" cy="148" rx="12" ry="6" rotate={10} />
        </>
      );
    case 4:
      return (
        <>
          {POT}
          {SOIL}
          <rect x="96" y="110" width="8" height="58" rx="3" fill="var(--color-ink-400)" />
          <circle cx="100" cy="95" r="38" fill="var(--color-success)" opacity="0.85" />
          <circle cx="78" cy="108" r="22" fill="var(--color-success)" opacity="0.9" />
          <circle cx="124" cy="108" r="22" fill="var(--color-success)" opacity="0.9" />
        </>
      );
    default:
      return (
        <>
          <ellipse cx="100" cy="188" rx="46" ry="8" fill="var(--color-ink-300)" opacity="0.6" />
          <rect x="93" y="120" width="14" height="68" rx="5" fill="var(--color-ink-400)" />
          <circle cx="100" cy="88" r="46" fill="var(--color-success)" opacity="0.85" />
          <circle cx="66" cy="106" r="26" fill="var(--color-success)" opacity="0.9" />
          <circle cx="134" cy="106" r="26" fill="var(--color-success)" opacity="0.9" />
          <circle cx="100" cy="60" r="26" fill="var(--color-success)" />
          <circle cx="82" cy="82" r="4" fill="var(--color-primary-300)" />
          <circle cx="122" cy="90" r="4" fill="var(--color-primary-300)" />
          <circle cx="104" cy="70" r="4" fill="var(--color-primary-300)" />
        </>
      );
  }
}

function PlantGrowth({ streak = 0, size = 120, className = "" }) {
  const stage = streakToStage(streak);

  return (
    <svg
      className={`plant-growth${className ? ` ${className}` : ""}`}
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label={`ต้นไม้ระยะ: ${stageLabel(stage)}`}
    >
      <StageArt stage={stage} />
    </svg>
  );
}

export default PlantGrowth;
