import { useEffect } from "react";

// ============================================================================
// VideoDocsModal — giải thích cách tính năng upload video hoạt động, kèm
// sơ đồ tuần tự (sequence diagram) vẽ bằng SVG thuần (không cần thư viện).
// ============================================================================

type LaneId = "fe" | "be" | "s3";
const LANES: { id: LaneId; label: string; icon: string; bg: string; stroke: string }[] = [
  { id: "fe", label: "Browser (FE)", icon: "🌐", bg: "#eff6ff", stroke: "#3b82f6" },
  { id: "be", label: "Backend", icon: "⚙️", bg: "#ecfdf5", stroke: "#16a34a" },
  { id: "s3", label: "AWS S3", icon: "☁️", bg: "#fffbeb", stroke: "#f59e0b" },
];
const LANE_X: Record<LaneId, number> = { fe: 120, be: 360, s3: 600 };

// Mỗi message = 1 mũi tên. dash = response (trả về).
const MESSAGES: { from: LaneId; to: LaneId; label: string; dash?: boolean }[] = [
  { from: "fe", to: "be", label: "POST /create {filename, type, size}" },
  { from: "be", to: "s3", label: "CreateMultipartUpload" },
  { from: "s3", to: "be", label: "uploadId", dash: true },
  { from: "be", to: "fe", label: "uploadId + ràng buộc (minPart, maxParts)", dash: true },
  { from: "fe", to: "be", label: "POST /sign {partNumbers} — FE đã tự chia part" },
  { from: "be", to: "fe", label: "presigned URL cho từng part", dash: true },
  { from: "fe", to: "s3", label: "PUT part 1..N (song song 3) → ETag" },
  { from: "fe", to: "be", label: "POST /complete {ETags}" },
  { from: "be", to: "s3", label: "CompleteMultipartUpload (ghép part)" },
  { from: "be", to: "fe", label: "viewUrl (presigned GET)", dash: true },
  { from: "fe", to: "s3", label: "GET video → phát ▶" },
];

const Y0 = 86;
const DY = 46;
const SVG_W = 720;
const SVG_H = Y0 + (MESSAGES.length - 1) * DY + 28;

function SequenceDiagram() {
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="min-w-[640px] w-full" role="img" aria-label="Sơ đồ tuần tự upload video">
        <defs>
          <marker id="vid-arrow" markerWidth="9" markerHeight="9" refX="7.5" refY="3" orient="auto">
            <path d="M0,0 L8,3 L0,6 Z" fill="#475569" />
          </marker>
        </defs>

        {/* Lifelines + actor boxes */}
        {LANES.map((lane) => {
          const x = LANE_X[lane.id];
          return (
            <g key={lane.id}>
              <line x1={x} y1={62} x2={x} y2={SVG_H - 8} stroke="#e5e7eb" strokeWidth={1.5} strokeDasharray="3 4" />
              <rect x={x - 70} y={14} width={140} height={36} rx={9} fill={lane.bg} stroke={lane.stroke} strokeWidth={1.5} />
              <text x={x} y={37} textAnchor="middle" fontSize={13} fontWeight={600} fill="#334155">
                {lane.icon} {lane.label}
              </text>
            </g>
          );
        })}

        {/* Messages */}
        {MESSAGES.map((m, i) => {
          const x1 = LANE_X[m.from];
          const x2 = LANE_X[m.to];
          const y = Y0 + i * DY;
          const midX = (x1 + x2) / 2;
          return (
            <g key={i}>
              <text x={midX} y={y - 7} textAnchor="middle" fontSize={11.5} fill="#475569">
                {m.label}
              </text>
              <line
                x1={x1}
                y1={y}
                x2={x2}
                y2={y}
                stroke="#475569"
                strokeWidth={1.6}
                strokeDasharray={m.dash ? "5 4" : undefined}
                markerEnd="url(#vid-arrow)"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Biểu đồ LUỒNG GỌI HÀM (call flow) — FE ↔ BE ──────────────────────────
// Mỗi hộp = 1 lần gọi hàm thật trong code; thụt lề = lồng nhau (ai gọi ai);
// dòng nghiêng "⇐" = giá trị trả về. ①–⑤ khớp với phần "Các bước chi tiết".
type FlowLane = "fe" | "be" | "s3";
const FLOW_LANE: Record<FlowLane, { tag: string; box: string; tagCls: string }> = {
  fe: { tag: "FE", box: "bg-blue-50 border-blue-200", tagCls: "bg-blue-600" },
  be: { tag: "BE", box: "bg-green-50 border-green-200", tagCls: "bg-green-600" },
  s3: { tag: "S3", box: "bg-amber-50 border-amber-200", tagCls: "bg-amber-500" },
};

interface FlowStep {
  lane: FlowLane;
  depth: number; // mức lồng nhau → độ thụt lề
  fn: string; // tên hàm / nhãn (monospace)
  desc?: string; // mô tả ngắn
  ret?: boolean; // true = dòng "trả về" (render nhạt, có ⇐)
}

const FLOW: FlowStep[] = [
  // — Nhận file & xếp hàng đợi (VideoTab.tsx) —
  { lane: "fe", depth: 0, fn: "addFiles(files)", desc: "validate dung lượng · lưu File vào recordsRef" },
  { lane: "fe", depth: 1, fn: "↳ enqueue(id)", desc: "đẩy id vào queueRef" },
  { lane: "fe", depth: 1, fn: "↳ pump()", desc: "tối đa 3 video song song; xong 1 → kéo tiếp" },
  { lane: "fe", depth: 2, fn: "↳ uploadOne(id)", desc: "ORCHESTRATOR — try/catch bọc cả 5 bước" },

  // ① Mở multipart
  { lane: "fe", depth: 3, fn: "① videosApi.createMultipart()", desc: "gửi filename, contentType, size" },
  { lane: "be", depth: 4, fn: "POST /multipart/create", desc: "validate video/* + size≤env · key = videos/<userId>/<uuid> · CreateMultipartUploadCommand → S3" },
  { lane: "fe", depth: 4, ret: true, fn: "⇐ { key, uploadId, minPartSize, maxParts }" },

  // ② FE tự chia part
  { lane: "fe", depth: 3, fn: "② computePartSize() + computePartCount()", desc: "FE TỰ chia part → dựng mảng rec.parts[]" },

  // ③ Ký URL (lặp theo lô)
  { lane: "fe", depth: 3, fn: "③ videosApi.signParts(batch)", desc: "lặp theo lô ≤500 part CHƯA xong" },
  { lane: "be", depth: 4, fn: "POST /multipart/sign", desc: "assertOwnedKey (đúng user) · validate partNumbers · getSignedUrl(UploadPartCommand) × N" },
  { lane: "fe", depth: 4, ret: true, fn: "⇐ urls[] (presigned PUT, hạn 6h)" },

  // ④ Upload part (pool song song)
  { lane: "fe", depth: 3, fn: "④ uploadParts(id, rec)", desc: "pool 3 worker rút part song song" },
  { lane: "fe", depth: 4, fn: "↳ file.slice() + putPart(url, blob)", desc: "XHR PUT thẳng part lên S3" },
  { lane: "s3", depth: 5, fn: "PUT part → S3", desc: "mỗi part trả về 1 ETag" },
  { lane: "fe", depth: 4, fn: "↳ reportProgress() → patchItem()", desc: "cập nhật % (throttle 150ms)" },

  // ⑤ Hoàn tất
  { lane: "fe", depth: 3, fn: "⑤ videosApi.completeMultipart(parts)", desc: "gửi danh sách { PartNumber, ETag }" },
  { lane: "be", depth: 4, fn: "POST /multipart/complete", desc: "assertOwnedKey (đúng user) · CompleteMultipartUploadCommand → S3 ghép part · getSignedUrl(GetObject)" },
  { lane: "fe", depth: 4, ret: true, fn: "⇐ { key, viewUrl }" },

  // Kết thúc / lỗi
  { lane: "fe", depth: 3, fn: "patchItem({ status: 'done', viewUrl })", desc: "✓ Xong → ▶ phát video từ viewUrl" },
  { lane: "fe", depth: 2, fn: "catch → patchItem({ status: 'error' })", desc: "bấm ↻ = enqueue lại → resume part còn thiếu" },
];

function FunctionFlowDiagram() {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[540px] space-y-1.5">
        {FLOW.map((s, i) => {
          const lane = FLOW_LANE[s.lane];
          // Dòng trả về: render nhạt, không viền, để đọc như "response".
          if (s.ret) {
            return (
              <div
                key={i}
                style={{ paddingLeft: s.depth * 16 }}
                className="font-mono text-[11px] italic text-gray-500"
              >
                {s.fn}
              </div>
            );
          }
          return (
            <div key={i} style={{ paddingLeft: s.depth * 16 }} className="flex">
              <div className={`flex items-start gap-2 rounded-md border px-2.5 py-1.5 ${lane.box}`}>
                <span className={`shrink-0 mt-px text-[9px] font-bold text-white rounded px-1 py-0.5 ${lane.tagCls}`}>
                  {lane.tag}
                </span>
                <div className="min-w-0">
                  <span className="font-mono text-[11.5px] font-semibold text-gray-800">{s.fn}</span>
                  {s.desc && <span className="text-[11px] text-gray-500"> — {s.desc}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-bold text-gray-800 mb-2">{title}</h3>
      {children}
    </div>
  );
}

export default function VideoDocsModal({ onClose }: { onClose: () => void }) {
  // Đóng bằng phím Esc.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header sticky */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📄</span>
            <h2 className="font-bold text-gray-800">Cách hoạt động: Upload video lên S3</h2>
          </div>
          <button
            type="button"
            title="Đóng"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          <p className="text-sm text-gray-600 leading-relaxed">
            Video (file lớn) được upload theo cơ chế <b>S3 Multipart Upload</b>: file được
            chia thành nhiều <b>part</b>, browser upload <b>trực tiếp lên S3</b> qua các
            <b> presigned URL</b> do backend ký. Backend <b>không nhận bytes video</b> → không
            tốn RAM/băng thông dù file lớn. Chọn nhiều video thì một <b>hàng đợi</b> cho tối đa
            <b> 3 video chạy song song</b> (còn lại "Chờ…"), mỗi video lại upload tối đa 3 part/lúc.
          </p>

          <Section title="Sơ đồ tuần tự">
            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3">
              <SequenceDiagram />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Nét liền = request · nét đứt = response. Bước ③ (PUT part) chạy song song 3 part/lúc.
              Sơ đồ mô tả <b>1 video</b>; nhiều video chạy theo hàng đợi (tối đa 3 video cùng lúc).
            </p>
          </Section>

          <Section title="Luồng gọi hàm (call flow) — FE ↔ BE">
            <div className="flex flex-wrap gap-2 mb-3 text-xs">
              <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold">🌐 FE</span>
              <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 font-semibold">⚙️ BE</span>
              <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold">☁️ S3</span>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3">
              <FunctionFlowDiagram />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Mỗi <b>hộp = 1 lần gọi hàm</b> thật trong code · <b>thụt lề = lồng nhau</b> (ai gọi ai) ·
              dòng <i>nghiêng "⇐"</i> = giá trị trả về. ①–⑤ khớp với phần "Các bước chi tiết" bên dưới.
            </p>
          </Section>

          <Section title="Các bước chi tiết">
            <p className="text-sm text-gray-600 mb-2">
              Mỗi video chạy độc lập theo 5 bước dưới; hàng đợi chỉ cho <b>3 video</b> vào cùng lúc, xong 1 → kéo video kế tiếp.
            </p>
            <ol className="space-y-2 text-sm text-gray-700 list-decimal pl-5">
              <li><b>Khởi tạo:</b> FE gọi <code>/create</code> {"{"}filename, contentType, size{"}"} → BE kiểm tra (chỉ <code>video/*</code>, ≤ giới hạn env) + mở multipart trên S3, trả <code>uploadId</code> + ràng buộc S3 (minPart 5MB, maxParts 10.000). <b>FE tự tính</b> partSize (<code>computePartSize</code>) + số part.</li>
              <li><b>Ký URL:</b> FE gọi <code>/sign</code> cho các part <b>CHƯA xong</b> (theo lô ≤500) → BE validate partNumber rồi ký presigned URL từng part (ký bằng secret key nên bắt buộc ở BE; URL có hạn 6h). Retry sẽ ký lại nên không sợ URL hết hạn.</li>
              <li><b>Upload part:</b> FE cắt file (<code>File.slice</code>), <code>PUT</code> thẳng lên S3 (song song 3 part), mỗi part trả về một <code>ETag</code>.</li>
              <li><b>Hoàn tất:</b> FE gửi danh sách <code>ETags</code> tới <code>/complete</code> → BE gọi S3 ghép part thành 1 video + trả <code>viewUrl</code> (presigned GET).</li>
              <li><b>Xem lại:</b> thẻ <code>&lt;video&gt;</code> phát trực tiếp từ <code>viewUrl</code>. <code>viewUrl</code> có <b>hạn ngắn (~15')</b> để link lộ ra ngoài chóng hết hạn → FE tự xin link mới qua <code>/view-url</code> khi bấm xem & khi hết hạn giữa chừng (tua lại đúng chỗ). F5 → <code>/api/videos</code> nạp lại danh sách.</li>
            </ol>
          </Section>

          <Section title="Chia & Gộp file (split / merge)">
            <div className="flex flex-wrap gap-2 mb-3 text-xs">
              <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold">🌐 FE chia file</span>
              <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 font-semibold">⚙️ BE chỉ điều phối (không đụng bytes)</span>
              <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold">☁️ S3 gộp file</span>
            </div>

            <p className="text-sm text-gray-700 mb-2">
              <b>Chia (ở browser):</b> <b>FE tự tính</b> partSize bằng{" "}
              <code>computePartSize()</code> — BE chỉ trả ràng buộc (minPart 5MB, ≤10.000 part).
              FE ưu tiên <b>~25MB/part</b> (file vừa không bị chia vụn), file lớn thì tăng partSize để số part <b>~≤1000</b>, rồi dùng <code>File.slice()</code> cắt theo byte-range.
            </p>
            <div className="rounded-lg border border-blue-200 overflow-hidden flex h-9 mb-1">
              {["part 1", "part 2", "part 3"].map((s) => (
                <div key={s} className="flex-1 bg-blue-100 border-r border-white flex items-center justify-center text-[10px] font-mono text-blue-700">
                  {s}
                </div>
              ))}
              <div className="flex-1 bg-blue-50 border-r border-white flex items-center justify-center text-[10px] text-blue-400">…</div>
              <div className="flex-[0.7] bg-blue-100 flex items-center justify-center text-[10px] font-mono text-blue-700">part cuối</div>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Ví dụ (25MB/part): <b>120MB → 5 part</b> · 1GB → 41 part · 30MB → 2 part · 10MB → 1 part · 20GB → ~820 part (file rất lớn mới tăng partSize).
            </p>

            <p className="text-sm text-gray-700 mb-2">
              <b>Gộp (ở S3):</b> khi <code>complete</code>, S3 <b>nối các part theo thứ tự PartNumber</b>{" "}
              — nối bytes thuần, không giải mã/encode lại; dùng <code>ETag</code> xác thực từng part.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex rounded-lg overflow-hidden border border-amber-200">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="px-2 py-1.5 bg-amber-100 border-r border-white text-[10px] font-mono text-amber-700">part {n}</div>
                ))}
                <div className="px-2 py-1.5 bg-amber-50 text-[10px] text-amber-400">…N</div>
              </div>
              <span className="text-gray-400 font-bold">→</span>
              <div className="px-3 py-1.5 rounded-lg bg-green-100 text-green-700 text-xs font-semibold">🎬 1 video hoàn chỉnh</div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              ETag object multipart = <code>MD5(các MD5 part) + "-N"</code> — không phải MD5 cả file.
            </p>
          </Section>

          <Section title="Khi part thiếu / hỏng thì sao?">
            <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 text-sm">
              {[
                ["1 part lỗi / mạng đứt", "Không được đánh dấu done → KHÔNG gọi complete → status lỗi → bấm ↻ up lại đúng part thiếu (resume)."],
                ["ETag sai / part bị tráo", "S3 trả InvalidPart → complete thất bại → KHÔNG tạo object."],
                ["Thiếu PartNumber", "S3 chỉ nối các part được liệt kê → video cụt. Code chỉ complete khi ĐỦ part nên không xảy ra."],
                ["Tạo rồi bỏ ngang", "Abort khi user xoá + lifecycle tự dọn part dở sau 1 ngày."],
              ].map(([k, v]) => (
                <div key={k} className="px-3 py-2 grid grid-cols-[130px_1fr] gap-2">
                  <span className="font-semibold text-gray-700">{k}</span>
                  <span className="text-gray-600">{v}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              S3 đảm bảo <b>atomic</b>: object chỉ xuất hiện khi complete thành công — không có video "gộp dở nửa vời".
            </p>
          </Section>

          <Section title="Tại sao thiết kế như vậy?">
            <ul className="space-y-2 text-sm text-gray-700">
              <li>🚀 <b>Trực tiếp browser → S3:</b> chịu được file lớn, server không phải bottleneck.</li>
              <li>🧩 <b>Mỗi file 1 multipart độc lập:</b> 1 file lỗi không ảnh hưởng file khác.</li>
              <li>🚦 <b>Hàng đợi:</b> tối đa <b>3 video</b> upload cùng lúc (mỗi video tối đa 3 part song song) → up 20 video cũng không "ngộp" mạng/S3; còn lại xếp hàng "Chờ…".</li>
              <li>🔁 <b>Retry = resume:</b> chỉ up lại part chưa xong (giữ <code>uploadId</code> + ETag đã có).</li>
              <li>🧹 <b>Huỷ/lỗi → AbortMultipartUpload</b> dọn part dở (lifecycle tự dọn sau 1 ngày).</li>
              <li>🔒 <b>Bảo mật:</b> bắt buộc đăng nhập; <b>mỗi user 1 "thư mục" riêng</b> <code>videos/&lt;userId&gt;/…</code> → không xem/xoá được video người khác; chặn key bậy (path traversal), giới hạn dung lượng 2 phía; bucket private + <b>URL xem hạn ngắn (~15')</b> → link copy ra ngoài chóng hết hạn (presigned URL vốn là "vé mang theo", chỉ hạn chế bằng cách rút ngắn thời gian sống).</li>
            </ul>
          </Section>

          <Section title="Yêu cầu hạ tầng (S3)">
            <ul className="space-y-1 text-sm text-gray-700">
              <li>• <b>CORS</b> bucket: cho <code>PUT/GET</code> + <code>ExposeHeaders: ETag</code> (để browser đọc ETag).</li>
              <li>• <b>Lifecycle</b>: tự huỷ multipart dở → tránh tốn phí lưu part rác.</li>
              <li>• Backend cần AWS credentials để <b>ký</b> presigned URL (local: <code>~/.aws</code>).</li>
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}
