import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';

function deriveLight(src: string): string {
  return src.replace(/\.png$/, '-light.png');
}

export function GuideCard({
  title,
  description,
  to,
  image,
}: {
  title: string;
  description: string;
  to: string;
  image?: string;
}) {
  const darkSrc = useBaseUrl(image ?? '');
  const lightSrc = useBaseUrl(image ? deriveLight(image) : '');
  return (
    <Link to={to} className="guide-card">
      {image && (
        <>
          <img src={darkSrc} alt={title} className="guide-card__image guide-card__image--dark" />
          <img src={lightSrc} alt={title} className="guide-card__image guide-card__image--light" />
        </>
      )}
      <div className="guide-card__body">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </Link>
  );
}

export function GuideSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="guide-section">
      <h2>{title}</h2>
      <div className="guide-grid">{children}</div>
    </div>
  );
}
