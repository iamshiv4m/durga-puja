import Image from "next/image";
import Link from "next/link";
import {
  DURGA_DOORS,
  FESTIVALS,
  type Festival,
  type FestivalArt,
} from "@/content/festivals";
import { SITE, SITE_URL } from "@/lib/site";
import styles from "./ParvHome.module.css";

// Durga Puja leads, with a door for each region; every other festival follows with its own scene.
const [FEATURED, ...REST] = FESTIVALS;

export function ParvHome() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    alternateName: "पर्व",
    url: SITE_URL,
    description: SITE.description,
    inLanguage: ["en", "hi", "bn", "gu", "mr", "pa", "as", "ta", "ml", "sa"],
    hasPart: FESTIVALS.filter((f) => f.path).map((f) => ({
      "@type": "WebPage",
      name: f.journey ?? f.name,
      url: new URL(f.path!, SITE_URL).toString(),
    })),
  };

  return (
    <main className={styles.home}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <header className={styles.hero}>
        <p className={`deva ${styles.native}`} lang="hi">
          पर्व
        </p>
        <h1>{SITE.name}</h1>
        <p className="small-caps">
          the festivals of India, one scroll at a time
        </p>
        <i className={styles.rule} aria-hidden="true" />
        <p className={styles.intro}>
          Each festival is a single page you scroll through, painted by hand in
          code and scored with real recordings. Turn the sound on.
        </p>
      </header>

      <ol className={styles.festivals}>
        {[FEATURED].map((festival) => (
          <li key={festival.id} className={styles.open}>
            <div className={styles.doors}>
              {DURGA_DOORS.map((door) => (
                <Link key={door.style} href={door.path} className={styles.door}>
                  <Image
                    src={`/parv/door-${door.style}.jpg`}
                    alt={`Durga, painted as in ${door.region}`}
                    fill
                    sizes="(max-width: 700px) 34vw, 22vw"
                    priority
                  />
                  <span className="small-caps">{door.region}</span>
                </Link>
              ))}
            </div>
            <FestivalText festival={festival} status="open now" />
          </li>
        ))}
        {REST.map((festival) => (
          <li key={festival.id} className={styles.later}>
            {festival.path ? (
              <Link
                href={festival.path}
                className={styles.artLink}
                aria-label={`Enter ${festival.journey ?? festival.name}`}
              >
                <Art id={festival.id} />
              </Link>
            ) : (
              <Art id={festival.id} />
            )}
            <FestivalText festival={festival} status="to come" />
          </li>
        ))}
      </ol>

      <footer className={styles.footer}>
        <p className="small-caps">
          {SITE.name} · <span className="deva">पर्व</span>
        </p>
        <p>A festival, a page. Best with headphones.</p>
      </footer>
    </main>
  );
}

function FestivalText({
  festival,
  status,
}: {
  festival: Festival;
  status: string;
}) {
  return (
    <div className={styles.text}>
      <p className={`small-caps ${styles.tithi}`}>{festival.tithi}</p>
      <h2>
        {festival.name}
        <span
          className={festival.script ?? "deva"}
          lang={festival.lang ?? "hi"}
        >
          {festival.native}
        </span>
      </h2>
      <p className={styles.when}>{festival.when}</p>
      <p className={styles.line}>{festival.line}</p>
      {festival.path ? (
        <Link href={festival.path} className={`small-caps ${styles.enter}`}>
          enter {festival.journey ?? festival.name}{" "}
          <span aria-hidden="true">→</span>
        </Link>
      ) : (
        <p className={`small-caps ${styles.status}`}>{status}</p>
      )}
    </div>
  );
}

/** A small painted scene for each festival still to come. */
function Art({ id }: { id: FestivalArt }) {
  return (
    <div className={`${styles.art} ${styles[id]}`} aria-hidden="true">
      {id === "diwali" && (
        <div className={styles.diyas}>
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={styles.diya}
              style={{ animationDelay: `${i * -0.37}s` }}
            >
              <i />
            </span>
          ))}
        </div>
      )}
      {id === "chhath" && (
        <>
          <span className={styles.sun} />
          <span className={styles.river} />
          <span className={styles.glint} />
        </>
      )}
      {id === "holi" &&
        [0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={styles.gulal}
            style={{ animationDelay: `${i * -2.3}s` }}
          />
        ))}
      {id === "navratri" && (
        <>
          <span className={styles.garbo} />
          <span className={styles.circle}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <i key={i} style={{ rotate: `${i * 40}deg` }} />
            ))}
          </span>
        </>
      )}
      {id === "lohri" && (
        <>
          <span className={styles.fire} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className={styles.spark}
              style={{
                left: `${40 + ((i * 37) % 20)}%`,
                animationDelay: `${i * -0.5}s`,
              }}
            />
          ))}
        </>
      )}
      {id === "sankranti" &&
        [0, 1, 2].map((i) => (
          <span
            key={i}
            className={styles.kite}
            style={{ animationDelay: `${i * -1.7}s` }}
          >
            <i />
          </span>
        ))}
      {id === "pongal" && (
        <>
          <span className={styles.dawn} />
          <span className={styles.pot}>
            <i />
          </span>
        </>
      )}
      {id === "bihu" && (
        <>
          <span className={styles.hills} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className={styles.petal}
              style={{ left: `${8 + i * 15}%`, animationDelay: `${i * -1.3}s` }}
            />
          ))}
          <span className={styles.gamosa} />
        </>
      )}
      {id === "onam" && <span className={styles.pookalam} />}
      {id === "janmashtami" && (
        <>
          <span className={styles.rain} />
          <span className={styles.feather} />
        </>
      )}
      {id === "ganesh" && (
        <>
          <span className={styles.moon} />
          <span className={styles.sea} />
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={styles.marigold}
              style={{ animationDelay: `${i * -1.1}s` }}
            />
          ))}
        </>
      )}
    </div>
  );
}
