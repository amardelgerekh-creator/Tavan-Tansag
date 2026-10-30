import type { Localized } from "@/lib/catalog";

export type Reel = {
  id: string;
  src: string;
  title: Localized;
  description: Localized;
  poster: string;
};

// Source evidence is kept separately in data/reels-manifest.json.
export const reels: readonly Reel[] = [
  {
    "id": "enkhzul",
    "src": "/videos/reels/enkhzul-02.mp4",
    "poster": "/images/reels/enkhzul-02.jpg",
    "title": {
      "mn": "Энхзул · 02",
      "en": "Enkhzul · 02"
    },
    "description": {
      "mn": "Хээтэй дээл, урт унжлагат ээмэгтэй дүр төрх болон Таван Тансагийн эдлэлийн үзүүлэнг харуулсан богино бичлэг.",
      "en": "A short portrait reel showing long hanging earrings with a patterned deel and the Tavan Tansag display."
    }
  },
  {
    "id": "tsetsegdelger",
    "src": "/videos/reels/tsetsegdelger-02.mp4",
    "poster": "/images/reels/tsetsegdelger-02.jpg",
    "title": {
      "mn": "Цэцэгдэлгэр · 02",
      "en": "Tsetsegdelger · 02"
    },
    "description": {
      "mn": "Хүрэн ягаан хээтэй дээл, зүүлт, энгэрийн чимэгтэй сууж буй хүний дүрсийг харуулсан босоо бичлэг.",
      "en": "A seated portrait reel showing a plum-coloured patterned deel, a pendant and a decorative brooch."
    }
  },
  {
    "id": "davaakhuu",
    "src": "/videos/reels/davaakhuu-03.mp4",
    "poster": "/images/reels/davaakhuu-03.jpg",
    "title": {
      "mn": "Даваахүү · 03",
      "en": "Davaakhuu · 03"
    },
    "description": {
      "mn": "Хөөрөг барьсан хүний дүрс, морины хэрэглэл болон хээт эмээлийн ойрын дүрслэлүүдийг харуулсан богино бичлэг.",
      "en": "A seated portrait with a snuff bottle, followed by close views of horse tack and decorated saddle details."
    }
  }
];
