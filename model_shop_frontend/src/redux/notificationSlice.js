// src/redux/notificationSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/index';

export const fetchNotificationCount = createAsyncThunk(
  'notifications/fetchCount',
  async ({ userId, sessionKey }, { rejectWithValue }) => {
    try {
      const params = {};
      if (userId) params.user_id = userId; // Sửa thành user_id nếu backend dùng vậy
      if (sessionKey) params.session_key = sessionKey;

      const response = await api.get('/notifications/count', { params }); // Sửa endpoint thành /notifications/count (thêm ở backend nếu chưa có)
      return response.data.count || 0;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Fetch count failed');
    }
  }
);

export const fetchNotificationsDropdown = createAsyncThunk(
  'notifications/fetchDropdown',
  async ({ userId, sessionKey }, { rejectWithValue }) => {
    try {
      const params = { page: 1, perPage: 10, filter: 'all', type: 'all' };
      if (userId) params.user_id = userId;
      if (sessionKey) params.session_key = sessionKey;

      const response = await api.get('/notifications', { params });
      return response.data.notifications || [];
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Fetch notifications failed');
    }
  }
);

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: { 
    count: 0, 
    dropdownList: [], // Thêm: Danh sách noti trong header dropdown (giới hạn 10-20)
    loading: false, 
    error: null 
  },
  reducers: {
    addNewNotification: (state, action) => {
      state.dropdownList.unshift(action.payload); // Thêm noti mới lên đầu
      if (state.dropdownList.length > 20) state.dropdownList.pop(); // Giới hạn
      state.count += 1; // Tăng count local
    },
    updateNotificationCount: (state, action) => {
      state.count = action.payload;
    },
    setDropdownList: (state, action) => {
      state.dropdownList = action.payload;
    },
    clearNotifications: (state) => {
      state.dropdownList = [];
      state.count = 0;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotificationCount.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchNotificationCount.fulfilled, (state, action) => {
        state.loading = false;
        state.count = action.payload;
      })
      .addCase(fetchNotificationCount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchNotificationsDropdown.fulfilled, (state, action) => {
        state.dropdownList = action.payload;
      });
  },
});

export const { addNewNotification, updateNotificationCount, setDropdownList, clearNotifications } = notificationSlice.actions;
export default notificationSlice.reducer;