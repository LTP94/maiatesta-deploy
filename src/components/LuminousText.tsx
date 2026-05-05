type LuminousTextProps = {
  text: string;
  phrases: string[];
  accentClassName?: string;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function LuminousText({
  text,
  phrases,
  accentClassName = 'luminous-accent',
}: LuminousTextProps) {
  const uniquePhrases = [...new Set(phrases.filter(Boolean))].sort(
    (left, right) => right.length - left.length,
  );

  if (uniquePhrases.length === 0) {
    return text;
  }

  const matcher = new RegExp(
    `(${uniquePhrases.map((phrase) => escapeRegExp(phrase)).join('|')})`,
    'gi',
  );
  const segments = text.split(matcher);

  return segments.map((segment, index) => {
    const isAccent = uniquePhrases.some(
      (phrase) => phrase.toLowerCase() === segment.toLowerCase(),
    );

    if (!segment) {
      return null;
    }

    return isAccent ? (
      <span className={accentClassName} key={`${segment}-${index}`}>
        {segment}
      </span>
    ) : (
      <span key={`${segment}-${index}`}>{segment}</span>
    );
  });
}