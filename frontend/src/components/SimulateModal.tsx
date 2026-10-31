"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { simulateIngest } from "@/lib/api";
import { X, Play, Sparkles, Mic, FileText, ShieldAlert, CopyCheck } from "lucide-react";
import clsx from "clsx";

interface SimulateModalProps {
  householdId: number;
  isOpen: boolean;
  onClose: () => void;
}

const PRESETS = [
  {
    title: "Voice note from Baba: electricity bill (Marathi)",
    type: "voice",
    icon: Mic,
    color: "border-orange-300 bg-orange-50/50 hover:bg-orange-50",
    text: "रोहन, महावितरणचे वीज बिल आले आहे. रक्कम ₹१,८४० आहे. ३ नोव्हेंबर पर्यंत भरायचे आहे.",
    note: "Pulls out amount, payee and due date with source quotes, then drafts a Marathi reply",
  },
  {
    title: "Rohan's education loan EMI notice",
    type: "image",
    icon: FileText,
    color: "border-rose-300 bg-rose-50/50 hover:bg-rose-50",
    text: "HDFC CREDILA FINANCIAL SERVICES. Monthly Education Loan EMI: INR 18,500. Due Date: 2026-11-10. Payee: HDFC Bank. Borrower: Rohan Kulkarni.",
    note: "Assigned to Rohan and added to the 30-day total",
  },
  {
    title: "Lab report (medical guardrail)",
    type: "image",
    icon: ShieldAlert,
    color: "border-red-300 bg-red-50/50 hover:bg-red-50",
    text: "DR LAL PATHLABS CLINICAL BIOCHEMISTRY REPORT. Fasting Glucose: 172 mg/dL. HbA1c: 8.1%. Consultation on 2026-11-08 at Sahyadri Hospital.",
    note: "Refuses to interpret results. Only the appointment date is kept.",
  },
  {
    title: "Same electricity bill, sent again as a photo",
    type: "image",
    icon: CopyCheck,
    color: "border-purple-300 bg-purple-50/50 hover:bg-purple-50",
    text: "MSEDCL Electricity Bill. Amount: ₹1,840. Due Date: 2026-11-03. Payee: Mahavitaran (MSEDCL). Duplicate invoice submission.",
    note: "Merged into the existing task instead of creating a second one",
  },
];

export function SimulateModal({ householdId, isOpen, onClose }: SimulateModalProps) {
  const queryClient = useQueryClient();
  const [selectedText, setSelectedText] = useState(PRESETS[0].text);
  const [selectedType, setSelectedType] = useState(PRESETS[0].type);

  const ingestMutation = useMutation({
    mutationFn: () => simulateIngest({ type: selectedType, raw_text: selectedText, household_id: householdId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", householdId] });
      queryClient.invalidateQueries({ queryKey: ["events", householdId] });
      onClose();
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="simulate-title" className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center text-brand-600">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 id="simulate-title" className="text-base font-semibold text-gray-900">Simulate a message</h2>
              <p className="text-xs text-gray-500">Send a voice transcript or photo text through the agent, as if a parent sent it</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Presets */}
        <div className="p-6 space-y-4 overflow-y-auto">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block">
            Pick a scenario
          </label>
          <div className="grid grid-cols-1 gap-2.5">
            {PRESETS.map((p, idx) => {
              const Icon = p.icon;
              const isSelected = selectedText === p.text;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedText(p.text);
                    setSelectedType(p.type);
                  }}
                  className={clsx(
                    "text-left p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3",
                    isSelected ? "border-brand-500 ring-2 ring-brand-500/20 bg-brand-50/40" : p.color
                  )}
                >
                  <div className="p-2 rounded-lg bg-white border border-gray-200 shadow-sm text-gray-700 mt-0.5">
                    <Icon size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-900">{p.title}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{p.note}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div>
            <label htmlFor="simulate-text" className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1.5">
              Message text (editable)
            </label>
            <textarea
              id="simulate-text"
              value={selectedText}
              onChange={(e) => setSelectedText(e.target.value)}
              rows={4}
              className="w-full text-xs font-mono p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50/50"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            Perceive → Classify → Extract → Verify → Dedupe → Assign
          </span>
          <button
            onClick={() => ingestMutation.mutate()}
            disabled={ingestMutation.isPending || !selectedText.trim()}
            className="btn-primary flex items-center gap-1.5 text-xs font-semibold"
          >
            <Play size={14} />
            {ingestMutation.isPending ? "Running…" : "Run agent"}
          </button>
        </div>
        {ingestMutation.isError && (
          <p role="alert" className="px-6 pb-3 text-xs text-red-600 bg-gray-50">
            {(ingestMutation.error as { response?: { status?: number } })?.response?.status === 401
              ? "Admin token rejected. Set NEXT_PUBLIC_ADMIN_TOKEN to the backend's ADMIN_SECRET."
              : "The agent run failed. Check the backend logs."}
          </p>
        )}
      </div>
    </div>
  );
}
