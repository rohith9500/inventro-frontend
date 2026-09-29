import { useState, useEffect, useRef } from 'react'
import './App.css'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [userEmail, setUserEmail] = useState(localStorage.getItem('email') || '');
  const [username, setUsername] = useState(localStorage.getItem('username') || 'Admin');
  const [authMode, setAuthMode] = useState('login'); // 'login', 'signup', 'forgot'
  const [authData, setAuthData] = useState({ username: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);

  // Forgot Password specific states
  const [forgotStep, setForgotStep] = useState(1); 
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpData, setOtpData] = useState({ otp: '', newPassword: '' });

  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({ name: '', category: 'Heavy', price: '', quantity: '' });
  const [editingId, setEditingId] = useState(null); 
  const [activeTab, setActiveTab] = useState('products');

  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalProductId, setActiveModalProductId] = useState(null);
  
  const [stockActionType, setStockActionType] = useState('reduce'); 
  const [stockInputData, setStockInputData] = useState({ qty: '', partyName: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deletedProductCache, setDeletedProductCache] = useState(null);
  const [undoToast, setUndoToast] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '' });
  const [passwordMsg, setPasswordMsg] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const formRef = useRef(null);
  const BACKEND_URL = 'https://inventro-backend-24r6.onrender.com';

  useEffect(() => {
    if (token && userEmail) {
      fetchProducts();
    }
  }, [token, userEmail]);

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
    setAuthError('');
    setAuthSuccess('');
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';

    try {
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authData)
      });

      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.message || "Authentication failed");
        return;
      }

      if (authMode === 'login') {
        localStorage.setItem('token', data.token);
        localStorage.setItem('email', authData.email);
        localStorage.setItem('username', data.username || authData.email.split('@')[0]);
        setToken(data.token);
        setUserEmail(authData.email);
        setUsername(data.username || authData.email.split('@')[0]);
      } else {
        alert("Registration successful! Please login now.");
        setAuthMode('login');
        setAuthData({ username: '', email: '', password: '' });
      }
    } catch (err) {
      setAuthError("Network error. Please try again.");
    }
  };

  // Verify Email for Master PIN Reset
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (isOtpLoading) return;
    setAuthError('');
    setAuthSuccess('');
    setIsOtpLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.message || "Email verification failed");
        setIsOtpLoading(false);
        return;
      }
      setAuthSuccess("Email verified! Enter Master PIN (123456) & new password.");
      setForgotStep(2);
    } catch (err) {
      setAuthError("Network error. Please try again.");
    } finally {
      setIsOtpLoading(false);
    }
  };

  // Reset Password with Master PIN
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
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
        setAuthError(data.message || "Failed to reset password");
        return;
      }
      alert(data.message);
      setAuthMode('login');
      setForgotStep(1);
      setForgotEmail('');
      setOtpData({ otp: '', newPassword: '' });
    } catch (err) {
      setAuthError("Network error.");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken('');
    setUserEmail('');
    setUsername('');
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await fetch(`${BACKEND_URL}/api/products/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        setEditingId(null);
      } else {
        await fetch(`${BACKEND_URL}/api/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, userEmail })
        });
      }
      setFormData({ name: '', category: 'Heavy', price: '', quantity: '' });
      fetchProducts();
    } catch (error) {
      console.error("Error saving product: ", error);
    }
  };

  const handleEdit = (product) => {
    setEditingId(product._id);
    setFormData({
      name: product.name,
      category: product.category || 'Heavy',
      price: product.price,
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
      setUndoToast(true);
      setTimeout(() => setUndoToast(false), 6000);
      fetchProducts();
    } catch (error) {
      console.error("Error deleting product: ", error);
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
          category: deletedProductCache.category || 'Heavy',
          price: deletedProductCache.price,
          quantity: deletedProductCache.quantity,
          userEmail
        })
      });
      setDeletedProductCache(null);
      setUndoToast(false);
      fetchProducts();
    } catch (err) {
      console.error("Error undoing delete:", err);
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
      alert("Please fill all fields!");
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
        alert(data.message || "Error updating stock");
        setIsSubmitting(false);
        return;
      }

      setStockInputData({ qty: '', partyName: '' });
      fetchProducts();
      closeManageModal();
    } catch (error) {
      console.error("Error updating stock:", error);
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
        alert(data.message || "Error deleting history log");
        return;
      }
      fetchProducts();
    } catch (err) {
      console.error("Error deleting history log:", err);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg('');
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
        setPasswordMsg(data.message || "Failed to change password");
        return;
      }
      setPasswordMsg("Password changed successfully!");
      setPasswordData({ currentPassword: '', newPassword: '' });
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordMsg('');
      }, 1500);
    } catch (err) {
      setPasswordMsg("Network error.");
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
              body: JSON.stringify({ name: p.name, category: p.category || 'Heavy', price: p.price, quantity: p.quantity, userEmail })
            });
          }
          fetchProducts();
          alert("Data imported successfully!");
        } catch (err) {
          alert("Invalid JSON file format!");
        }
      };
    }
  };

  const handleDownloadPDF = () => {
    if (!window.confirm("Do you want to download the full inventory PDF report?")) {
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

    const totalVal = products.reduce((acc, curr) => acc + (Number(curr.price) * Number(curr.quantity)), 0);
    doc.text(`Total Products: ${products.length}   |   Total Stock Value: Rs. ${totalVal.toLocaleString()}`, 14, 40);

    const tableColumn = ["Product Name", "Category", "Price (Rs.)", "Stock Quantity", "Total Value (Rs.)"];
    const tableRows = [];

    products.forEach(p => {
      const pValue = Number(p.price) * Number(p.quantity);
      tableRows.push([
        p.name,
        p.category || 'Heavy',
        `Rs. ${p.price}`,
        p.quantity,
        `Rs. ${pValue.toLocaleString()}`
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
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalProductsCount = products.length;
  const totalStockValue = products.reduce((acc, curr) => acc + (Number(curr.price) * Number(curr.quantity)), 0);
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
      <div className="flex h-screen items-center justify-center bg-gray-900 font-sans px-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-indigo-600">📦 VKN INVENTORY</h1>
            <p className="text-sm text-gray-500 mt-1">
              {authMode === 'login' ? 'Login to your account' : authMode === 'signup' ? 'Create a new account' : 'Reset your password'}
            </p>
          </div>

          {authError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-medium mb-4 text-center">
              {authError}
            </div>
          )}
          {authSuccess && (
            <div className="bg-green-50 text-green-700 p-3 rounded-lg text-xs font-medium mb-4 text-center">
              {authSuccess}
            </div>
          )}

          {/* Login Form */}
          {authMode === 'login' && (
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email Address</label>
                <input 
                  type="email" 
                  name="email"
                  placeholder="rohitha.24csc@kongu.edu" 
                  value={authData.email}
                  onChange={handleAuthChange}
                  required
                  className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Password</label>
                <input 
                  type={showPassword ? "text" : "password"} 
                  name="password"
                  placeholder="••••••••" 
                  value={authData.password}
                  onChange={handleAuthChange}
                  required
                  className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-8 text-gray-500 text-sm font-bold"
                >
                  {showPassword ? "👁️‍🗨️" : "👁️"}
                </button>
              </div>

              <div className="flex justify-between items-center text-xs">
                <button 
                  type="button" 
                  onClick={() => { setAuthMode('forgot'); setAuthError(''); setAuthSuccess(''); setForgotStep(1); }} 
                  className="text-indigo-600 font-semibold hover:underline"
                >
                  Forgot Password?
                </button>
              </div>

              <button type="submit" className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-indigo-700 transition-colors">
                Login
              </button>
            </form>
          )}

          {/* Signup Form */}
          {authMode === 'signup' && (
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Username</label>
                <input 
                  type="text" 
                  name="username"
                  placeholder="Enter your name" 
                  value={authData.username}
                  onChange={handleAuthChange}
                  required
                  className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email Address</label>
                <input 
                  type="email" 
                  name="email"
                  placeholder="rohitha.24csc@kongu.edu" 
                  value={authData.email}
                  onChange={handleAuthChange}
                  required
                  className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Password</label>
                <input 
                  type={showPassword ? "text" : "password"} 
                  name="password"
                  placeholder="••••••••" 
                  value={authData.password}
                  onChange={handleAuthChange}
                  required
                  className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-8 text-gray-500 text-sm font-bold"
                >
                  {showPassword ? "👁️‍🗨️" : "👁️"}
                </button>
              </div>

              <button type="submit" className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-indigo-700 transition-colors">
                Sign Up
              </button>
            </form>
          )}

          {/* Forgot Password Flow with Master PIN */}
          {authMode === 'forgot' && (
            <div>
              {forgotStep === 1 ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Enter your Registered Email</label>
                    <input 
                      type="email" 
                      placeholder="rohitha.24csc@kongu.edu" 
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                      className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={isOtpLoading}
                    className={`w-full text-white py-2.5 rounded-lg font-medium text-sm transition-colors ${isOtpLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                  >
                    {isOtpLoading ? 'Verifying...' : 'Next'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="bg-blue-50 text-blue-700 p-2.5 rounded-lg text-xs font-medium text-center">
                    Master PIN is: <b>123456</b>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Enter Master PIN (123456)</label>
                    <input 
                      type="text" 
                      placeholder="123456" 
                      value={otpData.otp}
                      onChange={(e) => setOtpData({ ...otpData, otp: e.target.value })}
                      required
                      className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-center tracking-widest font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">New Password</label>
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      value={otpData.newPassword}
                      onChange={(e) => setOtpData({ ...otpData, newPassword: e.target.value })}
                      required
                      className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button type="submit" className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-emerald-700 transition-colors">
                    Reset Password
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="mt-6 text-center text-xs text-gray-600">
            {authMode === 'login' ? (
              <p>
                Don't have an account?{' '}
                <button onClick={() => { setAuthMode('signup'); setAuthError(''); setAuthSuccess(''); }} className="text-indigo-600 font-bold hover:underline">
                  Sign Up
                </button>
              </p>
            ) : (
              <p>
                Remember your password?{' '}
                <button onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess(''); }} className="text-indigo-600 font-bold hover:underline">
                  Login
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-800 overflow-hidden">
      <aside className="w-64 bg-gray-900 text-white hidden md:flex flex-col h-full z-20">
        <div className="h-16 flex items-center px-6 border-b border-gray-800 font-bold text-xl tracking-wider text-indigo-400">
          📦 VKN INVENTORY
        </div>
        <div className="flex-1 py-4 px-4 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors font-medium ${activeTab === 'dashboard' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
             Dashboard
          </button>
          <button onClick={() => setActiveTab('products')} className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors font-medium ${activeTab === 'products' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
             Products
          </button>
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors font-medium ${activeTab === 'settings' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
             Settings & Backup
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-6 z-10">
          <div className="font-bold text-xl md:hidden text-indigo-600">VKN INVENTORY</div>
          <div className="hidden md:block text-gray-500 font-bold text-lg capitalize">{activeTab}</div>
          
          <div className="flex items-center space-x-4">
            <button onClick={handleDownloadPDF} className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-600 hover:text-white transition-colors">
              📄 Download PDF
            </button>

            <div className="relative">
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors"
              >
                <div className="h-7 w-7 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                  {username.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-gray-700 hidden sm:inline">{userEmail}</span>
                <span className="text-xs">▼</span>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-xs text-gray-400">Signed in as</p>
                    <p className="text-sm font-bold text-gray-800 truncate">{userEmail}</p>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 font-semibold flex items-center space-x-2"
                  >
                    <span>🚪 Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {activeTab === 'products' ? (
            <div className="space-y-6">
              <div ref={formRef} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold mb-4 text-gray-800">
                  {editingId ? 'Edit Product' : 'Add New Product'}
                </h2>

                <div className="flex space-x-2 mb-4">
                  {['Heavy', 'Medium', 'Light'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat })}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${formData.category === cat ? 'bg-indigo-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {cat} Pipe
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input type="text" name="name" placeholder="Product Name (e.g. 4-inch PVC)" value={formData.name} onChange={handleChange} required className="border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none w-full" />
                  <input type="number" name="price" placeholder="Current Price (₹)" value={formData.price} onChange={handleChange} required className="border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none w-full" />
                  <input type="number" name="quantity" placeholder="Quantity" value={formData.quantity} onChange={handleChange} required className="border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none w-full" />
                  <button type="submit" className={`md:col-span-3 text-white py-2.5 rounded-lg font-medium transition-colors mt-2 ${editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                    {editingId ? 'Update Product' : '+ Save Product'}
                  </button>
                </form>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center relative">
                <input 
                  type="text" 
                  placeholder="🔍 Search product by name..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none pr-10"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-6 text-gray-400 hover:text-gray-700 font-bold text-lg"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="uppercase tracking-wider border-b-2 border-gray-100 text-gray-500 bg-gray-50">
                      <tr>
                        <th className="px-6 py-4">Product Name</th>
                        <th className="px-6 py-4 text-center">Category</th>
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
                            <td className="px-6 py-4 text-center">
                              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                                {product.category || 'Heavy'}
                              </span>
                            </td>
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
                              <button onClick={() => handleDelete(product)} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-md hover:bg-red-600 hover:text-white transition-colors font-medium text-xs">
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredProducts.length === 0 && (
                        <tr>
                          <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                            No products found.
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

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-base text-gray-800 mb-4">⚡ Recent Stock Activities & Updates</h3>
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {allHistoryLogs.length > 0 ? (
                    allHistoryLogs.map((log, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs">
                        <div>
                          <span className="font-bold text-gray-900">{log.productName}</span>: <span className={log.quantityReduced < 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                            {log.quantityReduced < 0 ? `+${Math.abs(log.quantityReduced)} units` : `-${log.quantityReduced} units`}
                          </span> ({log.buyerName})
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-gray-400 font-medium">{new Date(log.date).toLocaleString()}</span>
                          <button 
                            onClick={() => handleDeleteHistoryLog(log.productId, log._id)}
                            className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-2 py-1 rounded text-[10px] font-bold transition-colors"
                          >
                            Revert
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-4">No recent stock activities recorded yet.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-xl space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-base text-gray-800">Change Account Password</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Update your password securely using current credentials.</p>
                </div>
                <button 
                  onClick={() => { setShowPasswordModal(true); setPasswordMsg(''); }}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
                >
                  Change Password 🔒
                </button>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="font-bold text-lg text-gray-800">Data Backup & Restore (Import / Export)</h3>
                <div className="flex space-x-4">
                  <button onClick={handleExportData} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
                    📥 Export JSON Backup
                  </button>
                  <label className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 cursor-pointer">
                    📤 Import Backup
                    <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Change Password Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="bg-gray-900 text-white px-6 py-4 flex justify-between items-center">
                <h3 className="font-bold text-lg">Change Password</h3>
                <button onClick={() => setShowPasswordModal(false)} className="text-gray-400 hover:text-white text-xl font-bold">×</button>
              </div>

              <div className="p-6 space-y-4">
                {passwordMsg && (
                  <div className={`p-3 rounded-lg text-xs font-medium text-center ${passwordMsg.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {passwordMsg}
                  </div>
                )}
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Current Password</label>
                    <input 
                      type="password" 
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      required
                      placeholder="••••••••"
                      className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">New Password</label>
                    <input 
                      type="password" 
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      required
                      placeholder="••••••••"
                      className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <button type="submit" className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                      Update Password
                    </button>
                    <button type="button" onClick={() => setShowPasswordModal(false)} className="px-4 bg-gray-100 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {undoToast && (
          <div className="absolute bottom-6 right-6 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center space-x-4 z-50">
            <span className="text-sm">Product deleted successfully!</span>
            <button onClick={handleUndoDelete} className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-indigo-500">
              ↩️ Undo
            </button>
          </div>
        )}

        {/* Manage Stock Modal */}
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

                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button 
                    type="button"
                    onClick={() => { setStockActionType('reduce'); setStockInputData({ qty: '', partyName: '' }); }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${stockActionType === 'reduce' ? 'bg-red-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    📉 Reduce Stock (Sell)
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setStockActionType('add'); setStockInputData({ qty: '', partyName: '' }); }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${stockActionType === 'add' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    📈 Add Stock (Purchase)
                  </button>
                </div>

                <form onSubmit={(e) => handleStockTransaction(e, activeProduct._id)} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      {stockActionType === 'reduce' ? 'Quantity to Reduce' : 'Quantity to Add'}
                    </label>
                    <input 
                      type="number" 
                      placeholder="e.g. 5" 
                      value={stockInputData.qty}
                      onChange={(e) => setStockInputData({ ...stockInputData, qty: e.target.value })}
                      required
                      className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      {stockActionType === 'reduce' ? 'Buyer Name' : 'Supplier Name'}
                    </label>
                    <input 
                      type="text" 
                      placeholder={stockActionType === 'reduce' ? 'e.g. Rahul' : 'e.g. ABC Supplier'} 
                      value={stockInputData.partyName}
                      onChange={(e) => setStockInputData({ ...stockInputData, partyName: e.target.value })}
                      required
                      className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className={`w-full text-white py-2.5 rounded-lg font-medium text-sm transition-colors ${
                      isSubmitting 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : stockActionType === 'reduce' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {isSubmitting 
                      ? 'Processing...' 
                      : stockActionType === 'reduce' ? 'Confirm & Reduce Stock' : 'Confirm & Add Stock'
                    }
                  </button>
                </form>

                <div className="mt-4">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-2">Stock History Logs (Recent First)</h4>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 max-h-40 overflow-y-auto space-y-2">
                    {activeProduct.history && activeProduct.history.length > 0 ? (
                      [...activeProduct.history].reverse().map((h, idx) => (
                        <div key={idx} className="text-xs text-gray-700 border-b border-gray-200 pb-1 last:border-0 flex justify-between items-center">
                          <div>
                            <span className={h.quantityReduced < 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                              {h.quantityReduced < 0 ? `+${Math.abs(h.quantityReduced)} units` : `-${h.quantityReduced} units`}
                            </span> ({h.buyerName})
                            <div className="text-[10px] text-gray-400">{new Date(h.date).toLocaleString()}</div>
                          </div>
                          <button 
                            onClick={() => handleDeleteHistoryLog(activeProduct._id, h._id)}
                            className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-2 py-1 rounded text-[10px] font-bold transition-colors"
                          >
                            Revert
                          </button>
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