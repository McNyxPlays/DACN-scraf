// src/redux/cartSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/index';

export const fetchCartCount = createAsyncThunk(
  'cart/fetchCount',
  async ({ userId, sessionKey }, { rejectWithValue }) => {
    try {
      let response;
      if (userId) {
        response = await api.get('/cart');
      } else {
        response = await api.get('/cart', { params: { session_key: sessionKey } });
      }
      return response.data.data?.length || 0;  // Giữ nguyên, khớp với backend 'data'
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Fetch cart failed');
    }
  }
);

const cartSlice = createSlice({
  name: 'cart',
  initialState: { count: 0, loading: false, error: null },
  reducers: {
    setCount: (state, action) => {
      state.count = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCartCount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCartCount.fulfilled, (state, action) => {
        state.loading = false;
        state.count = action.payload;
      })
      .addCase(fetchCartCount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        if (action.payload.includes('Unauthorized')) {
          state.count = 0; // Reset on 401 to avoid stale count
        }
      });
  },
});

export const { setCount } = cartSlice.actions;
export default cartSlice.reducer;