import { useState, useEffect, useRef } from 'react'
import './App.css'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [userEmail, setUserEmail] = useState(localStorage.getItem('email') || '');
  const [username, setUsername] = useState(localStorage.getItem('username') || 'Admin');
  const [authMode, setAuthMode] = useState('login'); 
  const [authData, setAuthData] = useState({ username: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);

  const [forgotStep, setForgotStep] = useState(1); 
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpData, setOtpData] = useState({ otp: '', newPassword: '' });

  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({ name: '', quantity: '' });
  const [editingId, setEditingId] = useState(null); 
  const [activeTab, setActiveTab] = useState('products');

  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalProductId, setActiveModalProductId] = useState(null);
  
  const [stockActionType, setStockActionType] = useState('reduce'); 
  const [stockInputData, setStockInputData] = useState({ qty: '', partyName: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deletedProductCache, setDeletedProductCache] = useState(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '' });
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ show: false, message: '', type: 'success' });

  const formRef = useRef(null);
  const BACKEND_URL = 'https://inventro-backend-24r6.onrender.com';

  useEffect(() => {
    if (token && userEmail) {
      fetchProducts();
    }
  }, [token, userEmail]);

  const showSnack = (message, type = 'success') => {
    setSnackbar({ show: true, message, type });
    setTimeout(() => setSnackbar({ show: false, message: '', type: 'success' }), 3000);
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/products?email=${userEmail}`);
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error("Error fetching data: ", error);
    }
  };

  const handleAuthChange = (e) => {
    setAuthData({ ...authData, [e.target.name]: e.target.value });
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';

    try {
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authData)
      });

      const data = await res.json();
      if (!res.ok) {
        showSnack(data.message || "Authentication failed", "error");
        return;
      }

      if (authMode === 'login') {
        localStorage.setItem('token', data.token);
        localStorage.setItem('email', authData.email);
        localStorage.setItem('username', data.username || authData.email.split('@')[0]);
        setToken(data.token);
        setUserEmail(authData.email);
        setUsername(data.username || authData.email.split('@')[0]);
        showSnack("Login Successful!");
      } else {
        showSnack("Registration successful! Please login now.");
        setAuthMode('login');
        setAuthData({ username: '', email: '', password: '' });
      }
    } catch (err) {
      showSnack("Network error. Please try again.", "error");
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (isOtpLoading) return;
    setIsOtpLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      if (!res.ok) {
        showSnack(data.message || "Email verification failed", "error");
        setIsOtpLoading(false);
        return;
      }
      showSnack("Email verified! Enter Master PIN (123456) & new password.");
      setForgotStep(2);
    } catch (err) {
      showSnack("Network error. Please try again.", "error");
    } finally {
      setIsOtpLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail,
          otp: otpData.otp,
          newPassword: otpData.newPassword
        })
      });
      const data = await res.json();
      if (!res.ok) {
        showSnack(data.message || "Failed to reset password", "error");
        return;
      }
      showSnack(data.message);
      setAuthMode('login');
      setForgotStep(1);
      setForgotEmail('');
      setOtpData({ otp: '', newPassword: '' });
    } catch (err) {
      showSnack("Network error.", "error");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken('');
    setUserEmail('');
    setUsername('');
    showSnack("Logged out successfully");
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        quantity: formData.quantity,
        userEmail
      };

      if (editingId) {
        await fetch(`${BACKEND_URL}/api/products/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        setEditingId(null);
        showSnack("Product updated successfully!");
      } else {
        await fetch(`${BACKEND_URL}/api/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        showSnack("Product added successfully!");
      }
      setFormData({ name: '', quantity: '' });
      fetchProducts();
    } catch (error) {
      showSnack("Error saving product", "error");
    }
  };

  const handleEdit = (product) => {
    setEditingId(product._id);
    setFormData({
      name: product.name,
      quantity: product.quantity
    });
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
      return;
    }

    try {
      await fetch(`${BACKEND_URL}/api/products/${product._id}`, { method: 'DELETE' });
      setDeletedProductCache(product);
      showSnack("Product deleted. Click Undo if needed.", "error");
      fetchProducts();
    } catch (error) {
      showSnack("Error deleting product", "error");
    }
  };

  const handleUndoDelete = async () => {
    if (!deletedProductCache) return;
    try {
      await fetch(`${BACKEND_URL}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: deletedProductCache.name,
          quantity: deletedProductCache.quantity,
          userEmail
        })
      });
      setDeletedProductCache(null);
      showSnack("Delete undone successfully!");
      fetchProducts();
    } catch (err) {
      showSnack("Error undoing delete", "error");
    }
  };

  const openManageModal = (productId) => {
    setActiveModalProductId(productId);
    setStockActionType('reduce');
    setStockInputData({ qty: '', partyName: '' });
  };

  const closeManageModal = () => {
    setActiveModalProductId(null);
    setStockInputData({ qty: '', partyName: '' });
    setIsSubmitting(false);
  };

  const handleStockTransaction = async (e, id) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!stockInputData.qty || !stockInputData.partyName) {
      showSnack("Please fill all fields!", "error");
      return;
    }

    setIsSubmitting(true);
    const endpoint = stockActionType === 'reduce' ? 'reduce' : 'add-stock';
    const payload = stockActionType === 'reduce' 
      ? { reduceQty: stockInputData.qty, buyerName: stockInputData.partyName }
      : { addQty: stockInputData.qty, supplierName: stockInputData.partyName };

    try {
      const res = await fetch(`${BACKEND_URL}/api/products/${id}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) {
        showSnack(data.message || "Error updating stock", "error");
        setIsSubmitting(false);
        return;
      }

      setStockInputData({ qty: '', partyName: '' });
      fetchProducts();
      closeManageModal();
      showSnack("Stock updated successfully!");
    } catch (error) {
      showSnack("Error updating stock", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteHistoryLog = async (productId, historyId) => {
    if (!window.confirm("Do you want to delete this history log and revert the stock quantity?")) {
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/products/${productId}/history/${historyId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) {
        showSnack(data.message || "Error deleting history log", "error");
        return;
      }
      fetchProducts();
      showSnack("History log reverted.");
    } catch (err) {
      showSnack("Error deleting history log", "error");
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });
      const data = await res.json();
      if (!res.ok) {
        showSnack(data.message || "Failed to change password", "error");
        return;
      }
      showSnack("Password changed successfully!");
      setPasswordData({ currentPassword: '', newPassword: '' });
      setTimeout(() => {
        setShowPasswordModal(false);
      }, 1500);
    } catch (err) {
      showSnack("Network error.", "error");
    }
  };

  const handleExportData = () => {
    if (!window.confirm("Are you sure you want to download the JSON backup of your inventory?")) {
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(products, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "vkn_inventory_backup.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showSnack("Data exported successfully!");
  };

  const handleImportData = (e) => {
    if (!window.confirm("Are you sure you want to import data from this backup file?")) {
      e.target.value = '';
      return;
    }
    const fileReader = new FileReader();
    if (e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = async (event) => {
        try {
          const importedProducts = JSON.parse(event.target.result);
          for (let p of importedProducts) {
            await fetch(`${BACKEND_URL}/api/products`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: p.name, quantity: p.quantity, userEmail })
            });
          }
          fetchProducts();
          showSnack("Data imported successfully!");
        } catch (err) {
          showSnack("Invalid JSON file format!", "error");
        }
      };
    }
  };

  const handleDownloadPDF = () => {
    if (!window.confirm("Do you want to download the inventory PDF report?")) {
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229);
    doc.text("VKN INVENTORY - Stock Report", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated Account: ${userEmail}`, 14, 28);
    doc.text(`Date: ${new Date().toLocaleString()}`, 14, 34);
    doc.text(`Total Products: ${products.length}`, 14, 40); 

    const tableColumn = ["Product Name", "Stock Quantity"];
    const tableRows = [];

    products.forEach(p => {
      tableRows.push([
        p.name,
        p.quantity
      ]);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 46,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 10, cellPadding: 4 }
    });

    doc.save(`VKN_Inventory_Report_${userEmail.split('@')[0]}.pdf`);
    showSnack("PDF Downloaded!");
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalProductsCount = products.length;
  const activeProduct = products.find(p => p._id === activeModalProductId);

  const allHistoryLogs = [];
  products.forEach(p => {
    if (p.history && p.history.length > 0) {
      p.history.forEach(h => {
        allHistoryLogs.push({
          productId: p._id,
          productName: p.name,
          ...h
        });
      });
    }
  });
  allHistoryLogs.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!token) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 font-sans px-4">
        <div className="bg-white p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-indigo-600 tracking-tight">VKN INVENTORY</h1>
            <p className="text-sm text-gray-500 mt-2">
              {authMode === 'login' ? 'Welcome back! Please login' : authMode === 'signup' ? 'Create a new account' : 'Reset your password'}
            </p>
          </div>

          {authMode === 'login' && (
            <form onSubmit={handleAuthSubmit} className="space-y-6">
              <div className="relative">
                <input 
                  type="email" 
                  id="email"
                  name="email"
                  placeholder=" " 
                  value={authData.email}
                  onChange={handleAuthChange}
                  required
                  className="peer w-full border-b-2 border-gray-200 bg-transparent py-2 text-sm text-gray-900 focus:border-indigo-600 focus:outline-none transition-colors"
                />
                <label htmlFor="email" className="absolute left-0 -top-3.5 text-xs font-semibold text-gray-500 transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-focus:-top-3.5 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-indigo-600 cursor-text">
                  Email Address
                </label>
              </div>
              <div className="relative mt-4">
                <input 
                  type={showPassword ? "text" : "password"} 
                  id="password"
                  name="password"
                  placeholder=" " 
                  value={authData.password}
                  onChange={handleAuthChange}
                  required
                  className="peer w-full border-b-2 border-gray-200 bg-transparent py-2 pr-10 text-sm text-gray-900 focus:border-indigo-600 focus:outline-none transition-colors"
                />
                <label htmlFor="password" className="absolute left-0 -top-3.5 text-xs font-semibold text-gray-500 transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-focus:-top-3.5 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-indigo-600 cursor-text">
                  Password
                </label>
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? "👁️‍🗨️" : "👁️"}
                </button>
              </div>

              <div className="flex justify-end text-xs">
                <button type="button" onClick={() => { setAuthMode('forgot'); setForgotStep(1); }} className="text-indigo-600 font-medium hover:underline">
                  Forgot Password?
                </button>
              </div>

              <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 hover:shadow-lg transition-all active:scale-[0.98]">
                Login
              </button>
            </form>
          )}

          {authMode === 'signup' && (
            <form onSubmit={handleAuthSubmit} className="space-y-6">
              <div className="relative">
                <input type="text" id="username" name="username" placeholder=" " value={authData.username} onChange={handleAuthChange} required className="peer w-full border-b-2 border-gray-200 bg-transparent py-2 text-sm text-gray-900 focus:border-indigo-600 focus:outline-none transition-colors" />
                <label htmlFor="username" className="absolute left-0 -top-3.5 text-xs font-semibold text-gray-500 transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-focus:-top-3.5 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-indigo-600 cursor-text">Username</label>
              </div>
              <div className="relative mt-4">
                <input type="email" id="email" name="email" placeholder=" " value={authData.email} onChange={handleAuthChange} required className="peer w-full border-b-2 border-gray-200 bg-transparent py-2 text-sm text-gray-900 focus:border-indigo-600 focus:outline-none transition-colors" />
                <label htmlFor="email" className="absolute left-0 -top-3.5 text-xs font-semibold text-gray-500 transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-focus:-top-3.5 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-indigo-600 cursor-text">Email Address</label>
              </div>
              <div className="relative mt-4">
                <input type={showPassword ? "text" : "password"} id="password" name="password" placeholder=" " value={authData.password} onChange={handleAuthChange} required className="peer w-full border-b-2 border-gray-200 bg-transparent py-2 pr-10 text-sm text-gray-900 focus:border-indigo-600 focus:outline-none transition-colors" />
                <label htmlFor="password" className="absolute left-0 -top-3.5 text-xs font-semibold text-gray-500 transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-focus:-top-3.5 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-indigo-600 cursor-text">Password</label>
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-2 text-gray-400 hover:text-gray-600">{showPassword ? "👁️‍🗨️" : "👁️"}</button>
              </div>

              <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 hover:shadow-lg transition-all active:scale-[0.98]">
                Sign Up
              </button>
            </form>
          )}

          {authMode === 'forgot' && (
            <div>
              {forgotStep === 1 ? (
                <form onSubmit={handleSendOtp} className="space-y-6">
                  <div className="relative">
                    <input type="email" id="forgotEmail" placeholder=" " value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required className="peer w-full border-b-2 border-gray-200 bg-transparent py-2 text-sm text-gray-900 focus:border-indigo-600 focus:outline-none transition-colors" />
                    <label htmlFor="forgotEmail" className="absolute left-0 -top-3.5 text-xs font-semibold text-gray-500 transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-focus:-top-3.5 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-indigo-600 cursor-text">Registered Email</label>
                  </div>
                  <button type="submit" disabled={isOtpLoading} className={`w-full text-white py-3 rounded-xl font-bold text-sm transition-all ${isOtpLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg active:scale-[0.98]'}`}>
                    {isOtpLoading ? 'Verifying...' : 'Next'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-6">
                  <div className="bg-indigo-50 text-indigo-700 p-3 rounded-lg text-xs font-medium text-center">Master PIN is: <b>123456</b></div>
                  <div className="relative">
                    <input type="text" id="otp" placeholder=" " value={otpData.otp} onChange={(e) => setOtpData({ ...otpData, otp: e.target.value })} required className="peer w-full border-b-2 border-gray-200 bg-transparent py-2 text-sm text-center tracking-widest font-bold focus:border-indigo-600 focus:outline-none transition-colors" />
                    <label htmlFor="otp" className="absolute left-0 -top-3.5 text-xs font-semibold text-gray-500 transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-focus:-top-3.5 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-indigo-600 cursor-text">Enter PIN</label>
                  </div>
                  <div className="relative mt-4">
                    <input type="password" id="newPassword" placeholder=" " value={otpData.newPassword} onChange={(e) => setOtpData({ ...otpData, newPassword: e.target.value })} required className="peer w-full border-b-2 border-gray-200 bg-transparent py-2 text-sm text-gray-900 focus:border-indigo-600 focus:outline-none transition-colors" />
                    <label htmlFor="newPassword" className="absolute left-0 -top-3.5 text-xs font-semibold text-gray-500 transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-focus:-top-3.5 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-indigo-600 cursor-text">New Password</label>
                  </div>
                  <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-emerald-700 hover:shadow-lg transition-all active:scale-[0.98]">
                    Reset Password
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="mt-8 text-center text-xs text-gray-500 font-medium">
            {authMode === 'login' ? (
              <p>Don't have an account? <button onClick={() => setAuthMode('signup')} className="text-indigo-600 font-bold hover:underline">Sign Up</button></p>
            ) : (
              <p>Remember your password? <button onClick={() => setAuthMode('login')} className="text-indigo-600 font-bold hover:underline">Login</button></p>
            )}
          </div>
        </div>

        {/* Global Snackbar Component */}
        {snackbar.show && (
          <div className={`fixed bottom-6 px-6 py-3 rounded-full shadow-xl text-white text-sm font-semibold transform transition-all duration-300 translate-y-0 opacity-100 z-50 ${snackbar.type === 'error' ? 'bg-red-500' : 'bg-gray-900'}`}>
            {snackbar.message}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-800 overflow-hidden">
      
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden transition-opacity" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Sidebar - Desktop & Mobile Drawer */}
      <aside className={`fixed inset-y-0 left-0 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition duration-300 ease-in-out w-64 bg-gray-900 text-white flex flex-col h-full z-30`}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-800">
          <span className="font-bold text-xl tracking-wider text-indigo-400">📦 VKN</span>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-gray-400 hover:text-white text-xl">✕</button>
        </div>
        <div className="flex-1 py-6 px-4 space-y-2">
          <button onClick={() => {setActiveTab('dashboard'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
             Dashboard
          </button>
          <button onClick={() => {setActiveTab('products'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'products' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
             Products
          </button>
          <button onClick={() => {setActiveTab('settings'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
             Settings & Backup
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-4 md:px-6 z-10">
          <div className="flex items-center space-x-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-gray-600 text-2xl focus:outline-none">
              ☰
            </button>
            <div className="font-bold text-lg md:hidden text-indigo-600">VKN</div>
            <div className="hidden md:block text-gray-800 font-bold text-lg capitalize">{activeTab}</div>
          </div>
          
          <div className="flex items-center space-x-3 md:space-x-4">
            <button onClick={handleDownloadPDF} className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-600 hover:text-white transition-colors">
              📄 <span className="hidden md:inline">Download PDF</span>
            </button>

            <div className="relative">
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 px-2 md:px-3 py-1.5 rounded-full transition-colors"
              >
                <div className="h-7 w-7 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                  {username.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-gray-700 hidden sm:inline">{userEmail}</span>
                <span className="text-xs">▼</span>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-xs text-gray-400">Signed in as</p>
                    <p className="text-sm font-bold text-gray-800 truncate">{userEmail}</p>
                  </div>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 font-semibold flex items-center space-x-2">
                    <span>🚪 Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50/50">
          {activeTab === 'products' ? (
            <div className="space-y-6">
              <div ref={formRef} className="bg-white p-6 rounded-2xl shadow-[0_2px_15px_rgb(0,0,0,0.03)] border border-gray-100">
                <h2 className="text-lg font-bold mb-4 text-gray-800">
                  {editingId ? 'Edit Product' : 'Add New Product'}
                </h2>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" name="name" placeholder="Product Name (e.g. 4-inch PVC)" value={formData.name} onChange={handleChange} required className="border border-gray-200 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full bg-gray-50 focus:bg-white transition-all" />
                  <input type="number" name="quantity" placeholder="Quantity" value={formData.quantity} onChange={handleChange} required className="border border-gray-200 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full bg-gray-50 focus:bg-white transition-all" />
                  <button type="submit" className={`md:col-span-2 text-white py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.99] mt-2 ${editingId ? 'bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/30' : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/30'}`}>
                    {editingId ? 'Update Product' : '+ Save Product'}
                  </button>
                </form>
              </div>

              <div className="bg-white p-2 md:p-4 rounded-2xl shadow-[0_2px_15px_rgb(0,0,0,0.03)] border border-gray-100 flex items-center relative">
                <span className="absolute left-6 text-gray-400">🔍</span>
                <input 
                  type="text" placeholder="Search product by name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border-none bg-gray-50 p-3 pl-10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-6 text-gray-400 hover:text-gray-700 font-bold text-lg">×</button>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-[0_2px_15px_rgb(0,0,0,0.03)] border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="uppercase tracking-wider border-b border-gray-100 text-gray-500 bg-gray-50/80 text-[10px] font-bold">
                      <tr>
                        <th className="px-6 py-4">Product Name</th>
                        <th className="px-6 py-4 text-center">Stock</th>
                        <th className="px-6 py-4 text-center">Manage</th>
                        <th className="px-6 py-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredProducts.map(product => (
                        <tr key={product._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-gray-900">{product.name}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-3 py-1 rounded-lg text-xs font-bold ${product.quantity <= 5 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                              {product.quantity}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button onClick={() => openManageModal(product._id)} className="bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors font-medium text-xs shadow-sm">
                              Stock ⚡
                            </button>
                          </td>
                          <td className="px-6 py-4 text-center space-x-2">
                            <button onClick={() => handleEdit(product)} className="text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors font-semibold text-xs">Edit</button>
                            <button onClick={() => handleDelete(product)} className="text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors font-semibold text-xs">Delete</button>
                          </td>
                        </tr>
                      ))}
                      {filteredProducts.length === 0 && (
                        <tr>
                          <td colSpan="4" className="px-6 py-12 text-center text-gray-400 font-medium">
                            No products found. Add some inventory!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : activeTab === 'dashboard' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                 <div className="bg-white p-6 rounded-2xl shadow-[0_2px_15px_rgb(0,0,0,0.03)] border border-gray-100 flex items-center justify-between">
                   <div>
                     <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Products</p>
                     <p className="text-4xl font-extrabold text-gray-900 mt-2">{totalProductsCount}</p>
                   </div>
                   <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 text-2xl shadow-inner">📦</div>
                 </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-[0_2px_15px_rgb(0,0,0,0.03)] border border-gray-100">
                <h3 className="font-bold text-sm text-gray-800 mb-4 uppercase tracking-wider">⚡ Recent Activities</h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {allHistoryLogs.length > 0 ? (
                    allHistoryLogs.map((log, idx) => {
                      const isReduced = log.quantityReduced > 0;
                      return (
                        <div key={idx} className="flex justify-between items-center bg-gray-50/80 p-4 rounded-xl border border-gray-100 text-sm hover:shadow-sm transition-all">
                          <div>
                            <span className="font-extrabold text-gray-900">{log.productName}</span> 
                            <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold ${isReduced ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {isReduced ? `-${log.quantityReduced}` : `+${Math.abs(log.quantityReduced)}`} units
                            </span>
                            <p className="text-xs text-gray-500 mt-1">
                              {isReduced ? 'Sold to' : 'Added from'}: <b>{log.buyerName}</b>
                            </p>
                          </div>
                          <div className="flex flex-col items-end space-y-2">
                            <span className="text-[10px] text-gray-400 font-medium">{new Date(log.date).toLocaleString()}</span>
                            <button onClick={() => handleDeleteHistoryLog(log.productId, log._id)} className="bg-white border border-gray-200 text-gray-600 hover:text-red-600 hover:border-red-200 px-3 py-1 rounded-lg text-[10px] font-bold transition-all shadow-sm">
                              Revert Action
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-10">
                      <p className="text-sm text-gray-400 font-medium">No stock activities recorded yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-xl space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-[0_2px_15px_rgb(0,0,0,0.03)] border border-gray-100 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-base text-gray-800">Security</h3>
                  <p className="text-xs text-gray-500 mt-1">Update your password securely.</p>
                </div>
                <button onClick={() => setShowPasswordModal(true)} className="bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-800 shadow-md transition-all">
                  Change Password 🔒
                </button>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-[0_2px_15px_rgb(0,0,0,0.03)] border border-gray-100 space-y-4">
                <h3 className="font-bold text-base text-gray-800">Data Management</h3>
                <p className="text-xs text-gray-500">Download or upload your inventory backup.</p>
                <div className="flex space-x-3 pt-2">
                  <button onClick={handleExportData} className="bg-indigo-50 text-indigo-600 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors">
                    📥 Export JSON
                  </button>
                  <label className="bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors cursor-pointer shadow-sm">
                    📤 Import JSON
                    <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Change Password Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-extrabold text-lg text-gray-900">Change Password</h3>
                <button onClick={() => setShowPasswordModal(false)} className="text-gray-400 hover:text-gray-905 text-xl">✕</button>
              </div>
              <div className="p-6">
                <form onSubmit={handleChangePassword} className="space-y-5">
                  <div className="relative">
                    <input type="password" id="currPass" placeholder=" " value={passwordData.currentPassword} onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} required className="peer w-full border-b-2 border-gray-200 bg-transparent py-2 text-sm text-gray-900 focus:border-indigo-600 focus:outline-none transition-colors" />
                    <label htmlFor="currPass" className="absolute left-0 -top-3.5 text-xs font-semibold text-gray-500 transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-focus:-top-3.5 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-indigo-600 cursor-text">Current Password</label>
                  </div>
                  <div className="relative mt-4">
                    <input type="password" id="newPass" placeholder=" " value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} required className="peer w-full border-b-2 border-gray-200 bg-transparent py-2 text-sm text-gray-900 focus:border-indigo-600 focus:outline-none transition-colors" />
                    <label htmlFor="newPass" className="absolute left-0 -top-3.5 text-xs font-semibold text-gray-500 transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-focus:-top-3.5 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-indigo-600 cursor-text">New Password</label>
                  </div>
                  <button type="submit" className="w-full bg-gray-900 text-white py-3 rounded-xl text-sm font-bold hover:bg-gray-800 transition-all active:scale-[0.98] mt-2">
                    Update Password
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Global Snackbar Render */}
        {snackbar.show && (
          <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl text-white text-sm font-semibold transition-all duration-300 z-50 flex items-center space-x-2 ${snackbar.type === 'error' ? 'bg-red-500' : 'bg-gray-900'}`}>
            <span>{snackbar.message}</span>
            {deletedProductCache && snackbar.message.includes('Undo') && (
               <button onClick={handleUndoDelete} className="ml-2 text-indigo-300 hover:text-indigo-100 uppercase text-[10px] tracking-wider font-extrabold underline">Undo</button>
            )}
          </div>
        )}

        {/* Manage Stock Modal */}
        {activeModalProductId && activeProduct && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-extrabold text-lg text-gray-900 truncate">Manage Stock: {activeProduct.name}</h3>
                <button onClick={closeManageModal} className="text-gray-400 hover:text-gray-900 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-5">
                <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl flex justify-between items-center">
                  <span className="text-xs text-indigo-900 font-bold uppercase tracking-wider">Current Stock Quantity:</span>
                  <span className="font-extrabold text-2xl text-indigo-600">{activeProduct.quantity}</span>
                </div>

                <div className="flex bg-gray-100 p-1.5 rounded-xl">
                  <button type="button" onClick={() => { setStockActionType('reduce'); setStockInputData({ qty: '', partyName: '' }); }} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${stockActionType === 'reduce' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>
                    📉 Reduce Stock (Sell)
                  </button>
                  <button type="button" onClick={() => { setStockActionType('add'); setStockInputData({ qty: '', partyName: '' }); }} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${stockActionType === 'add' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>
                    📈 Add Stock (Purchase)
                  </button>
                </div>

                <form onSubmit={(e) => handleStockTransaction(e, activeProduct._id)} className="space-y-4 pt-2">
                  <div className="relative">
                    <input type="number" id="qty" placeholder="e.g. 5" value={stockInputData.qty} onChange={(e) => setStockInputData({ ...stockInputData, qty: e.target.value })} required className="peer w-full border-b-2 border-gray-200 bg-transparent py-2 text-sm text-gray-900 focus:border-indigo-600 focus:outline-none transition-colors" />
                    <label htmlFor="qty" className="absolute left-0 -top-3.5 text-xs font-semibold text-gray-500 transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-focus:-top-3.5 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-indigo-600 cursor-text">
                      {stockActionType === 'reduce' ? 'Quantity to Reduce' : 'Quantity to Add'}
                    </label>
                  </div>
                  <div className="relative mt-4">
                    <input type="text" id="party" placeholder={stockActionType === 'reduce' ? 'e.g. Rahul' : 'e.g. ABC Supplier'} value={stockInputData.partyName} onChange={(e) => setStockInputData({ ...stockInputData, partyName: e.target.value })} required className="peer w-full border-b-2 border-gray-200 bg-transparent py-2 text-sm text-gray-900 focus:border-indigo-600 focus:outline-none transition-colors" />
                    <label htmlFor="party" className="absolute left-0 -top-3.5 text-xs font-semibold text-gray-500 transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-focus:-top-3.5 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-indigo-600 cursor-text">
                      {stockActionType === 'reduce' ? 'Buyer Name' : 'Supplier Name'}
                    </label>
                  </div>
                  
                  <button type="submit" disabled={isSubmitting} className={`w-full text-white py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98] mt-4 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : stockActionType === 'reduce' ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30' : 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30'}`}>
                    {isSubmitting ? 'Processing...' : stockActionType === 'reduce' ? 'Confirm & Reduce Stock' : 'Confirm & Add Stock'}
                  </button>
                </form>

                <div className="mt-4 pt-2 border-t border-gray-100">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-500 mb-2">Stock History Logs (Recent First)</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {activeProduct.history && activeProduct.history.length > 0 ? (
                      [...activeProduct.history].reverse().map((h, idx) => {
                        const isReduced = h.quantityReduced > 0;
                        return (
                          <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs">
                            <div>
                              <span className={`font-bold ${isReduced ? 'text-red-600' : 'text-emerald-600'}`}>
                                {isReduced ? `-${h.quantityReduced}` : `+${Math.abs(h.quantityReduced)}`} units
                              </span>
                              <span className="text-gray-500 ml-1">({isReduced ? 'Sold to' : 'Added from'} {h.buyerName})</span>
                              <div className="text-[10px] text-gray-400">{new Date(h.date).toLocaleString()}</div>
                            </div>
                            <button onClick={() => handleDeleteHistoryLog(activeProduct._id, h._id)} className="bg-white border border-gray-200 text-gray-600 hover:text-red-600 hover:border-red-200 px-2 py-1 rounded text-[10px] font-bold transition-all shadow-sm">
                              Revert
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-gray-400 text-center py-2">No history records yet.</p>
                    )}
                  </div>
                </div>

                <button onClick={closeManageModal} className="w-full bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors mt-2">
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