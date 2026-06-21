type BadgeKind = 'TOP' | 'NUEVO' | 'PREMIUM' | 'BAJO' | 'AGOTADO';

const styles: Record<BadgeKind, string> = {
  TOP:     'badge badge-TOP',
  NUEVO:   'badge badge-NUEVO',
  PREMIUM: 'badge badge-PREMIUM',
  BAJO:    'badge badge-BAJO',
  AGOTADO: 'badge badge-AGOTADO',
};

export function Badge({ kind }: { kind?: string | null }) {
  if (!kind) return null;
  return <span className={styles[kind as BadgeKind] ?? 'badge badge-TOP'}>{kind}</span>;
}
