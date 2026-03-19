export const html = {
  keywords: /\b(doctype|html|head|title|meta|link|style|script|body|section|article|nav|aside|header|footer|h1|h2|h3|h4|h5|h6|p|div|span|ul|ol|li|a|img|video|audio|canvas|svg|form|input|button|label|select|textarea|table|thead|tbody|tfoot|tr|th|td|main|details|summary|figure|figcaption|blockquote|pre|code|em|strong|br|hr)\b/g,
  string: /(\".*?\"|'.*?')/g,
  comment: /(<!--[\s\S]*?-->)/g,
  tag: /(<\/?[a-zA-Z][\w.:-]*|>)/g,
  attribute: /\b([a-zA-Z0-9\-]+)(?==)/g,
  number: /\b\d+(\.\d+)?(px|%|rem|em|vh|vw)?\b/g,
  operator: /([=])/g
};
