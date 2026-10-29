# Tavan Tansag website branding

## Source and application

The user-supplied **Tavan Tansag Logo Desgin.pdf** (10 pages, authored 27 February 2026) was read from the [Logo folder](https://drive.google.com/drive/folders/1db8ZTMtYHg8simnj6PMLpvKRrfxtsP3a). The private PDF is not published with the website.

- Pages 4 and 6: English and Mongolian stacked logo lockups. Exported as vector SVG with outlined original lettering; no redraw or replacement typeface inside the logo. A transparent margin is retained around each lockup.
- Pages 5 and 7: official Mongolian slogan **Мөнх Үргэлжлэх Монгол Өв**. The website translation **Enduring Mongolian Heritage** is an editorial translation, not an English slogan explicitly supplied in the PDF.
- Page 5: five interwoven squares symbolize Mongolia's five traditional livestock and continuous, intergenerational heritage. This interpretation is presented on the About page.
- Page 9: **Heritage Bronze**. PDF vector fill RGB `(173, 129, 78)` gives web color **#AD814E**. This is extracted from the vector asset; the PDF does not print a HEX specification.
- Page 10: original repeating pattern, exported unchanged and used subtly behind the consultation panel.

The official descriptors are `МОНГОЛ ӨВИЙН ҮНЭТ ЭДЛЭЛИЙН ДЭЛГҮҮР` and `MONGOLIAN HERITAGE JEWELRY HOUSE`.

## Website palette

Only Heritage Bronze is specified by the source. The supporting colors below are website adaptations, chosen for legibility and a restrained, warm appearance.

| Role | Color |
| --- | --- |
| Brand bronze | #AD814E |
| Warm light background | #FAF7F1 |
| Main text | #251F19 |
| Dark panels | #211C17 |
| Secondary text | #6B5C50 |
| Pale bronze on dark panels | #DAB98B |
| Dark bronze links/focus on light | #79552D |
| Fine borders | #E2D8CB |

Measured contrast: secondary text/light background 6.00:1; secondary text/tinted panel 5.19:1; dark button text/bronze background 4.85:1; pale bronze/dark panel 9.08:1. Bronze is not used for small body text on a light background.

## Typography and assets

The source PDF uses Inter Medium/Bold for its logo lettering. The website uses self-hosted **Inter 4.001** upright variable font (weights 100–900), obtained unmodified from the [official Inter repository](https://github.com/rsms/inter/blob/master/docs/font-files/InterVariable.woff2). The SIL Open Font License is retained in `public/fonts/OFL.txt`. Its character map was verified to include Mongolian Ө, ө, Ү and ү and every letter in the official slogan.

- `public/images/brand/logo-mn.svg` and `logo-en.svg`: original localized lockups.
- `public/images/brand/mark.svg`: isolated original bronze vector mark, used as the favicon.
- `public/images/brand/pattern.svg`: original pattern.
- `src/components/brand-logo.tsx`: shared header/footer logo component.
- `src/app/globals.css`: palette, typography, sizing and responsive styles.
- `src/lib/copy.ts`: localized slogan and descriptors.

The logo geometry and lettering are retained at their original aspect ratio. CSS does not crop the mark into a circle or stretch the lockup. Screen readers receive localized brand and descriptor text.

Firebase data and inquiry behavior are outside this visual update. The preview remains noindex.
