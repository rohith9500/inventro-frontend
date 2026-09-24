import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({ name: '', price: '', quantity: '' });
  const [editingId, setEditingId] = useState(null); 
  const [activeTab, setActiveTab] = useState('products');

  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state for Manage Stock
  const [activeModalProductId, setActiveModalProductId] = useState(null);
  const [reduceData, setReduceData] = useState({ qty: '', buyer: '' });

  const API_URL = 'https://inventro-backend-24r6.onrender.com/api/products';

  const fetchProducts = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error("Error fetching data: ", error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await fetch(`${API_URL}/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        setEditingId(null);
      } else {
        await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      }
      setFormData({ name: '', price: '', quantity: '' });
      fetchProducts();
    } catch (error) {
      console.error("Error saving product: ", error);
    }
  };

  const handleEdit = (product) => {
    setEditingId(product._id);
    setFormData({
      name: product.name,
      price: product.price,
      quantity: product.quantity
    });
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      fetchProducts();
    } catch (error) {
      console.error("Error deleting product: ", error);
    }
  };

  // Open Modal
  const openManageModal = (productId) => {
    setActiveModalProductId(productId);
    setReduceData({ qty: '', buyer: '' });
  };

  // Close Modal
  const closeManageModal = () => {
    setActiveModalProductId(null);
    setReduceData({ qty: '', buyer: '' });
  };

  // Handle stock reduction inside modal
  const handleReduceStock = async (e, id) => {
    e.preventDefault();
    if (!reduceData.qty || !reduceData.buyer) {
      alert("Please enter both quantity and buyer name!");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/${id}/reduce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reduceQty: reduceData.qty, buyerName: reduceData.buyer })
      });
      
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Error reducing stock");
        return;
      }

      setReduceData({ qty: '', buyer: '' });
      fetchProducts();
      // Keep modal open to view updated history or close if preferred
    } catch (error) {
      console.error("Error reducing stock:", error);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalProductsCount = products.length;
  const totalStockValue = products.reduce((acc, curr) => acc + (Number(curr.price) * Number(curr.quantity)), 0);

  // Find currently selected product for modal view
  const activeProduct = products.find(p => p._id === activeModalProductId);

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-800 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white hidden md:flex flex-col h-full z-20">
        <div className="h-16 flex items-center px-6 border-b border-gray-800 font-bold text-xl tracking-wider text-indigo-400">
          📦 INVENTRO
        </div>
        <div className="flex-1 py-4 px-4 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors font-medium ${activeTab === 'dashboard' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
             Dashboard
          </button>
          <button onClick={() => setActiveTab('products')} className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors font-medium ${activeTab === 'products' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
             Products
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-6 z-10">
          <div className="font-bold text-xl md:hidden text-indigo-600">INVENTRO</div>
          <div className="hidden md:block text-gray-500 font-bold text-lg capitalize">{activeTab}</div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {activeTab === 'products' ? (
            <div className="space-y-6">
              
              {/* Add / Edit Product Form (Category Removed) */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold mb-4 text-gray-800">
                  {editingId ? 'Edit Product' : 'Add New Product'}
                </h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input type="text" name="name" placeholder="Product Name" value={formData.name} onChange={handleChange} required className="border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none w-full" />
                  <input type="number" name="price" placeholder="Price (₹)" value={formData.price} onChange={handleChange} required className="border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none w-full" />
                  <input type="number" name="quantity" placeholder="Quantity" value={formData.quantity} onChange={handleChange} required className="border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none w-full" />
                  <button type="submit" className={`md:col-span-3 text-white py-2.5 rounded-lg font-medium transition-colors mt-2 ${editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                    {editingId ? 'Update Product' : '+ Save Product'}
                  </button>
                </form>
              </div>

              {/* Search Bar */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center">
                <input 
                  type="text" 
                  placeholder="🔍 Search product by name..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Products Table (Clean & Non-congested) */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="uppercase tracking-wider border-b-2 border-gray-100 text-gray-500 bg-gray-50">
                      <tr>
                        <th className="px-6 py-4">Product Name</th>
                        <th className="px-6 py-4 text-right">Price</th>
                        <th className="px-6 py-4 text-center">Stock</th>
                        <th className="px-6 py-4 text-center">Stock Management</th>
                        <th className="px-6 py-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredProducts.map(product => {
                        return (
                          <tr key={product._id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 font-bold text-gray-900">{product.name}</td>
                            <td className="px-6 py-4 text-right font-medium">₹{product.price}</td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-3 py-1 rounded-md text-xs font-bold ${product.quantity <= 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {product.quantity}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button 
                                onClick={() => openManageModal(product._id)}
                                className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-md hover:bg-emerald-600 hover:text-white transition-colors font-medium text-xs"
                              >
                                📊 Manage Stock
                              </button>
                            </td>
                            <td className="px-6 py-4 text-center space-x-2">
                              <button onClick={() => handleEdit(product)} className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-md hover:bg-blue-600 hover:text-white transition-colors font-medium text-xs">
                                Edit
                              </button>
                              <button onClick={() => handleDelete(product._id)} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-md hover:bg-red-600 hover:text-white transition-colors font-medium text-xs">
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredProducts.length === 0 && (
                        <tr>
                          <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                            No products found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                 <div>
                   <p className="text-sm font-medium text-gray-500">Total Products</p>
                   <p className="text-4xl font-bold text-gray-900 mt-1">{totalProductsCount}</p>
                 </div>
                 <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 text-2xl">
                   📦
                 </div>
               </div>

               <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                 <div>
                   <p className="text-sm font-medium text-gray-500">Total Stock Value</p>
                   <p className="text-4xl font-bold text-gray-900 mt-1">₹{totalStockValue.toLocaleString()}</p>
                 </div>
                 <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 text-2xl">
                   💰
                 </div>
               </div>
            </div>
          )}
        </div>

        {/* Manage Stock Popup Modal */}
        {activeModalProductId && activeProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="bg-gray-900 text-white px-6 py-4 flex justify-between items-center">
                <h3 className="font-bold text-lg">Manage Stock: {activeProduct.name}</h3>
                <button onClick={closeManageModal} className="text-gray-400 hover:text-white text-xl font-bold">×</button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                  <span className="text-sm text-gray-600 font-medium">Current Stock Quantity:</span>
                  <span className="font-bold text-lg text-indigo-600">{activeProduct.quantity}</span>
                </div>

                {/* Reduce Stock Form inside Modal */}
                <form onSubmit={(e) => handleReduceStock(e, activeProduct._id)} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Quantity to Reduce</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 5" 
                      value={reduceData.qty}
                      onChange={(e) => setReduceData({ ...reduceData, qty: e.target.value })}
                      required
                      className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Buyer Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Rahul" 
                      value={reduceData.buyer}
                      onChange={(e) => setReduceData({ ...reduceData, buyer: e.target.value })}
                      required
                      className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button type="submit" className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-emerald-700 transition-colors">
                    Confirm & Reduce Stock
                  </button>
                </form>

                {/* History Logs View inside Modal */}
                <div className="mt-4">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-2">Stock History Logs</h4>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 max-h-40 overflow-y-auto space-y-2">
                    {activeProduct.history && activeProduct.history.length > 0 ? (
                      activeProduct.history.map((h, idx) => (
                        <div key={idx} className="text-xs text-gray-700 border-b border-gray-200 pb-1 last:border-0">
                          <span className="text-red-600 font-bold">-{h.quantityReduced} units</span> sold to <span className="font-semibold">{h.buyerName}</span>
                          <div className="text-[10px][text-gray-400] text-gray-400">{new Date(h.date).toLocaleString()}</div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400 text-center py-2">No history records yet.</p>
                    )}
                  </div>
                </div>

                <button 
                  onClick={closeManageModal} 
                  className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors mt-2"
                >
                  Close Modal
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}

export default App