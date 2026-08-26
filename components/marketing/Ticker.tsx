import { Fragment } from 'react';
import { useTranslations } from 'next-intl';

export default function Ticker() {
  const t = useTranslations('ticker');
  const items = [t('item1'), t('item2'), t('item3'), t('item4'), t('item5'), t('item6'), t('item7'), t('item8')];
  // Doubled so the marquee's translateX(-50%) loop is seamless. Item and dot
  // stay separate sibling spans (not nested) — the CSS alternates color via
  // .ticker-track span:nth-child(odd), which depends on that flat structure.
  const doubled = [...items, ...items];

  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-track">
        {doubled.map((item, i) => (
          <Fragment key={i}>
            <span>{item}</span>
            <span>·</span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
