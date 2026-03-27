// src/components/TaskDescription.jsx
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

// ── Normalize LaTeX strings from server ──────────────────────────
function normalizeLatex(str) {
    return str
        .replace(/\\\\([a-zA-Z{}\[\]()^_&|])/g, "\\$1")
        .replace(/\\\\/g, "\\\\");
}

// ── Inline renderer: $math$, **bold**, *italic*, `code` ──────────
function InlineLine({ text }) {
    const parts = text.split(/(\$[^$]+?\$)/g);
    return (
        <>
            {parts.map((part, i) => {
                if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
                    return <InlineMath key={i} math={normalizeLatex(part.slice(1, -1))} />;
                }
                const rich = part.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
                return (
                    <span key={i}>
                        {rich.map((r, j) => {
                            if (r.startsWith("**") && r.endsWith("**"))
                                return <strong key={j}>{r.slice(2, -2)}</strong>;
                            if (r.startsWith("*") && r.endsWith("*"))
                                return <em key={j}>{r.slice(1, -1)}</em>;
                            if (r.startsWith("`") && r.endsWith("`"))
                                return (
                                    <code key={j} className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[13px] font-mono">
                                        {r.slice(1, -1)}
                                    </code>
                                );
                            return r;
                        })}
                    </span>
                );
            })}
        </>
    );
}

// ── Parse a cell: strip leading/trailing pipe-spaces, trim ───────
function parseCells(row) {
    return row
        .replace(/^\||\|$/g, "") // strip leading/trailing |
        .split("|")
        .map((c) => c.trim());
}

// ── Is this a separator row: |---|:---:|---:| etc. ───────────────
function isSeparatorRow(row) {
    return /^\|?[\s|:\-]+\|?$/.test(row) && /[-]/.test(row);
}

// ── Determine column alignment from separator row ─────────────────
function parseAlignments(sepRow) {
    return parseCells(sepRow).map((cell) => {
        if (cell.startsWith(":") && cell.endsWith(":")) return "center";
        if (cell.endsWith(":"))                          return "right";
        if (cell.startsWith(":"))                        return "left";
        return "left";
    });
}

// ── Table component ───────────────────────────────────────────────
function MdTable({ headers, alignments, rows }) {
    const alignClass = { left: "text-left", center: "text-center", right: "text-right" };
    return (
        <div className="my-5 overflow-x-auto rounded-2xl border border-indigo-100">
            <table className="w-full text-sm border-collapse">
                <thead>
                    <tr style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.06))" }}>
                        {headers.map((h, i) => (
                            <th
                                key={i}
                                className={`px-4 py-2.5 font-semibold text-indigo-700 whitespace-nowrap border-b border-indigo-100 ${alignClass[alignments[i] || "left"]}`}
                            >
                                <InlineLine text={h} />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, ri) => (
                        <tr
                            key={ri}
                            className="border-b border-slate-100 last:border-0 transition-colors hover:bg-indigo-50/30"
                            style={{ background: ri % 2 === 0 ? "rgba(255,255,255,0.6)" : "rgba(248,250,252,0.7)" }}
                        >
                            {row.map((cell, ci) => (
                                <td
                                    key={ci}
                                    className={`px-4 py-2 text-slate-700 ${alignClass[alignments[ci] || "left"]}`}
                                >
                                    <InlineLine text={cell} />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ── Main parser ───────────────────────────────────────────────────
export default function TaskDescription({ text }) {
    if (!text) return <p className="italic text-slate-400">—</p>;

    const normalized = normalizeLatex(text);
    const lines = normalized.split("\n");

    const elements = [];
    let i = 0;
    let listBuffer = [];

    const flushList = () => {
        if (!listBuffer.length) return;
        elements.push(
            <ul key={`ul-${elements.length}`} className="my-3 space-y-1.5 pl-5">
                {listBuffer.map((item, idx) => (
                    <li key={idx} className="flex gap-2 text-slate-700 text-[15px] leading-relaxed">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                        <span><InlineLine text={item} /></span>
                    </li>
                ))}
            </ul>,
        );
        listBuffer = [];
    };

    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        // ── empty line ──────────────────────────────────────────
        if (!trimmed) { flushList(); i++; continue; }

        // ── block math $$ (multiline) ───────────────────────────
        if (trimmed === "$$" || (trimmed.startsWith("$$") && !trimmed.endsWith("$$"))) {
            flushList();
            let mathLines = [];
            if (trimmed === "$$") {
                i++;
                while (i < lines.length && lines[i].trim() !== "$$") { mathLines.push(lines[i]); i++; }
                i++;
            } else {
                mathLines = [trimmed.slice(2, trimmed.lastIndexOf("$$"))];
                i++;
            }
            elements.push(
                <div key={`bmath-${elements.length}`} className="my-6 flex justify-center overflow-x-auto">
                    <BlockMath math={mathLines.join("\n")} />
                </div>,
            );
            continue;
        }

        // ── inline $$ ... $$ on one line ────────────────────────
        if (trimmed.startsWith("$$") && trimmed.endsWith("$$") && trimmed.length > 4) {
            flushList();
            elements.push(
                <div key={`bmath-${elements.length}`} className="my-6 flex justify-center overflow-x-auto">
                    <BlockMath math={trimmed.slice(2, -2).trim()} />
                </div>,
            );
            i++; continue;
        }

        // ── headings ────────────────────────────────────────────
        if (trimmed.startsWith("### ")) {
            flushList();
            elements.push(
                <h3 key={i} className="text-base font-bold text-slate-800 mt-6 mb-2 tracking-tight">
                    <InlineLine text={trimmed.slice(4)} />
                </h3>,
            );
            i++; continue;
        }
        if (trimmed.startsWith("## ")) {
            flushList();
            elements.push(
                <h2 key={i} className="text-lg font-bold text-indigo-700 mt-7 mb-2 tracking-tight">
                    <InlineLine text={trimmed.slice(3)} />
                </h2>,
            );
            i++; continue;
        }
        if (trimmed.startsWith("# ")) {
            flushList();
            elements.push(
                <h1 key={i} className="text-xl font-bold text-slate-900 mt-8 mb-3 tracking-tight">
                    <InlineLine text={trimmed.slice(2)} />
                </h1>,
            );
            i++; continue;
        }

        // ── markdown table ───────────────────────────────────────
        // Detect: current line is a pipe row, next line is a separator row
        if (
            trimmed.startsWith("|") &&
            i + 1 < lines.length &&
            isSeparatorRow(lines[i + 1].trim())
        ) {
            flushList();
            const headers    = parseCells(trimmed);
            const alignments = parseAlignments(lines[i + 1].trim());
            i += 2; // skip header + separator

            const rows = [];
            while (i < lines.length && lines[i].trim().startsWith("|")) {
                rows.push(parseCells(lines[i].trim()));
                i++;
            }

            elements.push(
                <MdTable
                    key={`table-${elements.length}`}
                    headers={headers}
                    alignments={alignments}
                    rows={rows}
                />,
            );
            continue;
        }

        // ── unordered list - and * ───────────────────────────────
        if (/^[-*]\s/.test(trimmed)) { listBuffer.push(trimmed.slice(2)); i++; continue; }

        // ── ordered list 1. 2. ──────────────────────────────────
        if (/^\d+\.\s/.test(trimmed)) {
            flushList();
            const match = trimmed.match(/^(\d+)\.\s(.*)$/);
            elements.push(
                <div key={i} className="flex gap-3 my-1.5 text-slate-700 text-[15px]">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center mt-0.5">
                        {match[1]}
                    </span>
                    <span><InlineLine text={match[2]} /></span>
                </div>,
            );
            i++; continue;
        }

        // ── fenced code block ``` ────────────────────────────────
        if (trimmed.startsWith("```")) {
            flushList();
            const lang = trimmed.slice(3).trim();
            i++;
            const codeLines = [];
            while (i < lines.length && !lines[i].trim().startsWith("```")) { codeLines.push(lines[i]); i++; }
            i++;
            elements.push(
                <div key={`code-${elements.length}`} className="my-4 rounded-xl overflow-hidden border border-indigo-100">
                    {lang && (
                        <div className="bg-indigo-50 px-4 py-1.5 text-xs text-indigo-500 font-mono font-semibold border-b border-indigo-100">
                            {lang}
                        </div>
                    )}
                    <pre className="bg-slate-900 text-slate-100 p-4 text-sm overflow-x-auto leading-relaxed font-mono">
                        <code>{codeLines.join("\n")}</code>
                    </pre>
                </div>,
            );
            continue;
        }

        // ── horizontal rule --- ──────────────────────────────────
        if (/^[-*_]{3,}$/.test(trimmed)) {
            flushList();
            elements.push(<hr key={i} className="my-5 border-slate-200" />);
            i++; continue;
        }

        // ── plain paragraph ──────────────────────────────────────
        flushList();
        elements.push(
            <p key={i} className="text-slate-700 text-[15px] leading-relaxed mb-2">
                <InlineLine text={trimmed} />
            </p>,
        );
        i++;
    }

    flushList();
    return <div className="space-y-0.5">{elements}</div>;
}
