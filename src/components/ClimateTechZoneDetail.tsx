import ClimateTechPlatformApp from "../climateTechPlatform/app/App";

type ClimateTechZoneDetailProps = {
  onClose: () => void;
  [key: string]: unknown;
};

export function ClimateTechZoneDetail({ onClose }: ClimateTechZoneDetailProps) {
  return (
    <section className="climate-tech-detail-host" aria-label="Climate-Tech zone detail">
      <ClimateTechPlatformApp onNavigateToMap={onClose} />
      <button className="climate-tech-detail-close" onClick={onClose} type="button">
        Close
      </button>
    </section>
  );
}
