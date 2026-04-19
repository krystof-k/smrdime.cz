import Link from "next/link";
import { Footer } from "@/components/Footer";

export default function NotFound() {
  return (
    <div className="grid min-h-screen grid-rows-[1fr_auto] bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
      <main className="flex flex-col justify-center">
        <div className="px-4 text-left md:px-8 lg:px-12">
          <h1 className="text-5xl text-gray-800 leading-tight md:text-6xl lg:text-7xl dark:text-gray-100">
            V <span className="font-black">Praze</span> <span className="font-thin">linka</span>{" "}
            <span className="font-black font-mono text-amber-600 dark:text-amber-400">404</span>{" "}
            <span className="font-thin">nejezdí</span> 🚋
            <br />
            <span className="font-thin">a tahle</span>{" "}
            <span className="font-black">stránka neexistuje</span>.
          </h1>
          <p className="mt-8 font-light text-gray-600 text-xl leading-relaxed md:text-2xl dark:text-gray-300">
            Asi jsi <span className="font-black">vystoupil</span> o pár zastávek dřív. Vrať se{" "}
            <Link
              href="/"
              className="cursor-pointer rounded px-1 font-black text-amber-600 underline decoration-dotted transition-all hover:bg-amber-100 hover:decoration-solid hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-950 dark:hover:text-amber-300"
            >
              domů
            </Link>
            ?
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
