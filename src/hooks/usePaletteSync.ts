// Single brand identity — the multi-palette switcher (tropical/sunset/sand,
// plus the 'current' easter-egg state) has been retired. 'atlantic' is kept
// as the sole value so every existing `data-palette='atlantic'` call site
// across the codebase keeps working unchanged.
export type PaletteName = 'atlantic';
