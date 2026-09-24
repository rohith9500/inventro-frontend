import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({ name: '', category: 'Electronics', price: '', quantity: '' });
  const [editingId, setEditingId] = useState(null); 
  const [activeTab, setActiveTab] = useState('products');

  // Updated API URL (without /api)
  const API_URL = 'https://inventro-backend-24r6.onrender.com/products';

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
      setFormData({ name: '', category: 'Electronics', price: '', quantity: '' });
      fetchProducts();
    } catch (error) {
      console.error("Error saving product: ", error);
    }
  };

  const handleEdit = (product) => {
    setEditingId(product._id);
    setFormData({
      name: product.name,
      category: product.category,
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
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-6 z-10">
          <div className="font-bold text-xl md:hidden text-indigo-600">INVENTRO</div>
          <div className="hidden md:block text-gray-500 font-bold text-lg capitalize">{activeTab}</div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {activeTab === 'products' ? (
            <div className="space-y-6">
              
              {/* Add / Edit Product Form */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold mb-4 text-gray-800">
                  {editingId ? 'Edit Product' : 'Add New Product'}
                </h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <input type="text" name="name" placeholder="Product Name" value={formData.name} onChange={handleChange} required className="border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none w-full" />
                  <select name="category" value={formData.category} onChange={handleChange} className="border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none w-full bg-white">
                    <option value="Electronics">Electronics</option>
                    <option value="Clothing">Clothing</option>
                    <option value="Hardware">Hardware</option>
                    <option value="Food">Food</option>
                    <option value="Other">Other</option>
                  </select>
                  <input type="number" name="price" placeholder="Price (₹)" value={formData.price} onChange={handleChange} required className="border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none w-full" />
                  <input type="number" name="quantity" placeholder="Quantity" value={formData.quantity} onChange={handleChange} required className="border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none w-full" />
                  <button type="submit" className={`md:col-span-4 text-white py-2.5 rounded-lg font-medium transition-colors mt-2 ${editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                    {editingId ? 'Update Product' : '+ Save Product'}
                  </button>
                </form>
              </div>

              {/* Products Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="uppercase tracking-wider border-b-2 border-gray-100 text-gray-500 bg-gray-50">
                      <tr>
                        <th className="px-6 py-4">Product Name</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4 text-right">Price</th>
                        <th className="px-6 py-4 text-center">Stock</th>
                        <th className="px-6 py-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {products.map(product => (
                        <tr key={product._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-gray-900">{product.name}</td>
                          <td className="px-6 py-4"><span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-md font-medium">{product.category}</span></td>
                          <td className="px-6 py-4 text-right font-medium">₹{product.price}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-3 py-1 rounded-md text-xs font-bold ${product.quantity <= 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {product.quantity}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center space-x-2">
                            <button onClick={() => handleEdit(product)} className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-md hover:bg-blue-600 hover:text-white transition-colors font-medium">
                              Edit
                            </button>
                            <button onClick={() => handleDelete(product._id)} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-md hover:bg-red-600 hover:text-white transition-colors font-medium">
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {products.length === 0 && (
                        <tr>
                          <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                            No products found. Add a product to get started!
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
                   <p className="text-4xl font-bold text-gray-900 mt-1">{products.length}</p>
                 </div>
                 <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 text-2xl">
                   📦
                 </div>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App