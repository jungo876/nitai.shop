export type Language = "en" | "bn";

export const translations = {
  en: {
    // Navbar
    nav_home: "Home",
    nav_products: "Products",

    // Hero
    hero_badge: "B2B Pesticide Distribution",
    hero_title_1: "Quality Crop Protection",
    hero_title_2: "Solutions",
    hero_description:
      "Trusted wholesale supplier of premium insecticides, fungicides, herbicides, and fertilizers. Order directly via WhatsApp — fast, easy, and reliable.",
    hero_browse: "Browse Products",
    hero_contact: "Contact Us",

    // Stats
    stat_products: "Products",
    stat_categories: "Categories",
    stat_dealers: "Dealers Served",
    stat_years: "Years Trust",

    // Products Section
    products_title: "Our Products",
    products_subtitle: "Browse our complete catalog of crop protection solutions.",
    products_all: "All",
    products_empty_title: "No products yet",
    products_empty_text: "Products will appear here once added via the admin panel.",
    products_error_title: "Failed to load products",
    products_no_category: "No products in this category.",
    products_order_whatsapp: "Order on WhatsApp",

    // Categories
    cat_insecticide: "Insecticide",
    cat_fungicide: "Fungicide",
    cat_herbicide: "Herbicide",
    cat_fertilizer: "Fertilizer",
    cat_plant_growth: "Plant Growth Regulator",
    cat_bio_pesticide: "Bio Pesticide",
    cat_rodenticide: "Rodenticide",
    cat_seed_treatment: "Seed Treatment",
    cat_other: "Other",

    // Footer
    footer_rights: "All rights reserved. B2B Pesticide Distribution.",

    // Hero Carousel Slides
    slide1_heading: "Trusted Pesticide Distributor",
    slide1_subtext: "Serving 200+ dealers with premium quality insecticides, fungicides, and herbicides across the region.",
    slide1_cta: "View Products",
    slide2_heading: "Best Quality Agro Products",
    slide2_subtext: "Wide range of certified crop protection solutions from leading manufacturers at competitive wholesale prices.",
    slide2_cta: "Explore Catalog",
    slide3_heading: "Fast Delivery to Your Shop",
    slide3_subtext: "Reliable supply chain ensuring your stock never runs out. Order via WhatsApp and get doorstep delivery.",
    slide3_cta: "Order Now",

    // Language
    lang_toggle: "বাংলা",
  },
  bn: {
    // Navbar
    nav_home: "হোম",
    nav_products: "পণ্যসমূহ",

    // Hero
    hero_badge: "B2B কীটনাশক পরিবেশক",
    hero_title_1: "মানসম্পন্ন ফসল সুরক্ষা",
    hero_title_2: "সমাধান",
    hero_description:
      "প্রিমিয়াম কীটনাশক, ছত্রাকনাশক, আগাছানাশক এবং সারের বিশ্বস্ত পাইকারি সরবরাহকারী। WhatsApp-এর মাধ্যমে সরাসরি অর্ডার করুন — দ্রুত, সহজ এবং নির্ভরযোগ্য।",
    hero_browse: "পণ্য দেখুন",
    hero_contact: "যোগাযোগ করুন",

    // Stats
    stat_products: "পণ্য",
    stat_categories: "বিভাগ",
    stat_dealers: "ডিলার সেবা",
    stat_years: "বছরের বিশ্বাস",

    // Products Section
    products_title: "আমাদের পণ্যসমূহ",
    products_subtitle: "ফসল সুরক্ষা সমাধানের সম্পূর্ণ ক্যাটালগ দেখুন।",
    products_all: "সব",
    products_empty_title: "এখনো কোনো পণ্য নেই",
    products_empty_text: "অ্যাডমিন প্যানেলের মাধ্যমে যোগ করা হলে পণ্যগুলি এখানে দেখা যাবে।",
    products_error_title: "পণ্য লোড করতে ব্যর্থ",
    products_no_category: "এই বিভাগে কোনো পণ্য নেই।",
    products_order_whatsapp: "WhatsApp-এ অর্ডার করুন",

    // Categories
    cat_insecticide: "কীটনাশক",
    cat_fungicide: "ছত্রাকনাশক",
    cat_herbicide: "আগাছানাশক",
    cat_fertilizer: "সার",
    cat_plant_growth: "উদ্ভিদ বৃদ্ধি নিয়ন্ত্রক",
    cat_bio_pesticide: "জৈব কীটনাশক",
    cat_rodenticide: "ইঁদুরনাশক",
    cat_seed_treatment: "বীজ শোধন",
    cat_other: "অন্যান্য",

    // Footer
    footer_rights: "সর্বস্বত্ব সংরক্ষিত। B2B কীটনাশক পরিবেশক।",

    // Hero Carousel Slides
    slide1_heading: "বিশ্বস্ত কীটনাশক পরিবেশক",
    slide1_subtext: "অঞ্চল জুড়ে ২০০+ ডিলারকে প্রিমিয়াম মানের কীটনাশক, ছত্রাকনাশক এবং আগাছানাশক সরবরাহ করা হচ্ছে।",
    slide1_cta: "পণ্য দেখুন",
    slide2_heading: "সেরা মানের কৃষি পণ্য",
    slide2_subtext: "শীর্ষ প্রস্তুতকারকদের থেকে প্রতিযোগিতামূলক পাইকারি মূল্যে বিস্তৃত ফসল সুরক্ষা সমাধান।",
    slide2_cta: "ক্যাটালগ দেখুন",
    slide3_heading: "আপনার দোকানে দ্রুত ডেলিভারি",
    slide3_subtext: "নির্ভরযোগ্য সরবরাহ ব্যবস্থা। WhatsApp-এ অর্ডার করুন এবং দোরগোড়ায় ডেলিভারি পান।",
    slide3_cta: "এখনই অর্ডার করুন",

    // Language
    lang_toggle: "English",
  },
} as const;

/** Map English category names (from DB) to translation keys */
export const categoryKeyMap: Record<string, keyof (typeof translations)["en"]> = {
  Insecticide: "cat_insecticide",
  Fungicide: "cat_fungicide",
  Herbicide: "cat_herbicide",
  Fertilizer: "cat_fertilizer",
  "Plant Growth Regulator": "cat_plant_growth",
  "Bio Pesticide": "cat_bio_pesticide",
  Rodenticide: "cat_rodenticide",
  "Seed Treatment": "cat_seed_treatment",
  Other: "cat_other",
};
