import type { Category, Localized } from "./catalog";

export interface Article {
  slug: string;
  category: Localized;
  title: Localized;
  summary: Localized;
  imageIndex: number;
  relevantCategories: Category[];
  readingMinutes: number;
  takeaways: Localized[];
  sources?: { title: Localized; url: string }[];
  sections: { title: Localized; paragraphs: Localized[] }[];
}

// Original editorial guides. These do not establish the age, origin,
// authenticity, composition or cultural attribution of any catalog object.
export const articles: Article[] = [
  {
    slug: "look-closer",
    category: { mn: "ХИЙЦ БА ХЭЛБЭР", en: "CRAFT & FORM" },
    title: {
      mn: "Эдлэлийг ойроос ажиглах нь",
      en: "The art of looking closer",
    },
    summary: {
      mn: "Ерөнхий хэлбэрээс жижиг холбоос хүртэл: эдлэлийн зургаас юуг ажиглаж, юуг нэмж асууж болох вэ?",
      en: "From the overall silhouette to the smallest joint: what to notice in a photograph, and what to ask next.",
    },
    imageIndex: 0,
    relevantCategories: ["men", "women", "silverware", "horse", "snuff-bottles"],
    readingMinutes: 3,
    sources: [{
      title: { mn: "ICOM — Эдлэлийг таньж тодорхойлох бүртгэлийн заавар", en: "ICOM — Object identification and documentation" },
      url: "https://icom.museum/en/resources/standards-guidelines/objectid/",
    }],
    takeaways: [
      { mn: "Бүтэн зураг, ойрын зураг, хэмжээсийг хамтад нь харах", en: "Look at the whole object, the details and its scale" },
      { mn: "Зургаас харагдах шинжийг баталгаатай материалаас ялгах", en: "Separate visible appearance from verified material" },
      { mn: "Эдлэлийн кодоор нэмэлт зураг, мэдээлэл хүсэх", en: "Use the piece reference to request specific information" },
    ],
    sections: [
      {
        title: {
          mn: "Эхлээд бүхэлд нь хараарай",
          en: "Begin with the whole object",
        },
        paragraphs: [
          {
            mn: "Эдлэлийн зураг үзэхдээ хамгийн тод чимэглэлд шууд анхаарахаас өмнө нийт хэлбэр, харьцаа, хэсгүүдийн зохицлыг ажиглаарай. Аль хэсэг нь хэрэглээний зориулалттай, аль хэсэг нь чимэглэлийн шинжтэй байж болохыг асууж болно. Зөвхөн зургаас таамагласнаа баталгаатай мэдээллээс ялгаж тэмдэглэх нь дараагийн яриаг илүү тодорхой болгоно.",
            en: "Before focusing on the most striking decoration, look at the silhouette, proportions and relationship between the parts. Ask which elements serve a practical purpose and which may be decorative. Keep your visual impressions separate from confirmed information; that distinction makes the next conversation more useful.",
          },
          {
            mn: "Энэ каталогийн зураг нь эдлэлийн дүр төрхтэй танилцах эхлэл юм. Хэмжээг нь төсөөлөхийн тулд өндөр, өргөн, урт болон боломжтой бол хэмжээс харагдах нэмэлт зураг хүсээрэй. Зургийн ойр, хол авалт нь бодит хэмжээг дангаараа илэрхийлэхгүй.",
            en: "The photographs in this collection are a starting point. To understand scale, ask for height, width and length, and an additional photograph with a visible scale where possible. A close-up or a distant view alone cannot establish an object’s actual size.",
          },
        ],
      },
      {
        title: {
          mn: "Дараа нь нарийн хэсгийг шалгаарай",
          en: "Then examine the details",
        },
        paragraphs: [
          {
            mn: "Ирмэг, холбоос, бариул, суурь болон чимэглэлийн уулзварыг өөр өөр өнцгөөс харуулах зураг хүсэж болно. Элэгдэл, сэв, засварласан хэсэг байгаа эсэхийг тусад нь тодруулаарай. Эдгээрийг мэдэх нь эдлэлийг ямар зориулалтаар сонгохоо бодоход тустай.",
            en: "Request different angles of edges, joints, handles, bases and the points where decoration meets the body. Ask separately about wear, marks and repairs. Understanding these details helps you consider how the object fits your intended use.",
          },
          {
            mn: "Зурган дээрх өнгө, гялбаа нь материалын найрлага эсвэл сорьцыг батлахгүй. Тиймээс “мөнгөлөг өнгөтэй” гэсэн ажиглалт болон “мөнгөн эдлэл” гэсэн баталгаатай тайлбар нь өөр утгатай. Материалыг холбогдох баримт, хэмжилт эсвэл мэргэжлийн үнэлгээгээр тодруулна.",
            en: "Colour and shine in a photograph do not establish composition or fineness. An observation such as “silver-coloured” is different from a verified description of an object as silver. Material claims need appropriate documentation, measurement or specialist assessment.",
          },
        ],
      },
      {
        title: {
          mn: "Сонирхсон зүйлээ тодорхой асуугаарай",
          en: "Make your questions specific",
        },
        paragraphs: [
          {
            mn: "Бидэнтэй холбогдохдоо бүртгэлийн код болон сонирхсон хэсгээ бичээрэй. “TT-001 эдлэлийн холбоосыг ойроос харж болох уу?” гэх мэт тодорхой асуулт нь зөв зураг, зөв мэдээлэл авахад тусална. Баталгаажаагүй мэдээлэлтэй бол бид түүнийг тодруулах шаардлагатай гэж тэмдэглэнэ.",
            en: "When contacting us, include the reference code and the detail you would like to see. A specific question such as “May I see a closer view of the joints on TT-001?” helps identify the right photograph and information. Details awaiting verification are marked as such.",
          },
        ],
      },
    ],
  },
  {
    slug: "questions-before-choosing",
    category: { mn: "СОНГОЛТЫН ТЭМДЭГЛЭЛ", en: "CHOOSING A PIECE" },
    title: {
      mn: "Сонголтын өмнөх гурван асуулт",
      en: "Three questions before choosing",
    },
    summary: {
      mn: "Зориулалт, баталгаатай мэдээлэл, худалдан авах нөхцөлөө тодруулж сонголтоо хийгээрэй.",
      en: "Clarify your intended use, the evidence behind the description, and the terms of a purchase.",
    },
    imageIndex: 4,
    relevantCategories: ["men", "women", "silverware", "horse", "snuff-bottles"],
    readingMinutes: 3,
    sources: [{
      title: { mn: "ICOM — Эдлэлийн мэдээлэл, зураг, тайлбарыг бүртгэх нь", en: "ICOM — Recording an object’s details, photographs and description" },
      url: "https://icom.museum/en/resources/standards-guidelines/objectid/",
    }],
    takeaways: [
      { mn: "Хэрэглэх, бэлэглэх эсвэл цуглуулах зорилгоо тодруулах", en: "Explain whether the piece is for use, a gift or a collection" },
      { mn: "Материал, нөхцөл байдал, бэлэн байдлыг баталгаажуулах", en: "Confirm materials, condition and availability" },
      { mn: "Хүсэлт илгээх нь захиалга баталгаажуулсан хэрэг биш", en: "An enquiry does not confirm a reservation" },
    ],
    sections: [
      {
        title: {
          mn: "1. Энэ эдлэлийг юунд зориулж сонгох вэ?",
          en: "1. What would you like the piece to do?",
        },
        paragraphs: [
          {
            mn: "Өөртөө хэрэглэх, бэлэглэх, орон зайдаа байрлуулах эсвэл цуглуулгадаа нэмэх эсэхээ эхлээд бодоорой. Зориулалтаа тодорхой хэлэх нь хэмжээ, жин, хэрэглээний нөхцөл, арчилгааны тухай зөв асуулт асуухад тусална. Хүлээн авах хүний сонирхол, байрлуулах орон зай, хэрэглэх давтамж ч сонголтод нөлөөлнө.",
            en: "Consider whether the object is for personal use, a gift, a room or a collection. Describing your purpose helps frame the right questions about dimensions, weight, suitability and care. The recipient’s interests, available space and expected frequency of use can all shape the choice.",
          },
          {
            mn: "Зурагт харагдах сав суулгыг хүнсний зориулалтаар хэрэглэж болох эсэх, эмээл тоногийг бодитоор хэрэглэх боломжтой эсэхийг тусад нь баталгаажуулна. Гоёлын болон хэрэглээний зориулалт ижил байх албагүй тул харагдах хэлбэрээр нь дүгнэхгүй байх нь зүйтэй.",
            en: "Confirm separately whether a vessel is suitable for food use, or whether a saddle or fitting is intended for practical use. Decorative and practical functions are not necessarily interchangeable, so appearance alone should not decide suitability.",
          },
        ],
      },
      {
        title: {
          mn: "2. Тайлбарын аль хэсэг нь баталгаатай вэ?",
          en: "2. Which details are supported by evidence?",
        },
        paragraphs: [
          {
            mn: "Материал, урлаач, хийсэн үе, гарал үүсэл, засварын түүхийн талаар мэдэгдэж байгаа зүйлсийг нэг нэгээр нь асуугаарай. Гэрчилгээ, тэмдэглэгээ, өмнөх бүртгэл байгаа бол тухайн эдлэлтэй хэрхэн холбогдож байгааг нь нягтална. Баримт байхгүй хэсгийг таамгаар нөхөх шаардлагагүй.",
            en: "Ask individually about material, maker, period, origin and restoration history. Where certificates, marks or earlier records are available, clarify how they relate to the particular object. A gap in the record should remain a gap rather than be filled with a guess.",
          },
          {
            mn: "Эхний каталогийн бүртгэлүүдэд хараахан баталгаажаагүй мэдээллийг “Тодруулах” гэж тэмдэглэсэн. Энэ тэмдэглэгээ нь эдлэлийн чанарыг дүгнэсэн үнэлгээ биш; тухайн мэдээлэл бүрэн болоогүйг илэрхийлнэ.",
            en: "In this initial catalog, details that have not yet been verified are marked “To be confirmed.” This is not a judgment about the quality of the piece; it means that the relevant information is still incomplete.",
          },
        ],
      },
      {
        title: {
          mn: "3. Үнэ, хүлээн авах нөхцөл тодорхой юу?",
          en: "3. Are the price and handover terms clear?",
        },
        paragraphs: [
          {
            mn: "Сонгосон эдлэлийн бэлэн байдал, тухайн үеийн үнэ, үнэд багтах зүйлс, хүлээн авах арга болон холбогдох нөхцөлийг зөвлөхтэй баталгаажуулаарай. Хэрэв хугацаа чухал бол хэзээ хэрэгтэйгээ эхний хүсэлтдээ дурдана уу.",
            en: "Confirm current availability, the quoted price, what is included, the handover arrangement and any applicable terms with our team. If timing matters, mention the date you have in mind in your first enquiry.",
          },
          {
            mn: "Вебсайтаар зөвлөгөө хүсэх нь худалдан авалт эсвэл барааны нөөцлөлт биш. Эдлэлийн мэдээлэл, нөхцөлийг харилцан тодруулсны дараа дараагийн алхмыг зөвлөхтэй тохиролцоно.",
            en: "An enquiry through the website is not a purchase or a reservation. Once the details and terms have been clarified, the next step can be agreed with our team.",
          },
        ],
      },
    ],
  },
  {
    slug: "stories-with-evidence",
    category: { mn: "ӨВ СОЁЛЫГ ТАНИХ НЬ", en: "UNDERSTANDING HERITAGE" },
    title: {
      mn: "Эдлэлийн түүхийг хүндэтгэн таних нь",
      en: "Giving an object’s story its due",
    },
    summary: {
      mn: "Монгол урлалын тухай ярихдаа ажигласан зүйл, уламжилсан яриа, батлагдсан баримтыг ялгаж ойлгох нь.",
      en: "A thoughtful way to approach Mongolian craft: distinguish what is visible, what has been shared, and what can be established.",
    },
    imageIndex: 7,
    relevantCategories: ["men", "women", "silverware", "horse", "snuff-bottles"],
    readingMinutes: 4,
    takeaways: [
      { mn: "Ерөнхий соёлын тайлбар болон тухайн эдлэлийн түүхийг ялгах", en: "Distinguish cultural context from the history of one object" },
      { mn: "Нэршил, он цаг, гарал үүслийн эх сурвалжийг асуух", en: "Ask for the sources behind names, dates and attribution" },
      { mn: "Түүхийг нь мэдээлэл өгсөн хүн, баримттай нь хамт хадгалах", en: "Keep an account together with its contributor and evidence" },
    ],
    sources: [{
      title: { mn: "The Met — Монгол дөрөөний музейн бүртгэл", en: "The Met — Pair of Stirrups, Mongolian" },
      url: "https://www.metmuseum.org/art/collection/search/762162",
    }],
    sections: [
      {
        title: {
          mn: "Харагдаж буй зүйлээс эхлэх",
          en: "Start with what can be seen",
        },
        paragraphs: [
          {
            mn: "Эдлэлийн хэлбэр, давтагдсан хээ, гадаргуугийн чимэглэл нь сонирхолтой ярианы эхлэл болдог. Гэхдээ хээний нэр, утга, нутагшил эсвэл он цагийг ганц зургаар тогтоохгүй. Нэршлийг нь мэдэхгүй бол “ирмэг дагуу давтагдсан чимэглэл” гэх мэт харагдаж буйг нь тодорхой бичиж болно.",
            en: "Shape, repeated patterns and surface decoration offer a starting point for a conversation. A photograph alone should not establish the name, meaning, regional attribution or age of a motif. When a name is unknown, a precise description such as “repeated decoration around the rim” is still useful.",
          },
          {
            mn: "Танин мэдэх хүсэл нь бэлэн тайлбар цээжлэхээс илүү асуулт тавихаас эхэлж болно. Энэ хэсгийг яаж хийсэн байж болох вэ? Ямар зориулалттай вэ? Ижил нэршлийг өөр газар өөрөөр хэрэглэдэг үү? Хариулт бүрийн эх сурвалжийг мэдэх нь ойлголтоо гүнзгийрүүлэх боломж өгнө.",
            en: "Learning can begin with questions rather than a ready-made explanation. How might this part have been made? What purpose does it serve? Could the same term have different uses in different contexts? Knowing where an answer comes from allows a deeper understanding.",
          },
        ],
      },
      {
        title: {
          mn: "Түүхийн эх сурвалжийг хамт хадгалах",
          en: "Keep the source with the story",
        },
        paragraphs: [
          {
            mn: "Урлаачийн тайлбар, гэр бүлийн дурсамж, дэлгүүрийн бүртгэл, судалгааны бүтээл нь эдлэлийн талаар өөр өөр мэдээлэл өгч болно. Хэн, хэзээ, ямар үндэслэлээр хэлснийг хамт тэмдэглэвэл дараа нь нягтлах боломжтой. Аман түүхийг сонссон яриа гэдгээр нь, батлагдсан мэдээллийг баримттай нь ялгаж хүргэх нь тухайн түүхийг хүндэтгэж буй хэрэг юм.",
            en: "A maker’s explanation, a family memory, a shop record and a research publication may each contribute different information. Recording who supplied an account, when, and on what basis makes it possible to revisit it. Presenting an oral account as an oral account, and documented information with its evidence, respects both the object and its story.",
          },
          {
            mn: "Каталогт үзүүлж буй тодорхой эдлэлийг музейн төстэй бүтээлтэй харьцуулж сонирхож болно. Гэхдээ төстэй харагдаж байгаа нь ижил урлаач, үе, гарал үүсэлтэйг өөрөө батлахгүй. Харьцуулалт нь шинэ асуулт олох хэрэгсэл болохоос баталгааг орлохгүй.",
            en: "An object in a catalog may invite comparison with a similar museum piece. Resemblance does not by itself establish a shared maker, date or origin. A comparison can reveal useful questions; it cannot replace evidence.",
          },
        ],
      },
      {
        title: { mn: "Музейн бүртгэлээс суралцах нь", en: "Learning from a museum record" },
        paragraphs: [{
          mn: "Нью-Йоркийн The Met музей Монгол хос дөрөөг материал, хэмжээс, он цаг, бүртгэлийн дугаартай нь нийтэлсэн байдаг. Тайлбарт нь морин хэрэглэл хэрэглээний үүргээс гадна ур хийц, чимэглэлийг харуулж ирснийг дурджээ. Энэ бол эх сурвалжтай соёлын жишээ; манай каталогийн эдлэлийн насжилт, найрлага, гарал үүслийг тогтоосон баримт биш.",
          en: "The Met in New York records a Mongolian pair of stirrups with material, dimensions, dating and an accession number. Its commentary describes equestrian equipment as a setting for ornament and craftsmanship as well as practical use. This is a documented cultural example; it does not establish the age, composition or origin of any piece in our collection.",
        }],
      },
      {
        title: {
          mn: "Урлаач, эзэмшигчийн дуу хоолойг сонсох",
          en: "Make room for the people behind the piece",
        },
        paragraphs: [
          {
            mn: "Эдлэлийн тухай тэмдэглэлд хийсэн хүн, хэрэглэж ирсэн хүн, мэдээлэл өгсөн хүний нэрийг зөв бичих нь чухал. Нийтлэхийн өмнө тэдний мэдээлэл, зураг, яриаг ашиглах боломжийг тодруулна. Бидний зорилго бол хэтрүүлсэн домог зохиох бус, эдлэлийн тухай мэдэж байгаа зүйлээ ойлгомжтой, нягт нямбай хүргэх юм.",
            en: "Record the names of makers, former users and contributors accurately, and clarify permission before publishing their information, images or accounts. Our aim is to share what is known about an object with care and clarity, without adding an embellished story.",
          },
        ],
      },
    ],
  },
  {
    slug: "caring-for-your-piece",
    category: { mn: "АРЧИЛГАА БА ХАДГАЛАЛТ", en: "CARE & KEEPING" },
    title: { mn: "Арчилгааг материалаас нь эхлэх нь", en: "Care begins with the material" },
    summary: {
      mn: "Эмээл, аяга зэрэг олон материал хосолсон эдлэлээ арчлахын өмнө юу тодруулах вэ?",
      en: "What to establish before caring for a saddle, bowl or another object made from several materials.",
    },
    imageIndex: 5,
    relevantCategories: ["men", "women", "silverware", "horse", "snuff-bottles"],
    readingMinutes: 2,
    takeaways: [
      { mn: "Материал, бүрэлт, засварын түүхийг эхэлж тодруулах", en: "First establish materials, finishes and previous repairs" },
      { mn: "Нэг цэвэрлэгээний аргыг бүх хэсэгт хэрэглэхгүй байх", en: "Do not apply one cleaning method to every component" },
      { mn: "Тухайн эдлэлд тохирсон арчилгааны заавар хүсэх", en: "Ask for care instructions for the particular piece" },
    ],
    sources: [{
      title: { mn: "Канадын хамгаалал сэргээн засварлах хүрээлэн — Мөнгөн эдлэлийн арчилгаа", en: "Canadian Conservation Institute — Silver: Care and Tarnish Removal" },
      url: "https://www.canada.ca/en/conservation-institute/services/conservation-preservation-publications/canadian-conservation-institute-notes/care-silver.html",
    }],
    sections: [
      {
        title: { mn: "Юунаас бүтсэнийг нь мэдэх", en: "Know what the object is made of" },
        paragraphs: [{
          mn: "Металл өнгөлгөөтэй хэсэг, мод, арьс болон чимэглэл нь өөр өөр арчилгаа шаардаж болно. Худалдан авахдаа материал, бүрэлт, засварласан хэсгийг тодруулж, арчилгааны зааврыг эдлэлийн кодтой нь хамт хадгалаарай. Найрлага нь тодорхойгүй хэсэгт өнгөлөгч, тос, химийн бодис хэрэглэхээс өмнө зөвлөхтэй ярилцана уу.",
          en: "Metal finishes, wood, leather and decoration may need different care. When choosing a piece, ask about materials, coatings and repairs, and keep its care instructions with the reference code. Discuss any unidentified component with the team before applying polish, oil or cleaning chemicals.",
        }],
      },
      {
        title: { mn: "Гялалзах нь арчилгааны ганц зорилго биш", en: "A bright finish is not the only goal" },
        paragraphs: [{
          mn: "Канадын хамгаалал сэргээн засварлах хүрээлэнгийн тайлбараар мөнгийг давтан өнгөлөхөд гадаргуугаас материал хорогддог. Мөнгөн бүрэлт, алтадсан хэсэг, мод зэрэг материал хосолсон эдлэлийг нэг аргаар цэвэрлэж болохгүй. Иймээс доорх эх сурвалжийг ерөнхий ойлголт авахад ашиглаж, тухайн эдлэлийн цэвэрлэгээг мэргэжлийн хүнтэй тохироорой.",
          en: "The Canadian Conservation Institute explains that repeated silver polishing removes surface material. Plating, gilding and mixed materials such as wooden attachments need particular attention. Use the source below for context, and agree any treatment of the individual object with a qualified specialist.",
        }],
      },
      {
        title: { mn: "Зөвлөгөө авахдаа юу илгээх вэ?", en: "What to include when asking for care advice" },
        paragraphs: [{
          mn: "Эдлэлийн код, бүтэн зураг, асуудалтай хэсгийн ойрын зураг, өмнө нь хэрэглэсэн арчилгааны бодисын мэдээлэл байвал хамт илгээгээрэй. Аягыг хүнсэнд, эмээлийг уналгад ашиглах боломжийг цэвэрлэгээний зөвлөгөөнөөс тусад нь баталгаажуулна. Зөвхөн харагдах хэлбэр нь хэрэглээний аюулгүй байдлыг тогтоохгүй.",
          en: "Include the piece reference, an overall photograph, a close-up of the area and any known previous cleaning products. Confirm food use for a bowl or riding use for a saddle separately from cleaning advice. Appearance alone does not establish suitability for practical use.",
        }],
      },
    ],
  },
];

export function articleBySlug(slug: string) {
  return articles.find((article) => article.slug === slug);
}
