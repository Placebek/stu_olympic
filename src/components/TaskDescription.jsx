import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

// Нормализует LaTeX-строки от сервера (убирает лишние \\)
function normalizeLatex(str) {
  return str
    .replace(/\\\\([a-zA-Z{}\[\]()^_&|])/g, '\\$1')
    .replace(/\\\\/g, '\\\\');
}

// Рендерит одну строку с inline $...$ и **bold** и *italic*
function InlineLine({ text }) {
  // Разбиваем по $...$
  const parts = text.split(/(\$[^$]+?\$)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          return <InlineMath key={i} math={normalizeLatex(part.slice(1, -1))} />;
        }
        // Bold + Italic внутри текстовых частей
        const rich = part.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
        return (
          <span key={i}>
            {rich.map((r, j) => {
              if (r.startsWith('**') && r.endsWith('**')) return <strong key={j}>{r.slice(2, -2)}</strong>;
              if (r.startsWith('*') && r.endsWith('*')) return <em key={j}>{r.slice(1, -1)}</em>;
              if (r.startsWith('`') && r.endsWith('`')) return <code key={j} className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[13px] font-mono">{r.slice(1, -1)}</code>;
              return r;
            })}
          </span>
        );
      })}
    </>
  );
}

export default function TaskDescription({ text }) {
  if (!text) return <p className="italic text-slate-400">—</p>;

  const normalized = normalizeLatex(text);
  const lines = normalized.split('\n');

  const elements = [];
  let i = 0;
  let listBuffer = [];

  const flushList = () => {
    if (listBuffer.length === 0) return;
    elements.push(
      <ul key={`ul-${elements.length}`} className="my-3 space-y-1.5 pl-5">
        {listBuffer.map((item, idx) => (
          <li key={idx} className="flex gap-2 text-slate-700 text-[15px] leading-relaxed">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
            <span><InlineLine text={item} /></span>
          </li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Пустая строка
    if (!trimmed) {
      flushList();
      i++;
      continue;
    }

    // Block math $$...$$  (многострочный)
    if (trimmed === '$$' || trimmed.startsWith('$$') && !trimmed.endsWith('$$')) {
      flushList();
      let mathLines = [];
      if (trimmed === '$$') {
        i++;
        while (i < lines.length && lines[i].trim() !== '$$') {
          mathLines.push(lines[i]);
          i++;
        }
        i++; // skip closing $$
      } else {
        // однострочный $$ ... $$
        mathLines = [trimmed.slice(2, trimmed.lastIndexOf('$$'))];
        i++;
      }
      elements.push(
        <div key={`bmath-${elements.length}`} className="my-6 flex justify-center overflow-x-auto">
          <BlockMath math={mathLines.join('\n')} />
        </div>
      );
      continue;
    }

    // Inline $$ ... $$ на одной строке
    if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 4) {
      flushList();
      const math = trimmed.slice(2, -2).trim();
      elements.push(
        <div key={`bmath-${elements.length}`} className="my-6 flex justify-center overflow-x-auto">
          <BlockMath math={math} />
        </div>
      );
      i++;
      continue;
    }

    // Заголовки
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(<h3 key={i} className="text-base font-bold text-slate-800 mt-6 mb-2 tracking-tight"><InlineLine text={trimmed.slice(4)} /></h3>);
      i++; continue;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(<h2 key={i} className="text-lg font-bold text-indigo-700 mt-7 mb-2 tracking-tight"><InlineLine text={trimmed.slice(3)} /></h2>);
      i++; continue;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(<h1 key={i} className="text-xl font-bold text-slate-900 mt-8 mb-3 tracking-tight"><InlineLine text={trimmed.slice(2)} /></h1>);
      i++; continue;
    }

    // Списки - и *
    if (/^[-*]\s/.test(trimmed)) {
      listBuffer.push(trimmed.slice(2));
      i++; continue;
    }

    // Нумерованный список
    if (/^\d+\.\s/.test(trimmed)) {
      flushList();
      const match = trimmed.match(/^(\d+)\.\s(.*)$/);
      elements.push(
        <div key={i} className="flex gap-3 my-1.5 text-slate-700 text-[15px]">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center mt-0.5">{match[1]}</span>
          <span><InlineLine text={match[2]} /></span>
        </div>
      );
      i++; continue;
    }

    // Блок кода ```
    if (trimmed.startsWith('```')) {
      flushList();
      const lang = trimmed.slice(3).trim();
      i++;
      const codeLines = [];
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <div key={`code-${elements.length}`} className="my-4 rounded-xl overflow-hidden border border-indigo-100">
          {lang && <div className="bg-indigo-50 px-4 py-1.5 text-xs text-indigo-500 font-mono font-semibold border-b border-indigo-100">{lang}</div>}
          <pre className="bg-slate-900 text-slate-100 p-4 text-sm overflow-x-auto leading-relaxed font-mono">
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>
      );
      continue;
    }

    // Горизонтальная черта ---
    if (/^[-*_]{3,}$/.test(trimmed)) {
      flushList();
      elements.push(<hr key={i} className="my-5 border-slate-200" />);
      i++; continue;
    }

    // Обычный параграф
    flushList();
    elements.push(
      <p key={i} className="text-slate-700 text-[15px] leading-relaxed mb-2">
        <InlineLine text={trimmed} />
      </p>
    );
    i++;
  }

  flushList();

  return (
    <div className="space-y-0.5">
      {elements}
    </div>
  );
}