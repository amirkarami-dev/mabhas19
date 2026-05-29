import { useState } from "react"
import { View } from "react-native"
import { useRouter } from "expo-router"
import { AppText, Button, Card, Field, Screen } from "@/components/ui"
import { useAuth } from "@/lib/auth-context"
import { authApi } from "@/lib/endpoints"
import { ApiError } from "@/lib/api"
import { t } from "@/i18n"
import { colors, spacing } from "@/theme"

type Mode = "password" | "otp"

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

  const onPasswordLogin = async () => {
    setBusy(true)
    setError(null)
    try {
      await loginWithPassword(email.trim(), password)
      router.replace("/(app)/projects")
    } catch (err) {
      setError(err instanceof ApiError ? t("loginFailed") : t("loginFailed"))
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
                  onChangeText={setCode}
                  textAlign="left"
                />
                <Button title={t("verify")} onPress={onVerifyOtp} loading={busy} />
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
