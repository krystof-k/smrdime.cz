type FooterLinkProps = {
  href: string;
  hoverColor: string;
  children: React.ReactNode;
};

function FooterLink({ href, hoverColor, children }: FooterLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`rounded px-1 font-mono text-gray-700 underline decoration-dotted transition-all duration-200 hover:decoration-solid dark:text-gray-300 ${hoverColor}`}
    >
      {children}
    </a>
  );
}

const HOVER = {
  twitter: "hover:bg-sky-100 hover:text-sky-700 dark:hover:bg-sky-950 dark:hover:text-sky-300",
  claude:
    "hover:bg-orange-100 hover:text-orange-700 dark:hover:bg-orange-950 dark:hover:text-orange-300",
  golemio: "hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-950 dark:hover:text-rose-300",
  openMeteo:
    "hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-950 dark:hover:text-blue-300",
  github:
    "hover:bg-neutral-200 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white",
} as const;

export function Footer() {
  return (
    <footer className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
      <p>
        Navibecodil{" "}
        <FooterLink href="https://twitter.com/krystof_k" hoverColor={HOVER.twitter}>
          @krystof_k
        </FooterLink>{" "}
        s{" "}
        <FooterLink href="https://claude.ai/code" hoverColor={HOVER.claude}>
          Claude Code
        </FooterLink>{" "}
        a daty z{" "}
        <FooterLink href="https://api.golemio.cz/docs/openapi/index.htm" hoverColor={HOVER.golemio}>
          Golemio API
        </FooterLink>{" "}
        a{" "}
        <FooterLink href="https://open-meteo.com" hoverColor={HOVER.openMeteo}>
          Open-Meteo
        </FooterLink>
        . Zapojte se na{" "}
        <FooterLink href="https://github.com/krystof-k/smrdime-cz" hoverColor={HOVER.github}>
          GitHubu
        </FooterLink>
        .
      </p>
    </footer>
  );
}
