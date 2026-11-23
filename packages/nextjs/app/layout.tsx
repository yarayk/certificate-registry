import Link from "next/link";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import "./style.css";

export const metadata = { title: "Реестр сертификатов курса" };

export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="ru"><body>
    <header><Link href="/verify" className="brand">Реестр сертификатов</Link>
      <nav aria-label="Разделы"><Link href="/verify">Проверка</Link><Link href="/issue">Преподавателю</Link></nav>
    </header>
    <main><Providers>{children}</Providers></main>
  </body></html>;
}
