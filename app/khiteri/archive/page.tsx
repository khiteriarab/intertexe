import Link from "next/link";
import { KHITERIS_EDIT_AUGUST_2026, KHITERIS_EDIT_JULY_2026 } from "../../../lib/khiteris-edit";

const posts = [KHITERIS_EDIT_AUGUST_2026, KHITERIS_EDIT_JULY_2026];

export default function KhiteriArchivePage() {
  return (
    <main className="min-h-screen bg-[#F7F5F0] text-[#1a1a1a] px-5 py-8">
      <div className="mx-auto max-w-3xl">
        <p className="text-[10px] tracking-[0.28em] uppercase text-[#8a8580] mb-2">Khiteri</p>
        <h1 className="font-serif text-4xl mb-2">Past postings</h1>
        <p className="text-sm text-[#5f5954] mb-8">A running archive of every KHITERI editorial drop.</p>
        <div className="grid gap-6 sm:grid-cols-2">
          {posts.map((post, i) => (
            <article key={post.monthLabel} className="border border-[#ddd7cf] bg-[#fbf9f4]">
              <img src={post.coverImage.src} alt={post.coverImage.alt} className="w-full aspect-[4/5] object-cover" />
              <div className="p-4">
                <p className="text-[10px] uppercase tracking-[0.22em] text-[#8a8580]">{post.monthLabel}</p>
                <h2 className="font-serif text-xl mt-1 mb-2">{post.title}</h2>
                <p className="text-sm text-[#5f5954] mb-3">{post.subtitle}</p>
                <Link href={i === 0 ? "/khiteri" : "/khiteri?preview=2026-07"} className="text-[11px] uppercase tracking-[0.2em]">
                  Open
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

