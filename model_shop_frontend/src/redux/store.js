// store.js
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from 'redux';
import userReducer from './userSlice';
import cartReducer from './cartSlice';
import notificationReducer from './notificationSlice';

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['user', 'cart'],
};

const rootReducer = combineReducers({
  user: userReducer,
  cart: cartReducer,
  notifications: notificationReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE', 'persist/PAUSE'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export const persistor = persistStore(store);