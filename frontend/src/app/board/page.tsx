import Link from "next/link";
import { Board } from "@/components/Board";
import { HOUSEHOLD_ID } from "@/lib/api";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-sm">
            स
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Saath <span className="text-gray-400 font-normal text-sm">/ साथ</span>
          </span>
        </div>
        <span className="hidden sm:inline text-xs text-gray-500">
          <Link href="/" className="underline hover:text-gray-800">
            Back to Saath
          </Link>
        </span>
      </header>

      <Board householdId={HOUSEHOLD_ID} />
    </main>
  );
}
