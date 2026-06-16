import { BrainCircuit, CalendarDays, GitCompareArrows, Pause, Play } from "lucide-react";
import type { RainfallRecord } from "../types";

type TimelineControlsProps = {
  aiDroughtShift: boolean;
  afterGsi: boolean;
  currentIndex: number;
  isPlaying: boolean;
  records: RainfallRecord[];
  selectedRecord: RainfallRecord;
  onAfterGsiChange: (value: boolean) => void;
  onAiDroughtShiftChange: (value: boolean) => void;
  onIndexChange: (value: number) => void;
  onPlayingChange: (value: boolean) => void;
};

export function TimelineControls({
  aiDroughtShift,
  afterGsi,
  currentIndex,
  isPlaying,
  records,
  selectedRecord,
  onAfterGsiChange,
  onAiDroughtShiftChange,
  onIndexChange,
  onPlayingChange,
}: TimelineControlsProps) {
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${selectedRecord.date}T12:00:00`));

  return (
    <div className="panel-section">
      <div className="section-row">
        <div>
          <div className="section-kicker">Rain History</div>
          <h3>{dateLabel}</h3>
        </div>
        <button
          className="icon-button"
          onClick={() => onPlayingChange(!isPlaying)}
          type="button"
          aria-label={isPlaying ? "Pause simulation" : "Play simulation"}
          title={isPlaying ? "Pause simulation" : "Play simulation"}
        >
          {isPlaying ? <Pause size={17} /> : <Play size={17} />}
        </button>
      </div>
      <div className="rain-data-strip">
        <span><CalendarDays size={15} />{selectedRecord.eventCategory.replace("-", " ")}</span>
        <strong>{selectedRecord.precipitationInches.toFixed(2)} in</strong>
        <span>{selectedRecord.daysSinceLastRain} dry days</span>
      </div>
      <input
        aria-label="Rainfall history timeline"
        className="timeline"
        max={records.length - 1}
        min={0}
        onChange={(event) => onIndexChange(Number(event.target.value))}
        type="range"
        value={currentIndex}
      />
      <button
        className={`split-toggle ${aiDroughtShift ? "is-after" : ""}`}
        onClick={() => onAiDroughtShiftChange(!aiDroughtShift)}
        type="button"
      >
        <BrainCircuit size={17} />
        <span>{aiDroughtShift ? "AI drought routing active" : "AI drought routing standby"}</span>
      </button>
      <button
        className={`split-toggle ${afterGsi ? "is-after" : ""}`}
        onClick={() => onAfterGsiChange(!afterGsi)}
        type="button"
      >
        <GitCompareArrows size={17} />
        <span>{afterGsi ? "After GSI + smart routing" : "Before baseline flood risk"}</span>
      </button>
    </div>
  );
}
