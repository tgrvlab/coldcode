export const css = {
  keywords: /\b(import|media|keyframes|font-face|supports|charset|namespace|page|viewport|counter-style|document|font-feature-values|swash|ornaments|annotation|stylistic|styleset|character-variant|property|layer)\b/g,
  string: /(\".*?\"|'.*?'|url\s*\(.*?\))/g,
  comment: /(\/\*[\s\S]*?\*\/)/g,
  number: /\b\d+(\.\d+)?(px|%|rem|em|vh|vw|s|ms|deg|rad|turn|pt|pc|in|cm|mm|ex|ch|vmax|vmin|fr|dpi|dpcm|dppx)?\b/g,
  tag: /([.#][a-zA-Z][\w-]*)/g,
  operator: /([:{};,>+~])/g
};
