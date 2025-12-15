import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getProducts, createProduct, updateProduct, toggleProductStatus, deleteProduct, getProductCategories } from '../../api/business';
import './ProductCatalog.css';

const ProductCatalog = ({ onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [toast, setToast] = useState(null);
  
  // Product form state
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    comparePrice: '',
    category: '',
    stock: '',
    sku: '',
    images: []
  });

  // Show Toast
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch products from backend
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const [productsRes, categoriesRes] = await Promise.all([
        getProducts(),
        getProductCategories()
      ]);
      
      if (productsRes.success) {
        setProducts(productsRes.products);
      }
      if (categoriesRes.success) {
        setCategories(categoriesRes.categories);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      showToast('Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handle product submit
  const handleSubmitProduct = async () => {
    if (!productForm.name || !productForm.price) {
      showToast('Please fill required fields', 'error');
      return;
    }
    
    try {
      if (editingProduct) {
        // Update existing product
        const response = await updateProduct(editingProduct._id, productForm);
        if (response.success) {
          setProducts(products.map(p => p._id === editingProduct._id ? response.product : p));
          showToast('Product updated! ✅');
        }
      } else {
        // Create new product
        const response = await createProduct(productForm);
        if (response.success) {
          setProducts([response.product, ...products]);
          showToast('Product added successfully! 🎉');
        }
      }
      
      setShowProductForm(false);
      setEditingProduct(null);
      resetProductForm();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to save product', 'error');
    }
  };
  
  // Reset form
  const resetProductForm = () => {
    setProductForm({
      name: '',
      description: '',
      price: '',
      comparePrice: '',
      category: '',
      stock: '',
      sku: '',
      images: []
    });
  };
  
  // Edit product
  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      comparePrice: product.comparePrice ? product.comparePrice.toString() : '',
      category: product.category || '',
      stock: product.stock.toString(),
      sku: product.sku || '',
      images: product.images || []
    });
    setShowProductForm(true);
  };

  // Delete product
  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      const response = await deleteProduct(id);
      if (response.success) {
        setProducts(products.filter(p => p._id !== id));
        showToast('Product deleted');
      }
    } catch (error) {
      showToast('Failed to delete product', 'error');
    }
  };

  // Toggle product status
  const handleToggleStatus = async (id) => {
    try {
      const response = await toggleProductStatus(id);
      if (response.success) {
        setProducts(products.map(p => p._id === id ? response.product : p));
        showToast(`Product ${response.product.status}`);
      }
    } catch (error) {
      showToast('Failed to update status', 'error');
    }
  };

  const tabs = [
    { id: 'products', label: 'Products', icon: 'fa-box' },
    { id: 'categories', label: 'Categories', icon: 'fa-tags' },
    { id: 'analytics', label: 'Analytics', icon: 'fa-chart-bar' },
    { id: 'settings', label: 'Settings', icon: 'fa-cog' }
  ];

  // Render Products Tab
  const renderProducts = () => (
    <div className="pc-products">
      <div className="pc-section-header">
        <h3>Products ({products.length})</h3>
        <button className="pc-add-btn" onClick={() => setShowProductForm(true)}>
          <i className="fa-solid fa-plus"></i> Add Product
        </button>
      </div>

      {products.length === 0 ? (
        <div className="pc-empty-state">
          <div className="pc-empty-icon">
            <i className="fa-solid fa-box-open"></i>
          </div>
          <h4>No products yet</h4>
          <p>Start adding products to showcase in your catalog</p>
          <button className="pc-primary-btn" onClick={() => setShowProductForm(true)}>
            <i className="fa-solid fa-plus"></i> Add Your First Product
          </button>
        </div>
      ) : (
        <div className="pc-products-grid">
          {products.map(product => (
            <div key={product._id} className="pc-product-card">
              <div className="pc-product-image">
                {product.images && product.images.length > 0 ? (
                  <img src={product.images[0].url} alt={product.name} />
                ) : (
                  <div className="pc-no-image">
                    <i className="fa-solid fa-image"></i>
                    <span>No Image</span>
                  </div>
                )}
                <span className={`pc-status-badge ${product.status}`}>
                  {product.status}
                </span>
              </div>
              <div className="pc-product-info">
                <h4>{product.name}</h4>
                <p>{product.description || 'No description'}</p>
                <div className="pc-product-pricing">
                  <span className="pc-price">${product.price?.toFixed(2) || '0.00'}</span>
                  {product.comparePrice && (
                    <span className="pc-compare-price">${product.comparePrice.toFixed(2)}</span>
                  )}
                </div>
                <div className="pc-product-stats">
                  <span><i className="fa-solid fa-eye"></i> {product.views || 0}</span>
                  <span><i className="fa-solid fa-shopping-cart"></i> {product.sales || 0}</span>
                  <span><i className="fa-solid fa-box"></i> {product.stock || 0} in stock</span>
                </div>
                {product.category && (
                  <div className="pc-product-category">
                    <i className="fa-solid fa-tag"></i> {product.category}
                  </div>
                )}
              </div>
              <div className="pc-product-actions">
                <button onClick={() => handleToggleStatus(product._id)} title={product.status === 'active' ? 'Deactivate' : 'Activate'}>
                  <i className={`fa-solid fa-${product.status === 'active' ? 'pause' : 'play'}`}></i>
                </button>
                <button onClick={() => handleEditProduct(product)} title="Edit">
                  <i className="fa-solid fa-edit"></i>
                </button>
                <button onClick={() => handleDeleteProduct(product._id)} title="Delete">
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Product Modal */}
      {showProductForm && (
        <div className="pc-modal-overlay" onClick={() => { setShowProductForm(false); setEditingProduct(null); resetProductForm(); }}>
          <div className="pc-modal" onClick={e => e.stopPropagation()}>
            <div className="pc-modal-header">
              <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button className="pc-modal-close" onClick={() => { setShowProductForm(false); setEditingProduct(null); resetProductForm(); }}>
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            <div className="pc-modal-body">
              <div className="pc-form-group">
                <label htmlFor="product-name-input">Product Name *</label>
                <input
                  id="product-name-input"
                  name="productName"
                  type="text"
                  value={productForm.name}
                  onChange={e => setProductForm({...productForm, name: e.target.value})}
                  placeholder="Enter product name"
                />
              </div>
              <div className="pc-form-group">
                <label htmlFor="product-description-textarea">Description</label>
                <textarea
                  id="product-description-textarea"
                  name="productDescription"
                  value={productForm.description}
                  onChange={e => setProductForm({...productForm, description: e.target.value})}
                  placeholder="Product description"
                  rows={3}
                />
              </div>
              <div className="pc-form-row">
                <div className="pc-form-group">
                  <label htmlFor="product-price-input">Price *</label>
                  <input
                    id="product-price-input"
                    name="productPrice"
                    type="number"
                    value={productForm.price}
                    onChange={e => setProductForm({...productForm, price: e.target.value})}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                <div className="pc-form-group">
                  <label htmlFor="product-compare-price-input">Compare at Price</label>
                  <input
                    id="product-compare-price-input"
                    name="productComparePrice"
                    type="number"
                    value={productForm.comparePrice}
                    onChange={e => setProductForm({...productForm, comparePrice: e.target.value})}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="pc-form-row">
                <div className="pc-form-group">
                  <label htmlFor="product-category-select">Category</label>
                  <select
                    id="product-category-select"
                    name="productCategory"
                    value={productForm.category}
                    onChange={e => setProductForm({...productForm, category: e.target.value})}
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="pc-form-group">
                  <label htmlFor="product-stock-input">Stock Quantity</label>
                  <input
                    id="product-stock-input"
                    name="productStock"
                    type="number"
                    value={productForm.stock}
                    onChange={e => setProductForm({...productForm, stock: e.target.value})}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="pc-form-group">
                <label htmlFor="product-sku-input">SKU</label>
                <input
                  id="product-sku-input"
                  name="productSku"
                  type="text"
                  value={productForm.sku}
                  onChange={e => setProductForm({...productForm, sku: e.target.value})}
                  placeholder="Product SKU"
                />
              </div>
            </div>
            <div className="pc-modal-footer">
              <button className="pc-secondary-btn" onClick={() => { setShowProductForm(false); setEditingProduct(null); resetProductForm(); }}>
                Cancel
              </button>
              <button 
                className="pc-primary-btn" 
                onClick={handleSubmitProduct}
                disabled={!productForm.name || !productForm.price}
              >
                <i className={`fa-solid fa-${editingProduct ? 'save' : 'plus'}`}></i> 
                {editingProduct ? 'Save Changes' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render Categories Tab
  const renderCategories = () => (
    <div className="pc-categories">
      <div className="pc-section-header">
        <h3>Categories</h3>
        <button className="pc-add-btn">
          <i className="fa-solid fa-plus"></i> Add Category
        </button>
      </div>
      
      <div className="pc-categories-list">
        {categories.map((category, index) => (
          <div key={index} className="pc-category-item">
            <div className="pc-category-info">
              <i className="fa-solid fa-folder"></i>
              <span>{category}</span>
            </div>
            <span className="pc-category-count">
              {products.filter(p => p.category === category).length} products
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  // Render Analytics Tab
  const renderAnalytics = () => (
    <div className="pc-analytics">
      <div className="pc-section">
        <h3>Catalog Performance</h3>
        <div className="pc-stats-grid">
          <div className="pc-stat-card">
            <div className="pc-stat-icon"><i className="fa-solid fa-box"></i></div>
            <div className="pc-stat-info">
              <span className="pc-stat-value">{products.length}</span>
              <span className="pc-stat-label">Total Products</span>
            </div>
          </div>
          <div className="pc-stat-card">
            <div className="pc-stat-icon"><i className="fa-solid fa-eye"></i></div>
            <div className="pc-stat-info">
              <span className="pc-stat-value">{products.reduce((sum, p) => sum + p.views, 0)}</span>
              <span className="pc-stat-label">Total Views</span>
            </div>
          </div>
          <div className="pc-stat-card">
            <div className="pc-stat-icon"><i className="fa-solid fa-shopping-cart"></i></div>
            <div className="pc-stat-info">
              <span className="pc-stat-value">{products.reduce((sum, p) => sum + p.sales, 0)}</span>
              <span className="pc-stat-label">Total Sales</span>
            </div>
          </div>
          <div className="pc-stat-card">
            <div className="pc-stat-icon"><i className="fa-solid fa-dollar-sign"></i></div>
            <div className="pc-stat-info">
              <span className="pc-stat-value">${products.reduce((sum, p) => sum + (p.price * p.sales), 0).toFixed(2)}</span>
              <span className="pc-stat-label">Revenue</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render Settings Tab
  const renderSettings = () => (
    <div className="pc-settings">
      <div className="pc-section">
        <h3>Catalog Settings</h3>
        <div className="pc-settings-list">
          <div className="pc-settings-item">
            <div className="pc-settings-icon"><i className="fa-solid fa-store"></i></div>
            <div className="pc-settings-info">
              <h5>Store Name</h5>
              <p>{user?.username || 'Your Store'}'s Shop</p>
            </div>
            <i className="fa-solid fa-chevron-right"></i>
          </div>
          <div className="pc-settings-item">
            <div className="pc-settings-icon"><i className="fa-solid fa-truck"></i></div>
            <div className="pc-settings-info">
              <h5>Shipping Settings</h5>
              <p>Configure shipping options</p>
            </div>
            <i className="fa-solid fa-chevron-right"></i>
          </div>
          <div className="pc-settings-item">
            <div className="pc-settings-icon"><i className="fa-solid fa-credit-card"></i></div>
            <div className="pc-settings-info">
              <h5>Payment Methods</h5>
              <p>Manage payment options</p>
            </div>
            <i className="fa-solid fa-chevron-right"></i>
          </div>
          <div className="pc-settings-item">
            <div className="pc-settings-icon"><i className="fa-solid fa-bell"></i></div>
            <div className="pc-settings-info">
              <h5>Notifications</h5>
              <p>Order and inventory alerts</p>
            </div>
            <i className="fa-solid fa-chevron-right"></i>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="product-catalog-overlay">
        <div className="pc-loading">
          <i className="fa-solid fa-spinner fa-spin"></i>
          <p>Loading catalog...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="product-catalog-overlay">
      <div className="product-catalog-container">
        {/* Header */}
        <header className="pc-header">
          <button className="pc-back-btn" onClick={onClose || (() => navigate('/profile'))}>
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <h1>Product Catalog</h1>
          <div className="pc-header-actions">
            <button className="pc-header-btn">
              <i className="fa-solid fa-search"></i>
            </button>
          </div>
        </header>

        {/* Tabs */}
        <nav className="pc-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`pc-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <i className={`fa-solid ${tab.icon}`}></i>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Content */}
        <main className="pc-content">
          {activeTab === 'products' && renderProducts()}
          {activeTab === 'categories' && renderCategories()}
          {activeTab === 'analytics' && renderAnalytics()}
          {activeTab === 'settings' && renderSettings()}
        </main>

        {/* Toast */}
        {toast && (
          <div className={`pc-toast ${toast.type}`}>
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCatalog;

