// userSlice.js (Added catch in thunk for better error handling; no other changes.)
// userSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/index';

export const validateUser = createAsyncThunk(
  'user/validateUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/user');
      return response.data.user;
    } catch (err) {
      localStorage.removeItem('user');
      return rejectWithValue(err.response?.data?.message || 'Validation failed');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'user/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      await api.post('/logout');
      localStorage.removeItem('guest_session_key');
      return null;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Logout failed');
    }
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState: { user: null, loading: false, error: null },
  reducers: {
    updateUser: (state, action) => {
      state.user = action.payload;
    },
    clearUser: (state) => {
      state.user = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(validateUser.pending, (state) => { state.loading = true; })
      .addCase(validateUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(validateUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.user = null;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
      });
  },
});

export const { updateUser, clearUser } = userSlice.actions;
export default userSlice.reducer;