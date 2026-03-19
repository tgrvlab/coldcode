export const python = {
  keywords: /\b(def|class|if|elif|else|for|while|try|except|finally|with|as|import|from|return|yield|break|continue|pass|raise|in|is|not|and|or|lambda|async|await|global|nonlocal|del|assert)\b/g,
  string: /(\".*?\"|'.*?'|\"\"\".*?\"\"\"|'''.*?''')/g,
  comment: /(#.*)/g,
  number: /\b\d+(\.\d+)?\b/g,
  operator: /([+\-*/%=<>!&|^~?:]+)/g
};
