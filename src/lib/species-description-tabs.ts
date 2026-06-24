export const DEFAULT_SPECIES_DESCRIPTION_TAB_TITLES = ['品种简介', '形态特征', '养护建议'] as const;

export interface SpeciesDescriptionTabInput {
  id?: string;
  title?: string;
  contentJson?: unknown;
  contentHtml?: string;
  contentText?: string;
}

export interface SpeciesDescriptionTab {
  id: string;
  title: string;
  contentJson?: unknown;
  contentHtml?: string;
  contentText?: string;
}

export interface LegacySpeciesDescription {
  description?: string | null;
  descriptionJson?: unknown;
  descriptionText?: string | null;
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function hasContent(tab: SpeciesDescriptionTabInput): boolean {
  return Boolean(
    tab.contentJson ||
    tab.contentHtml?.trim() ||
    tab.contentText?.trim()
  );
}

function normalizeTab(tab: SpeciesDescriptionTabInput, index: number): SpeciesDescriptionTab {
  const defaultTitle = DEFAULT_SPECIES_DESCRIPTION_TAB_TITLES[index] ?? `栏目 ${index + 1}`;
  return {
    id: tab.id?.trim() || `tab-${index + 1}`,
    title: tab.title?.trim() || defaultTitle,
    contentJson: parseMaybeJson(tab.contentJson),
    contentHtml: tab.contentHtml,
    contentText: tab.contentText,
  };
}

export function parseSpeciesDescriptionTabs(value: unknown): SpeciesDescriptionTab[] | null {
  const parsed = parseMaybeJson(value);
  if (!Array.isArray(parsed)) return null;
  return parsed
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      return normalizeTab(item as SpeciesDescriptionTabInput, index);
    })
    .filter((item): item is SpeciesDescriptionTab => Boolean(item));
}

export function defaultSpeciesDescriptionTabs(legacy?: LegacySpeciesDescription): SpeciesDescriptionTab[] {
  const legacyJson = parseMaybeJson(legacy?.descriptionJson);
  return DEFAULT_SPECIES_DESCRIPTION_TAB_TITLES.map((title, index) => ({
    id: `default-${index + 1}`,
    title,
    contentJson: index === 0 ? legacyJson : undefined,
    contentHtml: index === 0 ? legacy?.description ?? undefined : undefined,
    contentText: index === 0 ? legacy?.descriptionText ?? undefined : undefined,
  }));
}

export function getSpeciesDescriptionTabs(
  value: unknown,
  legacy?: LegacySpeciesDescription
): SpeciesDescriptionTab[] {
  const tabs = parseSpeciesDescriptionTabs(value);
  if (tabs) return tabs;
  return defaultSpeciesDescriptionTabs(legacy);
}

export function compactSpeciesDescriptionTabs(tabs: SpeciesDescriptionTabInput[]): SpeciesDescriptionTabInput[] {
  return tabs.map((tab, index) => {
    const normalized = normalizeTab(tab, index);
    return {
      id: normalized.id,
      title: normalized.title,
      contentJson: normalized.contentJson,
      contentHtml: normalized.contentHtml,
      contentText: normalized.contentText,
    };
  });
}

export function tabHasDescriptionContent(tab: SpeciesDescriptionTabInput): boolean {
  return hasContent(tab);
}
