// PRODUCTS DATA — برای فروشگاه ایرانی استایل
window.PRODUCTS = [
  {
    id: 0,
    name: "تیشرت Liquid Void",
    en: "Liquid Void T-Shirt",
    category: "پوشاک",
    price: 980000,
    oldPrice: 1250000,
    stock: 12,
    sizes: ["S","M","L","XL","XXL"],
    colors: [{name:"مشکی", hex:"#0a0a0f"}, {name:"سفید", hex:"#f7f2e8"}, {name:"ماژنتا", hex:"#ff2d95"}],
    rating: 4.7,
    reviewsCount: 34,
    badge: "NEW • PSYCH",
    img: "images/merch-tshirt.jpg",
    gallery: ["images/merch-tshirt.jpg","images/hero-steel.jpg","images/psych-bg.jpg"],
    desc: "پنبه ارگانیک 100%، چاپ مایع ماژنتا+سیان با جوهر نئون. پشتش پرتال چشم. تو تاریکی گلو میده. مناسب استیج و خیابون.",
    specs: [
      ["جنس", "پنبه ارگانیک سنگین 210gsm"],
      ["چاپ", "سیلک اسکرین نئون + شب‌تاب"],
      ["شستشو", "۳۰ درجه، پشت و رو"],
      ["برند", "OMID RASTAR OFFICIAL"]
    ],
    features: ["ارسال رایگان", "۷ روز ضمانت بازگشت", "موجود در انبار تهران"]
  },
  {
    id: 1,
    name: "هودی Portal",
    en: "Portal Hoodie",
    category: "پوشاک",
    price: 2100000,
    oldPrice: 0,
    stock: 5,
    sizes: ["M","L","XL"],
    colors: [{name:"مشکی", hex:"#0a0a0f"}, {name:"ذغالی", hex:"#2a2a32"}],
    rating: 4.9,
    reviewsCount: 21,
    badge: "LIMITED",
    img: "images/merch-hoodie.jpg",
    gallery: ["images/merch-hoodie.jpg","images/back-steel.jpg"],
    desc: "هودی سنگین 400 گرم، داخل کرکی، گرافیک چشم سایکدلیک با نخ شب‌تاب لایم. برای شبای سرد استیج.",
    specs: [
      ["جنس", "دورس سه نخ پنبه 400gsm"],
      ["جیب", "کانگورویی + زیپ مخفی"],
      ["سایزبندی", "Oversize - راهنمای سایز ببین"],
      ["چاپ", "گلدوزی + سیلک"]
    ],
    features: ["موجودی محدود", "ارسال فوری", "۷ روز بازگشت"]
  },
  {
    id: 2,
    name: "وینیل Prism Dust — نئون",
    en: "Prism Dust Neon Vinyl",
    category: "وینیل",
    price: 3600000,
    oldPrice: 4200000,
    stock: 3,
    sizes: ["180g"],
    colors: [{name:"ماژنتا شفاف", hex:"#ff2d95"}, {name:"سیان شفاف", hex:"#00ffd1"}],
    rating: 5.0,
    reviewsCount: 12,
    badge: "VINYL • 180g",
    img: "images/merch-vinyl.jpg",
    gallery: ["images/merch-vinyl.jpg","images/album1.jpg","images/psych-portal.jpg"],
    desc: "صفحه شفاف ماژنتا/سیان 180 گرمی، کاور هولوگرافیک با امضای راستار + پوستر داخلی و کد دانلود دیجیتال.",
    specs: [
      ["وزن", "180 گرم - Audiophile"],
      ["رنگ صفحه", "ماژنتا/سیان شفاف - تیراژ 300"],
      ["محتویات", "پوستر + اینسرت + کد FLAC"],
      ["لیبل", "Void Records - 1404"]
    ],
    features: ["تیراژ محدود", "شماره‌دار", "ارسال با قاب ضد خش"]
  },
  {
    id: 3,
    name: "ست پیک‌های پرتالی",
    en: "Portal Guitar Picks Set",
    category: "اکسسوری",
    price: 320000,
    oldPrice: 0,
    stock: 28,
    sizes: ["0.73mm","1.0mm"],
    colors: [{name:"ماژنتا", hex:"#ff2d95"}, {name:"سیان", hex:"#00ffd1"}, {name:"لایم", hex:"#d9ff00"}, {name:"مشکی", hex:"#0a0a0f"}],
    rating: 4.6,
    reviewsCount: 56,
    badge: "PICK SET",
    img: "images/merch-picks.jpg",
    gallery: ["images/merch-picks.jpg"],
    desc: "۶ پیک سلولوئید با رنگای ماژنتا، سیان، لایم، بنفش، نارنجی، مشکی مات. لوگوی بال‌دار حک شده.",
    specs: [
      ["تعداد", "۶ عدد"],
      ["ضخامت", "0.73mm و 1.0mm"],
      ["جنس", "سلولوئید - گریپ مات"],
      ["طرح", "لوگوی OMID RASTAR"]
    ],
    features: ["موجود", "ارسال امروز", "هدیه عالی برای گیتاریست"]
  }
];

window.PRODUCT_REVIEWS = [
  {user:"سینا ★", avatar:"S", rating:5, date:"۱۴۰۴/۰۵/۲۰", text:"کیفیت چاپش دیوونست! تو کنسرت همه میپرسیدن از کجا خریدی. پارچه‌ش هم خیلی سنگینه و مشتی.", images:[]},
  {user:"آرش راکر", avatar:"آ", rating:5, date:"۱۴۰۴/۰۵/۱۲", text:"وینیلش حرف نداره، صداش گرم و پره. کاور هولوگرافیکشم تو نور میدرخشه. پیشنهاد میکنم.", images:[]},
  {user:"نیلوفر", avatar:"ن", rating:4, date:"۱۴۰۴/۰۴/۲۸", text:"سایز M دقیقا اندازه بود، راهنمای سایز خیلی کمک کرد. فقط ارسالش ۲ روز طول کشید.", images:[]},
  {user:"کیان", avatar:"ک", rating:4, date:"۱۴۰۴/۰۴/۱۵", text:"هودی Portal فوق‌العادست، شب‌تابش تو تاریکی جواب میده. گرم و راحت.", images:[]}
];

window.PRODUCT_QA = [
  {q:"سایز تیشرت Oversize هست یا فیت؟", a:"فیت معمولیه ولی اگه استایل راحت دوست داری یه سایز بزرگتر بردار. جدول سایز تو صفحه محصول هست.", asker:"امیر"},
  {q:"وینیل با گرامافون معمولی هم پخش میشه؟", a:"آره، 33 دور استاندارده. فقط سوزن سالم باشه چون 180 گرمی سنگینه.", asker:"سارا"},
  {q:"ارسال به شهرستان چقدر طول میکشه؟", a:"تهران امروز/فردا، شهرستان ۲-۳ روز کاری با تیپاکس. رایگانه.", asker:"مهدی"}
];
