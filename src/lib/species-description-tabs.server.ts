import { processRichInput } from './richtext';
import {
  compactSpeciesDescriptionTabs,
  type LegacySpeciesDescription,
  type SpeciesDescriptionTab,
  type SpeciesDescriptionTabInput,
} from './species-description-tabs';

export interface StoredSpeciesDescriptionTabs {
  tabs: SpeciesDescriptionTab[];
  description: string;
  descriptionJson: string | null;
  descriptionText: string | null;
}

export function processSpeciesDescriptionTabs(
  input: SpeciesDescriptionTabInput[],
  legacy?: LegacySpeciesDescription
): StoredSpeciesDescriptionTabs {
  const tabs = compactSpeciesDescriptionTabs(input).map((tab, index) => {
    const stored = processRichInput({
      json: tab.contentJson,
      html: tab.contentHtml,
      text: tab.contentText,
      textMaxLen: 1200,
    });
    return {
      id: tab.id?.trim() || `tab-${index + 1}`,
      title: tab.title?.trim() || `栏目 ${index + 1}`,
      contentJson: stored.json ? JSON.parse(stored.json) : undefined,
      contentHtml: stored.html || '',
      contentText: stored.text || '',
    };
  });

  const firstContentTab = tabs.find((tab) => tab.contentHtml || tab.contentText || tab.contentJson);
  const fallback = processRichInput({
    json: legacy?.descriptionJson,
    html: legacy?.description ?? undefined,
    text: legacy?.descriptionText ?? undefined,
    textMaxLen: 1200,
  });
  const joinedText = tabs
    .map((tab) => tab.contentText?.trim())
    .filter(Boolean)
    .join(' ')
    .slice(0, 1200);

  return {
    tabs,
    description: firstContentTab?.contentHtml || fallback.html,
    descriptionJson: firstContentTab?.contentJson ? JSON.stringify(firstContentTab.contentJson) : (fallback.json || null),
    descriptionText: joinedText || fallback.text || null,
  };
}
