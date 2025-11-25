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

// Protected Route
const ProtectedRoute = ({ children }) => {
  const user = useSelector((state) => state.user.user);
  if (!user?.user_id) return <Navigate to="/" replace />;
  return children;
};

// Layout chính – chứa Header, Cart modal, Login modal, Footer
const Layout = ({ isLoginModalOpen, setIsLoginModalOpen, isCartOpen, setIsCartOpen }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user.user);

  useEffect(() => {
    if (user) { // Chỉ validate nếu persist có user
      dispatch(validateUser());
    }
  }, [dispatch, user]);

  return (
    <>
      <Header
        setIsLoginModalOpen={setIsLoginModalOpen}
        isCartOpen={isCartOpen}
        setIsCartOpen={setIsCartOpen}
      />
      <Outlet />
      <Footer />
      <BackToTop />
      <LoginModal isOpen={isLoginModalOpen} setIsOpen={setIsLoginModalOpen} />
      <Cart isOpen={isCartOpen} setIsOpen={setIsCartOpen} />
      <ToastifyContainer />
    </>
  );
};

// AppContent – setup states
const AppContent = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

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

          {/* Các trang cần đăng nhập */}
          <Route path="/orderhistory" element={<ProtectedRoute><OrderHistory /></ProtectedRoute>} />
          <Route path="/mystore" element={<ProtectedRoute><MyStore /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><UserProfileOverview /></ProtectedRoute>} />
          <Route path="/profile/:userId" element={<OtherUserProfile />} />
          <Route path="/settings" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
          <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/orderstatus" element={<OrderStatus />} />

          {/* Admin */}
          <Route path="/admin/*" element={<ProtectedRoute><Admin /></ProtectedRoute>} />

          {/* Messages & Notifications */}
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/messages/:userId" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        </Route>
      </Routes>
    </SessionProvider>
  );
};

// App chính
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