import TLink from '@/components/ui/TLink';

export default function NotFound() {
  return (
    <section
      style={{
        minHeight: '100svh',
        display: 'grid',
        placeContent: 'center',
        textAlign: 'center',
        gap: 28,
        padding: 'var(--gutter)',
      }}
    >
      <p className="mono faint">Erreur 404 — salle introuvable</p>
      <h1 className="display" style={{ fontSize: 'clamp(72px, 14vw, 220px)' }}>
        Cette salle <span className="italic">n&apos;existe pas</span>
      </h1>
      <p className="dim" style={{ maxWidth: '44ch', margin: '0 auto' }}>
        L&apos;œuvre a peut-être été décrochée, ou elle n&apos;a jamais été accrochée qu&apos;en rêve.
      </p>
      <TLink href="/" label="Le Mur" className="mono u-link" style={{ justifySelf: 'center' }}>
        Revenir au Mur →
      </TLink>
    </section>
  );
}
