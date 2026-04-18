// Shared lookup table mapping vehicle manufacturer names to region and country.

export interface MakeOrigin {
  countryOfOrigin: string;
  regionSlug: string;
}

export const MAKE_ORIGIN_MAP: Record<string, MakeOrigin> = {
  // United States
  "AM General":     { countryOfOrigin: "US", regionSlug: "north_america" },
  "AMC":            { countryOfOrigin: "US", regionSlug: "north_america" },
  "Buick":          { countryOfOrigin: "US", regionSlug: "north_america" },
  "Cadillac":       { countryOfOrigin: "US", regionSlug: "north_america" },
  "Chevrolet":      { countryOfOrigin: "US", regionSlug: "north_america" },
  "Chrysler":       { countryOfOrigin: "US", regionSlug: "north_america" },
  "DMC":            { countryOfOrigin: "US", regionSlug: "north_america" },
  "Dodge":          { countryOfOrigin: "US", regionSlug: "north_america" },
  "Ford":           { countryOfOrigin: "US", regionSlug: "north_america" },
  "GMC":            { countryOfOrigin: "US", regionSlug: "north_america" },
  "Hummer":         { countryOfOrigin: "US", regionSlug: "north_america" },
  "Imperial":       { countryOfOrigin: "US", regionSlug: "north_america" },
  "Jeep":           { countryOfOrigin: "US", regionSlug: "north_america" },
  "LaSalle":        { countryOfOrigin: "US", regionSlug: "north_america" },
  "Lincoln":        { countryOfOrigin: "US", regionSlug: "north_america" },
  "Lucid":          { countryOfOrigin: "US", regionSlug: "north_america" },
  "Mercury":        { countryOfOrigin: "US", regionSlug: "north_america" },
  "Oldsmobile":     { countryOfOrigin: "US", regionSlug: "north_america" },
  "Peterbilt":      { countryOfOrigin: "US", regionSlug: "north_america" },
  "Plymouth":       { countryOfOrigin: "US", regionSlug: "north_america" },
  "Pontiac":        { countryOfOrigin: "US", regionSlug: "north_america" },
  "Ram":            { countryOfOrigin: "US", regionSlug: "north_america" },
  "RAM":            { countryOfOrigin: "US", regionSlug: "north_america" },
  "Rambler":        { countryOfOrigin: "US", regionSlug: "north_america" },
  "Rivian":         { countryOfOrigin: "US", regionSlug: "north_america" },
  "Saleen":         { countryOfOrigin: "US", regionSlug: "north_america" },
  "Saturn":         { countryOfOrigin: "US", regionSlug: "north_america" },
  "Shelby":         { countryOfOrigin: "US", regionSlug: "north_america" },
  "SSC":            { countryOfOrigin: "US", regionSlug: "north_america" },
  "Tesla":          { countryOfOrigin: "US", regionSlug: "north_america" },
  "Zimmer":         { countryOfOrigin: "US", regionSlug: "north_america" },
  // Germany
  "Audi":           { countryOfOrigin: "DE", regionSlug: "europe" },
  "BMW":            { countryOfOrigin: "DE", regionSlug: "europe" },
  "Borgward":       { countryOfOrigin: "DE", regionSlug: "europe" },
  "Maybach":        { countryOfOrigin: "DE", regionSlug: "europe" },
  "Mercedes":       { countryOfOrigin: "DE", regionSlug: "europe" },
  "Mercedes-AMG":   { countryOfOrigin: "DE", regionSlug: "europe" },
  "Mercedes-Benz":  { countryOfOrigin: "DE", regionSlug: "europe" },
  "NSU":            { countryOfOrigin: "DE", regionSlug: "europe" },
  "Opel":           { countryOfOrigin: "DE", regionSlug: "europe" },
  "Porsche":        { countryOfOrigin: "DE", regionSlug: "europe" },
  "Smart":          { countryOfOrigin: "DE", regionSlug: "europe" },
  "Trabant":        { countryOfOrigin: "DE", regionSlug: "europe" },
  "Volkswagen":     { countryOfOrigin: "DE", regionSlug: "europe" },
  "VW":             { countryOfOrigin: "DE", regionSlug: "europe" },
  // Italy
  "Abarth":         { countryOfOrigin: "IT", regionSlug: "europe" },
  "Alfa Romeo":     { countryOfOrigin: "IT", regionSlug: "europe" },
  "De Tomaso":      { countryOfOrigin: "IT", regionSlug: "europe" },
  "Ferrari":        { countryOfOrigin: "IT", regionSlug: "europe" },
  "Fiat":           { countryOfOrigin: "IT", regionSlug: "europe" },
  "Lamborghini":    { countryOfOrigin: "IT", regionSlug: "europe" },
  "Lancia":         { countryOfOrigin: "IT", regionSlug: "europe" },
  "Maserati":       { countryOfOrigin: "IT", regionSlug: "europe" },
  "Pagani":         { countryOfOrigin: "IT", regionSlug: "europe" },
  // France
  "Alpine":         { countryOfOrigin: "FR", regionSlug: "europe" },
  "Bugatti":        { countryOfOrigin: "FR", regionSlug: "europe" },
  "Citroën":        { countryOfOrigin: "FR", regionSlug: "europe" },
  "Citroen":        { countryOfOrigin: "FR", regionSlug: "europe" },
  "DS":             { countryOfOrigin: "FR", regionSlug: "europe" },
  "Peugeot":        { countryOfOrigin: "FR", regionSlug: "europe" },
  "Renault":        { countryOfOrigin: "FR", regionSlug: "europe" },
  // Sweden
  "Koenigsegg":     { countryOfOrigin: "SE", regionSlug: "europe" },
  "Saab":           { countryOfOrigin: "SE", regionSlug: "europe" },
  "Volvo":          { countryOfOrigin: "SE", regionSlug: "europe" },
  // Czech Republic
  "Skoda":          { countryOfOrigin: "CZ", regionSlug: "europe" },
  "Škoda":          { countryOfOrigin: "CZ", regionSlug: "europe" },
  // Romania
  "Dacia":          { countryOfOrigin: "RO", regionSlug: "europe" },
  // Spain
  "SEAT":           { countryOfOrigin: "ES", regionSlug: "europe" },
  // Netherlands
  "Spyker":         { countryOfOrigin: "NL", regionSlug: "europe" },
  // Switzerland
  "Peraves":        { countryOfOrigin: "CH", regionSlug: "europe" },
  // Russia / Soviet Union
  "GAZ":            { countryOfOrigin: "RU", regionSlug: "europe" },
  "Lada":           { countryOfOrigin: "RU", regionSlug: "europe" },
  "Moskvitch":      { countryOfOrigin: "RU", regionSlug: "europe" },
  "VAZ":            { countryOfOrigin: "RU", regionSlug: "europe" },
  // Turkey
  "Anadol":         { countryOfOrigin: "TR", regionSlug: "europe" },
  "Tofaş":          { countryOfOrigin: "TR", regionSlug: "europe" },
  // Iran
  "IKCO":           { countryOfOrigin: "IR", regionSlug: "europe" },
  "Saipa":          { countryOfOrigin: "IR", regionSlug: "europe" },
  // United Kingdom
  "Ariel":          { countryOfOrigin: "GB", regionSlug: "uk" },
  "Aston Martin":   { countryOfOrigin: "GB", regionSlug: "uk" },
  "Austin-Healey":  { countryOfOrigin: "GB", regionSlug: "uk" },
  "Bentley":        { countryOfOrigin: "GB", regionSlug: "uk" },
  "Caterham":       { countryOfOrigin: "GB", regionSlug: "uk" },
  "Jaguar":         { countryOfOrigin: "GB", regionSlug: "uk" },
  "Land Rover":     { countryOfOrigin: "GB", regionSlug: "uk" },
  "Lotus":          { countryOfOrigin: "GB", regionSlug: "uk" },
  "McLaren":        { countryOfOrigin: "GB", regionSlug: "uk" },
  "MG":             { countryOfOrigin: "GB", regionSlug: "uk" },
  "MINI":           { countryOfOrigin: "GB", regionSlug: "uk" },
  "Mini":           { countryOfOrigin: "GB", regionSlug: "uk" },
  "Morgan":         { countryOfOrigin: "GB", regionSlug: "uk" },
  "Morris":         { countryOfOrigin: "GB", regionSlug: "uk" },
  "Noble":          { countryOfOrigin: "GB", regionSlug: "uk" },
  "Range Rover":    { countryOfOrigin: "GB", regionSlug: "uk" },
  "Rolls-Royce":    { countryOfOrigin: "GB", regionSlug: "uk" },
  "Rover":          { countryOfOrigin: "GB", regionSlug: "uk" },
  "TVR":            { countryOfOrigin: "GB", regionSlug: "uk" },
  // Japan
  "Acura":          { countryOfOrigin: "JP", regionSlug: "jdm" },
  "Daihatsu":       { countryOfOrigin: "JP", regionSlug: "jdm" },
  "Datsun":         { countryOfOrigin: "JP", regionSlug: "jdm" },
  "Honda":          { countryOfOrigin: "JP", regionSlug: "jdm" },
  "Infiniti":       { countryOfOrigin: "JP", regionSlug: "jdm" },
  "Isuzu":          { countryOfOrigin: "JP", regionSlug: "jdm" },
  "Lexus":          { countryOfOrigin: "JP", regionSlug: "jdm" },
  "Mazda":          { countryOfOrigin: "JP", regionSlug: "jdm" },
  "Mitsubishi":     { countryOfOrigin: "JP", regionSlug: "jdm" },
  "Nissan":         { countryOfOrigin: "JP", regionSlug: "jdm" },
  "Subaru":         { countryOfOrigin: "JP", regionSlug: "jdm" },
  "Suzuki":         { countryOfOrigin: "JP", regionSlug: "jdm" },
  "Toyota":         { countryOfOrigin: "JP", regionSlug: "jdm" },
  // South Korea
  "Genesis":        { countryOfOrigin: "KR", regionSlug: "east_asia" },
  "Hyundai":        { countryOfOrigin: "KR", regionSlug: "east_asia" },
  "Kia":            { countryOfOrigin: "KR", regionSlug: "east_asia" },
  // China
  "BYD":            { countryOfOrigin: "CN", regionSlug: "east_asia" },
  "Chery":          { countryOfOrigin: "CN", regionSlug: "east_asia" },
  "Geely":          { countryOfOrigin: "CN", regionSlug: "east_asia" },
  "Great Wall":     { countryOfOrigin: "CN", regionSlug: "east_asia" },
  "Haval":          { countryOfOrigin: "CN", regionSlug: "east_asia" },
  "NIO":            { countryOfOrigin: "CN", regionSlug: "east_asia" },
  "Nio":            { countryOfOrigin: "CN", regionSlug: "east_asia" },
  "Xpeng":          { countryOfOrigin: "CN", regionSlug: "east_asia" },
  // India
  "Hindustan":      { countryOfOrigin: "IN", regionSlug: "east_asia" },
  "Maruti Suzuki":  { countryOfOrigin: "IN", regionSlug: "east_asia" },
  // Brazil
  "MP Lafer":       { countryOfOrigin: "BR", regionSlug: "south_america" },
  // Australia
  "Holden":         { countryOfOrigin: "AU", regionSlug: "australia" },
  "HSV":            { countryOfOrigin: "AU", regionSlug: "australia" },
};

export function lookupMakeOrigin(make: string): MakeOrigin | null {
  if (MAKE_ORIGIN_MAP[make]) return MAKE_ORIGIN_MAP[make];
  const lower = make.toLowerCase();
  for (const [key, value] of Object.entries(MAKE_ORIGIN_MAP)) {
    if (key.toLowerCase() === lower) return value;
  }
  return null;
}
