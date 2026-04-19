type ErrorKind = "tram" | "bus";

type ErrorViewProps = {
  message: string;
  onRetry: () => void;
  kind?: ErrorKind;
};

const COPY: Record<ErrorKind, { noun: string; vanished: string }> = {
  tram: { noun: "tramvají", vanished: "tramvaje zakecaly někde v depu" },
  bus: { noun: "autobusů", vanished: "autobusy zasekly někde v garáži" },
};

export function ErrorView({ message, onRetry, kind = "tram" }: ErrorViewProps) {
  const { noun, vanished } = COPY[kind];
  return (
    <div className="px-4 text-left md:px-8 lg:px-12">
      <h1 className="text-5xl text-gray-800 leading-tight md:text-6xl lg:text-7xl dark:text-gray-100">
        V <span className="font-black">Praze</span> <span className="font-thin">je</span>{" "}
        <span className="font-black font-mono text-red-600 dark:text-red-400">chaos</span> 💥
        <br />
        <span className="font-thin">a</span> <span className="font-black">nevíme</span>,{" "}
        <span className="font-thin">kolik {noun} jede bez klimatizace</span>.
      </h1>
      <p className="mt-8 font-light text-gray-600 text-xl leading-relaxed md:text-2xl dark:text-gray-300">
        Server si asi dal <span className="font-black">pauzu</span>, nebo se {vanished}. Zkus to za
        chvíli{" "}
        <button
          type="button"
          onClick={onRetry}
          className="cursor-pointer rounded px-1 font-black text-red-600 underline decoration-dotted transition-all hover:bg-red-100 hover:decoration-solid hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300"
        >
          znovu
        </button>
        ?
      </p>
      <p className="mt-6 font-mono text-gray-400 text-xs dark:text-gray-600">{message}</p>
    </div>
  );
}
