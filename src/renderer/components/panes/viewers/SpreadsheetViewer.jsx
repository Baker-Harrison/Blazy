import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';

// A read-only spreadsheet viewer: reads a .csv, .xlsx, or .xls file from
// disk and displays it as a simple scrollable grid, like a lightweight,
// view-only version of Excel. Used by EditorPane when the selected file is
// a spreadsheet instead of text/code.
//
// "xlsx" (also called SheetJS) is a third-party library that knows how to
// understand the internal format of spreadsheet files (which, unlike plain
// text, involves multiple named "sheets," each holding a grid of cells)
// and turns that into plain JavaScript data we can render as an HTML
// table.
export default function SpreadsheetViewer({ filePath }) {
  // The parsed workbook (a spreadsheet file can contain multiple sheets —
  // think of each sheet as one tab at the bottom of an Excel window).
  const [workbook, setWorkbook] = useState(null);
  const [failed, setFailed] = useState(false);
  // Which sheet's tab is currently selected for viewing.
  const [activeSheet, setActiveSheet] = useState(null);

  useEffect(() => {
    let alive = true;
    setWorkbook(null);
    setFailed(false);
    setActiveSheet(null);
    window.fs.readFileBinary(filePath).then((base64) => {
      if (!alive) return;
      // Ask xlsx to parse the raw bytes (given to us as base64 text) into
      // a structured workbook object.
      const wb = XLSX.read(base64, { type: 'base64' });
      setWorkbook(wb);
      setActiveSheet(wb.SheetNames[0] || null);
    }).catch(() => {
      if (alive) setFailed(true);
    });
    return () => {
      alive = false;
    };
  }, [filePath]);

  // Converts the currently-selected sheet into a plain 2D array of rows
  // (each row itself an array of cell values), which is a much easier
  // shape to render as an HTML table than xlsx's internal format.
  const rows = useMemo(() => {
    if (!workbook || !activeSheet) return [];
    const sheet = workbook.Sheets[activeSheet];
    return XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
  }, [workbook, activeSheet]);

  if (failed) {
    return (
      <div className="flex flex-1 items-center justify-center text-[13px] text-ink-dim">
        Couldn't load this spreadsheet.
      </div>
    );
  }

  if (!workbook) {
    return (
      <div className="flex flex-1 items-center justify-center text-[13px] text-ink-dim">
        Loading spreadsheet…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Sheet tabs — only worth showing if there's more than one sheet to
          switch between. */}
      {workbook.SheetNames.length > 1 && (
        <div className="flex h-8 shrink-0 items-center gap-1 border-b border-edge bg-surface px-2 overflow-x-auto">
          {workbook.SheetNames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setActiveSheet(name)}
              className={`shrink-0 rounded px-2 py-1 text-[12px] ${
                activeSheet === name ? 'bg-hover text-ink' : 'text-ink-dim hover:bg-hover hover:text-ink'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-auto">
        {rows.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[13px] text-ink-dim">
            This sheet is empty.
          </div>
        ) : (
          <table className="w-full border-collapse text-[12px]">
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="whitespace-nowrap border border-edge px-2 py-1 text-ink"
                    >
                      {cell === undefined || cell === null ? '' : String(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
