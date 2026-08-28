import { useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { api, friendlyError } from "../lib/api";
import { Role } from "../types";
import Modal from "./Modal";

interface ParsedRow {
  name: string;
  registrationNumber: string;
  collegeEmail: string;
  role: Role;
}

interface RowResult extends ParsedRow {
  status: "pending" | "success" | "error";
  message?: string;
}

const REQUIRED_HEADERS = ["name", "registrationNumber", "collegeEmail"];

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

const HEADER_ALIASES: Record<string, keyof ParsedRow> = {
  name: "name",
  fullname: "name",
  registrationnumber: "registrationNumber",
  regno: "registrationNumber",
  regnumber: "registrationNumber",
  collegeemail: "collegeEmail",
  email: "collegeEmail",
  role: "role",
};

function rowsFromRecords(records: Record<string, unknown>[]): { rows: ParsedRow[]; error?: string } {
  if (records.length === 0) return { rows: [], error: "The selected file has no data rows." };

  const firstRowKeys = Object.keys(records[0]).map(normalizeHeader);
  const mappedKeys = new Set(firstRowKeys.map((k) => HEADER_ALIASES[k]).filter(Boolean));
  const missing = REQUIRED_HEADERS.filter((h) => !mappedKeys.has(h as keyof ParsedRow));
  if (missing.length > 0) {
    return {
      rows: [],
      error: `Missing required column(s): ${missing.join(", ")}. Expected headers: name, registrationNumber, collegeEmail, role (optional).`,
    };
  }

  const rows: ParsedRow[] = records.map((record) => {
    const mapped: Partial<ParsedRow> = {};
    for (const [key, value] of Object.entries(record)) {
      const target = HEADER_ALIASES[normalizeHeader(key)];
      if (target && value !== undefined && value !== null) {
        (mapped as Record<string, unknown>)[target] = String(value).trim();
      }
    }
    return {
      name: mapped.name ?? "",
      registrationNumber: (mapped.registrationNumber ?? "").toUpperCase(),
      collegeEmail: (mapped.collegeEmail ?? "").toLowerCase(),
      role: "member",
    };
  });

  return { rows: rows.filter((r) => r.name || r.registrationNumber || r.collegeEmail) };
}

async function parseFile(file: File): Promise<{ rows: ParsedRow[]; error?: string }> {
  const isCsv = file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";

  if (isCsv) {
    const text = await file.text();
    const parsed = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
    if (parsed.errors.length > 0) {
      return { rows: [], error: `Could not parse CSV file: ${parsed.errors[0].message}` };
    }
    return rowsFromRecords(parsed.data);
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return { rows: [], error: "The Excel workbook has no sheets." };
  const sheet = workbook.Sheets[firstSheetName];
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  return rowsFromRecords(records);
}

function downloadTemplate() {
  const csv = "name,registrationNumber,collegeEmail\nRahul Sharma,24BCE5051,rahul.sharma2024@vitstudent.ac.in\n";
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ffcs-member-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function downloadResultsCsv(results: RowResult[]) {
  const rows = [
    ["name", "registrationNumber", "collegeEmail", "role", "status", "message"],
    ...results.map((r) => [r.name, r.registrationNumber, r.collegeEmail, r.role, r.status, r.message ?? ""]),
  ];
  const csv = rows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ffcs-import-results.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function BulkImport({ onClose }: { onClose: () => void }) {
  const [parseError, setParseError] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [results, setResults] = useState<RowResult[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleFile(file: File) {
    setFileName(file.name);
    setResults(null);
    setParseError(null);
    try {
      const { rows: parsedRows, error } = await parseFile(file);
      if (error) {
        setParseError(error);
        setRows([]);
        return;
      }
      setRows(parsedRows);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Could not read that file.");
    }
  }

  async function runImport() {
    setImporting(true);
    const working: RowResult[] = rows.map((r) => ({ ...r, status: "pending" }));
    setResults([...working]);

    for (let i = 0; i < working.length; i++) {
      const row = working[i];
      if (!row.name || !row.registrationNumber || !row.collegeEmail) {
        working[i] = { ...row, status: "error", message: "Missing required details (name/reg/email)." };
        setResults([...working]);
        continue;
      }
      try {
        const res = await api.createMember({
          name: row.name,
          registrationNumber: row.registrationNumber,
          collegeEmail: row.collegeEmail,
          role: row.role,
        });
        await sendPasswordResetEmail(auth, res.data.collegeEmail);
        working[i] = { ...row, status: "success", message: "Created — setup email sent." };
      } catch (err) {
        working[i] = { ...row, status: "error", message: friendlyError(err) };
      }
      setResults([...working]);
    }
    setImporting(false);
  }

  const successCount = results?.filter((r) => r.status === "success").length ?? 0;
  const errorCount = results?.filter((r) => r.status === "error").length ?? 0;
  const done = results !== null && !importing;

  return (
    <Modal title="Bulk Import FFCS Members" onClose={onClose}>
      {!results && (
        <>
          <p className="page-subtitle" style={{ fontSize: "0.88rem", marginBottom: 14 }}>
            Upload a CSV or Excel (.xlsx) file with columns: <code>name</code>, <code>registrationNumber</code>,{" "}
            <code>collegeEmail</code>, and optional <code>role</code> (member/admin).
          </p>

          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={downloadTemplate}
            style={{ marginBottom: 16 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Download CSV Template</span>
          </button>

          <label htmlFor="bulkFile">Select File (CSV, XLSX)</label>
          <input
            id="bulkFile"
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />

          {parseError && <p className="field-error">{parseError}</p>}

          {fileName && !parseError && rows.length > 0 && (
            <>
              <p className="field-hint" style={{ marginTop: 14, color: "var(--brand-saffron)" }}>
                ✓ {rows.length} member row{rows.length === 1 ? "" : "s"} found in <strong>{fileName}</strong>. Review below:
              </p>
              <div className="table-wrap" style={{ maxHeight: 240, overflowY: "auto", marginTop: 8 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Reg. No.</th>
                      <th>College Email</th>
                      <th>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i}>
                        <td>{r.name || <em style={{ color: "var(--duplicate)" }}>missing</em>}</td>
                        <td>{r.registrationNumber || <em style={{ color: "var(--duplicate)" }}>missing</em>}</td>
                        <td>{r.collegeEmail || <em style={{ color: "var(--duplicate)" }}>missing</em>}</td>
                        <td>
                          <span className="badge badge-ffcs">{r.role === "admin" ? "Admin" : "Member"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={runImport}
              disabled={rows.length === 0}
            >
              Import {rows.length > 0 ? rows.length : ""} FFCS Member{rows.length === 1 ? "" : "s"}
            </button>
          </div>
        </>
      )}

      {results && (
        <>
          <p className="page-subtitle" style={{ fontSize: "0.92rem", marginBottom: 14 }}>
            {importing
              ? "Creating accounts & sending setup emails..."
              : `Import Completed: ${successCount} created successfully, ${errorCount} failed.`}
          </p>
          <div className="table-wrap" style={{ maxHeight: 300, overflowY: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Reg. No.</th>
                  <th>Status</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i}>
                    <td>{r.name}</td>
                    <td>{r.registrationNumber}</td>
                    <td>
                      {r.status === "pending" && <span className="badge badge-draft">Working...</span>}
                      {r.status === "success" && <span className="badge badge-present">Success</span>}
                      {r.status === "error" && <span className="badge badge-absent">Failed</span>}
                    </td>
                    <td style={{ fontSize: "0.82rem", color: r.status === "error" ? "var(--duplicate)" : "var(--text-secondary)" }}>
                      {r.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="modal-actions">
            {done && (
              <button type="button" className="btn btn-ghost" onClick={() => downloadResultsCsv(results)}>
                Export Results (CSV)
              </button>
            )}
            <button type="button" className="btn btn-primary" onClick={onClose} disabled={importing}>
              {importing ? "Importing..." : "Done"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
