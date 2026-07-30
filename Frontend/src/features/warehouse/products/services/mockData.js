// features/warehouse/products/services/mockData.js

export const productsMock = [
  {
    id: 1,
    code: "BRK-1001",
    barcode: "6260000000001",
    name: "لنت ترمز جلو",
    brand: "بوش",
    category: "سیستم ترمز",
    unit: "دست",
    purchasePrice: 350000,
    retailPrice: 450000,
    wholesalePrice: 420000,
    tax: 9,
    stock: 45,
    lowStockThreshold: 10,
    image: "",
    createdAt: "2024-01-10T08:00:00Z",
    updatedAt: "2024-06-15T12:00:00Z",
  },
  {
    id: 2,
    code: 'FLT-2022',
    barcode: '6260000000002',
    name: 'فیلتر روغن',
    brand: 'مان',
    category: 'موتور',
    unit: 'عدد',
    purchasePrice: 90000,
    retailPrice: 120000,
    wholesalePrice: 105000,
    tax: 9,
    stock: 120,
    image: '',
  },
  {
    id: 3,
    code: 'SHK-305',
    barcode: '6260000000003',
    name: 'کمک فنر جلو',
    brand: 'ساکس',
    category: 'سیستم تعلیق',
    unit: 'عدد',
    purchasePrice: 1500000,
    retailPrice: 1850000,
    wholesalePrice: 1700000,
    tax: 9,
    stock: 8,
    image: '',
  },
];

const generateMoreProducts = (count) => {
  const brands = [
    "بوش",
    "مان",
    "ساکس",
    "لنکر",
    "تویس",
    "ماله",
    "دنسو",
    "میتسوبیشی",
  ];
  const categories = [
    "موتور",
    "سیستم ترمز",
    "سیستم تعلیق",
    "برق و روشنایی",
    "بدنه",
    "گیربکس",
    "سیستم خنک کننده",
  ];
  const units = ["عدد", "بسته", "دست", "جفت", "کیت"];

  const products = [...productsMock];

  for (let i = productsMock.length + 1; i <= count; i++) {
    const retailPrice = 100000 + i * 25000;
    const purchasePrice = retailPrice * 0.75;
    const wholesalePrice = retailPrice * 0.9;

    products.push({
      id: i,
      code: `MOCK-${i}`,
      barcode: `6260000000${String(i).padStart(3, "0")}`,
      name: `قطعه نمونه ${i}`,
      brand: brands[i % brands.length],
      category: categories[i % categories.length],
      unit: units[i % units.length],
      purchasePrice: purchasePrice,
      retailPrice: retailPrice,
      wholesalePrice: wholesalePrice,
      tax: 9,
      stock: Math.floor(Math.random() * 100),
      lowStockThreshold: 10,
      image: "",
      createdAt: new Date(2024, 0, 1 + i).toISOString(),
      updatedAt: new Date(2024, 0, 1 + i).toISOString(),
    });
  }
  return products;
};

export const allProducts = generateMoreProducts(50);
