"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTasks, getMembers, simulateEscalation, resetDatabase, type Task, type TaskStatus } from "@/lib/api";
import { TaskColumn } from "./TaskColumn";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { MembersBar } from "./MembersBar";
import { MonthCommitmentBar } from "./MonthCommitmentBar";
import { AuditLogModal } from "./AuditLogModal";
import { SimulateModal } from "./SimulateModal";
import { FastForward, Sparkles, Activity, RotateCcw } from "lucide-react";

const COLUMNS: { statuses: TaskStatus[]; label: string; color: string }[] = [
  { statuses: ["new", "confirmed", "escalated"], label: "New & Pending", color: "bg-blue-50/70 border-blue-200" },
  { statuses: ["needs_review"], label: "Needs Confirmation", color: "bg-amber-50/70 border-amber-200" },
  { statuses: ["claimed"], label: "Claimed", color: "bg-purple-50/70 border-purple-200" },
  { statuses: ["done"], label: "Done", color: "bg-emerald-50/70 border-emerald-200" },
];

interface BoardProps {
  householdId: number;
}

export function Board({ householdId }: BoardProps) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { data: tasks = [], isLoading: tasksLoading, isError: tasksError } = useQuery({
    queryKey: ["tasks", householdId],
    queryFn: () => getTasks(householdId),
    refetchInterval: 3000,
  });
  // Look the task up on every render so the panel shows the latest status after a claim.
  const selectedTask = tasks.find((t) => t.id === selectedId) ?? null;

  const showToast = (msg: string, ms = 4000) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), ms);
  };
  const showError = (err: unknown) =>
    showToast(
      (err as { response?: { status?: number } })?.response?.status === 401
        ? "Admin token rejected. Set NEXT_PUBLIC_ADMIN_TOKEN to the backend's ADMIN_SECRET."
        : "Request failed. Is the backend running?",
      6000
    );

  const { data: members = [] } = useQuery({
    queryKey: ["members", householdId],
    queryFn: () => getMembers(householdId),
  });

  const escalateMutation = useMutation({
    mutationFn: () => simulateEscalation(3),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", householdId] });
      queryClient.invalidateQueries({ queryKey: ["events", householdId] });
      showToast(`Moved the clock 3 days ahead. ${res.count} unclaimed task(s) escalated.`);
    },
    onError: showError,
  });

  const resetMutation = useMutation({
    mutationFn: () => resetDatabase(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", householdId] });
      queryClient.invalidateQueries({ queryKey: ["events", householdId] });
      setSelectedId(null);
      showToast("Demo data reset.", 3000);
    },
    onError: showError,
  });

  if (tasksError && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-red-600">
        Could not reach the Saath API at {process.env.NEXT_PUBLIC_API_URL}. Start the backend and reload.
      </div>
    );
  }

  if (tasksLoading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading board…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-65px)]">
      <MonthCommitmentBar tasks={tasks} />

      {/* Action / Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        {/* Members status */}
        <div className="flex items-center gap-4 min-w-0 max-w-full">
          <MembersBar members={members} tasks={tasks} />
        </div>

        {/* Demo buttons */}
        <div className="flex items-center gap-2">
          {toastMessage && (
            <span role="status" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 shadow-md text-xs font-medium text-amber-900 bg-amber-100 border border-amber-200 rounded-lg px-2.5 py-1">
              {toastMessage}
            </span>
          )}

          <button
            onClick={() => setIsSimulateOpen(true)}
            className="flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white rounded-lg px-3 py-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <Sparkles size={14} />
            Simulate a message
          </button>

          <button
            onClick={() => escalateMutation.mutate()}
            disabled={escalateMutation.isPending}
            className="flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-3 py-1.5 transition-colors shadow-sm cursor-pointer"
            title="Move the clock 3 days ahead to trigger escalation on unclaimed tasks"
          >
            <FastForward size={14} />
            {escalateMutation.isPending ? "Moving clock…" : "Skip 3 days"}
          </button>

          <button
            onClick={() => setIsAuditOpen(true)}
            className="flex items-center gap-1.5 whitespace-nowrap text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
            title="Every step the agent took, in order"
          >
            <Activity size={14} />
            Audit Log
          </button>

          <button
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            title="Reset demo data"
            aria-label="Reset demo data"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* Kanban columns + detail panel */}
      <div className="flex flex-1 overflow-hidden bg-slate-50/50">
        <div className="flex flex-1 gap-4 p-4 sm:p-6 overflow-x-auto">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => col.statuses.includes(t.status));
            return (
              <TaskColumn
                key={col.label}
                label={col.label}
                colorClass={col.color}
                tasks={colTasks}
                members={members}
                onSelect={(t) => setSelectedId(t.id)}
                selectedId={selectedId}
              />
            );
          })}
        </div>

        {selectedTask && (
          <TaskDetailPanel
            task={selectedTask}
            members={members}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>

      {/* Modals */}
      <AuditLogModal
        householdId={householdId}
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
      />

      <SimulateModal
        householdId={householdId}
        isOpen={isSimulateOpen}
        onClose={() => setIsSimulateOpen(false)}
      />
    </div>
  );
}
