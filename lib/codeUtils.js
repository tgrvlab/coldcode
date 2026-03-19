import React from 'react'
import { RiJavascriptFill, RiReactjsFill, RiCommandLine, RiTerminalLine } from 'react-icons/ri'
import { SiTypescript, SiGo, SiRust, SiPython, SiCplusplus, SiHtml5 } from 'react-icons/si'
import { FaCss } from 'react-icons/fa6'
import { languages } from './languages';

export const getLangInfo = (filename) => {
  const ext = filename?.split('.').pop().toLowerCase() || 'js';
  const map = {
    'tsx': { label: 'TSX', icon: <RiReactjsFill className="text-[#61DAFB]" size={14} /> },
    'jsx': { label: 'JSX', icon: <RiReactjsFill className="text-[#61DAFB]" size={14} /> },
    'js': { label: 'JS', icon: <RiJavascriptFill className="text-[#F7DF1E]" size={14} /> },
    'javascript': { label: 'JS', icon: <RiJavascriptFill className="text-[#F7DF1E]" size={14} /> },
    'ts': { label: 'TS', icon: <SiTypescript className="text-[#3178C6]" size={12} /> },
    'typescript': { label: 'TS', icon: <SiTypescript className="text-[#3178C6]" size={12} /> },
    'go': { label: 'Go', icon: <SiGo className="text-[#00ADD8]" size={14} /> },
    'rs': { label: 'Rust', icon: <SiRust className="text-[#f27933]" size={14} /> },
    'rust': { label: 'Rust', icon: <SiRust className="text-[#f27933]" size={14} /> },
    'py': { label: 'Py', icon: <SiPython className="text-[#3776AB]" size={14} /> },
    'python': { label: 'Py', icon: <SiPython className="text-[#3776AB]" size={14} /> },
    'cpp': { label: 'C++', icon: <SiCplusplus className="text-[#00599C]" size={14} /> },
    'html': { label: 'HTML', icon: <SiHtml5 className="text-[#E34F26]" size={14} /> },
    'css': { label: 'CSS', icon: <FaCss className="text-[#8226e4]" size={14} /> },
  };
  return map[ext] || { label: 'Code', icon: <RiCommandLine size={14} /> };
};

export const getThemeStyles = (themeId) => {
  const themes = {
    'red': { 
      keyword: 'var(--accent)', 
      tag: '#22d3ee', // Cyan for tags
      attribute: '#fda4af', // Coral for attributes
      string: '#ec4899', 
      comment: 'var(--muted)', 
      text: 'var(--foreground)', 
      bg: 'var(--snippet-bg)', 
      number: '#f59e0b', 
      operator: '#6366f1', 
      currentLine: 'var(--card-hover)', 
      lineNum: 'var(--snippet-line)' 
    },
    'vscode': { keyword: '#569cd6', tag: '#4ec9b0', attribute: '#9cdcfe', string: '#ce9178', comment: '#6a9955', text: '#d4d4d4', bg: '#1e1e1e', number: '#b5cea8', operator: '#d4d4d4', currentLine: '#2a2a2a', lineNum: '#5a5a5a' },
    'github': { keyword: '#ff7b72', tag: '#7ee787', attribute: '#d2a8ff', string: '#a5d6ff', comment: '#8b949e', text: '#c9d1d9', bg: '#0d1117', number: '#79c0ff', operator: '#ff7b72', currentLine: '#161b22', lineNum: '#30363d' },
    'vercel': { keyword: '#ffffff', tag: '#ffffff', attribute: '#666666', string: '#00dfd8', comment: '#333333', text: '#ffffff', bg: '#000000', number: '#ff0080', operator: '#0070f3', currentLine: '#111', lineNum: '#222' },
  };

  const t = themes[themeId?.toLowerCase().includes('red') ? 'red' : themeId?.toLowerCase()] || themes.red;

  return {
    '--snippet-bg': t.bg,
    '--snippet-keyword': t.keyword,
    '--snippet-tag': t.tag,
    '--snippet-attribute': t.attribute,
    '--snippet-string': t.string,
    '--snippet-comment': t.comment,
    '--snippet-text': t.text,
    '--snippet-number': t.number,
    '--snippet-operator': t.operator,
    '--snippet-line': t.lineNum,
  };
};

export const highlightCode = (content, filenameOrLang = 'js') => {
  if (typeof content !== 'string') return content;

  const ext = filenameOrLang.includes('.') ? filenameOrLang.split('.').pop().toLowerCase() : filenameOrLang;
  const lang = languages[ext] || languages.js;

  const cleanSource = (regex) => regex ? regex.source.replace(/\((?!\?)/g, '(?:') : '';
  const partsRegex = [
    cleanSource(lang.comment),
    cleanSource(lang.string),
    cleanSource(lang.tag),
    cleanSource(lang.attribute),
    cleanSource(lang.keywords),
    cleanSource(lang.number),
    cleanSource(lang.operator)
  ].filter(Boolean).join('|');

  const combinedRegex = new RegExp(`(${partsRegex})`, 'g');
  
  const parts = content.split(combinedRegex);

  return (
    <div className="whitespace-pre-wrap wrap-break-word">
      {parts.map((part, i) => {
        if (!part) return null;
        
        if (lang.comment && (lang.comment.lastIndex = 0, lang.comment.test(part))) 
          return <span key={i} className="text-(--snippet-comment)">{part}</span>;
        
        if (lang.string && (lang.string.lastIndex = 0, lang.string.test(part))) 
          return <span key={i} className="text-(--snippet-string)">{part}</span>;

        if (lang.tag && (lang.tag.lastIndex = 0, lang.tag.test(part))) 
          return <span key={i} className="text-(--snippet-tag)">{part}</span>;

        if (lang.attribute && (lang.attribute.lastIndex = 0, lang.attribute.test(part))) 
          return <span key={i} className="text-(--snippet-attribute) italic">{part}</span>;
        
        if (lang.keywords && (lang.keywords.lastIndex = 0, lang.keywords.test(part))) 
          return <span key={i} className="text-(--snippet-keyword)">{part}</span>;

        if (lang.number && (lang.number.lastIndex = 0, lang.number.test(part))) 
          return <span key={i} className="text-(--snippet-number)">{part}</span>;

        if (lang.operator && (lang.operator.lastIndex = 0, lang.operator.test(part))) 
          return <span key={i} className="text-(--snippet-operator)">{part}</span>;

        return <span key={i} className="text-(--snippet-text)">{part}</span>;
      })}
    </div>
  );
};

let providersRegistered = false;

export const configureMonaco = (monaco) => {
  // Configure TypeScript/JavaScript to support JSX
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.Latest,
    allowNonTsExtensions: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.languages.typescript.ModuleKind.CommonJS,
    noEmit: true,
    jsx: monaco.languages.typescript.JsxEmit.React,
    reactNamespace: 'React',
    allowJs: true,
    typeRoots: ['node_modules/@types']
  });

  monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.Latest,
    allowNonTsExtensions: true,
    jsx: monaco.languages.typescript.JsxEmit.React,
    allowJs: true
  });

  // Define custom themes for Monaco to match our App Styles
  monaco.editor.defineTheme('cold-red', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'ff4655' },
      { token: 'tag', foreground: '22d3ee' },
      { token: 'tag.js', foreground: '22d3ee' },
      { token: 'tag.tsx', foreground: '22d3ee' },
      { token: 'tag.identifier', foreground: '22d3ee' },
      { token: 'identifier.tag', foreground: '22d3ee' },
      { token: 'tag.bracket', foreground: '52525b' },
      { token: 'attribute.name', foreground: 'fda4af' },
      { token: 'attribute.name.js', foreground: 'fda4af' },
      { token: 'attribute.name.tsx', foreground: 'fda4af' },
      { token: 'attribute.value', foreground: 'ec4899' },
      { token: 'type', foreground: 'ff4655', fontStyle: 'italic' },
      { token: 'string', foreground: 'ec4899' },
      { token: 'function', foreground: 'ffffff' },
      { token: 'comment', foreground: '3f3f46' },
      { token: 'number', foreground: 'f59e0b' },
      { token: 'operator', foreground: '6366f1' },
      { token: 'delimiter', foreground: '52525b' },
      { token: 'delimiter.js', foreground: '52525b' },
      { token: 'delimiter.tag', foreground: '52525b' },
    ],
    colors: {
      'editor.background': '#020202',
      'editor.foreground': '#e1e1e1',
      'editorLineNumber.foreground': '#222222',
      'editor.lineHighlightBackground': '#111111',
    }
  });

  monaco.editor.defineTheme('vs-code', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '569cd6' },
      { token: 'tag', foreground: '4ec9b0' },
      { token: 'tag.js', foreground: '4ec9b0' },
      { token: 'tag.tsx', foreground: '4ec9b0' },
      { token: 'tag.identifier', foreground: '4ec9b0' },
      { token: 'identifier.tag', foreground: '4ec9b0' },
      { token: 'attribute.name', foreground: '9cdcfe' },
      { token: 'attribute.name.js', foreground: '9cdcfe' },
      { token: 'attribute.name.tsx', foreground: '9cdcfe' },
      { token: 'attribute.value', foreground: 'ce9178' },
      { token: 'type', foreground: '4ec9b0' },
      { token: 'function', foreground: 'dcdcaa' },
      { token: 'string', foreground: 'ce9178' },
      { token: 'comment', foreground: '6a9955' },
      { token: 'number', foreground: 'b5cea8' },
      { token: 'delimiter', foreground: '#808080' },
      { token: 'tag.bracket', foreground: '#808080' },
    ],
    colors: {
      'editor.background': '#1e1e1e',
      'editor.foreground': '#d4d4d4',
      'editorLineNumber.foreground': '#5a5a5a',
      'editor.lineHighlightBackground': '#2a2a2a',
    }
  });

  monaco.editor.defineTheme('github-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'ff7b72' },
      { token: 'tag', foreground: '7ee787' },
      { token: 'tag.js', foreground: '7ee787' },
      { token: 'tag.tsx', foreground: '7ee787' },
      { token: 'tag.identifier', foreground: '7ee787' },
      { token: 'identifier.tag', foreground: '7ee787' },
      { token: 'attribute.name', foreground: 'd2a8ff' },
      { token: 'attribute.name.js', foreground: 'd2a8ff' },
      { token: 'attribute.name.tsx', foreground: 'd2a8ff' },
      { token: 'attribute.value', foreground: 'a5d6ff' },
      { token: 'type', foreground: 'ff7b72' },
      { token: 'function', foreground: 'd2a8ff' },
      { token: 'string', foreground: 'a5d6ff' },
      { token: 'comment', foreground: '8b949e' },
      { token: 'delimiter', foreground: '#444c56' },
      { token: 'tag.bracket', foreground: '#444c56' },
    ],
    colors: {
      'editor.background': '#0d1117',
      'editor.foreground': '#c9d1d9',
      'editorLineNumber.foreground': '#30363d',
      'editor.lineHighlightBackground': '#161b22',
    }
  });

  monaco.editor.defineTheme('vercel-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'ffffff', fontStyle: 'bold' },
      { token: 'tag', foreground: 'ffffff' },
      { token: 'identifier.tag', foreground: 'ffffff' },
      { token: 'attribute.name', foreground: '#888888' },
      { token: 'attribute.value', foreground: '#00dfd8' },
      { token: 'type', foreground: 'ffffff' },
      { token: 'function', foreground: 'ffffff', fontStyle: 'bold' },
      { token: 'string', foreground: '00dfd8' },
      { token: 'comment', foreground: '#666666' },
      { token: 'number', foreground: 'ff0080' },
      { token: 'delimiter', foreground: '#333333' },
    ],
    colors: {
      'editor.background': '#000000',
      'editor.foreground': '#ffffff',
      'editorLineNumber.foreground': '#333333',
      'editor.lineHighlightBackground': '#111111',
    }
  });

  if (!providersRegistered) {
    const langKeywords = {
      python: ['def', 'class', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'with', 'as', 'import', 'from', 'return', 'yield', 'break', 'continue', 'pass', 'raise', 'in', 'is', 'not', 'and', 'or', 'lambda', 'async', 'await', 'global', 'nonlocal', 'del', 'assert', 'print', 'len', 'range', 'self', 'list', 'dict', 'set', 'str', 'int', 'float', 'bool'],
      rust: ['fn', 'let', 'mut', 'pub', 'use', 'mod', 'struct', 'enum', 'impl', 'trait', 'for', 'in', 'while', 'loop', 'if', 'else', 'match', 'return', 'break', 'continue', 'type', 'where', 'unsafe', 'extern', 'async', 'await', 'dyn', 'move', 'ref', 'self', 'Self', 'static', 'const', 'crate', 'super', 'as', 'match', 'Option', 'Result', 'Some', 'None', 'Ok', 'Err', 'println!', 'vec!', 'panic!'],
      go: ['package', 'import', 'func', 'type', 'struct', 'interface', 'var', 'const', 'if', 'else', 'switch', 'case', 'default', 'for', 'range', 'break', 'continue', 'return', 'goto', 'defer', 'go', 'select', 'chan', 'map', 'make', 'new', 'nil', 'true', 'false', 'fmt', 'Println', 'Printf'],
      cpp: ['int', 'float', 'double', 'char', 'bool', 'void', 'auto', 'const', 'static', 'extern', 'inline', 'virtual', 'override', 'final', 'class', 'struct', 'enum', 'union', 'namespace', 'using', 'public', 'protected', 'private', 'template', 'typename', 'this', 'new', 'delete', 'throw', 'try', 'catch', 'if', 'else', 'switch', 'case', 'default', 'for', 'while', 'do', 'break', 'continue', 'return', 'goto', 'sizeof', 'decltype', 'nullptr', 'static_assert', 'dynamic_cast', 'static_cast', 'reinterpret_cast', 'const_cast', 'main', 'std', 'vector', 'string', 'cout', 'cin', 'endl', '#include', '#define', '#ifdef', '#ifndef', '#endif']
    };

    Object.entries(langKeywords).forEach(([langId, keywords]) => {
      monaco.languages.registerCompletionItemProvider(langId, {
        provideCompletionItems: (model, position) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn
          };
          const suggestions = keywords.map(kw => ({
            label: kw,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: kw,
            range: range
          }));
          return { suggestions };
        }
      });
    });
    providersRegistered = true;
  }
};
