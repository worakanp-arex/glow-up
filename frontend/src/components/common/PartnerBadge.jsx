import { useState } from "react";
import "./PartnerBadge.css";

function PartnerBadge({ partner, size = "md" }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className={`partner-badge partner-badge-${size}`}>
      {!imageFailed ? (
        <img
          src={partner.logo}
          alt={partner.name}
          onError={() => setImageFailed(true)}
          className="partner-badge-image"
        />
      ) : (
        <span className="partner-badge-fallback" aria-hidden="true">
          {partner.initials}
        </span>
      )}
    </div>
  );
}

export default PartnerBadge;
