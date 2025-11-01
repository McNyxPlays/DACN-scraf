// App.jsx (Added handling for user loading to prevent premature cart fetches; improved merge error handling for cart saving.)
// src/App.jsx
import React, { useState, useEffect } from "react";
import { Routes, Route, Outlet, Navigate } from "react-router-dom";
import { Provider, useDispatch } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { ToastifyContainer } from "./components/Toastify";
import { Toastify } from "./components/Toastify";
import Header from "./components/Header";
import LoginModal from "./components/LoginModal/LoginModal";
import Footer from "./components/Footer";
import BackToTop from "./components/BackToTop";
import Home from "./features/Home/Home";
import Shop from "./features/Shop/Shop";
import Community from "./features/Community/Community";
import OrderHistory from "./features/UserProfile/Order/orderhistory";
import MyStore from "./features/UserProfile/MyStore/mystore";
import UserProfileOverview from "./features/UserProfile/UserProfileOverview/UserProfileOverview";
import OtherUserProfile from "./features/UserProfile/OtherUserProfile/OtherUserProfile";
import AccountSettings from "./features/UserProfile/AccountSettings/AccountSettings";
import Admin from "./features/Admin/Admin";
import Favorites from "./features/Favorites/Favorites";
import Cart from "./features/Cart/Cart";
import Messages from "./features/UserProfile/Messages/Messages";
import Checkout from "./features/Checkout/Checkout";
import OrderSuccess from "./features/Checkout/OrderSuccess";
import Notifications from "./features/UserProfile/Notifications/Notifications";
import OrderStatus from "./features/Checkout/OrderStatus";
import { store, persistor } from "./redux/store";
import { useSelector } from "react-redux";
import { validateUser } from "./redux/userSlice";
import api from "./api/index";
import { SessionProvider } from "./context/SessionContext";

const Layout = ({ isLoginModalOpen, setIsLoginModalOpen, isCartOpen, setIsCartOpen }) => {
  const user = useSelector((state) => state.user.user);

  return (
    <div>
      <Header
        setIsLoginModalOpen={setIsLoginModalOpen}
        isCartOpen={isCartOpen}
        setIsCartOpen={setIsCartOpen}
      />
      <LoginModal
        isOpen={isLoginModalOpen}
        setIsOpen={setIsLoginModalOpen}
        onLoginSuccess={async (userData) => {
          localStorage.setItem("user", JSON.stringify(userData));
          
          // MERGE GUEST CART → USER CART (improved error handling for saving to DB)
          const localCart = JSON.parse(localStorage.getItem('guest_cart') || '[]');
          if (localCart.length > 0) {
            let mergeSuccess = true;
            for (const item of localCart) {
              try {
                await api.post("/carts", {
                  product_id: item.product_id,
                  quantity: item.quantity
                });
              } catch (err) {
                console.warn("Failed to merge cart item:", item.product_id, err);
                mergeSuccess = false;
                if (err.response?.status === 401) {
                  Toastify.error("Session invalid during cart merge. Please re-login.");
                  return; // Early exit if session issue
                }
              }
            }
            localStorage.removeItem('guest_cart');
            if (!mergeSuccess) {
              Toastify.error("Some guest cart items could not be merged to database.");
            } else {
              Toastify.success("Guest cart merged to your account.");
            }
          }

          window.dispatchEvent(new CustomEvent("cartUpdated"));
          Toastify.success("Đăng nhập thành công!");
        }}
      />
      <Outlet context={{ user }} />
      <Footer />
      <BackToTop />
      <ToastifyContainer />
      {isCartOpen && <Cart isOpen={isCartOpen} setIsOpen={setIsCartOpen} />}
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const user = useSelector((state) => state.user.user);
  if (!user?.user_id) return <Navigate to="/" replace />;
  return children;
};

const AppContent = () => {
  const dispatch = useDispatch();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    dispatch(validateUser()).catch((err) => {
      console.error("User validation failed:", err); // Handle uncaught promise
      Toastify.error("Session expired. Please log in again.");
    });
  }, [dispatch]);

  return (
    <SessionProvider>
      <Routes>
        <Route
          element={
            <Layout
              isLoginModalOpen={isLoginModalOpen}
              setIsLoginModalOpen={setIsLoginModalOpen}
              isCartOpen={isCartOpen}
              setIsCartOpen={setIsCartOpen}
            />
          }
        >
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/community" element={<Community />} />
          <Route path="/orderhistory" element={<ProtectedRoute><OrderHistory /></ProtectedRoute>} />
          <Route path="/mystore" element={<ProtectedRoute><MyStore /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><UserProfileOverview /></ProtectedRoute>} />
          <Route path="/profile/:userId" element={<OtherUserProfile />} />
          <Route path="/settings" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
          <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
          <Route path="/cart" element={<Cart isOpen={true} setIsOpen={setIsCartOpen} />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/ordersuccess" element={<OrderSuccess />} />
          <Route path="/admin/*" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/messages/:userId" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/orderstatus" element={<OrderStatus />} />
        </Route>
      </Routes>
    </SessionProvider>
  );
};

const App = () => {
  return (
    <Provider store={store}>
      <PersistGate
        loading={
          <div className="flex items-center justify-center h-screen bg-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        }
        persistor={persistor}
      >
        <AppContent />
      </PersistGate>
    </Provider>
  );
};

export default App;