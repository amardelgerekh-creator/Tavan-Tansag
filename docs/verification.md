# Суурь хувилбарын шалгалт — 2026-10-29

Энэ баримт өмнөх локал веб шалгалтын нотолгоог Firebase шилжилтийн дараах шалгалтаас ялгаж тэмдэглэнэ. Firestore-ийн бодит уншилт, импорт, эрхийн шалгалт болон шинэ Vercel байршуулалтаар онлайн сайт Firestore-оос уншиж байгаа шалгалт амжилттай болсон.

## Өмнөх локал веб шалгалт

Firebase шилжилтээс өмнөх хувилбарт дараах шалгалтууд амжилттай болсон:

- TypeScript шалгалт, тухайн үеийн 12 тест, Next.js production build.
- `/mn` HTTP 200; каталогийн 10 бүртгэл, аяганы шүүлтүүр, `TT-006` хайлт.
- Үр дүнгүй хайлт болон хайлт цэвэрлэх үйлдэл.
- TT-006 дэлгэрэнгүйгээс хүсэлт рүү зөв эдлэл дамжих, Англи хэл рүү солиход `piece=TT-006` хадгалагдах.
- Холболтгүй маягтын товч идэвхгүй байх, Facebook холбоос харагдах.
- Локал API-ийн зөв бүтэцтэй хүсэлтэд HTTP 503, `NOT_CONFIGURED`, `ok:false` буцах.
- Өв соёлын картын зураг, агуулга.
- 390 × 844 хэмжээнд нүүр, каталог, цэс; каталогт хөндлөн халилтгүй, холбоос сонгоход цэс хаагдах.
- Desktop/mobile харагдац `docs/previews/` дотор хадгалагдсан.

Эдгээр нь шинэ Firebase reader болон байршуулсан орчны шалгалтыг орлохгүй. Өмнөх SQL/PGlite туршилтын дүнг Firebase хадгалалт, эрх, transaction эсвэл idempotency ажилладаг гэсэн нотолгоо болгон ашиглахгүй.

## Firebase шилжилтийн дараах шалгалт

| Шалгалт | Энэ баримтад баталгаажсан төлөв |
|---|---|
| Шинэ кодын typecheck, тест, production build | 21 тест, typecheck, file болон Firebase горимын build амжилттай |
| Нийтийн каталогийн талбарын allowlist, эх сурвалжийн мэдээлэл хасагдах | Reader тест, client bundle шалгалт болон бодит Firebase response-ийн яг 10 баримт/нийтийн талбарын allowlist шалгалт амжилттай |
| `file` горим, Firebase алдаанд далд fallback хийхгүй байх | Reader тестээр баталгаажсан |
| Firebase төсөл/CLI эрх | CLI/MCP `amardelgerekh@gmail.com` эрхээр нэвтэрсэн; `tavan-tansag-30560` төсөл баталгаажсан |
| Enterprise Native `tavan-tansag-preview`, Tokyo `asia-northeast1` | `ENTERPRISE`, `FIRESTORE_NATIVE`, `freeTier=true` баталгаажсан |
| Эрхийн дүрэм, жишиг импорт, бодит anonymous read | CLI dry run compile ба deploy амжилттай; create-only 10 баримт импортолсон; админ reread яг таарсан; anonymous sample query 10, published query 0 |
| Public write болон private collection access хаалт | Бодит Firebase дээр зөвшөөрөгдөөгүй query/хувийн уншилтууд, хоёр нэргүй create probe 403; баримт үүсээгүй |
| Маягт болон API санамсаргүй flag-тай үед ч хаалттай байх | Unit тест амжилттай; онлайн API 503 NOT_CONFIGURED, маягтын илгээх товч disabled |
| Vercel deployment | `7316e3b` хувилбар READY; онлайн хоёр хэлний каталог Firebase-оос тус бүр 10 эдлэл уншсан, динамик render баталгаажсан |
| Firebase хүсэлт/CRM, нэвтрэлт, мэдэгдэл | Хэрэгжээгүй |

Vercel CLI болон GitHub CLI `amardelgerekh-creator` эрхээр баталгаажсан. Өмнөх `03fa5a8` хувилбарын file горимд [онлайн сайт](https://tavan-tansag-preview.vercel.app/mn)-ын Монгол/Англи нүүр, Англи каталог, сонгосон эдлэлтэй хүсэлтийн хуудас HTTP 200; каталогт 10 эдлэл харагдсан. Хуудсууд noindex, robots.txt нь Disallow: /; хүсэлтийн API 503 NOT_CONFIGURED буцаасан. `docs/previews/online-home.png` нь тэр хувилбарын нийтлэгдсэн нүүрийн зураг. Эдгээрийг шинэ Firebase байршуулалтын нотолгоо гэж тооцохгүй.

Бодит Firestore импорт `2026-10-29T08:38:55.427302Z` үед хийгдсэн. `verify-read.ts` болон `verify-access.ts --probe-writes` шалгалтууд амжилттай: unfiltered/incomplete/draft каталогийн хайлт, private inquiries/customers болон nested private уншилтууд 403 буцаасан; хоёр нэргүй create оролдлого хаагдаж, баримт үүсгээгүй. Энэ нь одоогийн каталогийн хил хязгаарыг шалгасан болохоос хэрэгжээгүй CRM-ийн эрх, transaction, нэвтрэлтийг батлаагүй.

Vercel Production/Preview орчинд `CATALOG_SOURCE=firebase`, `CATALOG_INCLUDE_SAMPLES=true`, `FIREBASE_PROJECT_ID=tavan-tansag-30560`, `FIRESTORE_DATABASE_ID=tavan-tansag-preview` тохируулсан. Firebase нууц түлхүүр ашиглаагүй; inquiries болон indexing хаалттай хэвээр. Локал emulator-ийн Java runtime байхгүй ч дээрх уншилт/эрхийн шалгалтууд бодит туршилтын санд хийгдсэн.

## Онлайн Firebase хувилбарын баталгаажуулалт

`7316e3b` хувилбарын Vercel deployment `dpl_BEhYd2F7vfK4aiVQgDwdmc3eoQqv` READY; alias нь [tavan-tansag-preview.vercel.app](https://tavan-tansag-preview.vercel.app).

- Build log-д нүүр, каталог, эдлэлийн дэлгэрэнгүй, хүсэлтийн хуудсууд `ƒ Dynamic` буюу хүсэлт бүрд сервер дээр render хийхээр баталгаажсан.
- `/mn`, `/en`, `/mn/collection`, `/en/collection`, `/mn/products/saddle-blue-border`, `/en/products/bowl-orange-band`, `/mn/inquiry?piece=TT-001` HTTP 200 буцаасан.
- Хоёр хэлний каталог тус бүр 10 ялгаатай slug агуулсан; `Cache-Control: private, no-cache, no-store` баталгаажсан.
- Шалгасан бүх хуудас noindex; robots нь `Disallow: /`; хүсэлтийн API `503 NOT_CONFIGURED`, маягтын товч disabled хэвээр.
- Браузерын онлайн каталогт 10 эдлэл харагдсан; Firebase console-д TT-001–TT-010 баримтыг давхар баталгаажуулсан.
- Нотлох зураг: `docs/previews/firebase-catalog.png`, `docs/previews/firebase-online-catalog.png`.

## Бүртгэлийн хязгаар

Жишиг зургууд дахь эдлэлүүдийг тусдаа агуулахын нэгж, баталгаажсан үнэт металл, тогтоосон он цагтай эдлэл гэж үзэхгүй. TT-001–TT-010 бүртгэлийн бодит нэр, материал, хэмжээ, жин, үнэ, бэлэн байдал, гарал болон зураг ашиглах эрхийг дэлгүүр баталгаажуулна.

Бодит хэрэглэгчийн мэдээлэл импортлоогүй. Хүсэлт хадгалах, и-мэйл хүргэх болон ажилтны CRM-ийн ажиллагааг энэ хувилбар амлахгүй.
