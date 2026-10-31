import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-ink flex flex-col">
      <div className="flex-1 w-full max-w-xl mx-auto px-4 py-12 sm:py-20 flex flex-col">
        <div className="flex items-center gap-3">
          <span className="w-12 h-12 rounded-full bg-brand-500 text-ink font-bold text-2xl flex items-center justify-center">
            स
          </span>
          <h1 className="text-4xl font-extrabold">साथ</h1>
        </div>
        <p className="mt-4 text-xl text-gray-700 leading-relaxed">
          आई-बाबांची बिलं आणि कागदपत्रं, मुलांच्या एकाच यादीत.
          <span className="block text-base text-gray-500 mt-1">
            Your parents&apos; bills and paperwork, on one list the whole family shares.
          </span>
        </p>

        <nav className="mt-10 flex flex-col gap-4" aria-label="Choose who you are">
          <Link
            href="/parent"
            lang="mr"
            className="rounded-2xl bg-brand-500 hover:bg-brand-600 px-6 py-6 text-ink"
          >
            <span className="block text-3xl font-bold">मी आई / बाबा आहे</span>
            <span className="block text-lg mt-1">I&apos;m a parent</span>
          </Link>
          <Link
            href="/family"
            className="rounded-2xl border-2 border-ink px-6 py-6 hover:bg-gray-50"
          >
            <span className="block text-3xl font-bold" lang="mr">मी मुलगा / मुलगी आहे</span>
            <span className="block text-lg mt-1">I&apos;m their son or daughter</span>
          </Link>
        </nav>

        <Link href="/board" className="mt-auto pt-12 text-sm text-gray-500 underline self-start">
          Open the full board (demo)
        </Link>
      </div>
    </main>
  );
}
