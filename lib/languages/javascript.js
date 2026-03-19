export const javascript = {
  // Comments first
  comment: /\/\/.*|\/\*[\s\S]*?\*\//g,
  
  // Strings
  string: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g,

  // JSX Tags: More robust tag name detection
  tag: /<\/?[a-zA-Z][\w.:-]*/g,

  // JSX Attributes
  attribute: /\b[\w-]+(?=\s*=)/g,
  
  // Keywords
  keywords: /\b(import|export|const|let|var|function|return|if|else|for|while|package|type|class|interface|public|private|new|try|catch|finally|throw|async|await|default|break|continue|case|switch|yield|static|get|set|from|as|in|of|instanceof|typeof|void|delete|do|extends|implements|enum|this|super|null|undefined|true|false|useState|useEffect|useMemo|useCallback|useRef|useContext|useReducer|useLayoutEffect|useId|useTransition|useDeferredValue)\b/g,
  
  // Numbers
  number: /\b\d+(\.\d+)?\b/g,
  
  // Operators
  operator: /=>|\.\.\.|[+\-*/%=<>!&|^~?:]+/g
};
