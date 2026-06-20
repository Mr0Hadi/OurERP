import { allProducts } from './mockData';

export const fetchProducts = async (params) => {
  await new Promise(resolve => setTimeout(resolve, 500));

  let filteredProducts = [...allProducts];

  if (params.search) {
    const searchTerm = params.search.toLowerCase();
    filteredProducts = filteredProducts.filter(p =>
      p.code.toLowerCase().includes(searchTerm) ||
      p.name.toLowerCase().includes(searchTerm) ||
      p.brand.toLowerCase().includes(searchTerm)
    );
  }

  if (params.brand) {
    filteredProducts = filteredProducts.filter(p => p.brand === params.brand);
  }

  if (params.category) {
    filteredProducts = filteredProducts.filter(p => p.category === params.category);
  }

  // فیلتر محدوده قیمت - اصلاح price به retailPrice
  if (params.minPrice) {
    filteredProducts = filteredProducts.filter(p => p.retailPrice >= Number(params.minPrice));
  }
  if (params.maxPrice) {
    filteredProducts = filteredProducts.filter(p => p.retailPrice <= Number(params.maxPrice));
  }

  if (params.stockStatus) {
    switch (params.stockStatus) {
      case 'inStock':
        filteredProducts = filteredProducts.filter(p => p.stock > 10);
        break;
      case 'lowStock':
        filteredProducts = filteredProducts.filter(p => p.stock > 0 && p.stock <= 10);
        break;
      case 'outOfStock':
        filteredProducts = filteredProducts.filter(p => p.stock === 0);
        break;
      default:
        break;
    }
  }

  if (params.sortBy) {
    const sortField = params.sortBy;
    const sortOrder = params.sortOrder === 'desc' ? -1 : 1;
    filteredProducts.sort((a, b) => {
      if (a[sortField] < b[sortField]) return -sortOrder;
      if (a[sortField] > b[sortField]) return sortOrder;
      return 0;
    });
  }

  const page = params.page || 1;
  const limit = params.limit || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedItems = filteredProducts.slice(startIndex, endIndex);

  return {
    items: paginatedItems,
    total: filteredProducts.length,
    page: page,
    totalPages: Math.ceil(filteredProducts.length / limit),
  };
};

export const fetchProductById = async (id) => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const product = allProducts.find(p => p.id === Number(id));
  if (!product) throw new Error('محصول یافت نشد');
  return product;
};
