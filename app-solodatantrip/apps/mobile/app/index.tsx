import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";

interface Credentials {
  username: string;
  password: string;
  server: string;
  port: string;
  mountpoint: string;
}

export default function HomeScreen() {
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("pending");

  async function loadCredentials() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/gnss/qr-code`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: "emlid" }),
      });
      const data = await res.json();
      if (!data.success) {
        Alert.alert("Erro", data.error ?? "Falha ao carregar credenciais.");
        return;
      }
      setCredentials(data.credentials);
      setQrPayload(data.payload);
      setStatus("active");
    } catch {
      Alert.alert("Erro", "Erro de rede.");
    } finally {
      setLoading(false);
    }
  }

  async function copyNtrip() {
    if (!credentials) return;
    const text = [
      `Host: ${credentials.server}`,
      `Port: ${credentials.port}`,
      `User: ${credentials.username}`,
      `Pass: ${credentials.password}`,
      `Mount: ${credentials.mountpoint}`,
    ].join("\n");
    await Clipboard.setStringAsync(text);
    Alert.alert("Copiado", "Credenciais NTRIP copiadas.");
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Datageo RTK</Text>
      <Text style={styles.subtitle}>Credenciais GNSS / NTRIP</Text>

      <View style={[styles.badge, status === "active" ? styles.badgeActive : styles.badgePending]}>
        <Text style={styles.badgeText}>{status === "active" ? "● Online" : "○ Offline"}</Text>
      </View>

      {loading && <ActivityIndicator size="large" color="#10b981" style={{ marginVertical: 24 }} />}

      {credentials && (
        <View style={styles.card}>
          <Text style={styles.label}>Usuário</Text>
          <Text style={styles.value}>{credentials.username}</Text>
          <Text style={styles.label}>Servidor</Text>
          <Text style={styles.value}>{credentials.server}:{credentials.port}</Text>
          <Text style={styles.label}>Mountpoint</Text>
          <Text style={styles.value}>{credentials.mountpoint}</Text>
        </View>
      )}

      {qrPayload && (
        <View style={styles.qrWrap}>
          <QRCode value={qrPayload} size={200} />
          <Text style={styles.qrHint}>Escaneie no Emlid Flow, SurPad ou Carlson</Text>
        </View>
      )}

      <TouchableOpacity style={styles.button} onPress={loadCredentials} disabled={loading}>
        <Text style={styles.buttonText}>Carregar credenciais</Text>
      </TouchableOpacity>

      {credentials && (
        <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={copyNtrip}>
          <Text style={styles.buttonText}>Copiar NTRIP</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#0f172a", padding: 24, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: "bold", color: "#fff" },
  subtitle: { fontSize: 14, color: "#94a3b8", marginTop: 4 },
  badge: { alignSelf: "flex-start", marginTop: 16, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeActive: { backgroundColor: "#064e3b" },
  badgePending: { backgroundColor: "#78350f" },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  card: { backgroundColor: "#1e293b", borderRadius: 12, padding: 16, marginTop: 24 },
  label: { fontSize: 11, color: "#64748b", textTransform: "uppercase", marginTop: 8 },
  value: { fontSize: 16, color: "#f1f5f9", fontFamily: "monospace" },
  qrWrap: { alignItems: "center", marginTop: 24, padding: 16, backgroundColor: "#fff", borderRadius: 12 },
  qrHint: { marginTop: 12, fontSize: 12, color: "#64748b", textAlign: "center" },
  button: { backgroundColor: "#10b981", borderRadius: 10, padding: 16, marginTop: 16, alignItems: "center" },
  buttonSecondary: { backgroundColor: "#334155" },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
