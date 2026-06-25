import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { videosApi, type CompletedPart } from "@/api/endpoints/videos";
import { useAuth } from "@/hooks/useAuth";
import { useDialog } from "@/context/DialogContext";
import {
  computePartSize,
  computePartCount,
  putPart,
  chunk,
} from "@/shared/upload/multipart";
import VideoDocsModal from "./VideoDocsModal";

// ============================================================================
// VideoTab — Upload video lên S3 bằng MULTIPART UPLOAD.
//   • FE TỰ chia part (computePartSize) → BE chỉ ký URL (/sign) + validate.
//   • Upload trực tiếp browser → S3 (không qua RAM backend); 1 file lỗi không
//     ảnh hưởng file khác; retry = resume part còn thiếu; xem lại qua presigned GET.
// ============================================================================

// Pre-check phía client (giới hạn THẬT do BE quyết qua env S3_VIDEOS_MAX_GB).
const MAX_BYTES = 50 * 1024 ** 3; // 50 GiB
const FILE_CONCURRENCY = 3; // số VIDEO upload đồng thời (còn lại xếp hàng "Chờ…")
const PART_CONCURRENCY = 3; // số PART/video upload song song
const SIGN_BATCH = 500; // ký URL theo lô để file rất lớn không gửi 1 request quá to

type Status = "pending" | "uploading" | "done" | "error" | "toolarge";

interface VideoItem {
  id: string;
  name: string;
  size: number;
  status: Status;
  progress: number; // 0..100
  error?: string;
  viewUrl?: string;
  key?: string; // S3 key — có khi đã upload xong / load từ S3 (để xoá)
}
interface PartRec {
  partNumber: number;
  url: string;
  size: number;
  loaded: number;
  etag?: string;
  done: boolean;
}
interface UploadRec {
  file: File;
  key?: string;
  uploadId?: string;
  partSize: number;
  parts: PartRec[];
  lastReport: number;
}

// Đổi số byte → chuỗi dễ đọc (GB/MB/KB/B) để hiển thị dung lượng file.
function formatBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
}

// Component CHÍNH của tab "Upload file": giữ toàn bộ state (danh sách video, hàng
// đợi upload, ô chọn, modal docs) và render dropzone + danh sách. Các hàm con
// (useCallback) bên dưới lo từng việc nhỏ trong vòng đời 1 lần upload.
export function VideoTab() {
  const { user } = useAuth();
  const { confirm } = useDialog();
  const [items, setItems] = useState<VideoItem[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showDocs, setShowDocs] = useState(false);
  const recordsRef = useRef<Map<string, UploadRec>>(new Map());
  const inputRef = useRef<HTMLInputElement>(null);
  // Vị trí đang xem (giây) — để TUA LẠI khi URL xem (TTL ngắn) hết hạn giữa chừng,
  // phải xin link mới và nạp lại <video>.
  const resumeAtRef = useRef(0);
  // Hàng đợi upload: tối đa FILE_CONCURRENCY video chạy cùng lúc, còn lại "Chờ…".
  const queueRef = useRef<string[]>([]);
  const activeRef = useRef(0);

  // F5 / mở tab → nạp lại danh sách video đã có trên S3.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    videosApi
      .list()
      .then((list) => {
        if (!alive) return;
        setItems(
          list.map((v) => ({
            id: v.key,
            name: v.key.split("/").pop() || v.key,
            size: v.size,
            status: "done" as const,
            progress: 100,
            viewUrl: v.viewUrl,
            key: v.key,
          })),
        );
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [userId]);

  // Cập nhật (merge) vài field của ĐÚNG 1 video trong list theo id — các video
  // khác giữ nguyên. Mọi thay đổi trạng thái/tiến trình đều đi qua hàm này.
  const patchItem = useCallback((id: string, patch: Partial<VideoItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    );
  }, []);

  // Tính % đã upload của 1 video (cộng `loaded` mọi part / tổng size) rồi cập nhật
  // thanh tiến trình. Có throttle 150ms để không re-render quá dày khi byte chảy liên tục.
  const reportProgress = useCallback(
    (id: string, rec: UploadRec) => {
      const now = performance.now();
      const loaded = rec.parts.reduce((s, p) => s + p.loaded, 0);
      const pct = Math.min(99, Math.round((loaded / rec.file.size) * 100));
      if (now - rec.lastReport < 150 && pct < 99) return; // throttle re-render
      rec.lastReport = now;
      patchItem(id, { progress: pct });
    },
    [patchItem],
  );

  // Upload các part CHƯA xong của 1 video, tối đa PART_CONCURRENCY part song song
  // (mô hình pool: vài "worker" cùng rút part từ hàng `pending`). Mỗi part PUT
  // thẳng lên S3 qua presigned URL và trả về ETag để dùng ở bước complete.
  const uploadParts = useCallback(
    async (id: string, rec: UploadRec) => {
      const pending = rec.parts.filter((p) => !p.done);
      let idx = 0;
      const worker = async () => {
        while (idx < pending.length) {
          const p = pending[idx++];
          const start = (p.partNumber - 1) * rec.partSize;
          const blob = rec.file.slice(start, start + p.size);
          const etag = await putPart(p.url, blob, (loaded) => {
            p.loaded = loaded;
            reportProgress(id, rec);
          });
          p.done = true;
          p.etag = etag;
          p.loaded = p.size;
          reportProgress(id, rec);
        }
      };
      await Promise.all(
        Array.from(
          { length: Math.min(PART_CONCURRENCY, pending.length) },
          worker,
        ),
      );
    },
    [reportProgress],
  );

  // Upload (hoặc resume) 1 file — độc lập, lỗi không ảnh hưởng file khác.
  const uploadOne = useCallback(
    async (id: string) => {
      const rec = recordsRef.current.get(id);
      if (!rec) return;
      patchItem(id, { status: "uploading", error: undefined });
      try {
        // Lần đầu: mở multipart + FE TỰ chia part theo ràng buộc S3 (BE trả về).
        if (!rec.uploadId) {
          const r = await videosApi.createMultipart(
            rec.file.name,
            rec.file.type || "video/mp4",
            rec.file.size,
          );
          rec.key = r.key;
          rec.uploadId = r.uploadId;
          rec.partSize = computePartSize(
            rec.file.size,
            r.minPartSize,
            r.maxParts,
          );
          const count = computePartCount(rec.file.size, rec.partSize);
          rec.parts = Array.from({ length: count }, (_, i) => {
            const partNumber = i + 1;
            return {
              partNumber,
              url: "",
              size: Math.min(
                rec.partSize,
                rec.file.size - (partNumber - 1) * rec.partSize,
              ),
              loaded: 0,
              done: false,
            };
          });
        }
        // Ký URL cho các part CHƯA xong (mới + khi retry vì URL có thể hết hạn), theo lô.
        const need = rec.parts.filter((p) => !p.done).map((p) => p.partNumber);
        for (const batch of chunk(need, SIGN_BATCH)) {
          const { urls } = await videosApi.signParts(
            rec.key!,
            rec.uploadId!,
            batch,
          );
          const byNum = new Map(urls.map((u) => [u.partNumber, u.url]));
          rec.parts.forEach((p) => {
            const u = byNum.get(p.partNumber);
            if (u) p.url = u;
          });
        }
        await uploadParts(id, rec);
        const parts: CompletedPart[] = rec.parts
          .map((p) => ({ PartNumber: p.partNumber, ETag: p.etag! }))
          .sort((a, b) => a.PartNumber - b.PartNumber);
        const { viewUrl } = await videosApi.completeMultipart(
          rec.key!,
          rec.uploadId!,
          parts,
        );
        patchItem(id, { status: "done", progress: 100, viewUrl, key: rec.key });
      } catch (e) {
        patchItem(id, { status: "error", error: (e as Error).message });
      }
    },
    [patchItem, uploadParts],
  );

  // Bơm hàng đợi: chỉ chạy tối đa FILE_CONCURRENCY video song song; xong 1 → kéo tiếp.
  const pump = useCallback(() => {
    while (
      activeRef.current < FILE_CONCURRENCY &&
      queueRef.current.length > 0
    ) {
      const id = queueRef.current.shift()!;
      activeRef.current++;
      void uploadOne(id).finally(() => {
        activeRef.current--;
        pump();
      });
    }
  }, [uploadOne]);

  // Xếp 1 video vào hàng đợi (đánh dấu "Chờ…" để thấy rõ chưa tới lượt).
  const enqueue = useCallback(
    (id: string) => {
      patchItem(id, { status: "pending", error: undefined, progress: 0 });
      queueRef.current.push(id);
      pump();
    },
    [patchItem, pump],
  );

  // Nhận file từ ô chọn HOẶC kéo-thả: tạo item cho từng file (file quá lớn →
  // đánh dấu "toolarge" và bỏ qua), lưu File vào recordsRef rồi xếp vào hàng đợi.
  const addFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      const newItems: VideoItem[] = [];
      const toUpload: string[] = [];
      for (const file of Array.from(fileList)) {
        const id = crypto.randomUUID();
        if (file.size > MAX_BYTES) {
          newItems.push({
            id,
            name: file.name,
            size: file.size,
            status: "toolarge",
            progress: 0,
            error: "Vượt giới hạn dung lượng",
          });
          continue;
        }
        recordsRef.current.set(id, {
          file,
          partSize: 0,
          parts: [],
          lastReport: 0,
        });
        newItems.push({
          id,
          name: file.name,
          size: file.size,
          status: "pending",
          progress: 0,
        });
        toUpload.push(id);
      }
      setItems((prev) => [...prev, ...newItems]);
      toUpload.forEach(enqueue); // vào hàng đợi: tối đa FILE_CONCURRENCY chạy cùng lúc
    },
    [enqueue],
  );

  // Xoá 1 video khỏi danh sách. 3 trường hợp: (a) đang up dở → abort multipart để
  // dọn part rác trên S3 (không hỏi); (b) đã có trên S3 → xác nhận rồi xoá hẳn
  // object; (c) item lỗi/chưa lên S3 → chỉ gỡ khỏi UI. Cuối cùng dọn state liên quan.
  const removeItem = useCallback(
    async (id: string) => {
      const rec = recordsRef.current.get(id);
      const item = items.find((i) => i.id === id);
      if (rec?.key && rec.uploadId && item?.status !== "done") {
        // Đang up dở → huỷ multipart (dọn part trên S3), không cần xác nhận.
        videosApi.abortMultipart(rec.key, rec.uploadId).catch(() => {});
      } else if (item?.key) {
        // Đã có trên S3 → xác nhận rồi xoá hẳn object.
        const ok = await confirm({
          title: "Xoá video?",
          body: `Xoá "${item.name}" khỏi S3? Không thể hoàn tác.`,
          type: "danger",
          confirmText: "Xoá",
          cancelText: "Huỷ",
        });
        if (!ok) return;
        await videosApi.deleteVideo(item.key).catch(() => {});
      }
      recordsRef.current.delete(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      setSelected((prev) => {
        if (!prev.has(id)) return prev;
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
      setPlaying((p) => (p === id ? null : p));
    },
    [items, confirm],
  );

  // Mở/đóng trình phát. Khi MỞ: xin URL xem MỚI (hạn ~15') NGAY trước khi phát →
  // link cũ trong danh sách (nếu đã bị copy ra ngoài) coi như vô dụng vì sắp/đã hết hạn.
  const togglePlay = useCallback(
    async (id: string, key: string | undefined, isPlaying: boolean) => {
      if (isPlaying) {
        setPlaying(null);
        return;
      }
      resumeAtRef.current = 0;
      if (key) {
        try {
          const { viewUrl } = await videosApi.viewUrl(key);
          patchItem(id, { viewUrl });
        } catch {
          /* lỗi mạng → giữ URL cũ, vẫn thử phát */
        }
      }
      setPlaying(id);
    },
    [patchItem],
  );

  // URL xem hết hạn GIỮA chừng (do TTL ngắn) → xin URL mới; onLoadedMetadata sẽ tua lại đúng chỗ.
  const refreshViewUrl = useCallback(
    async (id: string, key?: string) => {
      if (!key) return;
      try {
        const { viewUrl } = await videosApi.viewUrl(key);
        patchItem(id, { viewUrl });
      } catch {
        /* ignore */
      }
    },
    [patchItem],
  );

  // ─── Chọn nhiều + xoá hàng loạt (chỉ video đã ở trên S3) ───
  const selectable = items.filter((i) => i.status === "done" && i.key);
  const allSelected =
    selectable.length > 0 && selectable.every((i) => selected.has(i.id));

  // Bật/tắt tick chọn 1 video (cho thao tác xoá hàng loạt).
  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }, []);

  // "Chọn tất cả" / bỏ chọn tất cả các video đã ở trên S3 (chỉ video done + có key).
  const toggleSelectAll = useCallback(() => {
    setSelected((prev) => {
      const sel = items.filter((i) => i.status === "done" && i.key);
      const all = sel.length > 0 && sel.every((i) => prev.has(i.id));
      return all ? new Set() : new Set(sel.map((i) => i.id));
    });
  }, [items]);

  // Xoá hàng loạt các video đang được tick: xác nhận 1 lần, gọi delete-many (1 request
  // tới S3) rồi gỡ chúng khỏi UI và reset ô chọn.
  const bulkDelete = useCallback(async () => {
    const chosen = items.filter((i) => selected.has(i.id) && i.key);
    if (chosen.length === 0) return;
    const ok = await confirm({
      title: `Xoá ${chosen.length} video?`,
      body: `Xoá ${chosen.length} video đã chọn khỏi S3? Không thể hoàn tác.`,
      type: "danger",
      confirmText: "Xoá",
      cancelText: "Huỷ",
    });
    if (!ok) return;
    await videosApi.deleteManyVideos(chosen.map((i) => i.key!)).catch(() => {});
    const ids = new Set(chosen.map((i) => i.id));
    setItems((prev) => prev.filter((i) => !ids.has(i.id)));
    setSelected(new Set());
  }, [items, selected, confirm]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-green-700">
            Upload video lên S3 (Multipart)
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            FE tự chia file thành part, upload song song trực tiếp lên S3 (hỗ
            trợ video rất lớn). Một file lỗi không ảnh hưởng file khác — bấm{" "}
            <b>↻</b> để up tiếp phần còn thiếu.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowDocs(true)}
          className="shrink-0 flex items-center gap-1.5 text-sm font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg px-3 py-2 transition-colors"
        >
          📄 Docs
        </button>
      </div>

      {showDocs && <VideoDocsModal onClose={() => setShowDocs(false)} />}

      {!user ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-800">
          🔒 Hãy <b>đăng nhập</b> để dùng tính năng upload video lên S3.
        </div>
      ) : (
        <>
          {/* ─── Dropzone ─── */}
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              addFiles(e.dataTransfer.files);
            }}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
              dragOver
                ? "border-green-500 bg-green-50"
                : "border-gray-300 hover:border-green-400 hover:bg-gray-50"
            }`}
          >
            <div className="text-5xl mb-2">☁️</div>
            <p className="font-semibold text-gray-700">
              Kéo thả hoặc bấm để chọn video
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Chọn nhiều file • mp4, webm, mov, mkv… • hỗ trợ video rất lớn
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="video/*"
              multiple
              hidden
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {/* ─── Danh sách video ─── */}
          {items.length > 0 && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                {selectable.length > 0 && (
                  <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 accent-green-600"
                    />
                    Chọn tất cả
                  </label>
                )}
                <p className="text-sm font-semibold text-gray-500">
                  Video ({items.length})
                </p>
                {selected.size > 0 && (
                  <button
                    type="button"
                    onClick={() => void bulkDelete()}
                    className="ml-auto text-sm font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    🗑 Xoá đã chọn ({selected.size})
                  </button>
                )}
              </div>
              {items.map((it) => (
                <div
                  key={it.id}
                  className="border border-gray-200 rounded-xl p-3"
                >
                  <div className="flex items-center gap-3">
                    {it.status === "done" && it.key && (
                      <input
                        type="checkbox"
                        title={`Chọn ${it.name}`}
                        checked={selected.has(it.id)}
                        onChange={() => toggleSelect(it.id)}
                        className="w-4 h-4 accent-green-600 shrink-0"
                      />
                    )}
                    <span className="shrink-0 w-12 h-9 rounded-md bg-green-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {(it.name.split(".").pop() || "VID")
                        .slice(0, 4)
                        .toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {it.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatBytes(it.size)}
                      </p>
                    </div>
                    <StatusChip item={it} />
                    <div className="flex items-center gap-1 shrink-0">
                      {it.status === "done" && it.viewUrl && (
                        <IconBtn
                          title="Xem video"
                          onClick={() =>
                            void togglePlay(it.id, it.key, playing === it.id)
                          }
                        >
                          ▶
                        </IconBtn>
                      )}
                      {it.status === "error" && (
                        <IconBtn
                          title="Thử lại (resume)"
                          onClick={() => enqueue(it.id)}
                        >
                          ↻
                        </IconBtn>
                      )}
                      <IconBtn
                        title="Xoá"
                        onClick={() => void removeItem(it.id)}
                        danger
                      >
                        ✕
                      </IconBtn>
                    </div>
                  </div>

                  {it.status === "uploading" && (
                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all duration-200"
                        style={{ width: `${it.progress}%` }}
                      />
                    </div>
                  )}
                  {it.error && it.status !== "uploading" && (
                    <p className="mt-2 text-xs text-red-600">{it.error}</p>
                  )}
                  {playing === it.id && it.viewUrl && (
                    <video
                      src={it.viewUrl}
                      controls
                      autoPlay
                      onTimeUpdate={(e) => {
                        resumeAtRef.current = e.currentTarget.currentTime;
                      }}
                      onLoadedMetadata={(e) => {
                        // Sau khi nạp lại src mới (URL gia hạn) → tua về chỗ đang xem.
                        if (resumeAtRef.current > 0)
                          e.currentTarget.currentTime = resumeAtRef.current;
                      }}
                      onError={() => void refreshViewUrl(it.id, it.key)}
                      className="mt-3 w-full rounded-lg bg-black max-h-80"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Huy hiệu trạng thái nhỏ ở mỗi dòng video: Chờ… / %x / ✓ Xong / Lỗi / Quá lớn.
function StatusChip({ item }: { item: VideoItem }) {
  const map: Record<Status, { text: string; cls: string }> = {
    pending: { text: "Chờ…", cls: "bg-gray-100 text-gray-500" },
    uploading: { text: `${item.progress}%`, cls: "bg-blue-100 text-blue-700" },
    done: { text: "✓ Xong", cls: "bg-green-100 text-green-700" },
    error: { text: "Lỗi", cls: "bg-red-100 text-red-700" },
    toolarge: { text: "Quá lớn", cls: "bg-red-100 text-red-700" },
  };
  const s = map[item.status];
  return (
    <span
      className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${s.cls}`}
    >
      {s.text}
    </span>
  );
}

// Nút icon tròn dùng lại cho các hành động trên 1 dòng (▶ xem, ↻ retry, ✕ xoá);
// `danger` đổi sang tông đỏ cho hành động xoá.
function IconBtn({
  children,
  title,
  onClick,
  danger,
}: {
  children: ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${
        danger
          ? "text-gray-400 hover:bg-red-50 hover:text-red-600"
          : "text-gray-500 hover:bg-green-50 hover:text-green-700"
      }`}
    >
      {children}
    </button>
  );
}
