/** Tipe aset: hanya 3 pilihan */
export const ASSET_TYPES = [
  'Laptop',
  'Computer Desktop (PC)',
  'Handy Talky (HT)',
];

/** Opsi Brand dan Model per tipe aset. Model tergantung Brand yang dipilih. */
export const BRAND_MODEL_OPTIONS = {
  'Laptop': {
    brands: ['Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'Other'],
    modelsByBrand: {
      Dell: ['Latitude 5420', 'Latitude 5520', 'Inspiron 15', 'XPS 13', 'Vostro 3510', 'Other'],
      HP: ['ProBook 450', 'ProBook 440', 'EliteBook 840', 'Pavilion 15', 'Other'],
      Lenovo: ['ThinkPad E14', 'ThinkPad L14', 'IdeaPad 3', 'ThinkPad X1 Carbon', 'Other'],
      Asus: ['VivoBook 15', 'ZenBook 14', 'ExpertBook', 'Other'],
      Acer: ['TravelMate', 'Aspire 5', 'Swift 3', 'Other'],
      Other: ['Other'],
    },
  },
  'Computer Desktop (PC)': {
    brands: ['Dell', 'HP', 'Lenovo', 'Acer', 'Other'],
    modelsByBrand: {
      Dell: ['OptiPlex 7090', 'OptiPlex 3080', 'Vostro 3888', 'Inspiron 3880', 'Other'],
      HP: ['ProDesk 400', 'ProDesk 600', 'EliteDesk 800', 'Pavilion Desktop', 'Other'],
      Lenovo: ['ThinkCentre M720', 'ThinkCentre M90', 'IdeaCentre 5', 'ThinkStation', 'Other'],
      Acer: ['Aspire TC', 'Veriton', 'Other'],
      Other: ['Other'],
    },
  },
  'Handy Talky (HT)': {
    brands: ['Motorola', 'Kenwood', 'Icom', 'Yaesu', 'Hytera', 'Other'],
    modelsByBrand: {
      Motorola: ['GP328', 'GP338', 'CP200d', 'DP4400', 'Other'],
      Kenwood: ['TK-3201', 'TK-3402', 'TK-3180', 'TK-3230', 'Other'],
      Icom: ['IC-F1000', 'IC-F2000', 'IC-F3021', 'IC-V80', 'Other'],
      Yaesu: ['FT-60R', 'FT-70DR', 'VX-6R', 'FT-4XR', 'Other'],
      Hytera: ['BD305', 'PD365', 'PD505', 'Other'],
      Other: ['Other'],
    },
  },
};

export function getBrandsForType(type) {
  if (!type || !BRAND_MODEL_OPTIONS[type]) return [];
  return BRAND_MODEL_OPTIONS[type].brands || [];
}

export function getModelsForBrand(type, brand) {
  if (!type || !brand) return [];
  const opts = BRAND_MODEL_OPTIONS[type];
  if (!opts?.modelsByBrand?.[brand]) return [];
  return opts.modelsByBrand[brand] || [];
}
