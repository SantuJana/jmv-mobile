import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { getErrorMessage } from "../lib/api-client";
import { useAuth } from "../providers/auth-provider";
import { COLORS, ELEVATION, FONTS } from "../theme/design";

type AuthMode = "login" | "register";

const keyboardAvoidingBehavior = Platform.OS === "ios" ? "padding" : "height";

export function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitLabel = useMemo(() => (mode === "login" ? "Sign In" : "Create Account"), [mode]);
  const modeCaption = mode === "login" ? "Welcome back. Let us get groceries moving." : "Create your account in seconds.";

  const onSubmit = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === "login") {
        await login(email.trim(), password);
      } else {
        await register({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          password
        });
      }

      setPassword("");
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Authentication failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setError(null);
    setMode((current) => (current === "login" ? "register" : "login"));
  };

  return (
    <KeyboardAvoidingView behavior={keyboardAvoidingBehavior} style={styles.root}>
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#FFD89A", "#FFC67F", "#FFB56F"]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.hero}
        >
          <View style={styles.heroIconWrap}>
            <Image resizeMode="contain" source={require("../../assets/icon.png")} style={styles.heroLogo} />
          </View>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>JMV Grocery</Text>
            <Text style={styles.heroSubtitle}>Everything fresh, delivered fast.</Text>
          </View>
        </LinearGradient>

        <View style={styles.card}>
          <Text style={styles.title}>{mode === "login" ? "Sign In" : "Create Account"}</Text>
          <Text style={styles.subtitle}>{modeCaption}</Text>

          <View style={styles.modeSwitchRow}>
            <Pressable
              onPress={() => setMode("login")}
              style={[styles.modeSwitchButton, mode === "login" ? styles.modeSwitchButtonActive : null]}
            >
              <Text style={[styles.modeSwitchText, mode === "login" ? styles.modeSwitchTextActive : null]}>Login</Text>
            </Pressable>
            <Pressable
              onPress={() => setMode("register")}
              style={[styles.modeSwitchButton, mode === "register" ? styles.modeSwitchButtonActive : null]}
            >
              <Text style={[styles.modeSwitchText, mode === "register" ? styles.modeSwitchTextActive : null]}>Register</Text>
            </Pressable>
          </View>

          {mode === "register" ? (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                autoCapitalize="words"
                onChangeText={setName}
                placeholder="Asha Rao"
                placeholderTextColor={COLORS.textMuted}
                style={styles.input}
                value={name}
              />
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="asha.rao@example.com"
              placeholderTextColor={COLORS.textMuted}
              style={styles.input}
              value={email}
            />
          </View>

          {mode === "register" ? (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Phone (optional)</Text>
              <TextInput
                keyboardType="phone-pad"
                onChangeText={setPhone}
                placeholder="+919876543210"
                placeholderTextColor={COLORS.textMuted}
                style={styles.input}
                value={phone}
              />
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Password</Text>
            <TextInput
              autoCapitalize="none"
              onChangeText={setPassword}
              placeholder="Password123!"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
              style={styles.input}
              value={password}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            disabled={isSubmitting}
            onPress={() => {
              Keyboard.dismiss();
              void onSubmit();
            }}
            style={({ pressed }) => [styles.submitButton, pressed ? styles.submitButtonPressed : null]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={COLORS.surface} />
            ) : (
              <Text style={styles.submitButtonText}>{submitLabel}</Text>
            )}
          </Pressable>

          <Pressable onPress={switchMode} style={styles.switchButton}>
            <Text style={styles.switchButtonText}>
              {mode === "login" ? "Need an account? Register here" : "Already have an account? Login here"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: COLORS.background,
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 14,
    paddingBottom: 40
  },
  hero: {
    ...ELEVATION.card,
    alignItems: "center",
    borderRadius: 20,
    flexDirection: "row",
    marginBottom: 12,
    padding: 14
  },
  heroIconWrap: {
    alignItems: "center",
    borderRadius: 12,
    height: 48,
    justifyContent: "center",
    overflow: "hidden",
    width: 48
  },
  heroLogo: {
    height: "100%",
    width: "100%"
  },
  heroTextWrap: {
    marginLeft: 10
  },
  heroTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 20,
    fontWeight: "700"
  },
  heroSubtitle: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 12,
    marginTop: 2
  },
  card: {
    ...ELEVATION.card,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14
  },
  title: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    fontSize: 22,
    fontWeight: "700"
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 13,
    marginBottom: 12,
    marginTop: 4
  },
  modeSwitchRow: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 10,
    flexDirection: "row",
    marginBottom: 12,
    padding: 4
  },
  modeSwitchButton: {
    alignItems: "center",
    borderRadius: 8,
    flex: 1,
    paddingVertical: 8
  },
  modeSwitchButtonActive: {
    backgroundColor: COLORS.surface
  },
  modeSwitchText: {
    color: COLORS.textMuted,
    fontFamily: FONTS.body,
    fontSize: 13,
    fontWeight: "700"
  },
  modeSwitchTextActive: {
    color: COLORS.primaryDeep
  },
  field: {
    marginBottom: 10
  },
  fieldLabel: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 5
  },
  input: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderRadius: 10,
    borderWidth: 1,
    color: COLORS.textPrimary,
    fontFamily: FONTS.body,
    fontSize: 14,
    paddingHorizontal: 11,
    paddingVertical: 10
  },
  errorText: {
    color: COLORS.danger,
    fontFamily: FONTS.body,
    fontSize: 13,
    marginBottom: 8
  },
  submitButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minHeight: 44,
    justifyContent: "center",
    marginTop: 4
  },
  submitButtonPressed: {
    opacity: 0.85
  },
  submitButtonText: {
    color: COLORS.surface,
    fontFamily: FONTS.body,
    fontSize: 14,
    fontWeight: "800"
  },
  switchButton: {
    alignItems: "center",
    marginTop: 12
  },
  switchButtonText: {
    color: COLORS.primaryDeep,
    fontFamily: FONTS.body,
    fontSize: 12,
    fontWeight: "700"
  }
});
