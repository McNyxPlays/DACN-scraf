// notificationSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/index';

export const fetchNotificationCount = createAsyncThunk(
  'notifications/fetchCount',
  async (userId, { rejectWithValue }) => {
    if (!userId) return 0;
    try {
      const response = await api.get('/notifications', { params: { action: 'count' } });
      return response.data.unread_count || 0;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Fetch notifications failed');
    }
  }
);

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: { count: 0, loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotificationCount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotificationCount.fulfilled, (state, action) => {
        state.loading = false;
        state.count = action.payload;
      })
      .addCase(fetchNotificationCount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default notificationSlice.reducer;