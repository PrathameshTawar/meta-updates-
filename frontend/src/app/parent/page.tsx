"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  HOUSEHOLD_ID,
  addChild,
  getMembers,
  getTasks,
  removeMember,
  simulateIngest,
  statusOf,
  type Member,
  type Task,
} from "@/lib/api";
import { firstName, useMe } from "@/lib/useMe";

const marathiDate = new Intl.DateTimeFormat("mr-IN", { day: "numeric", month: "long" });

function statusLine(task: Task, members: Member[]) {
  if (task.status === "done") return { text: "✓ पूर्ण झाले", tone: "text-green-800" };
  const who = members.find((m) => m.id === task.assignee_id);
  if (who) return { text: `${firstName(who.name)} पाहत आहे`, tone: "text-green-800" };
  if (task.status === "needs_review") return { text: "मुले तपासत आहेत", tone: "text-gray-700" };
  return { text: "अजून कोणी घेतले नाही", tone: "text-red-700" };
}

const bigButton =
  "min-h-[64px] rounded-2xl px-6 text-2xl font-bold disabled:opacity-50";

export default function ParentPage() {
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members", HOUSEHOLD_ID],
    queryFn: () => getMembers(HOUSEHOLD_ID),
  });
  const parents = members.filter((m) => m.role === "parent");
  const [me, chooseMe] = useMe("saath.parent", parents);

  return (
    <main lang="mr" className="min-h-screen bg-white text-ink text-[22px] leading-relaxed">
      <div className="max-w-xl mx-auto px-4 py-6 sm:py-10">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 text-2xl font-extrabold">
            <span className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center">स</span>
            साथ
          </Link>
          {me && (
            <button onClick={() => chooseMe(null)} className="text-lg underline text-gray-600 min-h-[48px] px-2">
              मी {firstName(me.name)} नाही
            </button>
          )}
        </header>

        {isLoading ? (
          <p className="mt-10 text-gray-600">थोडं थांबा…</p>
        ) : !me ? (
          <section className="mt-10">
            <h1 className="text-4xl font-extrabold">तुम्ही कोण आहात?</h1>
            <div className="mt-6 flex flex-col gap-4">
              {parents.map((p) => (
                <button
                  key={p.id}
                  onClick={() => chooseMe(p.id)}
                  className={`${bigButton} bg-brand-500 hover:bg-brand-600 text-ink text-left py-4`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </section>
        ) : (
          <>
            <h1 className="mt-8 text-4xl font-extrabold">नमस्कार, {firstName(me.name)}</h1>
            <SendMessage />
            <MyTasks members={members} />
            <MyChildren members={members} />
          </>
        )}
      </div>
    </main>
  );
}

function SendMessage() {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [canSpeak, setCanSpeak] = useState(false);
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const recognizer = useRef<any>(null);

  useEffect(() => {
    const w = window as any;
    setCanSpeak(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  const listen = () => {
    const w = window as any;
    const rec = new (w.SpeechRecognition || w.webkitSpeechRecognition)();
    rec.lang = "mr-IN";
    rec.onresult = (e: any) => {
      const heard = Array.from(e.results as ArrayLike<any>).map((r) => r[0].transcript).join(" ");
      setText((t) => (t ? `${t} ${heard}` : heard));
    };
    rec.onerror = () => setNote("आवाज ऐकू आला नाही. पुन्हा बोला किंवा लिहा.");
    rec.onend = () => setListening(false);
    recognizer.current = rec;
    setNote(null);
    setListening(true);
    rec.start();
  };

  const send = useMutation({
    mutationFn: () => simulateIngest({ type: "voice", raw_text: text.trim() }),
    onSuccess: () => {
      setText("");
      setNote("पाठवले. मुले हे पाहतील.");
      queryClient.invalidateQueries({ queryKey: ["tasks", HOUSEHOLD_ID] });
    },
    onError: () => setNote("पाठवता आले नाही. थोड्या वेळाने पुन्हा पाठवा."),
  });

  return (
    <section className="mt-6 rounded-3xl bg-brand-50 border-2 border-brand-500 p-5" aria-labelledby="send-title">
      <h2 id="send-title" className="text-2xl font-bold">काय करायचे आहे ते सांगा</h2>
      <label htmlFor="message" className="sr-only">तुमचा संदेश</label>
      <textarea
        id="message"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="उदा. वीज बिल आले आहे, ₹१,८४० भरायचे आहे"
        className="mt-3 w-full rounded-2xl border-2 border-gray-400 bg-white p-4 text-[22px] placeholder:text-gray-500"
      />
      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        {canSpeak && (
          <button
            onClick={() => (listening ? recognizer.current?.stop() : listen())}
            aria-pressed={listening}
            className={`${bigButton} border-2 border-ink bg-white flex-1`}
          >
            {listening ? "ऐकत आहे… थांबा" : "🎤 बोला"}
          </button>
        )}
        <button
          onClick={() => send.mutate()}
          disabled={!text.trim() || send.isPending}
          className={`${bigButton} bg-ink text-white flex-1`}
        >
          {send.isPending ? "पाठवत आहे…" : "मुलांना पाठवा"}
        </button>
      </div>
      {note && (
        <p role="status" className="mt-3 text-xl font-semibold">
          {note}
        </p>
      )}
      <p className="mt-3 text-lg text-gray-700">
        बिलाचा फोटो किंवा व्हॉइस मेसेज WhatsApp वरही पाठवू शकता.
      </p>
    </section>
  );
}

function MyTasks({ members }: { members: Member[] }) {
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", HOUSEHOLD_ID],
    queryFn: () => getTasks(HOUSEHOLD_ID),
  });
  const byDue = (a: Task, b: Task) => (a.due_date ?? "9").localeCompare(b.due_date ?? "9");
  const open = tasks.filter((t) => t.status !== "done").sort(byDue);
  const done = tasks.filter((t) => t.status === "done");

  return (
    <section className="mt-10" aria-labelledby="tasks-title">
      <h2 id="tasks-title" className="text-3xl font-extrabold">तुमची कामे</h2>
      {open.length === 0 ? (
        <p className="mt-4 text-gray-700">सध्या काहीही बाकी नाही.</p>
      ) : (
        <ul className="mt-4 divide-y-2 divide-gray-200 border-y-2 border-gray-200">
          {open.map((t) => (
            <TaskRow key={t.id} task={t} members={members} />
          ))}
        </ul>
      )}
      {done.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer min-h-[48px] flex items-center text-xl font-semibold">
            पूर्ण झालेली कामे ({done.length})
          </summary>
          <ul className="divide-y-2 divide-gray-200">
            {done.map((t) => (
              <TaskRow key={t.id} task={t} members={members} />
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function TaskRow({ task, members }: { task: Task; members: Member[] }) {
  const status = statusLine(task, members);
  return (
    <li className="py-4">
      <p className="font-bold">{task.title}</p>
      <p className="text-gray-700">
        {task.amount && <span className="mr-4">{task.amount}</span>}
        {task.due_date && <span>देय: {marathiDate.format(new Date(task.due_date))}</span>}
      </p>
      <p className={`font-semibold ${status.tone}`}>{status.text}</p>
    </li>
  );
}

function MyChildren({ members }: { members: Member[] }) {
  const queryClient = useQueryClient();
  const children = members.filter((m) => m.role === "child");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["members", HOUSEHOLD_ID] });

  const add = useMutation({
    mutationFn: () => addChild(HOUSEHOLD_ID, name.trim(), phone),
    onSuccess: (child) => {
      setNote(`${child.name} यांना जोडले. त्यांना आता WhatsApp वर सूचना येतील.`);
      setName("");
      setPhone("");
      setAdding(false);
      refresh();
    },
    onError: (err) =>
      setNote(
        statusOf(err) === 409
          ? "हा नंबर आधीच जोडलेला आहे."
          : statusOf(err) === 422
          ? "१० अंकी मोबाईल नंबर लिहा."
          : "जोडता आले नाही. थोड्या वेळाने पुन्हा प्रयत्न करा."
      ),
  });

  const remove = useMutation({
    mutationFn: (id: number) => removeMember(id),
    onSuccess: () => {
      setConfirmId(null);
      setNote("काढले. त्यांनी घेतलेली कामे पुन्हा सर्वांच्या यादीत आली आहेत.");
      refresh();
      queryClient.invalidateQueries({ queryKey: ["tasks", HOUSEHOLD_ID] });
    },
    onError: () => setNote("काढता आले नाही. थोड्या वेळाने पुन्हा प्रयत्न करा."),
  });

  return (
    <section className="mt-10 mb-16" aria-labelledby="children-title">
      <h2 id="children-title" className="text-3xl font-extrabold">माझी मुले</h2>
      <p className="mt-1 text-lg text-gray-700">
        यांना तुमची कामे दिसतात आणि WhatsApp वर सूचना येतात.
      </p>

      <ul className="mt-4 flex flex-col gap-3">
        {children.map((c) => (
          <li key={c.id} className="rounded-2xl border-2 border-gray-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-bold">{c.name}</p>
                {c.phone_last4 && <p className="text-lg text-gray-600">मोबाईल ••••{c.phone_last4}</p>}
              </div>
              {confirmId !== c.id && (
                <button
                  onClick={() => setConfirmId(c.id)}
                  className="min-h-[48px] px-4 rounded-xl border-2 border-gray-400 text-lg font-semibold"
                >
                  काढा
                </button>
              )}
            </div>
            {confirmId === c.id && (
              <div className="mt-3 flex flex-col sm:flex-row gap-3" role="group" aria-label={`${c.name} यांना काढायचे?`}>
                <p className="sm:hidden font-semibold">{firstName(c.name)} यांना काढायचे?</p>
                <button
                  onClick={() => remove.mutate(c.id)}
                  disabled={remove.isPending}
                  className={`${bigButton} bg-red-700 text-white flex-1`}
                >
                  हो, काढा
                </button>
                <button onClick={() => setConfirmId(null)} className={`${bigButton} border-2 border-ink flex-1`}>
                  नको
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {adding ? (
        <form
          className="mt-4 rounded-2xl border-2 border-ink p-4 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            add.mutate();
          }}
        >
          <label className="flex flex-col gap-1 font-semibold">
            नाव
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="off"
              className="rounded-xl border-2 border-gray-400 p-3 text-[22px] font-normal"
            />
          </label>
          <label className="flex flex-col gap-1 font-semibold">
            मोबाईल नंबर
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              type="tel"
              inputMode="tel"
              placeholder="98765 43210"
              className="rounded-xl border-2 border-gray-400 p-3 text-[22px] font-normal"
            />
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <button type="submit" disabled={add.isPending} className={`${bigButton} bg-ink text-white flex-1`}>
              {add.isPending ? "जोडत आहे…" : "जोडा"}
            </button>
            <button type="button" onClick={() => setAdding(false)} className={`${bigButton} border-2 border-ink flex-1`}>
              रद्द करा
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => {
            setAdding(true);
            setNote(null);
          }}
          className={`${bigButton} mt-4 w-full bg-brand-500 hover:bg-brand-600 text-ink`}
        >
          + मुलगा / मुलगी जोडा
        </button>
      )}

      {note && (
        <p role="status" className="mt-4 text-xl font-semibold">
          {note}
        </p>
      )}
    </section>
  );
}
