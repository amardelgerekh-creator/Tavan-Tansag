import type { Locale } from "@/lib/catalog";
import { reels } from "@/lib/reels";
import "@/app/reels.css";

export function ReelsGallery({ locale }: { locale: Locale }) {
  if (!reels.length) return null;

  return (
    <section className="section container reels-section" id="films" aria-labelledby="reels-heading">
      <div className="section-heading reels-heading">
        <div>
          <span className="eyebrow">{locale === "mn" ? "БОГИНО БИЧЛЭГ" : "SHORT FILMS"}</span>
          <h2 id="reels-heading">{locale === "mn" ? "Эдлэл ба дүр төрх." : "Heritage, worn and shared."}</h2>
          <p>{locale === "mn" ? "Дээл, гоёл, морины хэрэглэл — Таван Тансагийн бичлэгүүдээс ойроос хараарай." : "A closer view of deel, adornment and equestrian pieces through our films."}</p>
        </div>
        <span className="reels-scroll-hint">{locale === "mn" ? "Хажуу тийш гүйлгэж үзээрэй →" : "Scroll to explore →"}</span>
      </div>
      <div className="reels-grid">
        {reels.map((reel, index) => (
          <figure className="reel-card" key={reel.id}>
            <div className="reel-screen">
              <video
                controls
                playsInline
                preload="none"
                width={540}
                height={960}
                poster={reel.poster}
                aria-labelledby={`reel-title-${reel.id}`}
                aria-describedby={`reel-description-${reel.id}`}
              >
                <source src={reel.src} type="video/mp4" />
                {locale === "mn" ? "Энэ браузер бичлэг тоглуулах боломжгүй. " : "Your browser cannot play this video. "}
                <a href={reel.src}>{locale === "mn" ? "Бичлэгийг нээх" : "Open video"}</a>
              </video>
            </div>
            <figcaption>
              <span className="reel-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3 id={`reel-title-${reel.id}`}>{reel.title[locale]}</h3>
                <p id={`reel-description-${reel.id}`}>{reel.description[locale]}</p>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
