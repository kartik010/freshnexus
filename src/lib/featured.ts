// A hand-picked set of well-known barcodes. The Open Food Facts /api/v2
// per-product endpoint is far more reliable than the legacy /cgi/search.pl,
// so we use this list as the default home page feed when no search term is
// present. It also makes the catalogue feel curated instead of random.

export const FEATURED_BARCODES: string[] = [
  "3017620422003", // Nutella
  "5449000000996", // Coca-Cola 1L
  "737628064502", // Simply Asia Thai peanut noodle kit
  "3175680011480", // Nestlé Chocapic
  "8076809513753", // Barilla Penne
  "4000417025005", // Ritter Sport milk chocolate
  "7622210449283", // Milka
  "3229820787183", // Oasis pain de mie
  "3168930010265", // President butter
  "3228857000852", // Harrys 100% mie
  "3033710074617", // Lu Petit Beurre
  "5000159407236", // Snickers
  "5449000054227", // Sprite
  "8000500310427", // Kinder Bueno
  "3017624010701", // Ferrero Rocher
  "20139057", // Oreo
  "3175681881242", // Nestlé Fitness
  "4056489024644", // Oatly oat drink barista
  "80177173", // KitKat
  "4008400402222", // Haribo Goldbaren
  "7613035833241", // Maggi cube
  "8712100849084", // Knorr cream of tomato
  "3046920028004", // Président Camembert
  "3228857000746", // Harrys 7 céréales
];
