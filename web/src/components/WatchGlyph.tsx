const tones: Record<string, { bg: string; fg: string }> = {
  ivory: { bg: '#E8E4DA', fg: '#183029' },
  green: { bg: '#D8E1DB', fg: '#183029' },
  dark:  { bg: '#1A1F1D', fg: '#E75300' },
};

export function WatchGlyph({ tone = 'ivory', size = 120 }: { tone?: string; size?: number }) {
  const { bg, fg } = tones[tone] ?? tones.ivory;
  const icon = 48;
  return (
    <div
      className="w-full flex items-center justify-center rounded-t-card"
      style={{ height: size, background: bg }}
    >
      <svg width={icon} height={icon} viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="14" stroke={fg} strokeWidth="2.2" />
        <path d="M24 16v8l5.5 3" stroke={fg} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M18 10h12M18 38h12" stroke={fg} strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}
