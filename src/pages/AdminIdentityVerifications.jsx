import { useCallback, useEffect, useState } from "react";
import apiClient from "../api/client.js";

const STATUS_STYLES = {
  UNVERIFIED: "bg-[#EAF0F4] text-[#52606F]",
  SUBMITTED: "bg-[#FDE8D8] text-[#9A4A1D]",
  APPROVED: "bg-[#E8F4EC] text-[#287A45]",
  REJECTED: "bg-[#FDECEC] text-[#B42318]",
};

const DOCUMENT_LABELS = {
  ID_FRONT: "ID - front",
  ID_BACK: "ID - back",
  SELFIE: "Selfie with ID",
};

function AdminIdentityVerifications() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("SUBMITTED");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/admin/identity-verifications", {
        params: status ? { status } : {},
      });
      setRows(response.data.data || []);
    } catch {
      setMessage("Could not load identity verifications.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  async function open(id) {
    setBusy(id);
    setMessage("");
    setNote("");
    try {
      const response = await apiClient.get(
        `/admin/identity-verifications/${id}`,
      );
      setSelected(response.data.data);
    } catch (error) {
      setMessage(
        error.response?.data?.error || "Could not load the verification.",
      );
    } finally {
      setBusy("");
    }
  }

  async function review(action) {
    if (action === "reject" && !note.trim()) {
      setMessage("Enter a reviewer note first.");
      return;
    }
    setBusy(action);
    setMessage("");
    try {
      await apiClient.post(
        `/admin/identity-verifications/${selected.id}/${action}`,
        action === "approve" ? {} : { reason: note.trim() },
      );
      setMessage(
        action === "approve" ? "Guest verified." : "Verification updated.",
      );
      setSelected(null);
      setNote("");
      await load();
    } catch (error) {
      setMessage(
        error.response?.data?.error || "Could not update the verification.",
      );
    } finally {
      setBusy("");
    }
  }

  async function downloadDocument(document) {
    setBusy(document.id);
    setMessage("");
    try {
      const response = await apiClient.get(
        `/admin/identity-verifications/${selected.id}/documents/${document.id}`,
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(response.data);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = document.originalName;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setMessage(
        error.response?.data?.error || "Could not download the document.",
      );
    } finally {
      setBusy("");
    }
  }

  const reviewMetrics = [
    { label: "In view", value: rows.length },
    {
      label: "Submitted",
      value: rows.filter((row) => row.status === "SUBMITTED").length,
    },
    {
      label: "Approved",
      value: rows.filter((row) => row.status === "APPROVED").length,
    },
    {
      label: "Rejected",
      value: rows.filter((row) => row.status === "REJECTED").length,
    },
  ];
  const statusOptions = [
    { value: "SUBMITTED", label: "Submitted" },
    { value: "APPROVED", label: "Approved" },
    { value: "REJECTED", label: "Rejected" },
    { value: "UNVERIFIED", label: "Unverified" },
    { value: "", label: "All statuses" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E3E8EF] pb-6">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#C49A6C]">
            Workspace / Trust &amp; safety
          </p>
          <h1 className="text-2xl font-bold text-[#0B1F42]">
            Identity verifications
          </h1>
          <p className="mt-1 text-sm text-[#5B6B82]">
            Review guest identity checks before payment.
          </p>
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-12 rounded-[10px] border-0 bg-[#F7F4EF] px-3 text-sm text-[#0B1F42] focus:outline-none focus:ring-2 focus:ring-[#C49A6C]/40"
        >
          {statusOptions.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {reviewMetrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-[#E3E8EF] bg-white p-4 shadow-[0_4px_16px_rgba(11,31,66,0.04)]"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">
              {metric.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-[#0B1F42]">
              {metric.value}
            </p>
          </div>
        ))}
      </div>
      <div
        className="flex flex-wrap items-center gap-2"
        role="tablist"
        aria-label="Verification status"
      >
        {statusOptions.map((option) => (
          <button
            key={option.value || "all"}
            type="button"
            role="tab"
            aria-selected={status === option.value}
            onClick={() => setStatus(option.value)}
            className={`rounded-[10px] px-4 py-2 text-xs font-semibold transition-colors ${status === option.value ? "bg-[#0B1F42] text-white" : "border border-[#E5E7EB] bg-white text-[#52606F] hover:bg-[#F7F4EF]"}`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {message && (
        <div className="rounded-2xl bg-[#F7F4EF] px-4 py-3 text-sm text-[#0B1F42]">
          {message}
        </div>
      )}
      {loading ? (
        <div className="py-16 text-center text-[#6b7280]">
          Loading verifications...
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-12 text-center text-[#52606F] shadow-sm">
          No verifications in this view.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#E3E8EF] bg-white shadow-[0_4px_16px_rgba(11,31,66,0.04)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] text-left">
                <th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">
                  Guest
                </th>
                <th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">
                  ID type
                </th>
                <th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">
                  Documents
                </th>
                <th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">
                  Status
                </th>
                <th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <tr
                  key={v.id}
                  className="border-b border-[#E5E7EB]/60 hover:bg-[#F7F4EF]"
                >
                  <td className="p-4">
                    <p className="font-semibold text-[#0B1F42]">
                      {v.fullName ||
                        `${v.user?.firstName || ""} ${v.user?.lastName || ""}`}
                    </p>
                    <p className="text-xs text-[#6b7280]">{v.user?.email}</p>
                  </td>
                  <td className="p-4 text-[#52606F]">{v.idType || "-"}</td>
                  <td className="p-4 text-[#52606F]">{v.documents?.length || 0}</td>
                  <td className="p-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[v.status]}`}
                    >
                      {v.status.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => open(v.id)}
                      disabled={busy === v.id}
                  className="rounded-[10px] bg-[#0B1F42] px-4 py-2 text-xs font-semibold text-white hover:bg-[#07072E] disabled:opacity-50"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/20"
          onClick={() => !busy && setSelected(null)}
        >
          <div
            className="h-full w-full max-w-2xl overflow-y-auto border-l border-[#E5E7EB] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E5E7EB] bg-white px-6 py-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">
                  Identity review
                </p>
                <h2 className="mt-1 text-xl font-bold text-[#0B1F42]">
                  {selected.fullName || "Unnamed"}
                </h2>
                <p className="text-sm text-[#6b7280]">{selected.user?.email}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg p-2 text-xl leading-none text-[#6b7280] hover:bg-[#F7F7F5]"
                aria-label="Close identity review"
              >
                &times;
              </button>
            </div>
            <div className="space-y-7 p-6">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#F7F4EF] p-3">
                  <p className="text-xs text-[#6b7280]">Date of birth</p>
                  <p className="mt-1 text-sm font-semibold text-[#0B1F42]">
                    {selected.dateOfBirth || "-"}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#F7F4EF] p-3">
                  <p className="text-xs text-[#6b7280]">ID type</p>
                  <p className="mt-1 text-sm font-semibold text-[#0B1F42]">
                    {selected.idType || "-"}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#F7F4EF] p-3">
                  <p className="text-xs text-[#6b7280]">ID number</p>
                  <p className="mt-1 text-sm font-semibold text-[#0B1F42]">
                    {selected.idNumber || "-"}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="mb-3 font-bold text-[#0B1F42]">
                  Encrypted documents
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {selected.documents?.map((document) => (
                    <button
                      key={document.id}
                      onClick={() => downloadDocument(document)}
                      disabled={busy === document.id}
                      className="rounded-2xl border border-[#E5E7EB] bg-[#F7F4EF] p-4 text-left hover:shadow-md disabled:opacity-50"
                    >
                      <p className="font-semibold text-[#0B1F42]">
                        {DOCUMENT_LABELS[document.kind] || document.kind}
                      </p>
                      <p className="mt-1 text-xs text-[#6b7280] break-all">
                        {document.originalName} ·{" "}
                        {(document.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              {selected.status === "SUBMITTED" && (
                <div className="rounded-2xl border border-[#E5E7EB] bg-[#F7F4EF] p-5">
                  <label className="mb-2 block text-sm font-semibold text-[#0B1F42]">
                    Reviewer note (required for rejection)
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows="3"
                    maxLength="2000"
                    className="h-28 w-full rounded-[10px] border-0 bg-white px-3 py-2 text-sm text-[#0B1F42] focus:outline-none focus:ring-2 focus:ring-[#C49A6C]/40"
                  />
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={() => review("approve")}
                      disabled={Boolean(busy)}
                      className="min-h-[44px] rounded-[10px] bg-[#0B1F42] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => review("reject")}
                      disabled={Boolean(busy)}
                      className="min-h-[44px] rounded-[10px] border border-[#B42318]/30 px-5 py-2.5 text-sm font-semibold text-[#B42318] disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminIdentityVerifications;
