// Small, safe markdown renderer. Escapes HTML first, so model output cannot inject markup.
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function inline(text) {
  let t = esc(text);
  t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/(^|[^*\w])\*([^*\s][^*]*)\*(?!\w)/g, "$1<em>$2</em>");
  return t;
}

function renderText(src) {
  const out = [];
  let list = null; // "ul" | "ol"
  let para = [];

  const flushPara = () => {
    if (para.length) out.push(`<p>${para.map(inline).join("<br>")}</p>`);
    para = [];
  };
  const closeList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };

  for (const line of src.split("\n")) {
    let m;
    if (!line.trim()) {
      flushPara();
      closeList();
    } else if ((m = line.match(/^\s{0,3}(#{1,4})\s+(.*)$/))) {
      flushPara();
      closeList();
      out.push(`<h4>${inline(m[2])}</h4>`);
    } else if ((m = line.match(/^\s*[-*]\s+(.*)$/))) {
      flushPara();
      if (list !== "ul") {
        closeList();
        out.push("<ul>");
        list = "ul";
      }
      out.push(`<li>${inline(m[1])}</li>`);
    } else if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
      flushPara();
      if (list !== "ol") {
        closeList();
        out.push("<ol>");
        list = "ol";
      }
      out.push(`<li>${inline(m[1])}</li>`);
    } else {
      closeList();
      para.push(line);
    }
  }
  flushPara();
  closeList();
  return out.join("");
}

export function renderMarkdown(src) {
  // Odd-numbered chunks are fenced code. An unclosed fence (mid-stream) still renders as code.
  return src
    .split("```")
    .map((chunk, i) => {
      if (i % 2 === 0) return renderText(chunk);
      const code = chunk.replace(/^[^\n]*\n/, ""); // drop the language tag line
      return `<pre><code>${esc(code.replace(/\n$/, ""))}</code></pre>`;
    })
    .join("");
}
