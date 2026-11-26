import { STORAGE_ITEMS } from './consentBanner.const';
export default function ConsentDetails() {
  return (
    <div className="storage-necessary">
      {STORAGE_ITEMS.map((item) => (
        <div className="storage-entry" key={item.id}>
          <div className="storage-entry-head">
            <span>{item.name}</span>
            <span className="storage-badge">Always active</span>
          </div>
          <p>{item.purpose}</p>
        </div>
      ))}
    </div>
  );
}
