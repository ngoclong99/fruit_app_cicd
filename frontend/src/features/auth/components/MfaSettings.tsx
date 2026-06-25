import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { authApi } from "@/api/endpoints/auth";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";

/**
 * Bật / tắt MFA (TOTP). Luồng bật:
 *   1. Bấm "Bật" → gọi /mfa/setup lấy secret + otpauth URL.
 *   2. Người dùng thêm secret vào app authenticator (Google Authenticator…).
 *   3. Nhập mã 6 số để xác nhận → /mfa/enable.
 * Tắt: nhập mã 6 số hiện tại → /mfa/disable.
 */
export function MfaSettings() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const enabled = user?.mfaEnabled ?? false;

  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [disabling, setDisabling] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reset = () => { setSetup(null); setDisabling(false); setCode(""); setError(""); };

  const startSetup = async () => {
    setError(""); setBusy(true);
    try { setSetup(await authApi.mfaSetup()); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  const confirmEnable = async () => {
    setError(""); setBusy(true);
    try {
      await authApi.mfaEnable(code);
      if (user) updateUser({ ...user, mfaEnabled: true });
      reset();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  const confirmDisable = async () => {
    setError(""); setBusy(true);
    try {
      await authApi.mfaDisable(code);
      if (user) updateUser({ ...user, mfaEnabled: false });
      reset();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-800 text-sm">{t("auth.mfaTitle")}</p>
          <p className="text-xs text-gray-500">
            {enabled ? t("auth.mfaOn") : t("auth.mfaOff")}
          </p>
        </div>
        {!setup && !disabling && (
          enabled
            ? <Button variant="outline" size="sm" onClick={() => setDisabling(true)}>{t("auth.mfaDisable")}</Button>
            : <Button variant="primary" size="sm" isLoading={busy} onClick={startSetup}>{t("auth.mfaEnable")}</Button>
        )}
      </div>

      {/* Bước hiện secret + nhập mã để BẬT */}
      {setup && (
        <div className="rounded-lg border border-gray-200 p-3 space-y-2 bg-gray-50">
          <p className="text-xs text-gray-600">{t("auth.mfaScanHint")}</p>
          <div className="text-xs bg-white border rounded px-2 py-1 font-mono break-all select-all">{setup.secret}</div>
          <Input
            label={t("auth.mfaCodeLabel")}
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button variant="primary" size="sm" isLoading={busy} disabled={code.length !== 6} onClick={confirmEnable}>
              {t("auth.mfaConfirmEnable")}
            </Button>
            <Button variant="ghost" size="sm" onClick={reset}>{t("common.cancel")}</Button>
          </div>
        </div>
      )}

      {/* Bước nhập mã để TẮT */}
      {disabling && (
        <div className="rounded-lg border border-gray-200 p-3 space-y-2 bg-gray-50">
          <Input
            label={t("auth.mfaCodeLabel")}
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button variant="danger" size="sm" isLoading={busy} disabled={code.length !== 6} onClick={confirmDisable}>
              {t("auth.mfaConfirmDisable")}
            </Button>
            <Button variant="ghost" size="sm" onClick={reset}>{t("common.cancel")}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
