// src/redux/orderSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  lastOrder: null,  
  recentOrders: [],   
};

const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {
    setLastOrder: (state, action) => {
      state.lastOrder = action.payload;
      const newOrder = action.payload;
      state.recentOrders = [
        newOrder,
        ...state.recentOrders.filter(o => o.order_id !== newOrder.order_id)
      ].slice(0, 5);
    },
    clearLastOrder: (state) => {
      state.lastOrder = null;
    },
  },
});

export const { setLastOrder, clearLastOrder } = orderSlice.actions;
export default orderSlice.reducer;