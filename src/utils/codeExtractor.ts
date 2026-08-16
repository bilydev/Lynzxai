export interface TextPart {
  type: 'text';
  content: string;
}

export interface CodePart {
  type: 'code';
  language: string;
  code: string;
  id: string;
}

export type MessagePart = TextPart | CodePart;

export interface ParsedAiMessage {
  parts: MessagePart[];
  hasWebCode: boolean;
  combinedPreviewHtml: string | null;
}

/**
 * Parses raw AI response string into sequential text and code segments.
 * Combines HTML, CSS, and JS blocks for live web preview.
 */
export function parseAiMessage(text: string, msgId: string): ParsedAiMessage {
  if (!text) return { parts: [], hasWebCode: false, combinedPreviewHtml: null };

  const regex = /```([a-zA-Z0-9_+#\-\s]*)\n?([\s\S]*?)```/gi;
  const parts: MessagePart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  let htmlCode = '';
  let cssCode = '';
  let jsCode = '';
  let codeCount = 0;

  while ((match = regex.exec(text)) !== null) {
    // Text paragraph before this code block
    const prevText = text.substring(lastIndex, match.index);
    if (prevText.trim()) {
      parts.push({ type: 'text', content: prevText });
    }

    const langRaw = (match[1] || 'code').trim().toLowerCase();
    const codeContent = match[2].trim();
    codeCount++;

    const codeId = `${msgId}_code_${codeCount}`;

    parts.push({
      type: 'code',
      language: langRaw || 'code',
      code: codeContent,
      id: codeId
    });

    // Collect web code for live web preview
    if (langRaw === 'html' || langRaw === 'htm') {
      htmlCode += (htmlCode ? '\n' : '') + codeContent;
    } else if (langRaw === 'css') {
      cssCode += (cssCode ? '\n' : '') + codeContent;
    } else if (langRaw === 'js' || langRaw === 'javascript' || langRaw === 'ts' || langRaw === 'jsx') {
      jsCode += (jsCode ? '\n' : '') + codeContent;
    }

    lastIndex = match.index + match[0].length;
  }

  // Text paragraph after the last code block
  const remainingText = text.substring(lastIndex);
  if (remainingText.trim()) {
    parts.push({ type: 'text', content: remainingText });
  }

  // Fallback: If no backtick code block but contains raw HTML
  if (parts.length === 0) {
    if (
      text.includes('<html') ||
      text.includes('<!DOCTYPE') ||
      text.includes('<div') ||
      text.includes('<script') ||
      text.includes('<style')
    ) {
      parts.push({ type: 'code', language: 'html', code: text, id: `${msgId}_code_1` });
      htmlCode = text;
    } else {
      parts.push({ type: 'text', content: text });
    }
  }

  // Build combinedPreviewHtml ONLY for Web Code (HTML, CSS, JS)
  let combinedPreviewHtml: string | null = null;
  if (htmlCode || (cssCode && jsCode)) {
    let doc = htmlCode || '<div style="padding:20px; font-family:sans-serif;">Web Preview</div>';
    
    // Inject CSS if separate
    if (cssCode && !doc.includes(cssCode)) {
      if (doc.includes('</head>')) {
        doc = doc.replace('</head>', `<style>\n${cssCode}\n</style>\n</head>`);
      } else {
        doc = `<style>\n${cssCode}\n</style>\n` + doc;
      }
    }

    // Inject JS if separate
    if (jsCode && !doc.includes(jsCode)) {
      if (doc.includes('</body>')) {
        doc = doc.replace('</body>', `<script>\n${jsCode}\n</script>\n</body>`);
      } else {
        doc = doc + `\n<script>\n${jsCode}\n</script>`;
      }
    }

    combinedPreviewHtml = doc;
  }

  return {
    parts,
    hasWebCode: !!combinedPreviewHtml,
    combinedPreviewHtml
  };
}
