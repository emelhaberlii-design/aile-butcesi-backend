import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  Switch,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useBusinessBudget } from "@/context/BusinessContext";
import { useBudget, TURKISH_BANKS, INTERNATIONAL_BANKS, CARD_COLORS, formatInputAmount, parseInputAmount } from "@/context/BudgetContext";
import { useLanguage } from "@/context/LanguageContext";

const ACCENT = Colors.purple;

const PROFESSIONS: { key: string; labelTR: string; labelEN: string; icon: string; subs: { tr: string; en: string }[] }[] = [
  {
    key: "doctor", labelTR: "Doktor", labelEN: "Doctor", icon: "medkit-outline",
    subs: [
      { tr: "Aile Hekimi", en: "Family Physician" }, { tr: "Uzman Hekim", en: "Specialist" },
      { tr: "Estetik Cerrah", en: "Aesthetic Surgeon" }, { tr: "Pediatri", en: "Pediatrics" },
      { tr: "Ortopedi", en: "Orthopedics" }, { tr: "Göz Doktoru", en: "Ophthalmology" },
      { tr: "Kulak Burun Boğaz", en: "ENT" }, { tr: "Kardiyoloji", en: "Cardiology" },
      { tr: "Dermatoloji", en: "Dermatology" }, { tr: "Jinekolog", en: "Gynecologist" },
      { tr: "Onkoloji", en: "Oncology" }, { tr: "Nöroloji", en: "Neurology" },
      { tr: "Genel Cerrahi", en: "General Surgery" }, { tr: "Üroloji", en: "Urology" },
      { tr: "Diğer", en: "Other" },
    ],
  },
  {
    key: "psychologist", labelTR: "Psikolog/Psikiyatrist", labelEN: "Psychologist/Psychiatrist", icon: "pulse-outline",
    subs: [
      { tr: "Klinik Psikolog", en: "Clinical Psychologist" }, { tr: "Psikiyatrist", en: "Psychiatrist" },
      { tr: "Çocuk Psikolojisi", en: "Child Psychology" }, { tr: "Çift Terapisi", en: "Couples Therapy" },
      { tr: "Aile Danışmanlığı", en: "Family Counseling" }, { tr: "Diğer", en: "Other" },
    ],
  },
  {
    key: "dentist", labelTR: "Diş Hekimi", labelEN: "Dentist", icon: "fitness-outline",
    subs: [
      { tr: "Genel Diş", en: "General Dentistry" }, { tr: "Ortodonti", en: "Orthodontics" },
      { tr: "İmplant", en: "Implants" }, { tr: "Çocuk Dişçisi", en: "Pediatric Dentist" },
      { tr: "Ağız Cerrahisi", en: "Oral Surgery" }, { tr: "Diğer", en: "Other" },
    ],
  },
  {
    key: "market", labelTR: "Market Sahibi", labelEN: "Store Owner", icon: "storefront-outline",
    subs: [
      { tr: "Mahalle Bakkalı", en: "Neighborhood Store" }, { tr: "Süpermarket", en: "Supermarket" },
      { tr: "Kasap", en: "Butcher" }, { tr: "Manav", en: "Greengrocer" },
      { tr: "Fırın/Pastane", en: "Bakery/Pastry" }, { tr: "Kuruyemiş", en: "Nut Shop" },
      { tr: "Diğer", en: "Other" },
    ],
  },
  {
    key: "restaurant", labelTR: "Restoran/Kafe/Lokanta", labelEN: "Restaurant/Café", icon: "restaurant-outline",
    subs: [
      { tr: "Restoran", en: "Restaurant" }, { tr: "Kafe/Bistro", en: "Café/Bistro" },
      { tr: "Lokanta", en: "Eatery" }, { tr: "Fast Food", en: "Fast Food" },
      { tr: "Pastane", en: "Pastry Shop" }, { tr: "Diğer", en: "Other" },
    ],
  },
  {
    key: "phone_shop", labelTR: "Telefon Bayii", labelEN: "Phone Dealer", icon: "phone-portrait-outline",
    subs: [
      { tr: "GSM Bayii", en: "GSM Dealer" }, { tr: "Teknik Servis", en: "Tech Service" },
      { tr: "Aksesuar", en: "Accessories" }, { tr: "Diğer", en: "Other" },
    ],
  },
  {
    key: "cafe_bistro", labelTR: "Kafe/Bistro", labelEN: "Café/Bistro", icon: "cafe-outline",
    subs: [
      { tr: "Kahve Dükkanı", en: "Coffee Shop" }, { tr: "Bistro", en: "Bistro" },
      { tr: "Çay Bahçesi", en: "Tea Garden" }, { tr: "Diğer", en: "Other" },
    ],
  },
  {
    key: "teacher", labelTR: "Özel Öğretmen/Dershane", labelEN: "Private Teacher/Tutoring", icon: "school-outline",
    subs: [
      { tr: "Matematik", en: "Mathematics" }, { tr: "Fen Bilimleri", en: "Science" },
      { tr: "Türkçe/Edebiyat", en: "Turkish/Literature" }, { tr: "Yabancı Dil", en: "Foreign Language" },
      { tr: "Müzik", en: "Music" }, { tr: "Resim/Sanat", en: "Art" },
      { tr: "Dans", en: "Dance" }, { tr: "Satranç", en: "Chess" },
      { tr: "Yazılım/Kodlama", en: "Coding" }, { tr: "Diğer", en: "Other" },
    ],
  },
  {
    key: "lawyer", labelTR: "Avukat/Hukuk Bürosu", labelEN: "Lawyer/Law Firm", icon: "briefcase-outline",
    subs: [
      { tr: "Ceza Hukuku", en: "Criminal Law" }, { tr: "Aile Hukuku", en: "Family Law" },
      { tr: "İş Hukuku", en: "Labor Law" }, { tr: "Ticaret Hukuku", en: "Commercial Law" },
      { tr: "Gayrimenkul", en: "Real Estate" }, { tr: "Diğer", en: "Other" },
    ],
  },
  {
    key: "accountant", labelTR: "Muhasebeci/Mali Müşavir", labelEN: "Accountant/Financial Advisor", icon: "calculator-outline",
    subs: [{ tr: "SM", en: "SM" }, { tr: "SMMM", en: "SMMM" }, { tr: "YMM", en: "YMM" }, { tr: "Diğer", en: "Other" }],
  },
  {
    key: "engineer", labelTR: "Mimar/Mühendis", labelEN: "Architect/Engineer", icon: "construct-outline",
    subs: [
      { tr: "İnşaat Mühendisi", en: "Civil Engineer" }, { tr: "Elektrik Mühendisi", en: "Electrical Engineer" },
      { tr: "Makine Mühendisi", en: "Mechanical Engineer" }, { tr: "Mimar", en: "Architect" },
      { tr: "İç Mimar", en: "Interior Designer" }, { tr: "Diğer", en: "Other" },
    ],
  },
  {
    key: "beauty", labelTR: "Güzellik/Kuaför", labelEN: "Beauty/Hair Salon", icon: "color-palette-outline",
    subs: [
      { tr: "Kuaför", en: "Hair Salon" }, { tr: "Güzellik Salonu", en: "Beauty Salon" },
      { tr: "Tırnak Stüdyosu", en: "Nail Studio" }, { tr: "Kalıcı Makyaj", en: "Permanent Makeup" },
      { tr: "Masaj/Spa", en: "Massage/Spa" }, { tr: "Diğer", en: "Other" },
    ],
  },
  {
    key: "veterinary", labelTR: "Veteriner", labelEN: "Veterinarian", icon: "paw-outline",
    subs: [
      { tr: "Küçük Hayvan", en: "Small Animals" }, { tr: "Büyük Hayvan", en: "Large Animals" },
      { tr: "Egzotik Hayvan", en: "Exotic Animals" }, { tr: "Diğer", en: "Other" },
    ],
  },
  {
    key: "pharmacist", labelTR: "Eczacı", labelEN: "Pharmacist", icon: "medical-outline",
    subs: [{ tr: "Eczane", en: "Pharmacy" }, { tr: "Diğer", en: "Other" }],
  },
  {
    key: "contractor", labelTR: "Müteahhit/Usta", labelEN: "Contractor", icon: "hammer-outline",
    subs: [
      { tr: "İnşaat", en: "Construction" }, { tr: "Elektrik", en: "Electrical" },
      { tr: "Su Tesisatı", en: "Plumbing" }, { tr: "Boya", en: "Painting" },
      { tr: "Seramik/Fayans", en: "Tiling" }, { tr: "Diğer", en: "Other" },
    ],
  },
  {
    key: "transport", labelTR: "Taşımacılık/Ulaşım", labelEN: "Transport/Logistics", icon: "car-outline",
    subs: [
      { tr: "Nakliye", en: "Moving" }, { tr: "Lojistik", en: "Logistics" },
      { tr: "Kurye", en: "Courier" }, { tr: "Taksi/Minibüs", en: "Taxi/Minibus" },
      { tr: "Diğer", en: "Other" },
    ],
  },
  {
    key: "other", labelTR: "Diğer", labelEN: "Other", icon: "ellipsis-horizontal-circle-outline",
    subs: [{ tr: "Diğer", en: "Other" }],
  },
];

type ExpCat = { key: string; labelTR: string; labelEN: string; icon: string; color: string };

const COMMON_CATS: ExpCat[] = [
  { key: "salary",    labelTR: "Personel Maaşı",       labelEN: "Staff Salary",        icon: "people-outline",                     color: Colors.blue },
  { key: "insurance", labelTR: "Personel SGK/Sigorta",  labelEN: "Staff Insurance/SSI", icon: "shield-checkmark-outline",           color: Colors.purple },
  { key: "rent",      labelTR: "Kira",                  labelEN: "Rent",                icon: "business-outline",                   color: Colors.purple },
  { key: "bills",     labelTR: "Fatura/Abonelik",       labelEN: "Bills/Subscriptions", icon: "receipt-outline",                    color: Colors.orange },
  { key: "marketing", labelTR: "Reklam/Pazarlama",      labelEN: "Marketing/Ads",       icon: "megaphone-outline",                  color: Colors.yellow },
  { key: "tax",       labelTR: "Vergi/Muhasebe",        labelEN: "Tax/Accounting",      icon: "calculator-outline",                 color: Colors.red },
  { key: "education", labelTR: "Eğitim Gideri",         labelEN: "Training/Education",  icon: "school-outline",                     color: "#5AC8FA" },
  { key: "other",     labelTR: "Diğer",                 labelEN: "Other",               icon: "ellipsis-horizontal-circle-outline", color: Colors.textSecondary },
];

const PROFESSION_SPECIFIC: Record<string, ExpCat[]> = {
  restaurant: [
    { key: "raw_material",  labelTR: "Hammadde/Et/Sebze",    labelEN: "Raw Material/Produce", icon: "nutrition-outline",   color: Colors.orange },
    { key: "beverage",      labelTR: "İçecek Tedariki",       labelEN: "Beverage Supply",      icon: "wine-outline",         color: Colors.purple },
    { key: "kitchen_supply",labelTR: "Mutfak Malzemeleri",    labelEN: "Kitchen Supplies",     icon: "cafe-outline",         color: Colors.red },
    { key: "packaging",     labelTR: "Ambalaj/Paket",         labelEN: "Packaging",            icon: "cube-outline",         color: "#5AC8FA" },
    { key: "cleaning",      labelTR: "Temizlik Malzemeleri",  labelEN: "Cleaning Supplies",    icon: "sparkles-outline",     color: Colors.tint },
    { key: "delivery",      labelTR: "Dağıtım/Kurye",         labelEN: "Delivery/Courier",     icon: "bicycle-outline",      color: Colors.blue },
    { key: "gas_energy",    labelTR: "Doğalgaz/Enerji",       labelEN: "Gas/Energy",           icon: "flame-outline",        color: Colors.yellow },
    { key: "pos_fee",       labelTR: "POS Komisyonu",         labelEN: "POS Commission",       icon: "card-outline",         color: Colors.textSecondary },
  ],
  cafe_bistro: [
    { key: "coffee_supply", labelTR: "Kahve/Çay Tedariki",   labelEN: "Coffee/Tea Supply",    icon: "cafe-outline",         color: Colors.orange },
    { key: "beverage",      labelTR: "İçecek Malzemeleri",    labelEN: "Beverage Materials",   icon: "wine-outline",         color: Colors.purple },
    { key: "raw_material",  labelTR: "Yiyecek Hammaddesi",    labelEN: "Food Raw Material",    icon: "nutrition-outline",    color: Colors.red },
    { key: "packaging",     labelTR: "Ambalaj/Bardak",        labelEN: "Cups/Packaging",       icon: "cube-outline",         color: "#5AC8FA" },
    { key: "cleaning",      labelTR: "Temizlik Malzemeleri",  labelEN: "Cleaning Supplies",    icon: "sparkles-outline",     color: Colors.tint },
    { key: "pos_fee",       labelTR: "POS Komisyonu",         labelEN: "POS Commission",       icon: "card-outline",         color: Colors.textSecondary },
    { key: "music_license", labelTR: "Müzik Lisansı",         labelEN: "Music License",        icon: "musical-notes-outline",color: Colors.blue },
  ],
  market: [
    { key: "stock",         labelTR: "Ürün/Stok Alımı",      labelEN: "Product/Stock",        icon: "cube-outline",         color: Colors.blue },
    { key: "cold_chain",    labelTR: "Soğuk Zincir/Elektrik",labelEN: "Cold Chain/Electric",  icon: "snow-outline",         color: "#5AC8FA" },
    { key: "pos_fee",       labelTR: "POS Komisyonu",         labelEN: "POS Commission",       icon: "card-outline",         color: Colors.orange },
    { key: "storage",       labelTR: "Depolama",              labelEN: "Storage",              icon: "archive-outline",      color: Colors.purple },
    { key: "waste",         labelTR: "Fire/Bozuk Ürün",       labelEN: "Waste/Expired",        icon: "trash-outline",        color: Colors.red },
    { key: "cleaning",      labelTR: "Temizlik Malzemeleri",  labelEN: "Cleaning Supplies",    icon: "sparkles-outline",     color: Colors.tint },
    { key: "barcode",       labelTR: "Barkod/Kasa Sistemi",   labelEN: "Barcode/POS System",   icon: "barcode-outline",      color: Colors.textSecondary },
  ],
  phone_shop: [
    { key: "stock",         labelTR: "Telefon/Aksesuar Stok", labelEN: "Phone/Accessory Stock",icon: "phone-portrait-outline",color: Colors.blue },
    { key: "repair_parts",  labelTR: "Tamir Parçaları",       labelEN: "Repair Parts",         icon: "build-outline",        color: Colors.orange },
    { key: "gsm_system",    labelTR: "GSM Sistem Ücreti",     labelEN: "GSM System Fee",       icon: "wifi-outline",         color: Colors.purple },
    { key: "warranty",      labelTR: "Garanti/Sigorta",       labelEN: "Warranty/Insurance",   icon: "shield-outline",       color: "#5AC8FA" },
    { key: "pos_fee",       labelTR: "POS Komisyonu",         labelEN: "POS Commission",       icon: "card-outline",         color: Colors.red },
    { key: "packaging",     labelTR: "Ambalaj/Kutu",          labelEN: "Packaging/Box",        icon: "cube-outline",         color: Colors.tint },
  ],
  doctor: [
    { key: "medical_supply",labelTR: "Tıbbi Sarf Malzeme",   labelEN: "Medical Supplies",     icon: "bandage-outline",      color: Colors.red },
    { key: "equipment",     labelTR: "Cihaz/Ekipman Bakım",  labelEN: "Equipment Maintenance",icon: "construct-outline",    color: Colors.blue },
    { key: "sterilization", labelTR: "Sterilizasyon Malz.",  labelEN: "Sterilization",        icon: "flask-outline",        color: "#5AC8FA" },
    { key: "lab_tests",     labelTR: "Laboratuvar/Tahlil",   labelEN: "Lab/Test Costs",       icon: "eyedrop-outline",      color: Colors.orange },
    { key: "med_insurance", labelTR: "Mesleki Sigorta",       labelEN: "Professional Insurance",icon: "shield-checkmark-outline", color: Colors.purple },
    { key: "drugs",         labelTR: "İlaç/Sarf Deposu",      labelEN: "Drug/Supply Stock",    icon: "medical-outline",      color: Colors.tint },
  ],
  dentist: [
    { key: "dental_supply", labelTR: "Diş Malzemeleri",      labelEN: "Dental Supplies",      icon: "bandage-outline",      color: Colors.red },
    { key: "sterilization", labelTR: "Sterilizasyon/Otoklav",labelEN: "Sterilization",        icon: "flask-outline",        color: "#5AC8FA" },
    { key: "equipment",     labelTR: "Cihaz/Koltuk Bakım",   labelEN: "Equipment Maintenance",icon: "construct-outline",    color: Colors.blue },
    { key: "prosthesis",    labelTR: "Protez/Lab Ücreti",     labelEN: "Prosthesis/Lab Fee",   icon: "cube-outline",         color: Colors.orange },
    { key: "med_insurance", labelTR: "Mesleki Sigorta",       labelEN: "Professional Insurance",icon: "shield-outline",     color: Colors.purple },
    { key: "xray",          labelTR: "Röntgen/Görüntüleme",  labelEN: "X-Ray/Imaging",        icon: "scan-outline",         color: Colors.tint },
  ],
  psychologist: [
    { key: "therapy_tools", labelTR: "Terapi Araçları/Mat.", labelEN: "Therapy Tools/Materials",icon: "color-palette-outline",color: Colors.purple },
    { key: "supervision",   labelTR: "Süpervizyon Ücreti",   labelEN: "Supervision Fee",      icon: "people-circle-outline",color: Colors.blue },
    { key: "assessment",    labelTR: "Psikolojik Test/Form", labelEN: "Assessment Tools",     icon: "clipboard-outline",    color: Colors.orange },
    { key: "med_insurance", labelTR: "Mesleki Sigorta",       labelEN: "Professional Insurance",icon: "shield-outline",     color: "#5AC8FA" },
    { key: "platform",      labelTR: "Online Platform/Yazılım",labelEN: "Online Platform",    icon: "laptop-outline",       color: Colors.tint },
  ],
  beauty: [
    { key: "cosmetics",     labelTR: "Kozmetik Ürünler",     labelEN: "Cosmetic Products",    icon: "color-palette-outline",color: Colors.purple },
    { key: "tools",         labelTR: "Alet/Ekipman",         labelEN: "Tools/Equipment",      icon: "cut-outline",          color: Colors.blue },
    { key: "cleaning",      labelTR: "Temizlik/Hijyen Malz.",labelEN: "Cleaning/Hygiene",     icon: "sparkles-outline",     color: "#5AC8FA" },
    { key: "packaging",     labelTR: "Ambalaj/Poşet",        labelEN: "Packaging/Bags",       icon: "cube-outline",         color: Colors.orange },
    { key: "perm_supply",   labelTR: "Perma/Boyama Malz.",   labelEN: "Perm/Coloring Supplies",icon: "color-wand-outline",  color: Colors.red },
    { key: "wax_supply",    labelTR: "Ağda/Depilasyon Malz.",labelEN: "Waxing Supplies",      icon: "flame-outline",        color: Colors.tint },
  ],
  lawyer: [
    { key: "stationery",    labelTR: "Kırtasiye/Fotokopi",   labelEN: "Stationery/Printing",  icon: "document-outline",    color: Colors.blue },
    { key: "archive",       labelTR: "Arşiv/Depolama",       labelEN: "Archive/Storage",      icon: "archive-outline",     color: Colors.orange },
    { key: "law_db",        labelTR: "Hukuk Veri Tabanı",    labelEN: "Legal Database",       icon: "library-outline",     color: Colors.purple },
    { key: "bar_fee",       labelTR: "Baro Aidatı",           labelEN: "Bar Association Fee",  icon: "medal-outline",       color: "#5AC8FA" },
    { key: "court_fee",     labelTR: "Mahkeme/Harç Gideri",  labelEN: "Court/Filing Fee",     icon: "scale-outline",       color: Colors.red },
    { key: "software",      labelTR: "Yazılım/Ofis Lisansı", labelEN: "Software/License",     icon: "laptop-outline",      color: Colors.tint },
  ],
  accountant: [
    { key: "software",      labelTR: "Muhasebe Yazılımı",    labelEN: "Accounting Software",  icon: "laptop-outline",      color: Colors.blue },
    { key: "stationery",    labelTR: "Kırtasiye/Baskı",      labelEN: "Stationery/Printing",  icon: "document-outline",    color: Colors.orange },
    { key: "member_fee",    labelTR: "Meslek Odası Aidatı",  labelEN: "Professional Fee",     icon: "medal-outline",       color: Colors.purple },
    { key: "archive",       labelTR: "Arşiv/Depolama",       labelEN: "Archive/Storage",      icon: "archive-outline",     color: "#5AC8FA" },
    { key: "notary",        labelTR: "Noter/Resmi İşlem",    labelEN: "Notary/Official",      icon: "ribbon-outline",      color: Colors.red },
  ],
  engineer: [
    { key: "cad_software",  labelTR: "Çizim/CAD Yazılımı",   labelEN: "CAD/Drawing Software", icon: "laptop-outline",      color: Colors.blue },
    { key: "site_transport",labelTR: "Saha/Ulaşım Gideri",   labelEN: "Site/Travel Expense",  icon: "car-outline",         color: Colors.orange },
    { key: "project_mat",   labelTR: "Proje Malzemeleri",     labelEN: "Project Materials",    icon: "cube-outline",        color: Colors.purple },
    { key: "member_fee",    labelTR: "Oda Aidatı/Lisans",     labelEN: "Association Fee",      icon: "medal-outline",       color: "#5AC8FA" },
    { key: "insurance",     labelTR: "Proje Sigortası",       labelEN: "Project Insurance",    icon: "shield-outline",      color: Colors.red },
    { key: "stationery",    labelTR: "Teknik Kırtasiye",      labelEN: "Technical Stationery", icon: "document-outline",    color: Colors.tint },
  ],
  teacher: [
    { key: "course_mat",    labelTR: "Ders Materyali/Kitap", labelEN: "Course Materials/Books",icon: "book-outline",        color: Colors.blue },
    { key: "exam_copies",   labelTR: "Sınav/Kopya Gideri",   labelEN: "Exam/Copy Expense",    icon: "document-text-outline",color: Colors.orange },
    { key: "platform",      labelTR: "Online Platform Aboneliği",labelEN: "Online Platform",  icon: "laptop-outline",      color: Colors.purple },
    { key: "stationary",    labelTR: "Kırtasiye/Yazı Malz.", labelEN: "Stationery",           icon: "pencil-outline",      color: "#5AC8FA" },
    { key: "room_rental",   labelTR: "Dersane/Oda Kirası",   labelEN: "Classroom Rental",     icon: "home-outline",        color: Colors.red },
  ],
  veterinary: [
    { key: "vet_medicine",  labelTR: "Veteriner İlaç/Aşı",   labelEN: "Veterinary Medicine",  icon: "medical-outline",     color: Colors.red },
    { key: "medical_tools", labelTR: "Tıbbi/Cerrahi Malzeme",labelEN: "Medical/Surgical Supplies",icon: "bandage-outline", color: Colors.blue },
    { key: "sterilization", labelTR: "Sterilizasyon",         labelEN: "Sterilization",        icon: "flask-outline",       color: "#5AC8FA" },
    { key: "animal_food",   labelTR: "Mama/Hayvan Barınak Malz.",labelEN: "Animal Food/Housing",icon: "paw-outline",       color: Colors.orange },
    { key: "equipment",     labelTR: "Ekipman/Cihaz Bakım",  labelEN: "Equipment Maintenance",icon: "construct-outline",   color: Colors.purple },
  ],
  pharmacist: [
    { key: "drug_stock",    labelTR: "İlaç/Stok Tedariki",   labelEN: "Drug/Stock Supply",    icon: "medical-outline",     color: Colors.red },
    { key: "cold_chain",    labelTR: "Soğuk Zincir/Buzdolabı",labelEN: "Cold Chain/Fridge",   icon: "snow-outline",        color: "#5AC8FA" },
    { key: "pro_insurance", labelTR: "Mesleki Sigorta",       labelEN: "Professional Insurance",icon: "shield-outline",    color: Colors.purple },
    { key: "pos_fee",       labelTR: "POS/SGK Sistem Ücreti",labelEN: "POS/SSI System Fee",   icon: "card-outline",        color: Colors.orange },
    { key: "stationery",    labelTR: "Kırtasiye/Etiket",      labelEN: "Stationery/Labels",    icon: "document-outline",   color: Colors.blue },
    { key: "packaging",     labelTR: "Paketleme Malzemeleri", labelEN: "Packaging Materials",  icon: "cube-outline",        color: Colors.tint },
  ],
  contractor: [
    { key: "construction",  labelTR: "İnşaat Malzemeleri",   labelEN: "Construction Materials",icon: "cube-outline",       color: Colors.orange },
    { key: "equipment",     labelTR: "Ekipman Kiralama/Tamir",labelEN: "Equipment Rental/Repair",icon: "construct-outline", color: Colors.blue },
    { key: "safety",        labelTR: "İş Güvenliği Malz.",   labelEN: "Safety Equipment",     icon: "shield-outline",      color: Colors.red },
    { key: "vehicle",       labelTR: "Şantiye Aracı/Yakıt",  labelEN: "Site Vehicle/Fuel",    icon: "car-sport-outline",   color: Colors.purple },
    { key: "insurance",     labelTR: "İş Yeri/Şantiye Sigorta",labelEN: "Site Insurance",     icon: "shield-checkmark-outline",color: "#5AC8FA" },
    { key: "permits",       labelTR: "Ruhsat/İzin Ücretleri",labelEN: "Permits/Licenses",     icon: "document-text-outline",color: Colors.tint },
  ],
  transport: [
    { key: "fuel",          labelTR: "Yakıt",                 labelEN: "Fuel",                 icon: "flame-outline",       color: Colors.red },
    { key: "maintenance",   labelTR: "Araç Bakım/Lastik",     labelEN: "Vehicle Maintenance",  icon: "build-outline",       color: Colors.orange },
    { key: "vehicle_ins",   labelTR: "Kasko/Trafik Sigortası",labelEN: "Vehicle Insurance",    icon: "shield-checkmark-outline",color: Colors.blue },
    { key: "highway",       labelTR: "Otoyol/Köprü/HGS",     labelEN: "Highway/Bridge Toll",  icon: "car-outline",         color: Colors.purple },
    { key: "parking",       labelTR: "Park/Garaj Ücreti",     labelEN: "Parking/Garage",       icon: "navigate-circle-outline",color: "#5AC8FA" },
    { key: "cargo_tools",   labelTR: "Nakliye Ekipmanı",      labelEN: "Cargo Equipment",      icon: "cube-outline",        color: Colors.tint },
  ],
  other: [
    { key: "stock",         labelTR: "Stok/Hammadde",         labelEN: "Stock/Raw Material",   icon: "cube-outline",        color: "#5AC8FA" },
    { key: "equipment",     labelTR: "Ekipman/Demirbaş",      labelEN: "Equipment/Fixtures",   icon: "construct-outline",   color: Colors.blue },
    { key: "vehicle",       labelTR: "İş Yeri Aracı",         labelEN: "Company Vehicle",      icon: "car-sport-outline",   color: Colors.orange },
  ],
};

function getExpCats(profKey: string): ExpCat[] {
  const specific = PROFESSION_SPECIFIC[profKey] ?? PROFESSION_SPECIFIC["other"];
  const specificKeys = new Set(specific.map((c) => c.key));
  const commons = COMMON_CATS.filter((c) => !specificKeys.has(c.key));
  return [...specific, ...commons];
}

const BUSINESS_INC_CATS: { key: string; labelTR: string; labelEN: string; icon: string }[] = [
  { key: "sales",      labelTR: "Satış Geliri",       labelEN: "Sales Revenue",   icon: "cash-outline" },
  { key: "service",    labelTR: "Hizmet Geliri",       labelEN: "Service Revenue", icon: "hammer-outline" },
  { key: "consulting", labelTR: "Danışmanlık",          labelEN: "Consulting",      icon: "chatbubble-outline" },
  { key: "rental",     labelTR: "Kira Geliri",          labelEN: "Rental Income",   icon: "home-outline" },
  { key: "commission", labelTR: "Komisyon",             labelEN: "Commission",      icon: "trending-up-outline" },
  { key: "other",      labelTR: "Diğer",               labelEN: "Other",           icon: "ellipsis-horizontal-circle-outline" },
];

const KDV_RATES = [1, 8, 10, 18, 20];

const CAT_KDV_HINT: Record<string, number> = {
  raw_material: 8, beverage: 8, kitchen_supply: 8, coffee_supply: 8,
  food: 8, stock: 8, drug_stock: 8, animal_food: 8,
  medical_supply: 8, dental_supply: 8, vet_medicine: 8,
  fuel: 20, rent: 20, salary: 0, insurance: 0, tax: 0, education: 20,
  marketing: 20, software: 20, cad_software: 20, platform: 20,
  equipment: 20, tools: 20, construction: 20, vehicle: 20, maintenance: 20,
  cosmetics: 20, packaging: 8, cleaning: 8,
  pos_fee: 20, highway: 20, course_mat: 8,
};

function fmt(n: number) {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(n) + " ₺";
}
function fmtN(n: number) {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(n);
}
function dateStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

type MainTab = "isyerim" | "giderler" | "gelirler" | "vergi" | "kartlar" | "ozet";
type TaxSubTab = "estimated" | "manual";

export default function CorporateScreen() {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const isEN = language === "en";
  const biz = useBusinessBudget();
  const budget = useBudget();

  const [mainTab, setMainTab] = useState<MainTab>("isyerim");
  const [profBoxOpen, setProfBoxOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState("");
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "debit" | "credit">("cash");
  const [selectedCardId, setSelectedCardId] = useState("");
  const [expRecurring, setExpRecurring] = useState(false);
  const [expRecurringFreq, setExpRecurringFreq] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [expRecurringDay, setExpRecurringDay] = useState("1");
  const [expInstallment, setExpInstallment] = useState(false);
  const [expInstallmentCount, setExpInstallmentCount] = useState(3);

  const [incCat, setIncCat] = useState("");
  const [incAmount, setIncAmount] = useState("");
  const [incTitle, setIncTitle] = useState("");
  const [incRecurring, setIncRecurring] = useState(false);
  const [incRecurringFreq, setIncRecurringFreq] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [incRecurringDay, setIncRecurringDay] = useState("1");

  const [taxSubTab, setTaxSubTab] = useState<TaxSubTab>("estimated");
  const [manualAmount, setManualAmount] = useState("");
  const [manualRate, setManualRate] = useState(18);
  const [manualIncluded, setManualIncluded] = useState(true);
  const [customRates, setCustomRates] = useState<Record<string, number>>({});
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [customRateInput, setCustomRateInput] = useState("");
  const [manualCustomRate, setManualCustomRate] = useState("");

  const [showCardForm, setShowCardForm] = useState(false);
  const corpBankList = isEN ? INTERNATIONAL_BANKS : TURKISH_BANKS;
  const [cardBank, setCardBank] = useState(corpBankList[0]);
  const [cardName, setCardName] = useState("");
  const [cardLimit, setCardLimit] = useState("");
  const [cardPaymentDay, setCardPaymentDay] = useState("10");
  const [cardColor, setCardColor] = useState(CARD_COLORS[0]);

  const [showDetail, setShowDetail] = useState(false);
  const [showAddWorkspace, setShowAddWorkspace] = useState(false);
  const [newWsProfKey, setNewWsProfKey] = useState("");
  const [newWsProfSub, setNewWsProfSub] = useState("");
  const [newWsCustomName, setNewWsCustomName] = useState("");
  const [profCustomNameInput, setProfCustomNameInput] = useState(biz.professionCustomName || "");

  function toggleProfBox() {
    setProfBoxOpen(!profBoxOpen);
    Haptics.selectionAsync();
  }

  function handleSelectProfession(key: string) {
    biz.setProfession(key);
    biz.setProfessionSub("");
    setSelectedCat("");
    setProfBoxOpen(false);
    if (key !== "other") {
      biz.setProfessionCustomName("");
      setProfCustomNameInput("");
    }
    if (biz.workspaces.length > 0 && biz.activeWorkspaceId) {
      biz.updateWorkspace(biz.activeWorkspaceId, { professionKey: key, professionSub: "", customName: key === "other" ? profCustomNameInput : "" });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleSelectProfSub(sub: string) {
    biz.setProfessionSub(sub);
    if (biz.workspaces.length > 0 && biz.activeWorkspaceId) {
      biz.updateWorkspace(biz.activeWorkspaceId, { professionSub: sub });
    }
    Haptics.selectionAsync();
  }

  function handleSaveCustomName(name: string) {
    biz.setProfessionCustomName(name);
    if (biz.workspaces.length > 0 && biz.activeWorkspaceId) {
      biz.updateWorkspace(biz.activeWorkspaceId, { customName: name });
    }
  }

  async function handleAddWorkspace() {
    if (!newWsProfKey) {
      Alert.alert(isEN ? "Error" : "Hata", isEN ? "Select a profession." : "Bir meslek seçin.");
      return;
    }
    await biz.addWorkspace({
      professionKey: newWsProfKey,
      professionSub: newWsProfSub,
      customName: newWsProfKey === "other" ? newWsCustomName : "",
    });
    setNewWsProfKey("");
    setNewWsProfSub("");
    setNewWsCustomName("");
    setShowAddWorkspace(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleSwitchWorkspace(wsId: string) {
    biz.setActiveWorkspaceId(wsId);
    const ws = biz.workspaces.find((w) => w.id === wsId);
    if (ws) {
      setProfCustomNameInput(ws.customName || "");
    }
    setProfBoxOpen(false);
    Haptics.selectionAsync();
  }

  const currentProf = PROFESSIONS.find((p) => p.key === biz.profession);
  const expCats = getExpCats(biz.profession ?? "other");
  const activeWs = biz.workspaces.find((w) => w.id === biz.activeWorkspaceId);

  function handleAddExpense() {
    if (!selectedCat) {
      Alert.alert(isEN ? "Error" : "Hata", isEN ? "Select a category." : "Kategori seçin.");
      return;
    }
    const parsed = parseInputAmount(amount);
    if (!amount || parsed <= 0) {
      Alert.alert(isEN ? "Error" : "Hata", isEN ? "Enter a valid amount." : "Geçerli bir tutar girin.");
      return;
    }
    if (paymentMethod === "credit" && biz.businessCreditCards.length > 0 && !selectedCardId) {
      Alert.alert(isEN ? "Error" : "Hata", isEN ? "Select a credit card." : "Bir kredi kartı seçin.");
      return;
    }
    const cat = expCats.find((c) => c.key === selectedCat);
    const isInst = paymentMethod === "credit" && expInstallment && expInstallmentCount > 1;
    const finalAmount = isInst ? parsed / expInstallmentCount : parsed;
    biz.addBusinessExpense({
      title: title.trim() || (isEN ? cat?.labelEN ?? selectedCat : cat?.labelTR ?? selectedCat),
      amount: finalAmount,
      category: selectedCat,
      date: dateStr(),
      paymentMethod,
      isRecurring: expRecurring,
      recurringFrequency: expRecurring ? expRecurringFreq : undefined,
      recurringDay: expRecurring && expRecurringFreq !== "daily" ? parseInt(expRecurringDay, 10) : undefined,
      ...(paymentMethod === "credit" && selectedCardId ? { cardId: selectedCardId } : {}),
      ...(isInst ? { isInstallment: true, installmentCount: expInstallmentCount } : {}),
    });
    setAmount("");
    setTitle("");
    setSelectedCardId("");
    setExpRecurring(false);
    setExpInstallment(false);
    setExpInstallmentCount(3);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(isEN ? "Saved!" : "Kaydedildi!", isEN ? "Business expense recorded." : "İş yeri gideri kaydedildi.");
  }

  function handleAddIncome() {
    if (!incCat) {
      Alert.alert(isEN ? "Error" : "Hata", isEN ? "Select a category." : "Kategori seçin.");
      return;
    }
    const parsed = parseInputAmount(incAmount);
    if (!incAmount || parsed <= 0) {
      Alert.alert(isEN ? "Error" : "Hata", isEN ? "Enter a valid amount." : "Geçerli bir tutar girin.");
      return;
    }
    const cat = BUSINESS_INC_CATS.find((c) => c.key === incCat);
    biz.addBusinessIncome({
      title: incTitle.trim() || (isEN ? cat?.labelEN ?? incCat : cat?.labelTR ?? incCat),
      amount: parsed,
      category: incCat,
      date: dateStr(),
      isRecurring: incRecurring,
      recurringFrequency: incRecurring ? incRecurringFreq : undefined,
      recurringDay: incRecurring && incRecurringFreq !== "daily" ? parseInt(incRecurringDay, 10) : undefined,
    });
    setIncAmount("");
    setIncTitle("");
    setIncRecurring(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(isEN ? "Saved!" : "Kaydedildi!", isEN ? "Business income recorded." : "İş yeri geliri kaydedildi.");
  }

  function confirmDeleteExp(id: string, ttl: string) {
    Alert.alert(isEN ? "Delete" : "Sil", `"${ttl}" ${isEN ? "will be deleted." : "silinecek."}`, [
      { text: isEN ? "Cancel" : "Vazgeç", style: "cancel" },
      { text: isEN ? "Delete" : "Sil", style: "destructive", onPress: () => { biz.deleteBusinessExpense(id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } },
    ]);
  }

  function confirmDeleteInc(id: string, ttl: string) {
    Alert.alert(isEN ? "Delete" : "Sil", `"${ttl}" ${isEN ? "will be deleted." : "silinecek."}`, [
      { text: isEN ? "Cancel" : "Vazgeç", style: "cancel" },
      { text: isEN ? "Delete" : "Sil", style: "destructive", onPress: () => { biz.deleteBusinessIncome(id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } },
    ]);
  }

  const wsId = biz.activeWorkspaceId;
  const thisMonthExp = biz.businessExpenses.filter((e) => e.date.startsWith(biz.selectedMonth) && (!wsId || (e.workspaceId || biz.workspaces[0]?.id) === wsId));
  const thisMonthInc = biz.businessIncomes.filter((i) => i.date.startsWith(biz.selectedMonth) && (!wsId || (i.workspaceId || biz.workspaces[0]?.id) === wsId));

  const estimatedTaxRows = thisMonthExp.map((exp) => {
    const rate = customRates[exp.id] ?? CAT_KDV_HINT[exp.category] ?? 18;
    const kdvAmount = rate > 0 ? exp.amount - (exp.amount / (1 + rate / 100)) : 0;
    return { ...exp, rate, kdvAmount };
  });
  const totalKDVExpense = estimatedTaxRows.reduce((s, r) => s + r.kdvAmount, 0);
  const totalKDVIncome  = thisMonthInc.reduce((s, inc) => s + (inc.amount - inc.amount / 1.18), 0);

  const manualParsed = parseInputAmount(manualAmount);
  const manualKDV = manualIncluded
    ? manualParsed - manualParsed / (1 + manualRate / 100)
    : manualParsed * (manualRate / 100);
  const manualNet   = manualIncluded ? manualParsed / (1 + manualRate / 100) : manualParsed;
  const manualTotal = manualIncluded ? manualParsed : manualParsed + manualKDV;

  const expByCategory = thisMonthExp.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  const incByCategory = thisMonthInc.reduce((acc, i) => {
    acc[i.category] = (acc[i.category] ?? 0) + i.amount;
    return acc;
  }, {} as Record<string, number>);

  return (
    <View style={[styles.container, { backgroundColor: Colors.background, paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
      <View style={styles.topBar}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <View style={styles.closeBtn}>
                <Ionicons name="chevron-back" size={20} color={Colors.text} />
              </View>
            </Pressable>
            <View style={[styles.headerIcon, { backgroundColor: ACCENT + "20" }]}>
              <Ionicons name="business-outline" size={18} color={ACCENT} />
            </View>
            <View>
              <Text style={styles.title}>{isEN ? "My Business" : "İş Yerim"}</Text>
              {currentProf ? (
                <Text style={styles.profSubtitle}>{isEN ? currentProf.labelEN : currentProf.labelTR}</Text>
              ) : null}
            </View>
          </View>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <View style={styles.closeBtn}>
              <Ionicons name="close" size={18} color={Colors.textSecondary} />
            </View>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {([
            { key: "isyerim",  labelTR: "İş Yerim",  labelEN: "Business" },
            { key: "giderler", labelTR: "Giderler",   labelEN: "Expenses" },
            { key: "gelirler", labelTR: "Gelirler",   labelEN: "Income" },
            { key: "vergi",    labelTR: "Vergi",       labelEN: "Tax" },
            { key: "kartlar",  labelTR: "Kartlar",     labelEN: "Cards" },
            { key: "ozet",     labelTR: "Özet",        labelEN: "Summary" },
          ] as { key: MainTab; labelTR: string; labelEN: string }[]).map((tab) => (
            <Pressable
              key={tab.key}
              style={[styles.tabBtn, mainTab === tab.key && styles.tabBtnActive]}
              onPress={() => { setMainTab(tab.key); Haptics.selectionAsync(); }}
            >
              <Text style={[styles.tabBtnText, mainTab === tab.key && styles.tabBtnTextActive]}>
                {isEN ? tab.labelEN : tab.labelTR}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.scrollWrap}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {mainTab === "isyerim" && (
          <>
            <View style={styles.toggleCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>
                  {isEN ? "Include in Household Budget" : "Ev Bütçesine Dahil Et"}
                </Text>
                <Text style={styles.toggleSub}>
                  {biz.combinedWithBudget
                    ? (isEN ? "Business figures are merged into your home budget totals" : "İş yeri rakamları ev bütçe toplamınıza yansıyor")
                    : (isEN ? "Business is tracked separately from home budget" : "İş yeri bütçesi ev bütçesinden bağımsız takip ediliyor")}
                </Text>
              </View>
              <Switch
                value={biz.combinedWithBudget}
                onValueChange={(val) => { biz.setCombinedWithBudget(val); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                trackColor={{ false: Colors.border, true: ACCENT + "80" }}
                thumbColor={biz.combinedWithBudget ? ACCENT : Colors.textSecondary}
                ios_backgroundColor={Colors.border}
              />
            </View>

            {biz.workspaces.length > 1 && (
              <>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="briefcase-outline" size={15} color={Colors.textSecondary} />
                  <Text style={styles.sectionLabel}>{isEN ? "Your Workspaces" : "İş Yerleriniz"}</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {biz.workspaces.map((ws) => {
                      const wsProf = PROFESSIONS.find((p) => p.key === ws.professionKey);
                      const isActive = ws.id === biz.activeWorkspaceId;
                      const displayName = ws.customName || (isEN ? wsProf?.labelEN : wsProf?.labelTR) || ws.professionKey;
                      return (
                        <Pressable
                          key={ws.id}
                          style={[styles.wsChip, isActive && { backgroundColor: ACCENT + "20", borderColor: ACCENT + "60" }]}
                          onPress={() => handleSwitchWorkspace(ws.id)}
                          onLongPress={() => {
                            if (biz.workspaces.length > 1) {
                              Alert.alert(isEN ? "Delete Workspace" : "İş Yerini Sil", `"${displayName}" ${isEN ? "will be removed." : "silinecek."}`, [
                                { text: isEN ? "Cancel" : "Vazgeç", style: "cancel" },
                                { text: isEN ? "Delete" : "Sil", style: "destructive", onPress: () => biz.removeWorkspace(ws.id) },
                              ]);
                            }
                          }}
                        >
                          <Ionicons name={(wsProf?.icon ?? "briefcase-outline") as any} size={14} color={isActive ? ACCENT : Colors.textSecondary} />
                          <Text style={[styles.wsChipText, isActive && { color: ACCENT, fontFamily: "Inter_700Bold" as const }]} numberOfLines={1}>
                            {displayName}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </>
            )}

            {currentProf && biz.profession && (
              <Pressable onPress={() => { setShowDetail(true); Haptics.selectionAsync(); }}>
                <View style={styles.workspaceCard}>
                  <View style={styles.workspaceHeader}>
                    <View style={[styles.workspaceIcon, { backgroundColor: ACCENT + "18" }]}>
                      <Ionicons name={currentProf.icon as any} size={22} color={ACCENT} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.workspaceTitle}>
                        {biz.professionCustomName || (isEN ? `${currentProf.labelEN} Office` : `${currentProf.labelTR} Ofisim`)}
                      </Text>
                      {biz.professionSub ? (
                        <Text style={styles.workspaceSub}>{biz.professionSub}</Text>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
                  </View>
                  <View style={styles.workspaceStats}>
                    <View style={styles.workspaceStat}>
                      <Text style={styles.workspaceStatLabel}>{isEN ? "Income" : "Gelir"}</Text>
                      <Text style={[styles.workspaceStatValue, { color: Colors.tint }]}>{fmt(biz.monthlyBusinessIncomes)}</Text>
                    </View>
                    <View style={styles.workspaceDivider} />
                    <View style={styles.workspaceStat}>
                      <Text style={styles.workspaceStatLabel}>{isEN ? "Expense" : "Gider"}</Text>
                      <Text style={[styles.workspaceStatValue, { color: Colors.red }]}>{fmt(biz.monthlyBusinessExpenses)}</Text>
                    </View>
                    <View style={styles.workspaceDivider} />
                    <View style={styles.workspaceStat}>
                      <Text style={styles.workspaceStatLabel}>{isEN ? "Net" : "Net"}</Text>
                      <Text style={[styles.workspaceStatValue, { color: biz.monthlyBusinessIncomes - biz.monthlyBusinessExpenses >= 0 ? Colors.tint : Colors.red }]}>
                        {fmt(biz.monthlyBusinessIncomes - biz.monthlyBusinessExpenses)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.workspaceTaxRow}>
                    <Ionicons name="receipt-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.workspaceTaxLabel}>{isEN ? "Est. KDV" : "Tahmini KDV"}</Text>
                    <Text style={[styles.workspaceTaxValue, { color: Colors.orange }]}>{fmt(totalKDVIncome - totalKDVExpense)}</Text>
                  </View>
                  <Text style={styles.detailHint}>{isEN ? "Tap for details" : "Detay için dokunun"}</Text>
                </View>
              </Pressable>
            )}

            <Pressable
              style={[styles.addBtn, { backgroundColor: ACCENT, marginBottom: 8 }]}
              onPress={() => { setShowAddWorkspace(true); Haptics.selectionAsync(); }}
            >
              <Ionicons name="add-circle-outline" size={20} color={Colors.background} />
              <Text style={styles.addBtnText}>{isEN ? "Add New Workspace" : "Yeni İş Yeri Ekle"}</Text>
            </Pressable>

            <View style={styles.sectionHeaderRow}>
              <Ionicons name="person-circle-outline" size={15} color={Colors.textSecondary} />
              <Text style={styles.sectionLabel}>
                {currentProf ? (isEN ? "Change Profession" : "Mesleği Değiştir") : (isEN ? "Select Profession" : "Meslek Seçin")}
              </Text>
            </View>

            {!currentProf && (
              <View style={styles.profBox}>
                <Text style={styles.profPickerLabel}>{isEN ? "Choose Profession" : "Meslek Seçin"}</Text>
                <View style={styles.profGrid}>
                  {PROFESSIONS.map((p) => (
                    <Pressable
                      key={p.key}
                      style={[styles.profChip, biz.profession === p.key && { backgroundColor: ACCENT + "20", borderColor: ACCENT + "60" }]}
                      onPress={() => handleSelectProfession(p.key)}
                    >
                      <Ionicons name={p.icon as any} size={13} color={biz.profession === p.key ? ACCENT : Colors.textSecondary} />
                      <Text style={[styles.profChipText, biz.profession === p.key && { color: ACCENT }]} numberOfLines={2}>
                        {isEN ? p.labelEN : p.labelTR}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {currentProf && (
              <>
                <Pressable style={styles.profHeader} onPress={toggleProfBox}>
                  <View style={styles.profHeaderLeft}>
                    <View style={[styles.profIconBox, { backgroundColor: ACCENT + "18" }]}>
                      <Ionicons name={currentProf.icon as any} size={18} color={ACCENT} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.profHeaderText}>
                        {isEN ? currentProf.labelEN : currentProf.labelTR}
                      </Text>
                      {biz.professionSub ? (
                        <Text style={styles.profSubText}>{biz.professionSub}</Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={[styles.chevronBox, profBoxOpen && { backgroundColor: ACCENT + "18" }]}>
                    <Ionicons name={profBoxOpen ? "chevron-up" : "chevron-down"} size={14} color={profBoxOpen ? ACCENT : Colors.textSecondary} />
                  </View>
                </Pressable>

                {profBoxOpen && (
                  <View style={styles.profBox}>
                    <Text style={styles.profPickerLabel}>{isEN ? "Change Profession" : "Meslek Değiştir"}</Text>
                    <View style={styles.profGrid}>
                      {PROFESSIONS.map((p) => (
                        <Pressable
                          key={p.key}
                          style={[styles.profChip, biz.profession === p.key && { backgroundColor: ACCENT + "20", borderColor: ACCENT + "60" }]}
                          onPress={() => handleSelectProfession(p.key)}
                        >
                          <Ionicons name={p.icon as any} size={13} color={biz.profession === p.key ? ACCENT : Colors.textSecondary} />
                          <Text style={[styles.profChipText, biz.profession === p.key && { color: ACCENT }]} numberOfLines={2}>
                            {isEN ? p.labelEN : p.labelTR}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    {currentProf && (
                      <View style={styles.profSubSection}>
                        <Text style={styles.profSubLabel}>{isEN ? "Specialization" : "Uzmanlık / Alt Alan"}</Text>
                        <View style={styles.profSubChips}>
                          {currentProf.subs.map((sub) => (
                            <Pressable
                              key={sub.tr}
                              style={[styles.subChip, biz.professionSub === sub.tr && styles.subChipActive]}
                              onPress={() => handleSelectProfSub(sub.tr)}
                            >
                              <Text style={[styles.subChipText, biz.professionSub === sub.tr && styles.subChipTextActive]}>
                                {isEN ? sub.en : sub.tr}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    )}
                    {biz.profession === "other" && (
                      <View style={[styles.profSubSection, { paddingTop: 0 }]}>
                        <Text style={styles.profSubLabel}>{isEN ? "Custom Business Name (Optional)" : "İş Yeri / Meslek Adı (İsteğe Bağlı)"}</Text>
                        <TextInput
                          style={[styles.input, { marginBottom: 0 }]}
                          value={profCustomNameInput}
                          onChangeText={(t) => {
                            setProfCustomNameInput(t);
                            handleSaveCustomName(t);
                          }}
                          placeholder={isEN ? "e.g. My Flower Shop" : "ör. Çiçekçim, Tuhafiyem"}
                          placeholderTextColor={Colors.textTertiary}
                        />
                      </View>
                    )}
                  </View>
                )}
              </>
            )}
          </>
        )}

        {mainTab === "giderler" && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="grid-outline" size={15} color={Colors.textSecondary} />
              <Text style={styles.sectionLabel}>
                {isEN ? "Expense Category" : "Gider Kategorisi"}
                {currentProf ? ` — ${isEN ? currentProf.labelEN : currentProf.labelTR}` : ""}
              </Text>
            </View>
            <View style={styles.catGrid}>
              {expCats.map((cat) => (
                <Pressable
                  key={cat.key}
                  style={[styles.catCard, selectedCat === cat.key && { backgroundColor: cat.color + "20", borderColor: cat.color + "60" }]}
                  onPress={() => { setSelectedCat(cat.key); Haptics.selectionAsync(); }}
                >
                  <Ionicons name={cat.icon as any} size={18} color={selectedCat === cat.key ? cat.color : Colors.textSecondary} />
                  <Text style={[styles.catCardText, selectedCat === cat.key && { color: cat.color }]} numberOfLines={2}>
                    {isEN ? cat.labelEN : cat.labelTR}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.sectionHeaderRow}>
              <Ionicons name="cash-outline" size={15} color={Colors.textSecondary} />
              <Text style={styles.sectionLabel}>{isEN ? "Amount (₺)" : "Tutar (₺)"}</Text>
            </View>
            <View style={styles.amountRow}>
              <Text style={styles.currencySymbol}>₺</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={(v) => setAmount(formatInputAmount(v))}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            <View style={styles.sectionHeaderRow}>
              <Ionicons name="create-outline" size={15} color={Colors.textSecondary} />
              <Text style={styles.sectionLabel}>{isEN ? "Description (optional)" : "Açıklama (isteğe bağlı)"}</Text>
            </View>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={isEN ? "e.g. March salary payment" : "ör. Mart maaş ödemesi"}
              placeholderTextColor={Colors.textTertiary}
            />

            <View style={styles.sectionHeaderRow}>
              <Ionicons name="card-outline" size={15} color={Colors.textSecondary} />
              <Text style={styles.sectionLabel}>{isEN ? "Payment" : "Ödeme Yöntemi"}</Text>
            </View>
            <View style={styles.pmRow}>
              {([
                { key: "cash" as const,   labelTR: "Nakit",  labelEN: "Cash",   icon: "cash-outline",   color: Colors.tint },
                { key: "debit" as const,  labelTR: "Banka",  labelEN: "Debit",  icon: "card-outline",   color: Colors.blue },
                { key: "credit" as const, labelTR: "Kredi",  labelEN: "Credit", icon: "card",           color: Colors.purple },
              ]).map(({ key, labelTR, labelEN, icon, color }) => (
                <Pressable
                  key={key}
                  style={[styles.pmBtn, paymentMethod === key && { backgroundColor: color + "20", borderColor: color + "60" }]}
                  onPress={() => { setPaymentMethod(key); Haptics.selectionAsync(); }}
                >
                  <Ionicons name={icon as any} size={16} color={paymentMethod === key ? color : Colors.textSecondary} />
                  <Text style={[styles.pmLabel, paymentMethod === key && { color }]}>{isEN ? labelEN : labelTR}</Text>
                </Pressable>
              ))}
            </View>

            {paymentMethod === "credit" && biz.businessCreditCards.length > 0 && (
              <>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="card-outline" size={15} color={Colors.textSecondary} />
                  <Text style={styles.sectionLabel}>{isEN ? "Select Card" : "Kart Seçin"}</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {biz.businessCreditCards.map((card) => (
                      <Pressable
                        key={card.id}
                        style={[styles.cardPickChip, selectedCardId === card.id && { backgroundColor: card.color + "20", borderColor: card.color + "60" }]}
                        onPress={() => { setSelectedCardId(card.id); Haptics.selectionAsync(); }}
                      >
                        <View style={[styles.cardPickDot, { backgroundColor: card.color }]} />
                        <Text style={[styles.cardPickText, selectedCardId === card.id && { color: card.color }]} numberOfLines={1}>
                          {card.name || card.bank}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}

            {paymentMethod === "credit" && (
              <>
                <View style={styles.recurringRow}>
                  <View style={styles.recurringLeft}>
                    <Ionicons name="layers-outline" size={16} color={Colors.textSecondary} />
                    <Text style={styles.recurringLabel}>{isEN ? "Installment" : "Taksit"}</Text>
                  </View>
                  <Switch
                    value={expInstallment}
                    onValueChange={(v) => { setExpInstallment(v); Haptics.selectionAsync(); }}
                    trackColor={{ false: Colors.card2, true: Colors.purple + "80" }}
                    thumbColor={expInstallment ? Colors.purple : Colors.textTertiary}
                  />
                </View>
                {expInstallment && (
                  <View style={{ marginBottom: 8 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        {[2, 3, 4, 6, 9, 12].map((cnt) => (
                          <Pressable
                            key={cnt}
                            style={[styles.freqChip, expInstallmentCount === cnt && { backgroundColor: Colors.purple, borderColor: Colors.purple }]}
                            onPress={() => { setExpInstallmentCount(cnt); Haptics.selectionAsync(); }}
                          >
                            <Text style={[styles.freqChipText, expInstallmentCount === cnt && styles.freqChipTextActive]}>
                              {cnt}x
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </ScrollView>
                    {amount && parseInputAmount(amount) > 0 && (
                      <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.purple, marginTop: 6, textAlign: "center" }}>
                        {isEN
                          ? `${expInstallmentCount} × ${fmt(parseInputAmount(amount) / expInstallmentCount)} / month`
                          : `${expInstallmentCount} × ${fmt(parseInputAmount(amount) / expInstallmentCount)} / ay`}
                      </Text>
                    )}
                  </View>
                )}
              </>
            )}

            <View style={styles.recurringRow}>
              <View style={styles.recurringLeft}>
                <Ionicons name="repeat-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.recurringLabel}>{isEN ? "Recurring" : "Tekrarlı"}</Text>
              </View>
              <Switch
                value={expRecurring}
                onValueChange={(v) => { setExpRecurring(v); Haptics.selectionAsync(); }}
                trackColor={{ false: Colors.card2, true: ACCENT + "80" }}
                thumbColor={expRecurring ? ACCENT : Colors.textTertiary}
              />
            </View>
            {expRecurring && (
              <>
                <View style={styles.freqRow}>
                  {([
                    { key: "daily" as const, tr: "Günlük", en: "Daily", icon: "today-outline" },
                    { key: "weekly" as const, tr: "Haftalık", en: "Weekly", icon: "calendar-outline" },
                    { key: "monthly" as const, tr: "Aylık", en: "Monthly", icon: "calendar-number-outline" },
                  ]).map((f) => (
                    <Pressable
                      key={f.key}
                      style={[styles.freqChip, expRecurringFreq === f.key && styles.freqChipActive]}
                      onPress={() => { setExpRecurringFreq(f.key); Haptics.selectionAsync(); }}
                    >
                      <Ionicons name={f.icon as any} size={14} color={expRecurringFreq === f.key ? Colors.background : Colors.textSecondary} />
                      <Text style={[styles.freqChipText, expRecurringFreq === f.key && styles.freqChipTextActive]}>
                        {isEN ? f.en : f.tr}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {expRecurringFreq === "weekly" && (
                  <View style={styles.freqRow}>
                    {([
                      { day: 1, tr: "Pzt", en: "Mon" }, { day: 2, tr: "Sal", en: "Tue" },
                      { day: 3, tr: "Çar", en: "Wed" }, { day: 4, tr: "Per", en: "Thu" },
                      { day: 5, tr: "Cum", en: "Fri" }, { day: 6, tr: "Cmt", en: "Sat" },
                      { day: 0, tr: "Paz", en: "Sun" },
                    ]).map((d) => (
                      <Pressable
                        key={d.day}
                        style={[styles.dayChip, parseInt(expRecurringDay) === d.day && styles.dayChipActive]}
                        onPress={() => { setExpRecurringDay(String(d.day)); Haptics.selectionAsync(); }}
                      >
                        <Text style={[styles.dayChipText, parseInt(expRecurringDay) === d.day && styles.dayChipTextActive]}>
                          {isEN ? d.en : d.tr}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                {expRecurringFreq === "monthly" && (
                  <View style={{ marginBottom: 8 }}>
                    <Text style={styles.sectionLabel}>{isEN ? "Day of Month" : "Ayın Günü"}</Text>
                    <TextInput style={styles.input} value={expRecurringDay} onChangeText={setExpRecurringDay} keyboardType="number-pad" maxLength={2} placeholder="1" placeholderTextColor={Colors.textTertiary} />
                  </View>
                )}
              </>
            )}

            <Pressable style={styles.addBtn} onPress={handleAddExpense}>
              <Ionicons name="checkmark-circle-outline" size={20} color={Colors.background} />
              <Text style={styles.addBtnText}>{isEN ? "Record Expense" : "Gideri Kaydet"}</Text>
            </Pressable>

            {thisMonthExp.length > 0 && (
              <>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="list-outline" size={15} color={Colors.textSecondary} />
                  <Text style={styles.sectionLabel}>{isEN ? "This Month's Expenses" : "Bu Ayki Giderler"}</Text>
                </View>
                <View style={styles.expTotalRow}>
                  <Text style={styles.expTotalLabel}>{isEN ? "Total" : "Toplam"}</Text>
                  <Text style={[styles.expTotalValue, { color: Colors.red }]}>{fmt(biz.monthlyBusinessExpenses)}</Text>
                </View>
                {thisMonthExp
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((exp) => {
                    const cat = expCats.find((c) => c.key === exp.category) ?? COMMON_CATS.find((c) => c.key === exp.category);
                    return (
                      <View key={exp.id} style={styles.listRow}>
                        <View style={[styles.listIcon, { backgroundColor: (cat?.color ?? Colors.purple) + "20" }]}>
                          <Ionicons name={(cat?.icon ?? "briefcase-outline") as any} size={16} color={cat?.color ?? Colors.purple} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.listTitle}>{exp.title}</Text>
                          <Text style={styles.listMeta}>
                            {isEN ? cat?.labelEN : cat?.labelTR} · {exp.date}
                          </Text>
                        </View>
                        <Text style={[styles.listAmount, { color: Colors.red }]}>{fmt(exp.amount)}</Text>
                        <Pressable onPress={() => confirmDeleteExp(exp.id, exp.title)} hitSlop={8} style={{ marginLeft: 8 }}>
                          <Ionicons name="trash-outline" size={16} color={Colors.textTertiary} />
                        </Pressable>
                      </View>
                    );
                  })}
              </>
            )}

            {thisMonthExp.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={40} color={Colors.textTertiary} />
                <Text style={styles.emptyText}>{isEN ? "No expenses recorded this month." : "Bu ay gider kaydı yok."}</Text>
              </View>
            )}
          </>
        )}

        {mainTab === "gelirler" && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="grid-outline" size={15} color={Colors.textSecondary} />
              <Text style={styles.sectionLabel}>{isEN ? "Income Category" : "Gelir Kategorisi"}</Text>
            </View>
            <View style={styles.catGrid}>
              {BUSINESS_INC_CATS.map((cat) => (
                <Pressable
                  key={cat.key}
                  style={[styles.catCard, incCat === cat.key && { backgroundColor: Colors.tint + "20", borderColor: Colors.tint + "60" }]}
                  onPress={() => { setIncCat(cat.key); Haptics.selectionAsync(); }}
                >
                  <Ionicons name={cat.icon as any} size={18} color={incCat === cat.key ? Colors.tint : Colors.textSecondary} />
                  <Text style={[styles.catCardText, incCat === cat.key && { color: Colors.tint }]} numberOfLines={2}>
                    {isEN ? cat.labelEN : cat.labelTR}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.sectionHeaderRow}>
              <Ionicons name="cash-outline" size={15} color={Colors.textSecondary} />
              <Text style={styles.sectionLabel}>{isEN ? "Amount (₺)" : "Tutar (₺)"}</Text>
            </View>
            <View style={styles.amountRow}>
              <Text style={[styles.currencySymbol, { color: Colors.tint }]}>₺</Text>
              <TextInput
                style={styles.amountInput}
                value={incAmount}
                onChangeText={(v) => setIncAmount(formatInputAmount(v))}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            <View style={styles.sectionHeaderRow}>
              <Ionicons name="create-outline" size={15} color={Colors.textSecondary} />
              <Text style={styles.sectionLabel}>{isEN ? "Description (optional)" : "Açıklama (isteğe bağlı)"}</Text>
            </View>
            <TextInput
              style={styles.input}
              value={incTitle}
              onChangeText={setIncTitle}
              placeholder={isEN ? "e.g. Weekly sales revenue" : "ör. Haftalık satış geliri"}
              placeholderTextColor={Colors.textTertiary}
            />

            <View style={styles.recurringRow}>
              <View style={styles.recurringLeft}>
                <Ionicons name="repeat-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.recurringLabel}>{isEN ? "Recurring" : "Tekrarlı"}</Text>
              </View>
              <Switch
                value={incRecurring}
                onValueChange={(v) => { setIncRecurring(v); Haptics.selectionAsync(); }}
                trackColor={{ false: Colors.card2, true: Colors.tint + "80" }}
                thumbColor={incRecurring ? Colors.tint : Colors.textTertiary}
              />
            </View>
            {incRecurring && (
              <>
                <View style={styles.freqRow}>
                  {([
                    { key: "daily" as const, tr: "Günlük", en: "Daily", icon: "today-outline" },
                    { key: "weekly" as const, tr: "Haftalık", en: "Weekly", icon: "calendar-outline" },
                    { key: "monthly" as const, tr: "Aylık", en: "Monthly", icon: "calendar-number-outline" },
                  ]).map((f) => (
                    <Pressable
                      key={f.key}
                      style={[styles.freqChip, incRecurringFreq === f.key && { backgroundColor: Colors.tint, borderColor: Colors.tint }]}
                      onPress={() => { setIncRecurringFreq(f.key); Haptics.selectionAsync(); }}
                    >
                      <Ionicons name={f.icon as any} size={14} color={incRecurringFreq === f.key ? Colors.background : Colors.textSecondary} />
                      <Text style={[styles.freqChipText, incRecurringFreq === f.key && styles.freqChipTextActive]}>
                        {isEN ? f.en : f.tr}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {incRecurringFreq === "weekly" && (
                  <View style={styles.freqRow}>
                    {([
                      { day: 1, tr: "Pzt", en: "Mon" }, { day: 2, tr: "Sal", en: "Tue" },
                      { day: 3, tr: "Çar", en: "Wed" }, { day: 4, tr: "Per", en: "Thu" },
                      { day: 5, tr: "Cum", en: "Fri" }, { day: 6, tr: "Cmt", en: "Sat" },
                      { day: 0, tr: "Paz", en: "Sun" },
                    ]).map((d) => (
                      <Pressable
                        key={d.day}
                        style={[styles.dayChip, parseInt(incRecurringDay) === d.day && { backgroundColor: Colors.tint + "20", borderColor: Colors.tint + "60" }]}
                        onPress={() => { setIncRecurringDay(String(d.day)); Haptics.selectionAsync(); }}
                      >
                        <Text style={[styles.dayChipText, parseInt(incRecurringDay) === d.day && { color: Colors.tint }]}>
                          {isEN ? d.en : d.tr}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                {incRecurringFreq === "monthly" && (
                  <View style={{ marginBottom: 8 }}>
                    <Text style={styles.sectionLabel}>{isEN ? "Day of Month" : "Ayın Günü"}</Text>
                    <TextInput style={styles.input} value={incRecurringDay} onChangeText={setIncRecurringDay} keyboardType="number-pad" maxLength={2} placeholder="1" placeholderTextColor={Colors.textTertiary} />
                  </View>
                )}
              </>
            )}

            <Pressable style={[styles.addBtn, { backgroundColor: Colors.tint }]} onPress={handleAddIncome}>
              <Ionicons name="checkmark-circle-outline" size={20} color={Colors.background} />
              <Text style={styles.addBtnText}>{isEN ? "Record Income" : "Geliri Kaydet"}</Text>
            </Pressable>

            {thisMonthInc.length > 0 && (
              <>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="list-outline" size={15} color={Colors.textSecondary} />
                  <Text style={styles.sectionLabel}>{isEN ? "This Month's Income" : "Bu Ayki Gelirler"}</Text>
                </View>
                <View style={styles.expTotalRow}>
                  <Text style={styles.expTotalLabel}>{isEN ? "Total" : "Toplam"}</Text>
                  <Text style={[styles.expTotalValue, { color: Colors.tint }]}>{fmt(biz.monthlyBusinessIncomes)}</Text>
                </View>
                {thisMonthInc
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((inc) => {
                    const cat = BUSINESS_INC_CATS.find((c) => c.key === inc.category);
                    return (
                      <View key={inc.id} style={styles.listRow}>
                        <View style={[styles.listIcon, { backgroundColor: Colors.tint + "20" }]}>
                          <Ionicons name={(cat?.icon ?? "cash-outline") as any} size={16} color={Colors.tint} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.listTitle}>{inc.title}</Text>
                          <Text style={styles.listMeta}>{isEN ? cat?.labelEN : cat?.labelTR} · {inc.date}</Text>
                        </View>
                        <Text style={[styles.listAmount, { color: Colors.tint }]}>{fmt(inc.amount)}</Text>
                        <Pressable onPress={() => confirmDeleteInc(inc.id, inc.title)} hitSlop={8} style={{ marginLeft: 8 }}>
                          <Ionicons name="trash-outline" size={16} color={Colors.textTertiary} />
                        </Pressable>
                      </View>
                    );
                  })}
              </>
            )}

            {thisMonthInc.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="cash-outline" size={40} color={Colors.textTertiary} />
                <Text style={styles.emptyText}>{isEN ? "No income recorded this month." : "Bu ay gelir kaydı yok."}</Text>
              </View>
            )}
          </>
        )}

        {mainTab === "vergi" && (
          <>
            <View style={styles.subTabRow}>
              <Pressable
                style={[styles.subTabBtn, taxSubTab === "estimated" && styles.subTabBtnActive]}
                onPress={() => { setTaxSubTab("estimated"); Haptics.selectionAsync(); }}
              >
                <Ionicons name="analytics-outline" size={14} color={taxSubTab === "estimated" ? ACCENT : Colors.textSecondary} />
                <Text style={[styles.subTabText, taxSubTab === "estimated" && { color: ACCENT }]}>
                  {isEN ? "Estimated" : "Tahmini"}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.subTabBtn, taxSubTab === "manual" && styles.subTabBtnActive]}
                onPress={() => { setTaxSubTab("manual"); Haptics.selectionAsync(); }}
              >
                <Ionicons name="create-outline" size={14} color={taxSubTab === "manual" ? ACCENT : Colors.textSecondary} />
                <Text style={[styles.subTabText, taxSubTab === "manual" && { color: ACCENT }]}>
                  {isEN ? "Manual" : "Manuel"}
                </Text>
              </Pressable>
            </View>

            {taxSubTab === "estimated" && (
              <>
                <View style={styles.taxInfoBox}>
                  <Ionicons name="information-circle-outline" size={16} color={Colors.blue} />
                  <Text style={styles.taxInfoText}>
                    {isEN
                      ? "KDV estimates based on your expense categories. Tap on any rate to change it manually."
                      : "Gider kategorilerinize göre tahmini KDV hesabı. Herhangi bir oranı değiştirmek için üzerine dokunun."}
                  </Text>
                </View>

                <View style={styles.taxSummaryRow}>
                  <View style={[styles.taxSummaryCard, { borderColor: Colors.red + "40" }]}>
                    <Ionicons name="arrow-up-circle-outline" size={20} color={Colors.red} />
                    <Text style={styles.taxSummaryLabel}>{isEN ? "KDV on Expenses" : "Gider KDV'si"}</Text>
                    <Text style={[styles.taxSummaryValue, { color: Colors.red }]}>{fmt(totalKDVExpense)}</Text>
                  </View>
                  <View style={[styles.taxSummaryCard, { borderColor: Colors.tint + "40" }]}>
                    <Ionicons name="arrow-down-circle-outline" size={20} color={Colors.tint} />
                    <Text style={styles.taxSummaryLabel}>{isEN ? "KDV on Income" : "Gelir KDV'si"}</Text>
                    <Text style={[styles.taxSummaryValue, { color: Colors.tint }]}>{fmt(totalKDVIncome)}</Text>
                  </View>
                </View>

                <View style={[styles.netKdvCard, { borderColor: totalKDVIncome - totalKDVExpense >= 0 ? Colors.tint + "40" : Colors.orange + "40" }]}>
                  <Text style={styles.netKdvLabel}>{isEN ? "Net KDV Position" : "Net KDV Durumu"}</Text>
                  <Text style={[styles.netKdvValue, { color: totalKDVIncome - totalKDVExpense >= 0 ? Colors.tint : Colors.orange }]}>
                    {fmt(totalKDVIncome - totalKDVExpense)}
                  </Text>
                  <Text style={styles.netKdvSub}>
                    {totalKDVIncome - totalKDVExpense >= 0
                      ? (isEN ? "You may owe this to the tax office" : "Bu tutarı vergi dairesine ödeyebilirsiniz")
                      : (isEN ? "You may be eligible for KDV refund" : "KDV iadesi alabilirsiniz")}
                  </Text>
                </View>

                {estimatedTaxRows.length > 0 && (
                  <>
                    <View style={styles.sectionHeaderRow}>
                      <Ionicons name="list-outline" size={15} color={Colors.textSecondary} />
                      <Text style={styles.sectionLabel}>{isEN ? "Expense KDV Breakdown" : "Gider KDV Dağılımı"}</Text>
                    </View>
                    {estimatedTaxRows
                      .sort((a, b) => b.kdvAmount - a.kdvAmount)
                      .map((row) => {
                        const cat = expCats.find((c) => c.key === row.category) ?? COMMON_CATS.find((c) => c.key === row.category);
                        const isEditing = editingRateId === row.id;
                        return (
                          <View key={row.id} style={styles.kdvRow}>
                            <View style={[styles.listIcon, { backgroundColor: (cat?.color ?? Colors.purple) + "20" }]}>
                              <Ionicons name={(cat?.icon ?? "briefcase-outline") as any} size={14} color={cat?.color ?? Colors.purple} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.listTitle} numberOfLines={1}>{row.title}</Text>
                              <Text style={styles.listMeta}>{fmt(row.amount)}</Text>
                            </View>
                            {isEditing ? (
                              <View style={{ gap: 4 }}>
                                <View style={styles.rateEditRow}>
                                  {KDV_RATES.map((r) => (
                                    <Pressable
                                      key={r}
                                      style={[styles.rateEditBtn, row.rate === r && { backgroundColor: ACCENT + "30", borderColor: ACCENT }]}
                                      onPress={() => {
                                        setCustomRates((prev) => ({ ...prev, [row.id]: r }));
                                        setEditingRateId(null);
                                        setCustomRateInput("");
                                        Haptics.selectionAsync();
                                      }}
                                    >
                                      <Text style={[styles.rateEditText, row.rate === r && { color: ACCENT, fontFamily: "Inter_700Bold" }]}>%{r}</Text>
                                    </Pressable>
                                  ))}
                                </View>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                  <Text style={{ fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.textSecondary }}>%</Text>
                                  <TextInput
                                    style={{ flex: 1, backgroundColor: Colors.card2, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.text, borderWidth: 1, borderColor: Colors.border, minWidth: 36 }}
                                    value={customRateInput}
                                    onChangeText={setCustomRateInput}
                                    keyboardType="decimal-pad"
                                    placeholder="ör. 3"
                                    placeholderTextColor={Colors.textTertiary}
                                    onSubmitEditing={() => {
                                      const val = parseFloat(customRateInput.replace(",", "."));
                                      if (!isNaN(val) && val >= 0 && val <= 100) {
                                        setCustomRates((prev) => ({ ...prev, [row.id]: val }));
                                        setEditingRateId(null);
                                        setCustomRateInput("");
                                        Haptics.selectionAsync();
                                      }
                                    }}
                                  />
                                  <Pressable
                                    style={{ backgroundColor: ACCENT, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}
                                    onPress={() => {
                                      const val = parseFloat(customRateInput.replace(",", "."));
                                      if (!isNaN(val) && val >= 0 && val <= 100) {
                                        setCustomRates((prev) => ({ ...prev, [row.id]: val }));
                                        setEditingRateId(null);
                                        setCustomRateInput("");
                                        Haptics.selectionAsync();
                                      }
                                    }}
                                  >
                                    <Ionicons name="checkmark" size={12} color={Colors.background} />
                                  </Pressable>
                                </View>
                              </View>
                            ) : (
                              <Pressable
                                onPress={() => { setEditingRateId(row.id); Haptics.selectionAsync(); }}
                                style={styles.rateBadgeTap}
                              >
                                <Text style={styles.rateBadgeText}>%{row.rate}</Text>
                                <Ionicons name="pencil-outline" size={10} color={ACCENT} />
                              </Pressable>
                            )}
                            <View style={{ alignItems: "flex-end", marginLeft: 8 }}>
                              <Text style={[styles.kdvAmt, { color: Colors.red }]}>{fmt(row.kdvAmount)}</Text>
                              <Text style={styles.kdvLabel}>KDV</Text>
                            </View>
                          </View>
                        );
                      })}
                  </>
                )}

                {estimatedTaxRows.length === 0 && (
                  <View style={styles.emptyState}>
                    <Ionicons name="calculator-outline" size={40} color={Colors.textTertiary} />
                    <Text style={styles.emptyText}>
                      {isEN ? "Add expenses to see KDV estimates." : "Tahmini vergi hesabı için gider ekleyin."}
                    </Text>
                  </View>
                )}
              </>
            )}

            {taxSubTab === "manual" && (
              <>
                <View style={styles.taxInfoBox}>
                  <Ionicons name="calculator-outline" size={16} color={Colors.purple} />
                  <Text style={styles.taxInfoText}>
                    {isEN
                      ? "Manually calculate KDV for any amount. Choose whether the amount already includes KDV."
                      : "Herhangi bir tutar için manuel KDV hesabı yapın. Tutarın KDV dahil mi yoksa hariç mi olduğunu seçin."}
                  </Text>
                </View>

                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="cash-outline" size={15} color={Colors.textSecondary} />
                  <Text style={styles.sectionLabel}>{isEN ? "Amount (₺)" : "Tutar (₺)"}</Text>
                </View>
                <View style={styles.amountRow}>
                  <Text style={[styles.currencySymbol, { color: Colors.purple }]}>₺</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={manualAmount}
                    onChangeText={(v) => setManualAmount(formatInputAmount(v))}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={Colors.textTertiary}
                  />
                </View>

                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="calculator-outline" size={15} color={Colors.textSecondary} />
                  <Text style={styles.sectionLabel}>{isEN ? "KDV Rate" : "KDV Oranı"}</Text>
                </View>
                <View style={styles.rateRow}>
                  {KDV_RATES.map((rate) => (
                    <Pressable
                      key={rate}
                      style={[styles.rateBtn, manualRate === rate && { backgroundColor: ACCENT + "20", borderColor: ACCENT + "80" }]}
                      onPress={() => { setManualRate(rate); setManualCustomRate(""); Haptics.selectionAsync(); }}
                    >
                      <Text style={[styles.rateBtnText, manualRate === rate && { color: ACCENT, fontFamily: "Inter_700Bold" }]}>
                        %{rate}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <Text style={{ fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary }}>{isEN ? "Custom:" : "Özel:"}</Text>
                  <Text style={{ fontFamily: "Inter_700Bold", fontSize: 14, color: ACCENT }}>%</Text>
                  <TextInput
                    style={{ flex: 1, backgroundColor: Colors.background, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text, borderWidth: 1, borderColor: Colors.border }}
                    value={manualCustomRate}
                    onChangeText={(t) => {
                      setManualCustomRate(t);
                      const val = parseFloat(t.replace(",", "."));
                      if (!isNaN(val) && val >= 0 && val <= 100) {
                        setManualRate(val);
                      }
                    }}
                    keyboardType="decimal-pad"
                    placeholder={isEN ? "e.g. 3, 27" : "ör. 3, 27"}
                    placeholderTextColor={Colors.textTertiary}
                  />
                </View>

                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="swap-horizontal-outline" size={15} color={Colors.textSecondary} />
                  <Text style={styles.sectionLabel}>{isEN ? "Amount Type" : "Tutar Türü"}</Text>
                </View>
                <View style={styles.includedRow}>
                  <Pressable
                    style={[styles.includedBtn, manualIncluded && styles.includedBtnActive]}
                    onPress={() => { setManualIncluded(true); Haptics.selectionAsync(); }}
                  >
                    <Text style={[styles.includedBtnText, manualIncluded && { color: ACCENT }]}>
                      {isEN ? "KDV Included" : "KDV Dahil"}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.includedBtn, !manualIncluded && styles.includedBtnActive]}
                    onPress={() => { setManualIncluded(false); Haptics.selectionAsync(); }}
                  >
                    <Text style={[styles.includedBtnText, !manualIncluded && { color: ACCENT }]}>
                      {isEN ? "KDV Excluded" : "KDV Hariç"}
                    </Text>
                  </Pressable>
                </View>

                {manualParsed > 0 && (
                  <View style={styles.manualResultCard}>
                    <Text style={styles.manualResultTitle}>{isEN ? "Calculation Result" : "Hesaplama Sonucu"}</Text>
                    <View style={styles.manualResultRow}>
                      <Text style={styles.manualResultLabel}>{isEN ? "Net Amount (exc. KDV)" : "Matrah (KDV Hariç)"}</Text>
                      <Text style={[styles.manualResultValue, { color: Colors.text }]}>{fmtN(manualNet)} ₺</Text>
                    </View>
                    <View style={[styles.manualResultRow, { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 6, paddingTop: 6 }]}>
                      <Text style={styles.manualResultLabel}>KDV (%{manualRate})</Text>
                      <Text style={[styles.manualResultValue, { color: Colors.red }]}>{fmtN(manualKDV)} ₺</Text>
                    </View>
                    <View style={[styles.manualResultRow, { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 6, paddingTop: 6 }]}>
                      <Text style={[styles.manualResultLabel, { fontFamily: "Inter_700Bold" }]}>{isEN ? "Total (incl. KDV)" : "Toplam (KDV Dahil)"}</Text>
                      <Text style={[styles.manualResultValue, { color: ACCENT, fontFamily: "Inter_700Bold", fontSize: 18 }]}>{fmtN(manualTotal)} ₺</Text>
                    </View>
                    <View style={styles.manualRateBadge}>
                      <Text style={styles.manualRateBadgeText}>%{manualRate} KDV</Text>
                    </View>
                  </View>
                )}

                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="information-circle-outline" size={15} color={Colors.textSecondary} />
                  <Text style={styles.sectionLabel}>{isEN ? "KDV Rate Guide" : "KDV Oranı Rehberi"}</Text>
                </View>
                {[
                  { rate: "%1",  tr: "Su, temel gıda, tarım",                   en: "Water, basic food, agriculture" },
                  { rate: "%8",  tr: "Yiyecek-içecek, ilaç, kitap, tarım ekip.",en: "Food & drink, medicine, books" },
                  { rate: "%10", tr: "Konut (150 m² altı), bazı hizmetler",      en: "Housing <150m², some services" },
                  { rate: "%18", tr: "Genel hizmetler, yazılım, reklam",          en: "General services, software, ads" },
                  { rate: "%20", tr: "Lüks ürünler, akaryakıt, mobilya",         en: "Luxury goods, fuel, furniture" },
                ].map((g) => (
                  <View key={g.rate} style={styles.guideRow}>
                    <View style={[styles.guideBadge, { backgroundColor: ACCENT + "20" }]}>
                      <Text style={[styles.guideBadgeText, { color: ACCENT }]}>{g.rate}</Text>
                    </View>
                    <Text style={styles.guideDesc}>{isEN ? g.en : g.tr}</Text>
                  </View>
                ))}
              </>
            )}
          </>
        )}

        {mainTab === "kartlar" && (
          <>
            <View style={styles.toggleCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>
                  {isEN ? "Separate Business Card Tracking" : "Ayrı İş Kartı Takibi"}
                </Text>
                <Text style={styles.toggleSub}>
                  {biz.separateCardTracking
                    ? (isEN ? "Business cards tracked separately from family budget" : "İş kartları aile bütçesinden ayrı takip ediliyor")
                    : (isEN ? "Business cards combined with family budget" : "İş kartları aile bütçesiyle birleşik takip ediliyor")}
                </Text>
              </View>
              <Switch
                value={biz.separateCardTracking}
                onValueChange={(val) => { biz.setSeparateCardTracking(val); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                trackColor={{ false: Colors.border, true: ACCENT + "80" }}
                thumbColor={biz.separateCardTracking ? ACCENT : Colors.textSecondary}
                ios_backgroundColor={Colors.border}
              />
            </View>

            <View style={styles.sectionHeaderRow}>
              <Ionicons name="card-outline" size={15} color={Colors.textSecondary} />
              <Text style={styles.sectionLabel}>{isEN ? "Business Credit Cards" : "İş Kredi Kartları"}</Text>
            </View>

            {biz.businessCreditCards.filter((c) => !c.linkedFamilyCardId).map((card) => {
              const spent = biz.businessCardSpending[card.id] || 0;
              return (
                <View key={card.id} style={[styles.bizCardRow, { borderColor: card.color + "40" }]}>
                  <View style={[styles.bizCardDot, { backgroundColor: card.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listTitle}>{card.name || card.bank}</Text>
                    <Text style={styles.listMeta}>{card.bank} · {isEN ? "Pay day" : "Ödeme günü"}: {card.paymentDay}</Text>
                    {card.limit ? (
                      <View style={styles.cardUsageRow}>
                        <Text style={styles.cardUsageText}>{fmt(spent)} / {fmt(card.limit)}</Text>
                        <View style={styles.cardUsageTrack}>
                          <View style={[styles.cardUsageFill, { width: `${Math.min(100, (spent / card.limit) * 100)}%`, backgroundColor: card.color }]} />
                        </View>
                      </View>
                    ) : (
                      <Text style={styles.cardUsageText}>{isEN ? "Spent" : "Harcama"}: {fmt(spent)}</Text>
                    )}
                  </View>
                  <Pressable
                    onPress={() => {
                      Alert.alert(isEN ? "Delete" : "Sil", `"${card.name || card.bank}" ${isEN ? "will be deleted." : "silinecek."}`, [
                        { text: isEN ? "Cancel" : "Vazgeç", style: "cancel" },
                        { text: isEN ? "Delete" : "Sil", style: "destructive", onPress: () => { biz.deleteBusinessCreditCard(card.id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } },
                      ]);
                    }}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={16} color={Colors.textTertiary} />
                  </Pressable>
                </View>
              );
            })}

            <Pressable style={[styles.addBtn, { backgroundColor: ACCENT }]} onPress={() => setShowCardForm(true)}>
              <Ionicons name="add-circle-outline" size={20} color={Colors.background} />
              <Text style={styles.addBtnText}>{isEN ? "Add Business Card" : "İş Kartı Ekle"}</Text>
            </Pressable>

            {budget.creditCards.length > 0 && (
              <>
                <View style={[styles.sectionHeaderRow, { marginTop: 20 }]}>
                  <Ionicons name="link-outline" size={15} color={Colors.textSecondary} />
                  <Text style={styles.sectionLabel}>{isEN ? "Link Family Budget Cards" : "Aile Bütçesi Kartlarını Bağla"}</Text>
                </View>
                {budget.creditCards.map((fc) => {
                  const isLinked = biz.businessCreditCards.some((bc) => bc.linkedFamilyCardId === fc.id);
                  const linked = biz.businessCreditCards.find((bc) => bc.linkedFamilyCardId === fc.id);
                  const bizSpent = linked ? (biz.businessCardSpending[linked.id] || 0) : 0;
                  const familySpent = budget.spendingByCard[fc.id] ?? 0;
                  const combinedTotal = !biz.separateCardTracking ? bizSpent + familySpent : bizSpent;
                  return (
                    <View key={fc.id} style={[styles.bizCardRow, { borderColor: isLinked ? fc.color + "40" : Colors.border }]}>
                      <View style={[styles.bizCardDot, { backgroundColor: fc.color }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.listTitle}>{fc.name || fc.bank}</Text>
                        <Text style={styles.listMeta}>
                          {fc.bank}
                          {isLinked ? ` · ${isEN ? "Biz" : "İş"}: ${fmt(bizSpent)}` : ""}
                          {isLinked && !biz.separateCardTracking && familySpent > 0 ? ` · ${isEN ? "Combined" : "Toplam"}: ${fmt(combinedTotal)}` : ""}
                        </Text>
                      </View>
                      <Pressable
                        style={[styles.linkBtn, isLinked && { backgroundColor: ACCENT + "20", borderColor: ACCENT + "60" }]}
                        onPress={() => {
                          if (isLinked) biz.unlinkFamilyCard(fc.id);
                          else biz.linkFamilyCard(fc.id, fc.bank, fc.name, fc.color);
                          Haptics.selectionAsync();
                        }}
                      >
                        <Ionicons name={isLinked ? "checkmark" : "link-outline"} size={14} color={isLinked ? ACCENT : Colors.textSecondary} />
                        <Text style={[styles.linkBtnText, isLinked && { color: ACCENT }]}>
                          {isLinked ? (isEN ? "Linked" : "Bağlı") : (isEN ? "Link" : "Bağla")}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </>
            )}

            <Modal visible={showCardForm} animationType="slide" transparent>
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <Text style={styles.title}>{isEN ? "New Business Card" : "Yeni İş Kartı"}</Text>
                    <Pressable onPress={() => setShowCardForm(false)} hitSlop={10}>
                      <Ionicons name="close" size={22} color={Colors.textSecondary} />
                    </Pressable>
                  </View>

                  <Text style={styles.cardFormLabel}>{isEN ? "Bank" : "Banka"}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12, maxHeight: 36 }}>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      {corpBankList.map((b) => (
                        <Pressable
                          key={b}
                          style={[styles.cardPickChip, cardBank === b && { backgroundColor: ACCENT + "20", borderColor: ACCENT + "60" }]}
                          onPress={() => setCardBank(b)}
                        >
                          <Text style={[styles.cardPickText, cardBank === b && { color: ACCENT }]}>{b}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>

                  <Text style={styles.cardFormLabel}>{isEN ? "Card Name" : "Kart Adı"}</Text>
                  <TextInput style={styles.input} value={cardName} onChangeText={setCardName} placeholder={isEN ? "e.g. Business Visa" : "ör. İş Visa"} placeholderTextColor={Colors.textTertiary} />

                  <Text style={[styles.cardFormLabel, { marginTop: 10 }]}>{isEN ? "Limit (₺)" : "Limit (₺)"}</Text>
                  <TextInput style={styles.input} value={cardLimit} onChangeText={(v) => setCardLimit(formatInputAmount(v))} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textTertiary} />

                  <Text style={[styles.cardFormLabel, { marginTop: 10 }]}>{isEN ? "Payment Day" : "Ödeme Günü"}</Text>
                  <TextInput style={styles.input} value={cardPaymentDay} onChangeText={setCardPaymentDay} keyboardType="number-pad" placeholder="10" placeholderTextColor={Colors.textTertiary} />

                  <Text style={[styles.cardFormLabel, { marginTop: 10 }]}>{isEN ? "Color" : "Renk"}</Text>
                  <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                    {CARD_COLORS.map((c) => (
                      <Pressable key={c} style={[styles.colorDot, { backgroundColor: c }, cardColor === c && { borderWidth: 3, borderColor: Colors.text }]} onPress={() => setCardColor(c)} />
                    ))}
                  </View>

                  <Pressable
                    style={[styles.addBtn, { backgroundColor: ACCENT }]}
                    onPress={() => {
                      if (!cardName.trim() && !cardBank) { Alert.alert(isEN ? "Error" : "Hata", isEN ? "Enter card name." : "Kart adı girin."); return; }
                      biz.addBusinessCreditCard({ bank: cardBank, name: cardName.trim() || cardBank, limit: parseInputAmount(cardLimit) || undefined, statementDay: 1, paymentDay: parseInt(cardPaymentDay) || 10, color: cardColor });
                      setCardName(""); setCardLimit(""); setCardPaymentDay("10"); setShowCardForm(false);
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }}
                  >
                    <Ionicons name="checkmark-circle-outline" size={20} color={Colors.background} />
                    <Text style={styles.addBtnText}>{isEN ? "Save Card" : "Kartı Kaydet"}</Text>
                  </Pressable>
                </View>
              </View>
            </Modal>

            {biz.businessCreditCards.length === 0 && budget.creditCards.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="card-outline" size={40} color={Colors.textTertiary} />
                <Text style={styles.emptyText}>{isEN ? "No credit cards yet." : "Henüz kredi kartı yok."}</Text>
              </View>
            )}
          </>
        )}

        {mainTab === "ozet" && (
          <>
            <View style={styles.summaryCards}>
              <View style={[styles.summaryCard, { borderColor: Colors.tint + "40" }]}>
                <Ionicons name="arrow-down-circle-outline" size={22} color={Colors.tint} />
                <Text style={styles.summaryCardLabel}>{isEN ? "Business Income" : "İş Yeri Geliri"}</Text>
                <Text style={[styles.summaryCardValue, { color: Colors.tint }]}>{fmt(biz.monthlyBusinessIncomes)}</Text>
              </View>
              <View style={[styles.summaryCard, { borderColor: Colors.red + "40" }]}>
                <Ionicons name="arrow-up-circle-outline" size={22} color={Colors.red} />
                <Text style={styles.summaryCardLabel}>{isEN ? "Business Expense" : "İş Yeri Gideri"}</Text>
                <Text style={[styles.summaryCardValue, { color: Colors.red }]}>{fmt(biz.monthlyBusinessExpenses)}</Text>
              </View>
            </View>

            <View style={styles.netCard}>
              <Text style={styles.netLabel}>{isEN ? "Net Profit/Loss" : "Net Kar/Zarar"}</Text>
              <Text style={[styles.netValue, { color: biz.monthlyBusinessIncomes - biz.monthlyBusinessExpenses >= 0 ? Colors.tint : Colors.red }]}>
                {fmt(biz.monthlyBusinessIncomes - biz.monthlyBusinessExpenses)}
              </Text>
              <Text style={styles.netSub}>
                {biz.combinedWithBudget
                  ? (isEN ? "Included in your total household budget" : "Ev bütçenize dahil ediliyor")
                  : (isEN ? "Tracked separately from household budget" : "Ev bütçesinden ayrı takip ediliyor")}
              </Text>
            </View>

            {(() => {
              const netKDV = totalKDVIncome - totalKDVExpense;
              const netProfit = biz.monthlyBusinessIncomes - biz.monthlyBusinessExpenses;
              const estimatedNetAfterTax = netProfit - (netKDV > 0 ? netKDV : 0);
              return (
                <View style={[styles.netCard, { marginTop: 8, borderColor: Colors.orange + "40" }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="calculator-outline" size={18} color={Colors.orange} />
                    <Text style={[styles.netLabel, { color: Colors.orange }]}>
                      {isEN ? "Est. Net After Tax" : "Tahmini Vergi Sonrası Net"}
                    </Text>
                  </View>
                  <Text style={[styles.netValue, { color: estimatedNetAfterTax >= 0 ? Colors.tint : Colors.red }]}>
                    {fmt(estimatedNetAfterTax)}
                  </Text>
                  {netKDV > 0 ? (
                    <Text style={styles.netSub}>
                      {isEN ? `Estimated KDV: ${fmt(netKDV)}` : `Tahmini KDV: ${fmt(netKDV)}`}
                    </Text>
                  ) : (
                    <Text style={styles.netSub}>
                      {isEN ? "Add income/expenses to see tax estimate" : "Vergi tahmini için gelir/gider ekleyin"}
                    </Text>
                  )}
                </View>
              );
            })()}

            {thisMonthExp.length > 0 && (
              <>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="pie-chart-outline" size={15} color={Colors.textSecondary} />
                  <Text style={styles.sectionLabel}>{isEN ? "Expense Breakdown" : "Gider Dağılımı"}</Text>
                </View>
                {Object.entries(expByCategory)
                  .sort((a, b) => b[1] - a[1])
                  .map(([catKey, total]) => {
                    const cat = expCats.find((c) => c.key === catKey) ?? COMMON_CATS.find((c) => c.key === catKey);
                    const pct = biz.monthlyBusinessExpenses > 0 ? (total / biz.monthlyBusinessExpenses) * 100 : 0;
                    return (
                      <View key={catKey} style={styles.breakdownRow}>
                        <View style={[styles.breakdownDot, { backgroundColor: cat?.color ?? Colors.purple }]} />
                        <Text style={styles.breakdownLabel}>{isEN ? cat?.labelEN : cat?.labelTR}</Text>
                        <Text style={styles.breakdownPct}>{Math.round(pct)}%</Text>
                        <Text style={styles.breakdownAmt}>{fmt(total)}</Text>
                      </View>
                    );
                  })}
              </>
            )}

            {thisMonthExp.length === 0 && thisMonthInc.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="business-outline" size={40} color={Colors.textTertiary} />
                <Text style={styles.emptyText}>
                  {isEN ? "No data this month. Start recording income & expenses." : "Bu ay veri yok. Gelir ve gider kaydetmeye başlayın."}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
      </View>

      <Modal visible={showAddWorkspace} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "90%" }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={styles.title}>{isEN ? "New Workspace" : "Yeni İş Yeri"}</Text>
              <Pressable onPress={() => setShowAddWorkspace(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.cardFormLabel}>{isEN ? "Select Profession" : "Meslek Seçin"}</Text>
              <View style={styles.profGrid}>
                {PROFESSIONS.map((p) => (
                  <Pressable
                    key={p.key}
                    style={[styles.profChip, newWsProfKey === p.key && { backgroundColor: ACCENT + "20", borderColor: ACCENT + "60" }]}
                    onPress={() => { setNewWsProfKey(p.key); setNewWsProfSub(""); Haptics.selectionAsync(); }}
                  >
                    <Ionicons name={p.icon as any} size={13} color={newWsProfKey === p.key ? ACCENT : Colors.textSecondary} />
                    <Text style={[styles.profChipText, newWsProfKey === p.key && { color: ACCENT }]} numberOfLines={2}>
                      {isEN ? p.labelEN : p.labelTR}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {newWsProfKey && (
                <>
                  {(() => {
                    const prof = PROFESSIONS.find((p) => p.key === newWsProfKey);
                    if (!prof) return null;
                    return (
                      <View style={{ marginTop: 12 }}>
                        <Text style={styles.cardFormLabel}>{isEN ? "Specialization" : "Uzmanlık"}</Text>
                        <View style={styles.profSubChips}>
                          {prof.subs.map((sub) => (
                            <Pressable
                              key={sub.tr}
                              style={[styles.subChip, newWsProfSub === sub.tr && styles.subChipActive]}
                              onPress={() => { setNewWsProfSub(sub.tr); Haptics.selectionAsync(); }}
                            >
                              <Text style={[styles.subChipText, newWsProfSub === sub.tr && styles.subChipTextActive]}>
                                {isEN ? sub.en : sub.tr}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    );
                  })()}
                  {newWsProfKey === "other" && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={styles.cardFormLabel}>{isEN ? "Custom Business Name" : "İş Yeri Adı"}</Text>
                      <TextInput
                        style={styles.input}
                        value={newWsCustomName}
                        onChangeText={setNewWsCustomName}
                        placeholder={isEN ? "e.g. My Flower Shop" : "ör. Çiçekçim"}
                        placeholderTextColor={Colors.textTertiary}
                      />
                    </View>
                  )}
                </>
              )}
              <Pressable style={[styles.addBtn, { backgroundColor: ACCENT, marginTop: 16 }]} onPress={handleAddWorkspace}>
                <Ionicons name="checkmark-circle-outline" size={20} color={Colors.background} />
                <Text style={styles.addBtnText}>{isEN ? "Add Workspace" : "İş Yeri Ekle"}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showDetail} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "90%" }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                {currentProf && (
                  <View style={[styles.workspaceIcon, { backgroundColor: ACCENT + "18" }]}>
                    <Ionicons name={currentProf.icon as any} size={20} color={ACCENT} />
                  </View>
                )}
                <View>
                  <Text style={styles.title}>{isEN ? "Business Detail" : "İş Yeri Detayı"}</Text>
                  {currentProf && <Text style={styles.profSubtitle}>{isEN ? currentProf.labelEN : currentProf.labelTR}</Text>}
                </View>
              </View>
              <Pressable onPress={() => setShowDetail(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.summaryCards}>
                <View style={[styles.summaryCard, { borderColor: Colors.tint + "40" }]}>
                  <Text style={styles.summaryCardLabel}>{isEN ? "Income" : "Gelir"}</Text>
                  <Text style={[styles.summaryCardValue, { color: Colors.tint, fontSize: 18 }]}>{fmt(biz.monthlyBusinessIncomes)}</Text>
                </View>
                <View style={[styles.summaryCard, { borderColor: Colors.red + "40" }]}>
                  <Text style={styles.summaryCardLabel}>{isEN ? "Expense" : "Gider"}</Text>
                  <Text style={[styles.summaryCardValue, { color: Colors.red, fontSize: 18 }]}>{fmt(biz.monthlyBusinessExpenses)}</Text>
                </View>
              </View>

              <View style={[styles.netCard, { marginTop: 8, marginBottom: 8 }]}>
                <Text style={styles.netLabel}>Net</Text>
                <Text style={[styles.netValue, { fontSize: 22, color: biz.monthlyBusinessIncomes - biz.monthlyBusinessExpenses >= 0 ? Colors.tint : Colors.red }]}>
                  {fmt(biz.monthlyBusinessIncomes - biz.monthlyBusinessExpenses)}
                </Text>
              </View>

              {(() => {
                const netKDV = totalKDVIncome - totalKDVExpense;
                const netProfit = biz.monthlyBusinessIncomes - biz.monthlyBusinessExpenses;
                const estimatedNetAfterTax = netProfit - (netKDV > 0 ? netKDV : 0);
                return (
                  <View style={[styles.netCard, { marginBottom: 12, borderColor: Colors.orange + "40" }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Ionicons name="calculator-outline" size={16} color={Colors.orange} />
                      <Text style={[styles.netLabel, { color: Colors.orange }]}>
                        {isEN ? "Est. Net After Tax" : "Tahmini Vergi Sonrası Net"}
                      </Text>
                    </View>
                    <Text style={[styles.netValue, { fontSize: 20, color: estimatedNetAfterTax >= 0 ? Colors.tint : Colors.red }]}>
                      {fmt(estimatedNetAfterTax)}
                    </Text>
                    {netKDV > 0 && (
                      <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textTertiary, marginTop: 2 }}>
                        {isEN ? `KDV: ${fmt(netKDV)}` : `KDV: ${fmt(netKDV)}`}
                      </Text>
                    )}
                  </View>
                );
              })()}

              {Object.keys(incByCategory).length > 0 && (
                <>
                  <View style={styles.sectionHeaderRow}>
                    <Ionicons name="arrow-down-circle-outline" size={15} color={Colors.tint} />
                    <Text style={[styles.sectionLabel, { color: Colors.tint }]}>{isEN ? "Income Sources" : "Gelir Kaynakları"}</Text>
                  </View>
                  {Object.entries(incByCategory)
                    .sort((a, b) => b[1] - a[1])
                    .map(([catKey, total]) => {
                      const cat = BUSINESS_INC_CATS.find((c) => c.key === catKey);
                      const pct = biz.monthlyBusinessIncomes > 0 ? (total / biz.monthlyBusinessIncomes) * 100 : 0;
                      return (
                        <View key={catKey} style={styles.breakdownRow}>
                          <View style={[styles.breakdownDot, { backgroundColor: Colors.tint }]} />
                          <Text style={styles.breakdownLabel}>{isEN ? cat?.labelEN : cat?.labelTR}</Text>
                          <Text style={styles.breakdownPct}>{Math.round(pct)}%</Text>
                          <Text style={[styles.breakdownAmt, { color: Colors.tint }]}>{fmt(total)}</Text>
                        </View>
                      );
                    })}
                </>
              )}

              {Object.keys(expByCategory).length > 0 && (
                <>
                  <View style={[styles.sectionHeaderRow, { marginTop: 16 }]}>
                    <Ionicons name="arrow-up-circle-outline" size={15} color={Colors.red} />
                    <Text style={[styles.sectionLabel, { color: Colors.red }]}>{isEN ? "Expense Categories" : "Gider Kategorileri"}</Text>
                  </View>
                  {Object.entries(expByCategory)
                    .sort((a, b) => b[1] - a[1])
                    .map(([catKey, total]) => {
                      const cat = expCats.find((c) => c.key === catKey) ?? COMMON_CATS.find((c) => c.key === catKey);
                      const pct = biz.monthlyBusinessExpenses > 0 ? (total / biz.monthlyBusinessExpenses) * 100 : 0;
                      return (
                        <View key={catKey} style={styles.breakdownRow}>
                          <View style={[styles.breakdownDot, { backgroundColor: cat?.color ?? Colors.red }]} />
                          <Text style={styles.breakdownLabel}>{isEN ? cat?.labelEN : cat?.labelTR}</Text>
                          <Text style={styles.breakdownPct}>{Math.round(pct)}%</Text>
                          <Text style={[styles.breakdownAmt, { color: Colors.red }]}>{fmt(total)}</Text>
                        </View>
                      );
                    })}
                </>
              )}

              {Object.keys(incByCategory).length === 0 && Object.keys(expByCategory).length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="analytics-outline" size={40} color={Colors.textTertiary} />
                  <Text style={styles.emptyText}>{isEN ? "No data this month." : "Bu ay veri yok."}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { zIndex: 10, position: "relative" as const, backgroundColor: Colors.background },
  scrollWrap: { flex: 1, backgroundColor: Colors.card },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },
  profSubtitle: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.card2, alignItems: "center", justifyContent: "center" },
  tabRow: { paddingHorizontal: 8, paddingTop: 10, paddingBottom: 6, gap: 4 },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 8, alignItems: "center", borderRadius: 10, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  tabBtnActive: { backgroundColor: ACCENT + "18", borderColor: ACCENT + "60" },
  tabBtnText: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textSecondary },
  tabBtnTextActive: { fontFamily: "Inter_700Bold", color: ACCENT },
  scroll: { padding: 16, gap: 4 },
  toggleCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.background, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 12, marginBottom: 8 },
  toggleTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.text },
  toggleSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14, marginBottom: 8 },
  sectionLabel: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary, flex: 1 },
  profHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.background, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 4 },
  profHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  profIconBox: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  profHeaderText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  profSubText: { fontFamily: "Inter_400Regular", fontSize: 11, color: ACCENT, marginTop: 2 },
  chevronBox: { width: 26, height: 26, borderRadius: 8, backgroundColor: Colors.card2, alignItems: "center", justifyContent: "center" },
  profBox: { backgroundColor: Colors.background, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: "hidden", marginBottom: 8 },
  profPickerLabel: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textSecondary, paddingHorizontal: 12, paddingTop: 12 },
  profGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, padding: 10 },
  profChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, maxWidth: "48%" },
  profChipText: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textSecondary, flexShrink: 1 },
  profSubSection: { paddingHorizontal: 12, paddingBottom: 12 },
  profSubLabel: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textSecondary, marginBottom: 8 },
  profSubChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  subChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  subChipActive: { backgroundColor: ACCENT + "20", borderColor: ACCENT + "60" },
  subChipText: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textSecondary },
  subChipTextActive: { color: ACCENT },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catCard: { width: "30%", flexGrow: 1, flexShrink: 1, padding: 12, borderRadius: 14, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, alignItems: "center", gap: 6, minWidth: 80 },
  catCardText: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.textSecondary, textAlign: "center" },
  amountRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.background, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border },
  currencySymbol: { fontFamily: "Inter_700Bold", fontSize: 26, color: ACCENT },
  amountInput: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 34, color: Colors.text },
  input: { backgroundColor: Colors.background, borderRadius: 12, padding: 14, fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  pmRow: { flexDirection: "row", gap: 8 },
  pmBtn: { flex: 1, alignItems: "center", gap: 4, padding: 12, borderRadius: 12, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  pmLabel: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textSecondary },
  addBtn: { backgroundColor: ACCENT, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 8 },
  addBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.background },
  expTotalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, paddingHorizontal: 4 },
  expTotalLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textSecondary },
  expTotalValue: { fontFamily: "Inter_700Bold", fontSize: 16 },
  listRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.background, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border, marginTop: 6 },
  listIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  listTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.text },
  listMeta: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  listAmount: { fontFamily: "Inter_700Bold", fontSize: 14 },
  summaryCards: { flexDirection: "row", gap: 10, marginBottom: 4 },
  summaryCard: { flex: 1, backgroundColor: Colors.background, borderRadius: 16, padding: 16, borderWidth: 1, alignItems: "center", gap: 8 },
  summaryCardLabel: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textSecondary, textAlign: "center" },
  summaryCardValue: { fontFamily: "Inter_700Bold", fontSize: 20 },
  netCard: { backgroundColor: Colors.background, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: Colors.border, alignItems: "center", marginTop: 8, gap: 4 },
  netLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textSecondary },
  netValue: { fontFamily: "Inter_700Bold", fontSize: 28 },
  netSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textTertiary, textAlign: "center" },
  breakdownRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  breakdownDot: { width: 8, height: 8, borderRadius: 4 },
  breakdownLabel: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.text },
  breakdownPct: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, width: 36, textAlign: "right" },
  breakdownAmt: { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.red, width: 80, textAlign: "right" },
  emptyState: { alignItems: "center", paddingVertical: 48, gap: 12 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center" },
  subTabRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  subTabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  subTabBtnActive: { backgroundColor: ACCENT + "18", borderColor: ACCENT + "60" },
  subTabText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textSecondary },
  taxInfoBox: { flexDirection: "row", gap: 8, backgroundColor: Colors.blue + "12", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.blue + "30", alignItems: "flex-start", marginBottom: 12 },
  taxInfoText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, flex: 1, lineHeight: 18 },
  taxSummaryRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  taxSummaryCard: { flex: 1, backgroundColor: Colors.background, borderRadius: 14, padding: 14, borderWidth: 1, alignItems: "center", gap: 6 },
  taxSummaryLabel: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textSecondary, textAlign: "center" },
  taxSummaryValue: { fontFamily: "Inter_700Bold", fontSize: 18 },
  netKdvCard: { backgroundColor: Colors.background, borderRadius: 14, padding: 16, borderWidth: 1, alignItems: "center", gap: 4, marginBottom: 4 },
  netKdvLabel: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary },
  netKdvValue: { fontFamily: "Inter_700Bold", fontSize: 26 },
  netKdvSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textTertiary, textAlign: "center" },
  kdvRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.background, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: Colors.border, marginTop: 6 },
  kdvAmt: { fontFamily: "Inter_700Bold", fontSize: 13 },
  kdvLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textTertiary },
  rateRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  rateBtn: { flex: 1, paddingVertical: 11, alignItems: "center", borderRadius: 12, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  rateBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textSecondary },
  includedRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  includedBtn: { flex: 1, paddingVertical: 11, alignItems: "center", borderRadius: 12, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  includedBtnActive: { backgroundColor: ACCENT + "18", borderColor: ACCENT + "60" },
  includedBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textSecondary },
  manualResultCard: { backgroundColor: Colors.background, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: ACCENT + "40", marginTop: 4, gap: 4 },
  manualResultTitle: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.text, marginBottom: 8 },
  manualResultRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 2 },
  manualResultLabel: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  manualResultValue: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  manualRateBadge: { alignSelf: "flex-start", marginTop: 10, backgroundColor: ACCENT + "20", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  manualRateBadgeText: { fontFamily: "Inter_700Bold", fontSize: 11, color: ACCENT },
  guideRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  guideBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, minWidth: 44, alignItems: "center" },
  guideBadgeText: { fontFamily: "Inter_700Bold", fontSize: 12 },
  guideDesc: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, flex: 1 },
  workspaceCard: { backgroundColor: Colors.background, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: ACCENT + "40", marginBottom: 12, marginTop: 8 },
  workspaceHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  workspaceIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  workspaceTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text },
  workspaceSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: ACCENT, marginTop: 2 },
  workspaceStats: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", marginBottom: 10 },
  workspaceStat: { alignItems: "center", flex: 1 },
  workspaceStatLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, marginBottom: 4 },
  workspaceStatValue: { fontFamily: "Inter_700Bold", fontSize: 16 },
  workspaceDivider: { width: 1, height: 30, backgroundColor: Colors.border },
  workspaceTaxRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.orange + "10", borderRadius: 10, padding: 10, marginTop: 4 },
  workspaceTaxLabel: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary, flex: 1 },
  workspaceTaxValue: { fontFamily: "Inter_700Bold", fontSize: 14 },
  detailHint: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textTertiary, textAlign: "center", marginTop: 8 },
  cardPickChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  cardPickDot: { width: 8, height: 8, borderRadius: 4 },
  cardPickText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary },
  bizCardRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.background, borderRadius: 14, padding: 14, borderWidth: 1, marginTop: 6 },
  bizCardDot: { width: 10, height: 10, borderRadius: 5 },
  cardUsageRow: { marginTop: 6 },
  cardUsageText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary },
  cardUsageTrack: { height: 4, backgroundColor: Colors.border, borderRadius: 2, marginTop: 4 },
  cardUsageFill: { height: 4, borderRadius: 2 },
  linkBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  linkBtnText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "80%" },
  cardFormLabel: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary, marginBottom: 6 },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  rateBadgeTap: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: ACCENT + "15", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: ACCENT + "30" },
  rateBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: ACCENT },
  rateEditRow: { flexDirection: "row", gap: 4 },
  rateEditBtn: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, backgroundColor: Colors.card2, borderWidth: 1, borderColor: Colors.border },
  rateEditText: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.textSecondary },
  wsChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  wsChipText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary },
  recurringRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.background, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border, marginTop: 12 },
  recurringLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  recurringLabel: { fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.text },
  freqRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  freqChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  freqChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  freqChipText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  freqChipTextActive: { color: Colors.background },
  dayChip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  dayChipActive: { backgroundColor: ACCENT + "20", borderColor: ACCENT + "60" },
  dayChipText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  dayChipTextActive: { color: ACCENT },
});
