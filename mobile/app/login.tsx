import { useEffect, useRef, useState } from "react"
import { View } from "react-native"
import { useRouter } from "expo-router"
import { AppText, Button, Card, Field, Screen } from "@/components/ui"
import { useAuth } from "@/lib/auth-context"
import { authApi } from "@/lib/endpoints"
import { t } from "@/i18n"
import { colors, spacing } from "@/theme"

type Mode = "password" | "otp"

// OTP code length — must match the backend Otp:CodeLength.
const OTP_LENGTH = 5

export default function LoginScreen() {
  const router = useRouter()
  const { loginWithPassword, loginWithOtp } = useAuth()

  const [mode, setMode] = useState<Mode>("password")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Tracks the code we already auto-submitted, so we don't fire verify twice
  // for the same value (e.g. after a failed attempt).
  const submittedRef = useRef<string | null>(null)

  const onPasswordLogin = async () => {
    setBusy(true)
    setError(null)
    try {
      await loginWithPassword(email.trim(), password)
      router.replace("/(app)/projects")
    } catch {
      setError(t("loginFailed"))
    } finally {
      setBusy(false)
    }
  }

  const onSendOtp = async () => {
    setBusy(true)
    setError(null)
    try {
      await authApi.requestOtp(phone.trim())
      setOtpSent(true)
      setCode("")
      submittedRef.current = null
    } catch {
      setError(t("loginFailed"))
    } finally {
      setBusy(false)
    }
  }

  const onVerifyOtp = async () => {
    setBusy(true)
    setError(null)
    try {
      await loginWithOtp(phone.trim(), code.trim())
      router.replace("/(app)/projects")
    } catch {
      setError(t("loginFailed"))
    } finally {
      setBusy(false)
    }
  }

  // Auto-verify as soon as the full code is entered — no button press needed.
  useEffect(() => {
    if (otpSent && code.length === OTP_LENGTH && !busy && submittedRef.current !== code) {
      submittedRef.current = code
      void onVerifyOtp()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, otpSent, busy])

  const onCodeChange = (value: string) =>
    setCode(value.replace(/\D/g, "").slice(0, OTP_LENGTH))

  return (
    <Screen>
      <View style={{ alignItems: "center", marginTop: spacing.xl, marginBottom: spacing.lg, gap: 4 }}>
        <AppText variant="title">{t("appName")}</AppText>
        <AppText variant="muted">{t("tagline")}</AppText>
      </View>

      <Card>
        <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm }}>
          <Button
            title={t("loginWithPassword")}
            variant={mode === "password" ? "primary" : "outline"}
            onPress={() => setMode("password")}
          />
          <Button
            title={t("loginWithOtp")}
            variant={mode === "otp" ? "primary" : "outline"}
            onPress={() => setMode("otp")}
          />
        </View>

        {mode === "password" ? (
          <>
            <Field
              label={t("email")}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              textAlign="left"
            />
            <Field
              label={t("password")}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              textAlign="left"
            />
            <Button title={busy ? t("signingIn") : t("login")} onPress={onPasswordLogin} loading={busy} />
          </>
        ) : (
          <>
            <Field
              label={t("phone")}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              textAlign="left"
            />
            {otpSent ? (
              <>
                <Field
                  label={t("otpCode")}
                  keyboardType="number-pad"
                  value={code}
                  onChangeText={onCodeChange}
                  maxLength={OTP_LENGTH}
                  autoFocus
                  textAlign="left"
                />
                {/* Code auto-verifies when complete; this is a manual fallback. */}
                <Button
                  title={busy ? t("signingIn") : t("verify")}
                  onPress={onVerifyOtp}
                  loading={busy}
                  disabled={code.length !== OTP_LENGTH}
                />
              </>
            ) : (
              <Button title={t("sendOtp")} onPress={onSendOtp} loading={busy} />
            )}
          </>
        )}

        {error ? <AppText style={{ color: colors.danger }}>{error}</AppText> : null}
      </Card>
    </Screen>
  )
}
