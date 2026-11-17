import { useEffect, useState, useRef } from "react";
import { uploadFile } from "../api/client";
import { useToast } from "./toastContext";

export default function UploadPanel({ onUploadComplete, openRequest }) {
  const [status, setStatus] = useState("idle"); // idle | uploading | success | error
  const [message, setMessage] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    if (openRequest > 0) inputRef.current?.click();
  }, [openRequest]);

  async function handleFile(file) {
    if (!file) return;
    setStatus("uploading");
    setMessage("");
    try {
      const result = await uploadFile(file);
      setStatus("success");
      setMessage(
        `Added ${result.inserted} transaction${result.inserted === 1 ? "" : "s"}` +
          (result.duplicates_skipped > 0
            ? ` · skipped ${result.duplicates_skipped} duplicate${result.duplicates_skipped === 1 ? "" : "s"}`
            : ""),
      );
      toast(`Imported ${result.inserted} transaction${result.inserted === 1 ? "" : "s"}.`);
      onUploadComplete?.();
    } catch (err) {
      setStatus("error");
      setMessage(err.response?.data?.error || "Upload failed. Check the file format and try again.");
      toast(err.response?.data?.error || "Upload failed.", "error");
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  }

  return (
    <div
      className={`upload-panel ${dragActive ? "drag-active" : ""} status-${status}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        hidden
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <div className="upload-icon" aria-hidden="true">
        ⤒
      </div>
      <div className="upload-text">
        <strong>
          {status === "uploading" ? "Reading your file…" : "Drop a statement here, or click to browse"}
        </strong>
        <span>CSV or Excel — bank exports, M-Pesa statements, budget sheets</span>
      </div>
      {message && <div className={`upload-message ${status}`}>{message}</div>}
    </div>
  );
}
