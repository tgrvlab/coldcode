export const rust = {
  keywords: /\b(fn|let|mut|pub|use|mod|struct|enum|impl|trait|for|in|while|loop|if|else|match|return|break|continue|type|where|unsafe|extern|async|await|dyn|move|ref|self|Self|static|const|crate|super|as)\b/g,
  string: /(\".*?\"|'.*?'|b\".*?\"|br\".*?\")/g,
  comment: /(\/\/.*|\/\*[\s\S]*?\*\/)/g,
  number: /\b\d+(\.\d+)?(u8|u16|u32|u64|u128|usize|i8|i16|i32|i64|i128|isize|f32|f64)?\b/g,
  operator: /([+\-*/%=<>!&|^~?:]+)/g
};
