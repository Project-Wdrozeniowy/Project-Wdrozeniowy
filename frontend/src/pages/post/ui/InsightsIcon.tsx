interface InsightsIconProps {
  name: string;
  className?: string;
}

/** Exact local assets exported from the approved Figma cards. */
export default function InsightsIcon({ name, className = '' }: InsightsIconProps) {
  return (
    <img
      alt=""
      aria-hidden="true"
      className={`insights-icon ${className}`}
      src={`/images/post-insights/${name}.svg`}
    />
  );
}
