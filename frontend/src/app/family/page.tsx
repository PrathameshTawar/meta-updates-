"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HOUSEHOLD_ID, getMembers, getTasks, updateTask, type Member, type Task } from "@/lib/api";
import { MonthCommitmentBar } from "@/components/MonthCommitmentBar";
import { firstName, useMe } from "@/lib/useMe";

export default function FamilyPage() {
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["members", HOUSEHOLD_ID],
    queryFn: () => getMembers(HOUSEHOLD_ID),
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", HOUSEHOLD_ID],
    queryFn: () => getTasks(HOUSEHOLD_ID),
  });
  const children = members.filter((m) => m.role === "child");
  const [me, chooseMe] = useMe("saath.child", children);

  const byDue = (a: Task, b: Task) => (a.due_date ?? "9").localeCompare(b.due_date ?? "9");
  const open = tasks.filter((t) => t.status !== "done").sort(byDue);
  const waiting = open.filter((t) => t.assignee_id === null);
  const mine = open.filter((t) => me && t.assignee_id === me.id);
  const siblings = open.filter((t) => t.assignee_id !== null && t.assignee_id !== me?.id);
  const done = tasks.filter((t) => t.status === "done").slice(0, 5);

  return (
    <main className="min-h-screen bg-white text-ink text-lg">
      <header className="border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 text-xl font-extrabold">
            <span className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center">स</span>
            Saath
          </Link>
          <nav className="flex items-center gap-4 text-base">
            <Link href="/board" className="underline text-gray-600">Full board</Link>
            {me && (
              <button onClick={() => chooseMe(null)} className="underline text-gray-600">
                Not {firstName(me.name)}?
              </button>
            )}
          </nav>
        </div>
      </header>

      {membersLoading ? (
        <p className="max-w-3xl mx-auto px-4 py-10 text-gray-600">Loading…</p>
      ) : !me ? (
        <section className="max-w-3xl mx-auto px-4 py-10">
          <h1 className="text-3xl font-extrabold">Who are you?</h1>
          <p className="mt-1 text-gray-600">Aai and Baba add their children from their own screen.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {children.map((c) => (
              <button
                key={c.id}
                onClick={() => chooseMe(c.id)}
                className="min-h-[56px] rounded-xl border-2 border-ink px-4 text-left text-xl font-bold hover:bg-gray-50"
              >
                {c.name}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <>
          <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-10">
            <h1 className="text-3xl font-extrabold">Hi {firstName(me.name)}</h1>
            <div className="-mt-6 rounded-2xl overflow-hidden border border-orange-200/60">
              <MonthCommitmentBar tasks={tasks} />
            </div>

            <TaskSection
              title="Nobody has taken these yet"
              empty="Everything open has someone on it."
              tasks={waiting}
              members={members}
              me={me}
              action="claim"
            />
            <TaskSection
              title="You're handling"
              empty="Nothing on your plate. Take one from the list above."
              tasks={mine}
              members={members}
              me={me}
              action="done"
            />
            <TaskSection
              title="Your siblings are handling"
              empty="No one else has anything open."
              tasks={siblings}
              members={members}
              me={me}
            />
            {done.length > 0 && (
              <TaskSection title="Recently done" empty="" tasks={done} members={members} me={me} />
            )}
          </div>
        </>
      )}
    </main>
  );
}

function TaskSection({
  title,
  empty,
  tasks,
  members,
  me,
  action,
}: {
  title: string;
  empty: string;
  tasks: Task[];
  members: Member[];
  me: Member;
  action?: "claim" | "done";
}) {
  return (
    <section>
      <h2 className="text-2xl font-bold">
        {title} <span className="text-gray-500 font-normal">({tasks.length})</span>
      </h2>
      {tasks.length === 0 ? (
        <p className="mt-2 text-gray-600">{empty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-200 border-y border-gray-200">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} members={members} me={me} action={action} />
          ))}
        </ul>
      )}
    </section>
  );
}

function TaskRow({ task, members, me, action }: { task: Task; members: Member[]; me: Member; action?: "claim" | "done" }) {
  const queryClient = useQueryClient();
  const assignee = members.find((m) => m.id === task.assignee_id);
  const due = task.due_date ? parseISO(task.due_date) : null;
  const overdue = due !== null && due < new Date() && task.status !== "done";

  const act = useMutation({
    mutationFn: () =>
      action === "claim"
        ? updateTask(task.id, { status: "claimed", assignee_id: me.id })
        : updateTask(task.id, { status: "done" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", HOUSEHOLD_ID] }),
  });

  return (
    <li className="py-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="font-semibold">{task.title}</p>
        <p className="text-base text-gray-600">
          {task.amount && <span className="mr-3">{task.amount}</span>}
          {due && (
            <span className={overdue ? "text-red-700 font-semibold" : ""}>
              {overdue ? "Overdue since " : "Due "}
              {format(due, "d MMM")}
            </span>
          )}
          {assignee && assignee.id !== me.id && <span className="ml-3">{firstName(assignee.name)} has it</span>}
        </p>
        {task.status === "escalated" && (
          <p className="text-base text-red-700 font-semibold">Due within 3 days and still unclaimed</p>
        )}
        {task.status === "needs_review" && (
          <p className="text-base text-gray-700">
            The agent wasn&apos;t sure it read this right.{" "}
            <Link href="/board" className="underline">Check the details</Link>
          </p>
        )}
        {act.isError && (
          <p role="alert" className="text-base text-red-700">
            That didn&apos;t save. Try again in a moment.
          </p>
        )}
      </div>
      {action && (
        <button
          onClick={() => act.mutate()}
          disabled={act.isPending}
          className={
            action === "claim"
              ? "min-h-[48px] rounded-xl bg-brand-500 hover:bg-brand-600 text-ink px-5 font-bold disabled:opacity-50"
              : "min-h-[48px] rounded-xl bg-green-700 hover:bg-green-800 text-white px-5 font-bold disabled:opacity-50"
          }
        >
          {act.isPending ? "Saving…" : action === "claim" ? "I'll handle it" : "Mark done"}
        </button>
      )}
    </li>
  );
}
