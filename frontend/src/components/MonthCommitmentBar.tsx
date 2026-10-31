"use client";

import { useMemo } from "react";
import { Task } from "@/lib/api";
import { IndianRupee, CalendarCheck2 } from "lucide-react";

const DEVANAGARI_DIGITS = "०१२३४५६७८९";

// "₹1,840.50" -> 1840, "₹१,८४०" -> 1840. Paise are dropped; the bar shows whole rupees.
export function parseRupees(amount: string | null): number {
  if (!amount) return 0;
  const ascii = amount.replace(/[०-९]/g, (d) => String(DEVANAGARI_DIGITS.indexOf(d)));
  const whole = ascii.split(".")[0].replace(/[^\d]/g, "");
  return parseInt(whole, 10) || 0;
}

interface MonthCommitmentBarProps {
  tasks: Task[];
}

export function MonthCommitmentBar({ tasks }: MonthCommitmentBarProps) {
  const commitments = useMemo(() => {
    let parentsTotal = 0;
    let loanEmiTotal = 0;
    let pendingCount = 0;
    const horizon = Date.now() + 30 * 24 * 60 * 60 * 1000;

    tasks.forEach((t) => {
      if (t.status === "done") return;
      // Tasks with no due date or a date past 30 days are left out of the total.
      if (!t.due_date || new Date(t.due_date).getTime() > horizon) return;
      pendingCount++;
      const amt = parseRupees(t.amount);

      if (t.category === "loan_emi") {
        loanEmiTotal += amt;
      } else {
        parentsTotal += amt;
      }
    });

    return {
      parentsTotal,
      loanEmiTotal,
      grandTotal: parentsTotal + loanEmiTotal,
      pendingCount,
    };
  }, [tasks]);

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border-b border-orange-200/60 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-6">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 flex items-center gap-1">
            <CalendarCheck2 size={12} />
            Due in the next 30 days
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-bold text-gray-900 tracking-tight flex items-center">
              <IndianRupee size={18} className="text-amber-600" />
              {commitments.grandTotal.toLocaleString("en-IN")}
            </span>
            <span className="text-xs text-gray-500">{commitments.pendingCount} open task(s)</span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 border-l border-orange-200 pl-6">
          <div className="bg-white/80 rounded-lg px-3 py-1.5 border border-orange-100 shadow-sm">
            <span className="text-[10px] text-gray-500 block">Parents' bills and insurance</span>
            <span className="text-xs font-semibold text-gray-800">
              ₹{commitments.parentsTotal.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="bg-white/80 rounded-lg px-3 py-1.5 border border-orange-100 shadow-sm">
            <span className="text-[10px] text-gray-500 block">Loan EMIs</span>
            <span className="text-xs font-semibold text-rose-700">
              ₹{commitments.loanEmiTotal.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
