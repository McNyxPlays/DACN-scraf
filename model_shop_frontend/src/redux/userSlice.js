// userSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/index';

export const validateUser = createAsyncThunk(
  'user/validateUser',
  async (_, { rejectWithValue, getState }) => {
    const { user: { loading } } = getState(); // FIX: Check if already loading to prevent loop
    if (loading) return rejectWithValue('Validation in progress'); // Skip if ongoing
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
  initialState: { user: null, loading: false, error: null, toastShown: false }, // ADD: Flag for toast
  reducers: {
    updateUser: (state, action) => {
      state.user = action.payload;
    },
    clearUser: (state) => {
      state.user = null;
    },
    resetToast: (state) => { // ADD: Reset flag
      state.toastShown = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(validateUser.pending, (state) => { state.loading = true; })
      .addCase(validateUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.error = null;
        state.toastShown = false;
      })
      .addCase(validateUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.user = null;
        if (!state.toastShown) { // ADD: Only show toast once
          state.toastShown = true;
        }
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.toastShown = false;
      });
  },
});

export const { updateUser, clearUser, resetToast } = userSlice.actions;
export default userSlice.reducer;