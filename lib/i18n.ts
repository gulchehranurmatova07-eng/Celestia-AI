export const LANGS = ["en", "ru", "zh", "uz", "tr"] as const;
export type LangCode = (typeof LANGS)[number];

export const DEFAULT_LANG: LangCode = "en";

export const LANG_META: Record<LangCode, { label: string; short: string; htmlLang: string }> = {
  en: { label: "English", short: "EN", htmlLang: "en" },
  ru: { label: "Русский", short: "RU", htmlLang: "ru" },
  zh: { label: "中文", short: "中文", htmlLang: "zh-CN" },
  uz: { label: "O‘zbek", short: "UZ", htmlLang: "uz-Latn" },
  tr: { label: "Türkçe", short: "TR", htmlLang: "tr" },
};

export function isLang(value: unknown): value is LangCode {
  return typeof value === "string" && (LANGS as readonly string[]).includes(value);
}

type Feature = { title: string; text: string };
type Service = { title: string; text: string };

export type Dictionary = {
  tagline: string;
  motto: string;
  brandSub: string;
  navServices: string;
  navPricing: string;
  navContact: string;
  heroTitleA: string;
  heroTitleB: string;
  heroText: string;
  startConversation: string;
  chooseLanguage: string;
  popularQuestions: string;
  suggestions: [string, string, string];
  orbTooltip: string;
  features: [Feature, Feature, Feature, Feature];
  servicesTitle: string;
  servicesText: string;
  services: Service[];
  pricingTitle: string;
  pricingText: string;
  pricingNote: string;
  askPrice: string;
  showcaseTitle: string;
  showcaseText: string;
  showcaseAlts: [string, string, string];
  contactTitle: string;
  contactText: string;
  emailUs: string;
  telegramUs: string;
  founded: string;
  rights: string;
  // Chat
  assistantSubtitle: string;
  online: string;
  welcome: string;
  placeholder: string;
  send: string;
  minimize: string;
  clear: string;
  copy: string;
  copied: string;
  language: string;
  you: string;
  thinking: string;
  followUpTitle: string;
  followUps: string[];
  ctaTitle: string;
  ctaText: string;
  ctaDiscuss: string;
  ctaExplore: string;
  ctaEstimate: string;
  ctaPortfolio: string;
  ctaAnother: string;
  exploreMessage: string;
  estimateMessage: string;
  anotherPrompt: string;
  discussTitle: string;
  discussText: string;
  portfolioSoon: string;
  errNetwork: string;
  errServer: string;
  errRateLimit: string;
  errTooLong: string;
  errRefused: string;
  errNotConfiguredTitle: string;
  errNotConfiguredText: string;
  retry: string;
  disclaimer: string;
  openChat: string;
};

const en: Dictionary = {
  tagline: "We Build Websites. You Grow Your Business.",
  motto: "Building Tomorrow’s Digital Success, Today.",
  brandSub: "Your Digital Assistant by WEB-CREATORS",
  navServices: "Services",
  navPricing: "Pricing",
  navContact: "Contact",
  heroTitleA: "Meet Your Digital",
  heroTitleB: "Business Assistant.",
  heroText: "Ask anything about websites, services, pricing, and your next digital project.",
  startConversation: "Start Conversation",
  chooseLanguage: "Choose your language",
  popularQuestions: "Popular questions",
  suggestions: [
    "How much does a website cost?",
    "What services do you offer?",
    "Can you build a website for my business?",
  ],
  orbTooltip: "Ask Celestia AI anything.",
  features: [
    { title: "Instant Answers", text: "Clear answers about services, pricing and process — any time of day." },
    { title: "5 Languages", text: "English, Русский, 中文, O‘zbek and Türkçe." },
    { title: "Friendly & Helpful", text: "Plain-language explanations, even if websites are new to you." },
    { title: "Custom Solutions", text: "Explore the right website for your business and goals." },
  ],
  servicesTitle: "Everything about WEB-CREATORS — in one place.",
  servicesText: "Modern, fast and secure websites designed to support real business results.",
  services: [
    { title: "Custom Websites", text: "Tailored, brand-focused landing pages and multi-page sites." },
    { title: "Responsive Design", text: "Polished layouts for desktop, tablet and mobile." },
    { title: "Performance, Security & SEO", text: "Fast pages, secure practices and technical SEO foundations." },
    { title: "UI/UX Design", text: "Thoughtful user journeys and conversion-focused layouts." },
    { title: "E-Commerce", text: "Catalogs, product pages, cart and checkout integrations." },
    { title: "Maintenance & Support", text: "Updates, improvements and technical assistance." },
    { title: "Digital Business Solutions", text: "Restaurant, hotel and booking experiences, custom features." },
  ],
  pricingTitle: "Transparent starting point",
  pricingText: "The average website project at WEB-CREATORS costs around",
  pricingNote:
    "An indicative average, not a fixed quote. The final price depends on your goals, pages and features. Hosting, domains and third-party services are confirmed separately by the team.",
  askPrice: "Ask about my project",
  showcaseTitle: "Celestia AI in the spotlight",
  showcaseText: "A glimpse of the assistant behind WEB-CREATORS.",
  showcaseAlts: [
    "Celestia AI promotional artwork showing the assistant chat interface",
    "Celestia AI orb with headphones and an orbital ring, next to a sample chat",
    "Celestia AI brand poster with language options and sample conversation",
  ],
  contactTitle: "Ready to bring your idea to life? 🚀",
  contactText: "Let’s discuss your project with WEB-CREATORS.",
  emailUs: "Write on Gmail",
  telegramUs: "Message on Telegram",
  founded: "WEB-CREATORS was founded in 2026 by JackDaniel & DonAsadMoriarty.",
  rights: "All rights reserved.",
  assistantSubtitle: "WEB-CREATORS Assistant",
  online: "Online",
  welcome:
    "Hello! 👋 I’m Celestia AI, your personal assistant from WEB-CREATORS.\n\nI can tell you about our services, pricing and process, and help you get started with your website. Just ask me anything!",
  placeholder: "Type your message…",
  send: "Send",
  minimize: "Minimize chat",
  clear: "Clear chat",
  copy: "Copy",
  copied: "Copied",
  language: "Language",
  you: "You",
  thinking: "Celestia AI is thinking…",
  followUpTitle: "You might also ask",
  followUps: [
    "What’s the difference between a business website and an online store?",
    "Will my website work well on phones?",
    "What is SEO, in simple words?",
    "Can you build a restaurant website with online booking?",
    "Do you offer website maintenance?",
    "How do I get started?",
    "Who founded WEB-CREATORS?",
  ],
  ctaTitle: "Ready to bring your idea to life? 🚀",
  ctaText: "Let’s discuss your project with WEB-CREATORS.",
  ctaDiscuss: "Discuss My Project",
  ctaExplore: "Explore Services",
  ctaEstimate: "Get a Price Estimate",
  ctaPortfolio: "View Portfolio",
  ctaAnother: "Ask Another Question",
  exploreMessage: "What services do you offer?",
  estimateMessage: "I’d like a price estimate for my website.",
  anotherPrompt: "Sure — what else would you like to know?",
  discussTitle: "Talk to the team directly",
  discussText: "Send a short description of your project and the team will get back to you.",
  portfolioSoon: "The portfolio page is coming soon. Meanwhile, the team can share details via Gmail or Telegram.",
  errNetwork: "Connection lost. Check your internet and try again.",
  errServer: "Something went wrong on our side. Please try again.",
  errRateLimit: "You’re sending messages a bit fast. Please wait a moment and try again.",
  errTooLong: "That message is too long. Please keep it under 2,000 characters.",
  errRefused: "I can’t help with that request, but I’m happy to answer questions about websites and WEB-CREATORS.",
  errNotConfiguredTitle: "AI is not connected yet",
  errNotConfiguredText:
    "The site owner needs to add an ANTHROPIC_API_KEY on the server before Celestia AI can answer. Meanwhile, you can reach the team directly:",
  retry: "Retry",
  disclaimer: "Celestia AI can make mistakes. Prices are indicative — the team confirms final quotes. Chats are not saved.",
  openChat: "Open Celestia AI chat",
};

const ru: Dictionary = {
  tagline: "Мы создаём сайты. Вы развиваете бизнес.",
  motto: "Строим цифровой успех завтрашнего дня — уже сегодня.",
  brandSub: "Ваш цифровой ассистент от WEB-CREATORS",
  navServices: "Услуги",
  navPricing: "Цены",
  navContact: "Контакты",
  heroTitleA: "Познакомьтесь с вашим",
  heroTitleB: "цифровым бизнес-ассистентом.",
  heroText: "Спрашивайте о сайтах, услугах, ценах и вашем следующем цифровом проекте.",
  startConversation: "Начать разговор",
  chooseLanguage: "Выберите язык",
  popularQuestions: "Популярные вопросы",
  suggestions: [
    "Сколько стоит сайт?",
    "Какие услуги вы предлагаете?",
    "Можете сделать сайт для моего бизнеса?",
  ],
  orbTooltip: "Спросите Celestia AI о чём угодно.",
  features: [
    { title: "Мгновенные ответы", text: "Понятные ответы об услугах, ценах и процессе — в любое время." },
    { title: "5 языков", text: "English, Русский, 中文, O‘zbek и Türkçe." },
    { title: "Дружелюбно и полезно", text: "Простые объяснения, даже если вы впервые заказываете сайт." },
    { title: "Индивидуальные решения", text: "Подберём сайт под ваш бизнес и ваши цели." },
  ],
  servicesTitle: "Всё о WEB-CREATORS — в одном месте.",
  servicesText: "Современные, быстрые и безопасные сайты, которые работают на реальный результат.",
  services: [
    { title: "Сайты под ключ", text: "Индивидуальные лендинги и многостраничные сайты в стиле вашего бренда." },
    { title: "Адаптивный дизайн", text: "Отличный вид на компьютере, планшете и телефоне." },
    { title: "Скорость, безопасность и SEO", text: "Быстрые страницы, безопасная реализация и техническая база SEO." },
    { title: "UI/UX-дизайн", text: "Продуманные пользовательские сценарии и конверсионные макеты." },
    { title: "Интернет-магазины", text: "Каталоги, карточки товаров, корзина и оформление заказа." },
    { title: "Поддержка и обслуживание", text: "Обновления, улучшения и техническая помощь." },
    { title: "Цифровые решения для бизнеса", text: "Сайты ресторанов и отелей, бронирование, индивидуальные функции." },
  ],
  pricingTitle: "Понятная отправная точка",
  pricingText: "Средняя стоимость сайта в WEB-CREATORS — около",
  pricingNote:
    "Это ориентировочная средняя цена, а не фиксированное предложение. Итоговая стоимость зависит от целей, количества страниц и функций. Хостинг, домен и сторонние сервисы команда подтверждает отдельно.",
  askPrice: "Спросить о моём проекте",
  showcaseTitle: "Celestia AI в центре внимания",
  showcaseText: "Знакомьтесь с ассистентом WEB-CREATORS.",
  showcaseAlts: [
    "Промо-изображение Celestia AI с интерфейсом чата",
    "Сфера Celestia AI в наушниках с орбитальным кольцом рядом с примером чата",
    "Постер Celestia AI с выбором языков и примером диалога",
  ],
  contactTitle: "Готовы воплотить идею в жизнь? 🚀",
  contactText: "Давайте обсудим ваш проект с WEB-CREATORS.",
  emailUs: "Написать в Gmail",
  telegramUs: "Написать в Telegram",
  founded: "WEB-CREATORS основана в 2026 году — JackDaniel и DonAsadMoriarty.",
  rights: "Все права защищены.",
  assistantSubtitle: "Ассистент WEB-CREATORS",
  online: "В сети",
  welcome:
    "Здравствуйте! 👋 Я Celestia AI, ваш персональный ассистент от WEB-CREATORS.\n\nЯ расскажу об услугах, ценах и процессе работы и помогу начать проект вашего сайта. Спрашивайте что угодно!",
  placeholder: "Введите сообщение…",
  send: "Отправить",
  minimize: "Свернуть чат",
  clear: "Очистить чат",
  copy: "Копировать",
  copied: "Скопировано",
  language: "Язык",
  you: "Вы",
  thinking: "Celestia AI думает…",
  followUpTitle: "Можно также спросить",
  followUps: [
    "Чем бизнес-сайт отличается от интернет-магазина?",
    "Сайт будет хорошо работать на телефоне?",
    "Что такое SEO простыми словами?",
    "Можете сделать сайт ресторана с онлайн-бронированием?",
    "Вы занимаетесь поддержкой сайтов?",
    "С чего начать?",
    "Кто основал WEB-CREATORS?",
  ],
  ctaTitle: "Готовы воплотить идею в жизнь? 🚀",
  ctaText: "Давайте обсудим ваш проект с WEB-CREATORS.",
  ctaDiscuss: "Обсудить проект",
  ctaExplore: "Посмотреть услуги",
  ctaEstimate: "Узнать стоимость",
  ctaPortfolio: "Портфолио",
  ctaAnother: "Задать другой вопрос",
  exploreMessage: "Какие услуги вы предлагаете?",
  estimateMessage: "Хочу узнать примерную стоимость моего сайта.",
  anotherPrompt: "Конечно — что ещё вы хотели бы узнать?",
  discussTitle: "Свяжитесь с командой напрямую",
  discussText: "Отправьте короткое описание проекта, и команда ответит вам.",
  portfolioSoon: "Страница портфолио скоро появится. Пока подробности можно узнать у команды в Gmail или Telegram.",
  errNetwork: "Соединение потеряно. Проверьте интернет и попробуйте снова.",
  errServer: "Что-то пошло не так на нашей стороне. Попробуйте ещё раз.",
  errRateLimit: "Вы отправляете сообщения слишком быстро. Подождите немного и попробуйте снова.",
  errTooLong: "Сообщение слишком длинное. Пожалуйста, не более 2000 символов.",
  errRefused: "С этим запросом я помочь не могу, но с радостью отвечу на вопросы о сайтах и WEB-CREATORS.",
  errNotConfiguredTitle: "ИИ ещё не подключён",
  errNotConfiguredText:
    "Владельцу сайта нужно добавить ANTHROPIC_API_KEY на сервере, чтобы Celestia AI могла отвечать. А пока можно связаться с командой напрямую:",
  retry: "Повторить",
  disclaimer: "Celestia AI может ошибаться. Цены ориентировочные — окончательную стоимость подтверждает команда. Чаты не сохраняются.",
  openChat: "Открыть чат Celestia AI",
};

const zh: Dictionary = {
  tagline: "我们打造网站，您发展业务。",
  motto: "今天，就为明天的数字成功奠基。",
  brandSub: "WEB-CREATORS 为您打造的数字助手",
  navServices: "服务",
  navPricing: "价格",
  navContact: "联系我们",
  heroTitleA: "认识您的",
  heroTitleB: "数字商业助手。",
  heroText: "关于网站、服务、价格以及您的下一个数字项目，尽管问。",
  startConversation: "开始对话",
  chooseLanguage: "选择语言",
  popularQuestions: "热门问题",
  suggestions: ["做一个网站要多少钱？", "你们提供哪些服务？", "你们能为我的企业做网站吗？"],
  orbTooltip: "有问题尽管问 Celestia AI。",
  features: [
    { title: "即时解答", text: "随时清晰解答服务、价格和流程相关问题。" },
    { title: "5 种语言", text: "English、Русский、中文、O‘zbek 和 Türkçe。" },
    { title: "友好贴心", text: "即使您不熟悉网站，也能用通俗的语言为您讲解。" },
    { title: "定制方案", text: "帮您找到最适合您业务和目标的网站。" },
  ],
  servicesTitle: "关于 WEB-CREATORS 的一切，尽在这里。",
  servicesText: "现代、快速、安全的网站，助力真实的业务成果。",
  services: [
    { title: "定制网站", text: "贴合品牌的着陆页和多页面网站。" },
    { title: "响应式设计", text: "在电脑、平板和手机上都精致美观。" },
    { title: "性能、安全与 SEO", text: "快速加载、安全实现与技术 SEO 基础。" },
    { title: "UI/UX 设计", text: "精心设计的用户旅程和高转化布局。" },
    { title: "电子商务", text: "商品目录、商品详情页、购物车与结账集成。" },
    { title: "维护与支持", text: "网站更新、优化与技术协助。" },
    { title: "数字商业方案", text: "餐厅与酒店网站、预订体验及定制功能。" },
  ],
  pricingTitle: "清晰的起点",
  pricingText: "WEB-CREATORS 网站项目的平均价格约为",
  pricingNote: "这是参考平均价，并非固定报价。最终价格取决于您的目标、页面数量和功能。主机、域名及第三方服务费用需由团队另行确认。",
  askPrice: "咨询我的项目",
  showcaseTitle: "聚焦 Celestia AI",
  showcaseText: "一睹 WEB-CREATORS 背后的智能助手。",
  showcaseAlts: [
    "展示聊天界面的 Celestia AI 宣传图",
    "戴着耳机、环绕光环的 Celestia AI 球体及聊天示例",
    "带有语言选项和对话示例的 Celestia AI 品牌海报",
  ],
  contactTitle: "准备好将创意变为现实了吗？🚀",
  contactText: "和 WEB-CREATORS 聊聊您的项目吧。",
  emailUs: "通过 Gmail 联系",
  telegramUs: "通过 Telegram 联系",
  founded: "WEB-CREATORS 由 JackDaniel 与 DonAsadMoriarty 于 2026 年创立。",
  rights: "保留所有权利。",
  assistantSubtitle: "WEB-CREATORS 助手",
  online: "在线",
  welcome:
    "您好！👋 我是 Celestia AI，来自 WEB-CREATORS 的专属助手。\n\n我可以为您介绍我们的服务、价格和流程，并帮助您开启网站项目。有任何问题尽管问我！",
  placeholder: "输入您的消息…",
  send: "发送",
  minimize: "最小化聊天",
  clear: "清空聊天",
  copy: "复制",
  copied: "已复制",
  language: "语言",
  you: "您",
  thinking: "Celestia AI 正在思考…",
  followUpTitle: "您还可以问",
  followUps: [
    "企业网站和网上商店有什么区别？",
    "我的网站在手机上也能好用吗？",
    "用简单的话说，什么是 SEO？",
    "你们能做带在线预订的餐厅网站吗？",
    "你们提供网站维护服务吗？",
    "我该如何开始？",
    "WEB-CREATORS 是谁创立的？",
  ],
  ctaTitle: "准备好将创意变为现实了吗？🚀",
  ctaText: "和 WEB-CREATORS 聊聊您的项目吧。",
  ctaDiscuss: "洽谈我的项目",
  ctaExplore: "了解服务",
  ctaEstimate: "获取价格估算",
  ctaPortfolio: "查看作品集",
  ctaAnother: "问其他问题",
  exploreMessage: "你们提供哪些服务？",
  estimateMessage: "我想估算一下我的网站价格。",
  anotherPrompt: "当然——您还想了解什么？",
  discussTitle: "直接联系团队",
  discussText: "发送一段简短的项目描述，团队会尽快回复您。",
  portfolioSoon: "作品集页面即将上线。在此之前，您可以通过 Gmail 或 Telegram 向团队了解详情。",
  errNetwork: "连接已断开。请检查网络后重试。",
  errServer: "我们这边出了点问题，请重试。",
  errRateLimit: "您发送消息有点快，请稍等片刻再试。",
  errTooLong: "消息太长了，请控制在 2000 个字符以内。",
  errRefused: "这个请求我无法提供帮助，但很乐意回答关于网站和 WEB-CREATORS 的问题。",
  errNotConfiguredTitle: "AI 尚未连接",
  errNotConfiguredText: "网站所有者需要在服务器上配置 ANTHROPIC_API_KEY，Celestia AI 才能回答。在此期间，您可以直接联系团队：",
  retry: "重试",
  disclaimer: "Celestia AI 可能会出错。价格仅供参考，最终报价由团队确认。聊天记录不会被保存。",
  openChat: "打开 Celestia AI 聊天",
};

const uz: Dictionary = {
  tagline: "Biz veb-saytlar yaratamiz. Siz biznesingizni rivojlantirasiz.",
  motto: "Ertangi raqamli muvaffaqiyatni bugun quramiz.",
  brandSub: "WEB-CREATORS’dan raqamli yordamchingiz",
  navServices: "Xizmatlar",
  navPricing: "Narxlar",
  navContact: "Aloqa",
  heroTitleA: "Raqamli biznes",
  heroTitleB: "yordamchingiz bilan tanishing.",
  heroText: "Veb-saytlar, xizmatlar, narxlar va keyingi raqamli loyihangiz haqida istalgan savolni bering.",
  startConversation: "Suhbatni boshlash",
  chooseLanguage: "Tilni tanlang",
  popularQuestions: "Ko‘p beriladigan savollar",
  suggestions: [
    "Veb-sayt qancha turadi?",
    "Qanday xizmatlarni taklif qilasiz?",
    "Biznesim uchun veb-sayt yaratib bera olasizmi?",
  ],
  orbTooltip: "Celestia AI’dan istalgan narsani so‘rang.",
  features: [
    { title: "Tezkor javoblar", text: "Xizmatlar, narxlar va ish jarayoni haqida aniq javoblar — istalgan vaqtda." },
    { title: "5 ta til", text: "English, Русский, 中文, O‘zbek va Türkçe." },
    { title: "Samimiy va foydali", text: "Veb-saytlar siz uchun yangi bo‘lsa ham, oddiy tilda tushuntiramiz." },
    { title: "Individual yechimlar", text: "Biznesingiz va maqsadlaringizga mos saytni tanlashga yordam beramiz." },
  ],
  servicesTitle: "WEB-CREATORS haqida hammasi — bir joyda.",
  servicesText: "Haqiqiy biznes natijalariga xizmat qiladigan zamonaviy, tez va xavfsiz veb-saytlar.",
  services: [
    { title: "Individual veb-saytlar", text: "Brendingizga mos landing sahifalar va ko‘p sahifali saytlar." },
    { title: "Moslashuvchan dizayn", text: "Kompyuter, planshet va telefonda chiroyli ko‘rinish." },
    { title: "Tezlik, xavfsizlik va SEO", text: "Tez sahifalar, xavfsiz yondashuv va texnik SEO asoslari." },
    { title: "UI/UX dizayn", text: "O‘ylangan foydalanuvchi yo‘li va konversiyaga yo‘naltirilgan maketlar." },
    { title: "Internet-do‘konlar", text: "Kataloglar, mahsulot sahifalari, savat va to‘lov integratsiyasi." },
    { title: "Texnik xizmat va qo‘llab-quvvatlash", text: "Yangilanishlar, takomillashtirish va texnik yordam." },
    { title: "Raqamli biznes yechimlari", text: "Restoran va mehmonxona saytlari, bron qilish, maxsus funksiyalar." },
  ],
  pricingTitle: "Aniq boshlanish nuqtasi",
  pricingText: "WEB-CREATORS’da veb-sayt loyihasining o‘rtacha narxi taxminan",
  pricingNote:
    "Bu taxminiy o‘rtacha narx, qat’iy taklif emas. Yakuniy narx maqsadlaringiz, sahifalar soni va funksiyalarga bog‘liq. Xosting, domen va uchinchi tomon xizmatlarini jamoa alohida tasdiqlaydi.",
  askPrice: "Loyiham haqida so‘rash",
  showcaseTitle: "Diqqat markazida — Celestia AI",
  showcaseText: "WEB-CREATORS yordamchisi bilan tanishing.",
  showcaseAlts: [
    "Celestia AI chat interfeysi tasvirlangan reklama rasmi",
    "Quloqchinli va orbital halqali Celestia AI sferasi hamda chat namunasi",
    "Til tanlovi va suhbat namunasi tasvirlangan Celestia AI posteri",
  ],
  contactTitle: "G‘oyangizni hayotga tatbiq etishga tayyormisiz? 🚀",
  contactText: "Loyihangizni WEB-CREATORS bilan muhokama qilaylik.",
  emailUs: "Gmail orqali yozish",
  telegramUs: "Telegram orqali yozish",
  founded: "WEB-CREATORS 2026-yilda JackDaniel va DonAsadMoriarty tomonidan asos solingan.",
  rights: "Barcha huquqlar himoyalangan.",
  assistantSubtitle: "WEB-CREATORS yordamchisi",
  online: "Onlayn",
  welcome:
    "Assalomu alaykum! 👋 Men Celestia AI — WEB-CREATORS’ning shaxsiy yordamchingizman.\n\nXizmatlarimiz, narxlar va ish jarayoni haqida aytib beraman hamda veb-saytingizni boshlashga yordam beraman. Istalgan savolingizni bering!",
  placeholder: "Xabaringizni yozing…",
  send: "Yuborish",
  minimize: "Chatni yig‘ish",
  clear: "Chatni tozalash",
  copy: "Nusxalash",
  copied: "Nusxalandi",
  language: "Til",
  you: "Siz",
  thinking: "Celestia AI o‘ylamoqda…",
  followUpTitle: "Bularni ham so‘rashingiz mumkin",
  followUps: [
    "Biznes sayt va internet-do‘kon o‘rtasida qanday farq bor?",
    "Saytim telefonda ham yaxshi ishlaydimi?",
    "SEO nima, oddiy qilib aytganda?",
    "Onlayn bron qilish imkoniyati bor restoran sayti yarata olasizmi?",
    "Saytlarga texnik xizmat ko‘rsatasizmi?",
    "Qanday boshlasam bo‘ladi?",
    "WEB-CREATORS’ga kim asos solgan?",
  ],
  ctaTitle: "G‘oyangizni hayotga tatbiq etishga tayyormisiz? 🚀",
  ctaText: "Loyihangizni WEB-CREATORS bilan muhokama qilaylik.",
  ctaDiscuss: "Loyihamni muhokama qilish",
  ctaExplore: "Xizmatlar bilan tanishish",
  ctaEstimate: "Narxni taxminlash",
  ctaPortfolio: "Portfolioni ko‘rish",
  ctaAnother: "Boshqa savol berish",
  exploreMessage: "Qanday xizmatlarni taklif qilasiz?",
  estimateMessage: "Saytim uchun taxminiy narxni bilmoqchiman.",
  anotherPrompt: "Albatta — yana nimani bilishni xohlaysiz?",
  discussTitle: "Jamoa bilan to‘g‘ridan-to‘g‘ri bog‘laning",
  discussText: "Loyihangiz haqida qisqacha yozib yuboring — jamoa sizga javob beradi.",
  portfolioSoon: "Portfolio sahifasi tez orada ishga tushadi. Hozircha batafsil ma’lumotni Gmail yoki Telegram orqali jamoadan olishingiz mumkin.",
  errNetwork: "Aloqa uzildi. Internetni tekshirib, qayta urinib ko‘ring.",
  errServer: "Bizning tomonda nimadir xato ketdi. Iltimos, qayta urinib ko‘ring.",
  errRateLimit: "Xabarlarni biroz tez yuboryapsiz. Bir oz kutib, qayta urinib ko‘ring.",
  errTooLong: "Xabar juda uzun. Iltimos, 2000 belgidan oshirmang.",
  errRefused: "Bu so‘rovda yordam bera olmayman, lekin veb-saytlar va WEB-CREATORS haqidagi savollarga mamnuniyat bilan javob beraman.",
  errNotConfiguredTitle: "AI hali ulanmagan",
  errNotConfiguredText:
    "Celestia AI javob berishi uchun sayt egasi serverga ANTHROPIC_API_KEY qo‘shishi kerak. Hozircha jamoa bilan to‘g‘ridan-to‘g‘ri bog‘lanishingiz mumkin:",
  retry: "Qayta urinish",
  disclaimer: "Celestia AI xato qilishi mumkin. Narxlar taxminiy — yakuniy narxni jamoa tasdiqlaydi. Suhbatlar saqlanmaydi.",
  openChat: "Celestia AI chatini ochish",
};

const tr: Dictionary = {
  tagline: "Biz Web Siteleri Kuruyoruz. Siz İşinizi Büyütüyorsunuz.",
  motto: "Yarının Dijital Başarısını Bugünden İnşa Ediyoruz.",
  brandSub: "WEB-CREATORS’tan Dijital Asistanınız",
  navServices: "Hizmetler",
  navPricing: "Fiyatlar",
  navContact: "İletişim",
  heroTitleA: "Dijital İş Asistanınızla",
  heroTitleB: "Tanışın.",
  heroText: "Web siteleri, hizmetler, fiyatlar ve bir sonraki dijital projeniz hakkında her şeyi sorun.",
  startConversation: "Sohbete Başla",
  chooseLanguage: "Dilinizi seçin",
  popularQuestions: "Popüler sorular",
  suggestions: [
    "Bir web sitesi ne kadar tutar?",
    "Hangi hizmetleri sunuyorsunuz?",
    "İşletmem için web sitesi yapabilir misiniz?",
  ],
  orbTooltip: "Celestia AI’a dilediğinizi sorun.",
  features: [
    { title: "Anında Yanıtlar", text: "Hizmetler, fiyatlar ve süreç hakkında net yanıtlar — günün her saati." },
    { title: "5 Dil", text: "English, Русский, 中文, O‘zbek ve Türkçe." },
    { title: "Samimi ve Yardımsever", text: "Web siteleri size yeni olsa bile sade bir dille anlatım." },
    { title: "Özel Çözümler", text: "İşletmenize ve hedeflerinize uygun web sitesini birlikte bulalım." },
  ],
  servicesTitle: "WEB-CREATORS hakkında her şey — tek bir yerde.",
  servicesText: "Gerçek iş sonuçlarını destekleyen modern, hızlı ve güvenli web siteleri.",
  services: [
    { title: "Özel Web Siteleri", text: "Markanıza özel açılış sayfaları ve çok sayfalı siteler." },
    { title: "Duyarlı Tasarım", text: "Masaüstü, tablet ve mobilde kusursuz görünüm." },
    { title: "Performans, Güvenlik ve SEO", text: "Hızlı sayfalar, güvenli uygulamalar ve teknik SEO temelleri." },
    { title: "UI/UX Tasarım", text: "Özenle kurgulanmış kullanıcı yolculukları ve dönüşüm odaklı düzenler." },
    { title: "E-Ticaret", text: "Ürün katalogları, ürün sayfaları, sepet ve ödeme entegrasyonları." },
    { title: "Bakım ve Destek", text: "Güncellemeler, iyileştirmeler ve teknik yardım." },
    { title: "Dijital İş Çözümleri", text: "Restoran ve otel siteleri, rezervasyon deneyimleri, özel özellikler." },
  ],
  pricingTitle: "Şeffaf bir başlangıç noktası",
  pricingText: "WEB-CREATORS’ta ortalama bir web sitesi projesinin maliyeti yaklaşık",
  pricingNote:
    "Bu, sabit bir teklif değil, yaklaşık bir ortalamadır. Nihai fiyat hedeflerinize, sayfa sayısına ve özelliklere bağlıdır. Barındırma, alan adı ve üçüncü taraf hizmetler ekip tarafından ayrıca teyit edilir.",
  askPrice: "Projemi sor",
  showcaseTitle: "Spot ışığında: Celestia AI",
  showcaseText: "WEB-CREATORS’ın arkasındaki asistana bir bakış.",
  showcaseAlts: [
    "Sohbet arayüzünü gösteren Celestia AI tanıtım görseli",
    "Kulaklıklı ve yörünge halkalı Celestia AI küresi ile örnek sohbet",
    "Dil seçenekleri ve örnek sohbet içeren Celestia AI marka posteri",
  ],
  contactTitle: "Fikrinizi hayata geçirmeye hazır mısınız? 🚀",
  contactText: "Projenizi WEB-CREATORS ile konuşalım.",
  emailUs: "Gmail ile yazın",
  telegramUs: "Telegram’dan yazın",
  founded: "WEB-CREATORS, 2026 yılında JackDaniel ve DonAsadMoriarty tarafından kuruldu.",
  rights: "Tüm hakları saklıdır.",
  assistantSubtitle: "WEB-CREATORS Asistanı",
  online: "Çevrimiçi",
  welcome:
    "Merhaba! 👋 Ben Celestia AI, WEB-CREATORS’tan kişisel asistanınız.\n\nHizmetlerimizi, fiyatlarımızı ve sürecimizi anlatabilir, web sitenize başlamanıza yardımcı olabilirim. Bana dilediğinizi sorun!",
  placeholder: "Mesajınızı yazın…",
  send: "Gönder",
  minimize: "Sohbeti küçült",
  clear: "Sohbeti temizle",
  copy: "Kopyala",
  copied: "Kopyalandı",
  language: "Dil",
  you: "Siz",
  thinking: "Celestia AI düşünüyor…",
  followUpTitle: "Şunları da sorabilirsiniz",
  followUps: [
    "Kurumsal site ile online mağaza arasındaki fark nedir?",
    "Sitem telefonlarda da iyi çalışır mı?",
    "Basitçe SEO nedir?",
    "Online rezervasyonlu restoran sitesi yapabilir misiniz?",
    "Web sitesi bakım hizmeti sunuyor musunuz?",
    "Nasıl başlayabilirim?",
    "WEB-CREATORS’ı kim kurdu?",
  ],
  ctaTitle: "Fikrinizi hayata geçirmeye hazır mısınız? 🚀",
  ctaText: "Projenizi WEB-CREATORS ile konuşalım.",
  ctaDiscuss: "Projemi Konuşalım",
  ctaExplore: "Hizmetleri Keşfet",
  ctaEstimate: "Fiyat Tahmini Al",
  ctaPortfolio: "Portföyü Gör",
  ctaAnother: "Başka Bir Soru Sor",
  exploreMessage: "Hangi hizmetleri sunuyorsunuz?",
  estimateMessage: "Web sitem için bir fiyat tahmini almak istiyorum.",
  anotherPrompt: "Elbette — başka ne öğrenmek istersiniz?",
  discussTitle: "Ekiple doğrudan iletişime geçin",
  discussText: "Projenizi kısaca anlatan bir mesaj gönderin, ekip size dönüş yapsın.",
  portfolioSoon: "Portföy sayfası çok yakında yayında. Bu arada ayrıntıları Gmail veya Telegram üzerinden ekipten öğrenebilirsiniz.",
  errNetwork: "Bağlantı kesildi. İnternetinizi kontrol edip tekrar deneyin.",
  errServer: "Bizim tarafımızda bir sorun oluştu. Lütfen tekrar deneyin.",
  errRateLimit: "Mesajları biraz hızlı gönderiyorsunuz. Lütfen biraz bekleyip tekrar deneyin.",
  errTooLong: "Mesaj çok uzun. Lütfen 2.000 karakteri geçmeyin.",
  errRefused: "Bu istekte yardımcı olamıyorum, ancak web siteleri ve WEB-CREATORS hakkındaki sorularınızı memnuniyetle yanıtlarım.",
  errNotConfiguredTitle: "Yapay zekâ henüz bağlı değil",
  errNotConfiguredText:
    "Celestia AI’ın yanıt verebilmesi için site sahibinin sunucuya ANTHROPIC_API_KEY eklemesi gerekiyor. Bu arada ekiple doğrudan iletişime geçebilirsiniz:",
  retry: "Tekrar dene",
  disclaimer: "Celestia AI hata yapabilir. Fiyatlar yaklaşıktır — nihai teklifi ekip onaylar. Sohbetler kaydedilmez.",
  openChat: "Celestia AI sohbetini aç",
};

export const DICTIONARIES: Record<LangCode, Dictionary> = { en, ru, zh, uz, tr };

/**
 * Best-effort guess of the language of a short message. Returns null when the
 * text gives no clear signal, so the caller can keep the current language and
 * let the assistant ask politely.
 */
export function detectLanguage(text: string): LangCode | null {
  const sample = text.toLowerCase();
  if (/[一-鿿]/.test(sample)) return "zh";
  if (/[Ѐ-ӿ]/.test(sample)) {
    // Uzbek Cyrillic letters that Russian does not use.
    if (/[ўқғҳ]/.test(sample)) return "uz";
    return "ru";
  }
  const words = sample.match(/[\p{L}‘’'ʻ`-]+/gu) ?? [];
  if (words.length === 0) return null;

  const score = (pattern: RegExp, vocab: string[]) =>
    words.filter((w) => vocab.includes(w)).length + (pattern.test(sample) ? 2 : 0);

  const scores: Record<"en" | "uz" | "tr", number> = {
    tr: score(/[ğış]|İ/u, [
      "merhaba", "bir", "ve", "ne", "kadar", "nasıl", "nedir", "için", "mı", "mi", "mu", "mü", "fiyat", "site", "sitesi",
      "hizmet", "hizmetler", "istiyorum", "yapabilir", "misiniz", "teşekkürler", "evet", "hayır", "selam",
    ]),
    uz: score(/[og][‘’'ʻ`]/u, [
      "salom", "assalomu", "alaykum", "qancha", "narxi", "narx", "sayt", "veb-sayt", "uchun", "qanday", "nima", "men",
      "biz", "rahmat", "kerak", "xizmat", "xizmatlar", "bormi", "yo‘q", "ha", "qilasiz", "beradi", "turadi",
    ]),
    en: score(/\b(the|is|are|you|what|how)\b/, [
      "hello", "hi", "hey", "how", "what", "much", "does", "website", "price", "cost", "services", "can", "you",
      "the", "is", "are", "my", "for", "do", "need", "thanks", "yes", "no", "want", "build",
    ]),
  };
  const ranked = (Object.entries(scores) as ["en" | "uz" | "tr", number][]).sort((a, b) => b[1] - a[1]);
  const [best, second] = ranked;
  if (best[1] === 0 || best[1] === second[1]) return null;
  return best[0];
}
