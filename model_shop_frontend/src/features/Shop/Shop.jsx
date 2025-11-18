import React, { useState, useEffect } from "react";
import FiltersSidebar from "./FiltersSidebar";
import ProductsGrid from "./ProductsGrid";
import ShopBanner from "./ShopBanner";
import api from "../../api/index";

function Shop() {
  const [viewMode, setViewMode] = useState("grid");
  const [filters, setFilters] = useState({
    category_ids: [],
    brand_ids: [],
    status_new: false,
    status_available: false,
    status_sale: false,
    search: "",
  });
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categoryError, setCategoryError] = useState("");
  const [brandError, setBrandError] = useState("");

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get("/products/categories");
        if (response.data.status === "success") {
          setCategories(response.data.data);
          setCategoryError("");
        } else {
          setCategoryError(
            "Failed to fetch categories: " + response.data.message
          );
        }
      } catch (err) {
        setCategoryError(
          "Failed to fetch categories: " + (err.message || "Unknown error")
        );
        console.error("Failed to fetch categories:", err);
      }
    };

    const fetchBrands = async () => {
      try {
        const response = await api.get("/products/brands");
        if (response.data.status === "success") {
          setBrands(response.data.data);
          setBrandError("");
        } else {
          setBrandError("Failed to fetch brands: " + response.data.message);
        }
      } catch (err) {
        setBrandError(
          "Failed to fetch brands: " + (err.message || "Unknown error")
        );
        console.error("Failed to fetch brands:", err);
      }
    };

    fetchCategories();
    fetchBrands();
  }, []);

  const handleSearch = (searchTerm) => {
    setFilters((prev) => ({
      ...prev,
      search: searchTerm,
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      category_ids: [],
      brand_ids: [],
      status_new: false,
      status_available: false,
      status_sale: false,
      search: "",
    });
  };

  return (
    <div className="bg-gray-50">
      <ShopBanner setViewMode={setViewMode} onSearch={handleSearch} />
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-8">
            <div>
              {categoryError && (
                <p className="text-red-500 mb-4">{categoryError}</p>
              )}
              {brandError && <p className="text-red-500 mb-4">{brandError}</p>}
              <FiltersSidebar
                filters={filters}
                setFilters={setFilters}
                categories={categories}
                brands={brands}
              />
            </div>
            <div className="flex-1">
              <ProductsGrid
                viewMode={viewMode}
                filters={filters}
                setFilters={setFilters}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Shop;