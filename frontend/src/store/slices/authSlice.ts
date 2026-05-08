import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { User } from '../../types';
import { authApi } from '../../api/endpoints/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}

const initialState: AuthState = {
  user: (() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? (JSON.parse(saved) as User) : null;
    } catch {
      return null;
    }
  })(),
  token: localStorage.getItem('token'),
  loading: false,
};

export const registerAsync = createAsyncThunk(
  'auth/register',
  async (
    data: { name: string; email: string; password: string; phone?: string },
    { rejectWithValue }
  ) => {
    try {
      const { user, token } = await authApi.register(data);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
      return { user, token };
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  }
);

export const loginAsync = createAsyncThunk(
  'auth/login',
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      const { user, token } = await authApi.login(email, password);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
      return { user, token };
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginAsync.pending, (state) => { state.loading = true; })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(loginAsync.rejected, (state) => { state.loading = false; })
      .addCase(registerAsync.pending, (state) => { state.loading = true; })
      .addCase(registerAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(registerAsync.rejected, (state) => { state.loading = false; });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
