import { useMemo, useState, type ReactNode } from "react";
import { VideoTab } from "./Study/VideoTab";

// ============================================================================
// /study — Khu vực tự học & thực hành. UI dạng tab: mỗi tab = 1 chủ đề gồm
// phần LÝ THUYẾT (trái: minh hoạ, phải: ý chính) + phần THỰC HÀNH tương tác,
// gắn trực tiếp với những gì project này đã build (Auth/JWT, REST, Security).
// ============================================================================

const TABS = [
  { id: "auth", icon: "🔐", label: "Auth & JWT" },
  { id: "rest", icon: "🔄", label: "REST API" },
  { id: "security", icon: "🛡️", label: "Bảo mật" },
  { id: "video", icon: "🎥", label: "Upload file" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function Study() {
  const [tab, setTab] = useState<TabId>("auth");

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-2 flex items-center gap-3">
        <span className="text-3xl">📚</span>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Khu vực tự học</h1>
          <p className="text-sm text-gray-500">
            Học lý thuyết và thực hành ngay trên chính tính năng của app.
          </p>
        </div>
      </div>

      {/* ─── Tab bar (giống ảnh: icon + label, tab active gạch chân) ─── */}
      <div className="mt-6 flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2.5 px-4 py-3 border-b-2 -mb-px whitespace-nowrap transition-colors ${
                active
                  ? "border-green-600 text-green-700"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              <span
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-base ${
                  active ? "bg-green-100" : "bg-gray-100"
                }`}
              >
                {t.icon}
              </span>
              <span className="font-semibold text-sm">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── Nội dung tab ─── */}
      <div className="py-8">
        {tab === "auth" && <AuthTab />}
        {tab === "rest" && <RestTab />}
        {tab === "security" && <SecurityTab />}
        {tab === "video" && <VideoTab />}
      </div>
    </div>
  );
}

// Khung chung mỗi tab: cột trái minh hoạ + cột phải ý chính.
function ConceptLayout({
  illustration,
  title,
  points,
}: {
  illustration: ReactNode;
  title: string;
  points: { k: string; v: string }[];
}) {
  return (
    <div className="grid md:grid-cols-[300px_1fr] gap-6 items-start">
      <div className="bg-green-50 rounded-2xl h-64 flex items-center justify-center text-7xl shrink-0">
        {illustration}
      </div>
      <div>
        <h2 className="text-xl font-bold text-green-700 mb-4">{title}</h2>
        <ul className="space-y-3">
          {points.map((p) => (
            <li key={p.k} className="flex gap-3">
              <span className="mt-0.5 text-green-600 shrink-0">▸</span>
              <span className="text-sm text-gray-700">
                <b className="text-gray-900">{p.k}</b> — {p.v}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PracticeBox({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-8 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🧪</span>
        <h3 className="font-bold text-gray-800">Thực hành: {title}</h3>
      </div>
      {hint && <p className="text-xs text-gray-500 mb-4">{hint}</p>}
      {children}
    </div>
  );
}

// ─── TAB 1: Auth & JWT — công cụ giải mã JWT ───────────────────────────────
function decodeJwt(
  token: string,
): {
  header: unknown;
  payload: Record<string, unknown>;
  signature: string;
} | null {
  const parts = token.trim().split(".");
  if (parts.length !== 3) return null;
  const part = (s: string) => {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  };
  try {
    return {
      header: part(parts[0]),
      payload: part(parts[1]),
      signature: parts[2],
    };
  } catch {
    return null;
  }
}

function AuthTab() {
  const [raw, setRaw] = useState(() => localStorage.getItem("token") ?? "");
  const decoded = useMemo(() => (raw.trim() ? decodeJwt(raw) : null), [raw]);
  const exp = decoded?.payload?.exp as number | undefined;
  const expDate = exp ? new Date(exp * 1000) : null;
  const expired = exp ? exp * 1000 < Date.now() : false;

  return (
    <>
      <ConceptLayout
        illustration="🔐"
        title="Xác thực: Access + Refresh token + MFA"
        points={[
          {
            k: "Access token (JWT, 15 phút)",
            v: "vé vào cửa ngắn hạn, gắn vào mỗi request qua header Authorization.",
          },
          {
            k: "Refresh token (7 ngày, xoay vòng)",
            v: "lưu hash trong DB, đổi access token mới; dùng lại token cũ → cắt cả phiên (reuse-detection).",
          },
          {
            k: "JWT = header.payload.signature",
            v: "chỉ KÝ chứ không mã hoá → ai cũng đọc được payload, nhưng không sửa được nếu không có secret.",
          },
          {
            k: "MFA (TOTP)",
            v: "lớp 2: sau mật khẩu, nhập mã 6 số từ app authenticator.",
          },
        ]}
      />
      <PracticeBox
        title="Giải mã JWT"
        hint="Dán 1 JWT (mặc định lấy token đang đăng nhập của bạn) để xem cấu trúc thật — đúng phần PV hay hỏi 'token gồm gì'."
      >
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="eyJhbGciOiJIUzI1Ni...  (dán token vào đây)"
          className="w-full h-24 text-xs font-mono border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none break-all"
        />
        {raw.trim() && !decoded && (
          <p className="mt-3 text-sm text-red-600">
            Không phải JWT hợp lệ (cần 3 phần ngăn bởi dấu chấm).
          </p>
        )}
        {decoded && (
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <DecodedCard
              label="HEADER (thuật toán)"
              obj={decoded.header}
              color="amber"
            />
            <DecodedCard
              label="PAYLOAD (dữ liệu / claims)"
              obj={decoded.payload}
              color="green"
            />
            {expDate && (
              <div
                className={`sm:col-span-2 text-sm rounded-lg px-3 py-2 ${expired ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}
              >
                ⏱️ Hết hạn (exp): <b>{expDate.toLocaleString("vi-VN")}</b> —{" "}
                {expired ? "ĐÃ HẾT HẠN (cần refresh)" : "còn hiệu lực"}
              </div>
            )}
            <div className="sm:col-span-2 text-xs text-gray-500">
              🔏 Signature:{" "}
              <code className="break-all">
                {decoded.signature.slice(0, 24)}…
              </code>{" "}
              — không giải mã ngược được, dùng để chống giả mạo.
            </div>
          </div>
        )}
      </PracticeBox>
    </>
  );
}

function DecodedCard({
  label,
  obj,
  color,
}: {
  label: string;
  obj: unknown;
  color: "amber" | "green";
}) {
  const cls =
    color === "amber"
      ? "bg-amber-50 border-amber-200"
      : "bg-green-50 border-green-200";
  return (
    <div className={`rounded-lg border ${cls} p-3`}>
      <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>
      <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap break-all">
        {JSON.stringify(obj, null, 2)}
      </pre>
    </div>
  );
}

// ─── TAB 2: REST API — gọi thử API thật, xem envelope ──────────────────────
const ENDPOINTS = [
  { method: "GET", path: "/api/health", desc: "Health check (luôn 200)" },
  {
    method: "GET",
    path: "/api/products?limit=2",
    desc: "Danh sách sản phẩm (phân trang)",
  },
  {
    method: "GET",
    path: "/api/khong-ton-tai",
    desc: "Đường dẫn sai → 404 + body lỗi",
  },
];

function RestTab() {
  const [resp, setResp] = useState<{
    status: number;
    ms: number;
    body: string;
  } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const call = async (path: string) => {
    setLoading(path);
    setResp(null);
    const t0 = performance.now();
    try {
      const r = await fetch(path, { headers: { Accept: "application/json" } });
      const text = await r.text();
      let body = text;
      try {
        body = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        /* giữ nguyên */
      }
      setResp({
        status: r.status,
        ms: Math.round(performance.now() - t0),
        body,
      });
    } catch (e) {
      setResp({
        status: 0,
        ms: 0,
        body: `Lỗi mạng: ${(e as Error).message}\n(Backend đang chạy chưa? Dev proxy /api → :5000)`,
      });
    } finally {
      setLoading(null);
    }
  };

  const statusColor =
    resp && resp.status >= 200 && resp.status < 300
      ? "text-green-600"
      : resp
        ? "text-red-600"
        : "";

  return (
    <>
      <ConceptLayout
        illustration="🔄"
        title="REST API: HTTP status + envelope thống nhất"
        points={[
          {
            k: "HTTP status = tín hiệu thành công",
            v: "200 OK · 201 Created · 204 No Content · 4xx lỗi client · 5xx lỗi server.",
          },
          {
            k: "Envelope { code, message, data }",
            v: "mọi response đều có code = HTTP status để client kiểm tra dễ dàng.",
          },
          {
            k: "Lỗi: { code, error, message }",
            v: "mã error semantic (BAD_REQUEST, NOT_FOUND…) dùng chung BE/FE.",
          },
          {
            k: "PATCH vs PUT",
            v: "PATCH cập nhật một phần (chuẩn); 304 Not Modified là caching, không phải lỗi.",
          },
        ]}
      />
      <PracticeBox
        title="Gọi API thật & xem response"
        hint="Bấm để gọi backend và xem envelope { code, message, data } trả về (dùng fetch trần để thấy đầy đủ, không bị interceptor bóc)."
      >
        <div className="flex flex-wrap gap-2">
          {ENDPOINTS.map((e) => (
            <button
              key={e.path}
              type="button"
              onClick={() => call(e.path)}
              disabled={loading !== null}
              className="text-left border border-gray-200 rounded-lg px-3 py-2 hover:border-green-400 hover:bg-green-50 transition disabled:opacity-60"
            >
              <span className="text-xs font-bold text-green-700 font-mono">
                {e.method}
              </span>{" "}
              <span className="text-xs font-mono text-gray-700">{e.path}</span>
              <p className="text-[11px] text-gray-400">{e.desc}</p>
            </button>
          ))}
        </div>
        {loading && (
          <p className="mt-4 text-sm text-gray-500">Đang gọi {loading}…</p>
        )}
        {resp && (
          <div className="mt-4">
            <p className="text-sm mb-1">
              Trạng thái:{" "}
              <span className={`font-bold ${statusColor}`}>
                {resp.status || "lỗi"}
              </span>
              <span className="text-gray-400"> · {resp.ms}ms</span>
            </p>
            <pre className="text-xs font-mono bg-gray-900 text-green-300 rounded-lg p-3 overflow-x-auto max-h-72">
              {resp.body}
            </pre>
          </div>
        )}
      </PracticeBox>
    </>
  );
}

// ─── TAB 3: Bảo mật — checklist + thẻ Q&A ôn phỏng vấn ─────────────────────
const CHECKLIST = [
  "Mật khẩu hash bằng bcrypt (có salt + cost), không lưu plaintext",
  "HTTPS/TLS cho mọi request",
  "Validate input (zod) + chống SQL injection (parameterized query)",
  "Rate-limit chống brute-force trên endpoint auth",
  "Security headers (helmet: CSP, HSTS, X-Frame-Options)",
  "Phân quyền kiểm tra ở BACKEND, không tin frontend",
  "Secrets để trong env/Secret Manager, không hardcode",
  "Access token ngắn hạn + refresh token revoke được",
];

const QA = [
  {
    q: "Authentication khác Authorization thế nào?",
    a: 'Authentication = "bạn là AI" (đăng nhập). Authorization = "bạn được LÀM GÌ" (phân quyền, vd role admin/user).',
  },
  {
    q: "JWT có mã hoá không?",
    a: "KHÔNG — chỉ được ký (signed). Payload là Base64, ai cũng đọc được → không để dữ liệu nhạy cảm trong đó. Không sửa được nếu thiếu secret.",
  },
  {
    q: "Vì sao cần refresh token?",
    a: "Access token để ngắn (15p) cho an toàn; refresh token (revoke được) lo gia hạn → block user có hiệu lực nhanh, mà không bắt đăng nhập lại liên tục.",
  },
  {
    q: "Lưu token ở localStorage hay cookie?",
    a: "localStorage: dễ nhưng rủi ro XSS. httpOnly cookie: an toàn XSS hơn nhưng cần chống CSRF. Tuỳ trade-off.",
  },
];

function SecurityTab() {
  const [checked, setChecked] = useState<boolean[]>(() =>
    CHECKLIST.map(() => false),
  );
  const [open, setOpen] = useState<number | null>(null);
  const done = checked.filter(Boolean).length;

  return (
    <>
      <ConceptLayout
        illustration="🛡️"
        title="Bảo mật theo lớp (defense in depth)"
        points={[
          {
            k: "Nhiều lớp",
            v: "mật khẩu, đường truyền, input, headers, phân quyền, secrets — không dựa vào 1 lớp duy nhất.",
          },
          {
            k: "Không tin client",
            v: "mọi validate/authorize quan trọng phải lặp lại ở server.",
          },
          {
            k: "Fail securely",
            v: "lỗi không lộ chi tiết ở production; mặc định từ chối khi nghi ngờ.",
          },
          { k: "OWASP Top 10", v: "dùng làm checklist tham chiếu khi review." },
        ]}
      />
      <PracticeBox
        title={`Checklist tự đánh giá (${done}/${CHECKLIST.length})`}
        hint="Tick những gì project của bạn đã có."
      >
        <div className="space-y-2">
          {CHECKLIST.map((item, i) => (
            <label
              key={item}
              className="flex items-start gap-2.5 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={checked[i]}
                onChange={() =>
                  setChecked((c) => c.map((v, j) => (j === i ? !v : v)))
                }
                className="mt-0.5 w-4 h-4 accent-green-600 shrink-0"
              />
              <span
                className={`text-sm ${checked[i] ? "text-gray-400 line-through" : "text-gray-700"}`}
              >
                {item}
              </span>
            </label>
          ))}
        </div>
        <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${(done / CHECKLIST.length) * 100}%` }}
          />
        </div>
      </PracticeBox>

      <PracticeBox
        title="Ôn phỏng vấn — câu hỏi & trả lời"
        hint="Bấm để xem đáp án."
      >
        <div className="space-y-2">
          {QA.map((item, i) => (
            <div
              key={item.q}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50"
              >
                <span className="text-sm font-medium text-gray-800">
                  {item.q}
                </span>
                <span className="text-gray-400">{open === i ? "−" : "+"}</span>
              </button>
              {open === i && (
                <p className="px-4 pb-3 text-sm text-gray-600">{item.a}</p>
              )}
            </div>
          ))}
        </div>
      </PracticeBox>
    </>
  );
}
