import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";
import { auth as participantAuth } from "@/lib/auth/participant";
import { getSettings } from "@/lib/settings";
import MobileNav from "@/components/public/MobileNav";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/media", label: "Media" },
  { href: "/merch", label: "Merch" },
];

export default async function PublicHeader() {
  const session = await participantAuth();
  const isLoggedIn = Boolean(session?.user?.participantId);
  const settings = await getSettings();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
        <Link href="/" className="group flex items-center gap-2.5 font-semibold tracking-tight text-white">
          {settings.logoPath ? (
            // eslint-disable-next-line @next/next/no-img-element -- served via app/api/media
            <img src={`/api/media/${settings.logoPath}`} alt="35events" className="h-8 w-auto" />
          ) : (
            <>
              <span className="border-accent flex h-8 w-8 items-center justify-center border text-sm font-bold transition-colors group-hover:bg-accent group-hover:text-zinc-950">
                35
              </span>
              <span className="font-display text-lg">35events</span>
            </>
          )}
        </Link>

        <div className="flex items-center gap-3 md:gap-8">
          <nav className="font-mono-label hidden items-center gap-7 text-xs text-white/60 md:flex">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="transition-colors hover:text-white">
                {link.label}
              </Link>
            ))}
          </nav>

          <Link
            href={isLoggedIn ? "/account" : "/login"}
            className="flex items-center gap-2 border border-white/20 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:border-accent hover:text-accent"
          >
            <FontAwesomeIcon icon={faUser} className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isLoggedIn ? "Mijn account" : "Inloggen"}</span>
          </Link>

          <MobileNav links={NAV_LINKS} />
        </div>
      </div>
    </header>
  );
}
