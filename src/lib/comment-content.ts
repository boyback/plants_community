export function buildCommentContentJson(text: string, imageUrls: string[]): unknown {
  const nodes: Array<Record<string, unknown>> = [];
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    nodes.push({
      type: 'paragraph',
      content: [{ type: 'text', text: line }],
    });
  }

  for (const url of imageUrls) {
    nodes.push({
      type: 'image',
      attrs: {
        src: url,
        alt: '',
        title: null,
      },
    });
  }

  return {
    type: 'doc',
    content: nodes.length > 0 ? nodes : [{ type: 'paragraph' }],
  };
}
