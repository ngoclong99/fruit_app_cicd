import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@/types';
import { authApi, isMfaChallenge } from '@/api/endpoints/auth';

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

// Lưu / xoá phiên (access token, refresh token, user) vào localStorage.
function persistSession(user: User, token: string, refreshToken: string) {
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('token', token);
  localStorage.setItem('refreshToken', refreshToken);
}
function clearSession() {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
}

export const fetchMeAsync = createAsyncThunk(
  'auth/me',
  async (_, { rejectWithValue }) => {
    try {
      const user = await authApi.me();
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  }
);

export const loginAsync = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await authApi.login(email, password);
      // Bật MFA → chưa có token, trả challenge để component hiện bước nhập mã.
      if (isMfaChallenge(res)) return { mfaRequired: true as const, mfaToken: res.mfaToken };
      persistSession(res.user, res.token, res.refreshToken);
      return { mfaRequired: false as const, user: res.user, token: res.token };
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  }
);

// Bước 2 của login khi có MFA.
export const verifyMfaAsync = createAsyncThunk(
  'auth/mfaVerify',
  async ({ mfaToken, code }: { mfaToken: string; code: string }, { rejectWithValue }) => {
    try {
      const res = await authApi.verifyMfaLogin(mfaToken, code);
      persistSession(res.user, res.token, res.refreshToken);
      return { user: res.user, token: res.token };
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  }
);

export const registerAsync = createAsyncThunk(
  'auth/register',
  async (
    data: { name: string; email: string; password: string; phone?: string },
    { rejectWithValue }
  ) => {
    try {
      const res = await authApi.register(data);
      persistSession(res.user, res.token, res.refreshToken);
      return { user: res.user, token: res.token };
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  }
);

// Đăng xuất: thu hồi refresh token ở server (best-effort) rồi xoá phiên local.
export const logoutAsync = createAsyncThunk('auth/logout', async () => {
  const rt = localStorage.getItem('refreshToken');
  if (rt) {
    try { await authApi.logout(rt); } catch { /* best-effort, vẫn xoá local */ }
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      localStorage.setItem('user', JSON.stringify(action.payload));
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginAsync.pending, (state) => { state.loading = true; })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.loading = false;
        if (!action.payload.mfaRequired) {
          state.user = action.payload.user;
          state.token = action.payload.token;
        }
      })
      .addCase(loginAsync.rejected, (state) => { state.loading = false; })
      .addCase(verifyMfaAsync.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(registerAsync.pending, (state) => { state.loading = true; })
      .addCase(registerAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(registerAsync.rejected, (state) => { state.loading = false; })
      .addCase(fetchMeAsync.fulfilled, (state, action) => { state.user = action.payload; })
      .addCase(logoutAsync.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        clearSession();
      });
  },
});

export const { setUser } = authSlice.actions;
export default authSlice.reducer;
