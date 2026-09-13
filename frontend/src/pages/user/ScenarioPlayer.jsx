import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Award, CheckCircle2, Play, XCircle } from "lucide-react";
import * as scenarioService from "../../services/scenarioService.js";
import "./ScenarioPlayer.css";

function ScenarioPlayer() {
  const { id } = useParams();
  const [scenario, setScenario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [chosenIndex, setChosenIndex] = useState(null);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    scenarioService
      .getScenario(id)
      .then(setScenario)
      .catch((error) => setLoadError(error))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit() {
    if (chosenIndex === null) return;
    setSubmitting(true);
    try {
      const res = await scenarioService.attemptScenario(id, chosenIndex);
      setResult(res);
    } finally {
      setSubmitting(false);
    }
  }

  function handleRetry() {
    setChosenIndex(null);
    setResult(null);
  }

  const pageHeader = <PageHeader icon={Play} backTo={"/learning"} backLabel="บทเรียนทั้งหมด">{scenario?.title || "ฝึกสถานการณ์จำลอง"}</PageHeader>;

  if (loadError) return <div className="scenario-player-page">{pageHeader}<AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} /></div>;

  if (loading) {
    return <div className="scenario-player-page">{pageHeader}<AsyncState /></div>;
  }
  if (!scenario) {
    return <div className="scenario-player-page">{pageHeader}ไม่พบสถานการณ์นี้</div>;
  }

  return (
    <div className="scenario-player-page">
      {pageHeader}
      <div className="scenario-player-card">
        <p className="scenario-player-prompt">{scenario.prompt}</p>

        {result ? (
          <div className={`scenario-player-result${result.passed ? " passed" : " failed"}`}>
            {result.passed ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
            <div>
              <p className="scenario-player-result-title">
                {result.passed ? "ตอบถูกต้อง เก่งมาก!" : "ยังไม่ใช่คำตอบที่ดีที่สุด"}
              </p>
              {result.feedback && <p className="scenario-player-result-feedback">{result.feedback}</p>}
              {result.newlyCompletedMissions?.length > 0 && (
                <p className="scenario-player-result-mission">
                  <Award size={14} />
                  สำเร็จภารกิจ: {result.newlyCompletedMissions.join(", ")}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="scenario-player-options" role="radiogroup">
            {scenario.options.map((option, index) => (
              <button
                key={index}
                type="button"
                role="radio"
                aria-checked={chosenIndex === index}
                className={`scenario-player-option${chosenIndex === index ? " active" : ""}`}
                onClick={() => setChosenIndex(index)}
              >
                {option.text}
              </button>
            ))}
          </div>
        )}

        {result ? (
          !result.passed && (
            <button type="button" className="btn btn-secondary" onClick={handleRetry}>
              ลองอีกครั้ง
            </button>
          )
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={chosenIndex === null || submitting}
          >
            {submitting ? "กำลังส่ง..." : "ส่งคำตอบ"}
          </button>
        )}
      </div>
    </div>
  );
}

export default ScenarioPlayer;
