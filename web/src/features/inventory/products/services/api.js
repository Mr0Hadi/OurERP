// src/features/inventory/products/services/api.js
import { allProducts } from './mockData';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const fetchProducts = async (params) => {
  await delay(500);

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
    }
  }

  if (params.sortBy) {
    const sortOrder = params.sortOrder === 'desc' ? -1 : 1;
    filteredProducts.sort((a, b) => {
      if (a[params.sortBy] < b[params.sortBy]) return -sortOrder;
      if (a[params.sortBy] > b[params.sortBy]) return sortOrder;
      return 0;
    });
  }

  const page = params.page || 1;
  const limit = params.limit || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  return {
    items: filteredProducts.slice(startIndex, endIndex),
    total: filteredProducts.length,
    page,
    totalPages: Math.ceil(filteredProducts.length / limit),
  };
};

export const fetchProductById = async (id) => {
  await delay(300);
  const product = allProducts.find(p => p.id === Number(id));
  if (!product) throw new Error('محصول یافت نشد');
  return product;
};

export const createProduct = async (productData) => {
  await delay(800);

  if (Math.random() < 0.1) {
    throw new Error("خطای سرور در ایجاد کالا");
  }

  const newProduct = {
    id: Date.now().toString(),
    ...productData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  allProducts.unshift(newProduct);
  return newProduct;
};

export const updateProduct = async (id, productData) => {
  await delay(500);

  const index = allProducts.findIndex((p) => p.id === Number(id));
  
  if (index === -1) {
    throw new Error("محصول یافت نشد");
  }

  const updatedProduct = {
    ...allProducts[index],
    ...productData,
    id: Number(id),
    updatedAt: new Date().toISOString()
  };
  
  allProducts[index] = updatedProduct;
  return updatedProduct;
};
