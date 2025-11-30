// src/redux/userSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/index';

export const validateUser = createAsyncThunk(
  'user/validateUser',
  async (_, { rejectWithValue, getState }) => {
    const { user: { user, loading } } = getState();
    if (loading) return rejectWithValue('Validation in progress');
    if (!user?.user_id) return rejectWithValue('No user to validate');

    try {
      const response = await api.get('/user/stats');
      return response.data.user;
    } catch (err) {
      const message = err.response?.data?.message || 'Validation failed';
      if (err.response?.status === 401 && message === 'Unauthorized') {
        return rejectWithValue('Session expired');
      }
      return rejectWithValue(message);
    }
  }
);

export const logoutUser = createAsyncThunk(
  'user/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      await api.post('/auth/logout');
      localStorage.removeItem('guest_session_key');
      return null;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Logout failed');
    }
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState: { user: null, loading: false, error: null, toastShown: false }, 
  reducers: {
    updateUser: (state, action) => {
      state.user = action.payload;
    },
    clearUser: (state) => {
      state.user = null;
    },
    resetToast: (state) => { 
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
        if (action.payload === 'Session expired') {
          state.user = null;
          localStorage.removeItem('user');
          window.dispatchEvent(new CustomEvent("userLoggedOut")); // Trigger regenerate guest_session_key
        }
        if (!state.toastShown) { 
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