export const go = {
  keywords: /\b(package|import|func|type|struct|interface|var|const|if|else|switch|case|default|for|range|break|continue|return|goto|defer|go|select|chan|map|make|new|nil|true|false)\b/g,
  string: /(\".*?\"|'.*?'|`.*?`)/g,
  comment: /(\/\/.*|\/\*[\s\S]*?\*\/)/g,
  number: /\b\d+(\.\d+)?\b/g,
  operator: /([+\-*/%=<>!&|^~?:]+)/g
};
