import { parseJsonArray } from '@/lib/api';

export type SpeciesAiProfile = {
  id: string;
  name: string;
  latinName: string;
  familyName: string;
  genusName: string;
  description: string;
  difficulty: number;
  light: string;
  watering: string;
  hardiness: string;
  blooming: string | null;
  originRegion: string | null;
  growthType: string | null;
  growthSpeed: string | null;
  summerDormancy: string | null;
  lightRequirement: string | null;
  idealTemperature: string | null;
  minTemperature: string | null;
  maxTemperature: string | null;
  humidity: string | null;
  soil: string | null;
  tips: string[];
  riskTips: string[];
  similarSpecies: Array<{ name: string; latinName: string; reason?: string | null }>;
};

export type SpeciesAiAnswer = {
  answer: string;
  source: 'gemini' | 'openrouter' | 'species_profile';
  model?: string;
  fallbackReason?: string;
};

export async function answerSpeciesQuestion(profile: SpeciesAiProfile, question: string): Promise<SpeciesAiAnswer> {
  const provider = (process.env.AI_PROVIDER || 'auto').toLowerCase();
  const errors: string[] = [];

  if (provider === 'local') {
    return {
      answer: buildRuleAnswer(profile, question),
      source: 'species_profile',
      fallbackReason: 'local provider selected',
    };
  }

  if ((provider === 'auto' || provider === 'gemini') && process.env.GEMINI_API_KEY) {
    const result = await askGemini(profile, question).catch((e) => {
      errors.push(`gemini: ${messageOf(e)}`);
      return null;
    });
    if (result) return result;
  }

  if ((provider === 'auto' || provider === 'openrouter') && process.env.OPENROUTER_API_KEY) {
    const result = await askOpenRouter(profile, question).catch((e) => {
      errors.push(`openrouter: ${messageOf(e)}`);
      return null;
    });
    if (result) return result;
  }

  return {
    answer: buildRuleAnswer(profile, question),
    source: 'species_profile',
    fallbackReason: errors.join('; ') || 'AI provider not configured',
  };
}

async function askGemini(profile: SpeciesAiProfile, question: string): Promise<SpeciesAiAnswer | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const model = process.env.GEMINI_MODEL || process.env.AI_SPECIES_MODEL || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt() }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: buildUserPrompt(profile, question) }],
        },
      ],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 700,
      },
    }),
    signal: AbortSignal.timeout(Number(process.env.AI_TIMEOUT_MS || 12000)),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await safeText(res)}`);
  const json = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const answer = json.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim();
  if (!answer) return null;
  return { answer, source: 'gemini', model };
}

async function askOpenRouter(profile: SpeciesAiProfile, question: string): Promise<SpeciesAiAnswer | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  const model = process.env.OPENROUTER_MODEL || 'openrouter/free';
  const prompt = buildUserPrompt(profile, question);
  const result = await askOpenRouterModel(apiKey, model, prompt);
  if (result) return result;
  if (model !== 'openrouter/free') {
    return askOpenRouterModel(apiKey, 'openrouter/free', prompt);
  }
  return null;
}

async function askOpenRouterModel(apiKey: string, model: string, prompt: string): Promise<SpeciesAiAnswer | null> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://plantcommunity.cn',
      'X-Title': 'Rouyou Species Assistant',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt() },
        { role: 'user', content: prompt },
      ],
      temperature: 0.35,
      max_tokens: 700,
    }),
    signal: AbortSignal.timeout(Number(process.env.AI_TIMEOUT_MS || 12000)),
  });
  if (!res.ok) {
    if (res.status === 404 && model !== 'openrouter/free') return null;
    throw new Error(`HTTP ${res.status}: ${await safeText(res)}`);
  }
  const json = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
  };
  const answer = json.choices?.[0]?.message?.content?.trim();
  if (!answer) return null;
  return { answer, source: 'openrouter', model: json.model || model };
}

function systemPrompt() {
  return [
    '你是肉友社的多肉植物图鉴助手，只回答多肉植物图鉴、养护、品种辨别、投稿资料相关问题。',
    '回答必须以用户当前品种资料为依据。资料不足时明确说“当前图鉴资料不足”，不要编造产地、花期、药剂剂量或医学/农药安全结论。',
    '中文回答，语气专业、简洁、可执行。优先给养护判断和下一步操作。',
    '不要输出 Markdown 表格。不要承诺一定救活植物。',
  ].join('\n');
}

function buildUserPrompt(profile: SpeciesAiProfile, question: string) {
  return [
    `用户问题：${question}`,
    '',
    '当前品种资料：',
    `中文名：${profile.name}`,
    `拉丁名：${profile.latinName}`,
    `科属：${profile.familyName} / ${profile.genusName}`,
    `描述：${profile.description}`,
    `难度：${profile.difficulty}/5`,
    `光照：${profile.lightRequirement || profile.light || '资料待补充'}`,
    `浇水：${profile.watering || '资料待补充'}`,
    `耐寒/最低温：${profile.minTemperature || profile.hardiness || '资料待补充'}`,
    `最高温：${profile.maxTemperature || '资料待补充'}`,
    `适宜温度：${profile.idealTemperature || '资料待补充'}`,
    `湿度：${profile.humidity || '资料待补充'}`,
    `配土：${profile.soil || '资料待补充'}`,
    `生长型：${profile.growthType || '资料待补充'}`,
    `生长速度：${profile.growthSpeed || '资料待补充'}`,
    `夏眠：${profile.summerDormancy || '资料待补充'}`,
    `原产地：${profile.originRegion || '资料待补充'}`,
    `花期：${profile.blooming || '资料待补充'}`,
    `养护经验：${profile.tips.slice(0, 5).join('；') || '暂无'}`,
    `风险提示：${profile.riskTips.slice(0, 5).join('；') || '暂无'}`,
    `相似品种：${profile.similarSpecies.map((item) => `${item.name}(${item.latinName})${item.reason ? `：${item.reason}` : ''}`).join('；') || '暂无'}`,
    '',
    '请给出直接回答。若问题涉及病害，请先给排查步骤，再给低风险处理建议。',
  ].join('\n');
}

export function makeSpeciesAiProfile(
  species: {
    id: string;
    name: string;
    latinName: string;
    description: string;
    difficulty: number;
    light: string;
    watering: string;
    hardiness: string;
    tips: string;
    riskTips: string | null;
    blooming: string | null;
    originRegion: string | null;
    growthType: string | null;
    growthSpeed: string | null;
    summerDormancy: string | null;
    lightRequirement: string | null;
    idealTemperature: string | null;
    minTemperature: string | null;
    maxTemperature: string | null;
    humidity: string | null;
    soil: string | null;
    genus: { name: string; board: { name: string } | null };
  },
  similarSpecies: SpeciesAiProfile['similarSpecies'],
): SpeciesAiProfile {
  return {
    id: species.id,
    name: species.name,
    latinName: species.latinName,
    familyName: species.genus.board?.name ?? '',
    genusName: species.genus.name,
    description: species.description,
    difficulty: species.difficulty,
    light: species.light,
    watering: species.watering,
    hardiness: species.hardiness,
    blooming: species.blooming,
    originRegion: species.originRegion,
    growthType: species.growthType,
    growthSpeed: species.growthSpeed,
    summerDormancy: species.summerDormancy,
    lightRequirement: species.lightRequirement,
    idealTemperature: species.idealTemperature,
    minTemperature: species.minTemperature,
    maxTemperature: species.maxTemperature,
    humidity: species.humidity,
    soil: species.soil,
    tips: parseJsonArray(species.tips),
    riskTips: parseJsonArray(species.riskTips),
    similarSpecies,
  };
}

function buildRuleAnswer(profile: SpeciesAiProfile, question: string) {
  const q = question.toLowerCase();
  const light = profile.lightRequirement || profile.light || '充足散射光';
  const watering = profile.watering || '干透浇透';
  const temp = profile.idealTemperature || '15-28°C';
  const minTemp = profile.minTemperature || profile.hardiness || '5°C';
  const maxTemp = profile.maxTemperature || '35°C';
  const humidity = profile.humidity || '20%-60%';
  const soil = profile.soil || (profile.difficulty >= 4 ? '高颗粒配土' : '颗粒土 70% 左右');
  const dormancy = profile.summerDormancy || (/冬型|夏眠/.test(profile.growthType ?? '') ? '夏季休眠明显' : '夏眠不明显');
  const prefix = `${profile.name}（${profile.latinName}）`;

  if (/夏|高温|度夏|休眠/.test(q)) {
    return `${prefix} 夏季重点是通风、遮阴和控水。当前资料建议光照为「${light}」，最高温度参考「${maxTemp}」，夏眠状态为「${dormancy}」。温度持续偏高时减少浇水频率，只在盆土完全干透且夜间降温后少量补水。${profile.riskTips[0] ? `风险提示：${profile.riskTips[0]}` : ''}`;
  }
  if (/水|浇|烂根|黑腐/.test(q)) {
    return `${prefix} 的浇水策略建议按「${watering}」执行。配土建议为「${soil}」，湿度参考「${humidity}」。如果叶片发软但盆土仍潮，不要补水，先加强通风并检查根系状态。${profile.riskTips.length ? `常见风险：${profile.riskTips.slice(0, 2).join('；')}` : ''}`;
  }
  if (/光|晒|发红|徒长|颜色/.test(q)) {
    return `${prefix} 的光照需求是「${light}」。叶尖发红通常和温差、日照增强、轻微控水有关；如果同时出现徒长、叶距拉长，则说明光照不足，需要逐步增加光照，避免突然暴晒。`;
  }
  if (/爆盆|繁殖|生长/.test(q)) {
    return `${prefix} 生长速度记录为「${profile.growthSpeed || '中等'}」，适宜温度为「${temp}」。想促进生长，优先保证根系健康、光照稳定和生长期正常浇水；不要靠频繁浇水催生长。${profile.tips[0] ? `可参考经验：${profile.tips[0]}` : ''}`;
  }
  if (/相似|区别|像/.test(q)) {
    const similar = profile.similarSpecies.slice(0, 3).map((item) => item.name).join('、') || '页面下方推荐品种';
    return `${prefix} 属于 ${profile.familyName} / ${profile.genusName}。区分相似品种时优先看叶形、株型、刺座或窗面纹理，再结合花色和生长习性；当前可对比：${similar}。`;
  }
  return `${prefix} 的基础养护建议：光照「${light}」，浇水「${watering}」，适宜温度「${temp}」，最低温度参考「${minTemp}」，配土「${soil}」。${profile.tips[0] ? `补充经验：${profile.tips[0]}` : '更具体的问题可以围绕浇水、度夏、光照、繁殖或相似品种继续问。'}`;
}

async function safeText(res: Response) {
  return (await res.text().catch(() => '')).slice(0, 500);
}

function messageOf(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}
