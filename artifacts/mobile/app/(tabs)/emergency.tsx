import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { EmergencySOSButton } from "@/components/EmergencySOSButton";
import { STRINGS, TIER_FEATURES, type EmergencyContact, useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/Button";
import { PaywallModal } from "@/components/ui/PaywallModal";

function ContactItem({ contact, onRemove }: { contact: EmergencyContact; onRemove: () => void }) {
  const { c } = useTheme();
  return (
    <View style={[styles.contactCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      <View style={[styles.avatar, { backgroundColor: "rgba(255,107,26,0.12)" }]}>
        <Text style={styles.avatarText}>{contact.name.slice(0, 2).toUpperCase()}</Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={[styles.contactName, { color: c.text }]} numberOfLines={1}>{contact.name}</Text>
        <Text style={[styles.contactPhone, { color: c.textSecondary }]}>{contact.phone}</Text>
      </View>
      <Pressable
        onPress={onRemove}
        hitSlop={8}
        style={({ pressed }) => [
          styles.removeBtn,
          { backgroundColor: "rgba(255,59,48,0.1)", opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Ionicons name="trash-outline" size={18} color={Colors.dark.danger} />
      </Pressable>
    </View>
  );
}

function AddContactModal({
  visible,
  onClose,
  onAdd,
  t,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (name: string, phone: string) => void;
  t: Record<string, string>;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const handleAdd = () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert(t.missingInfo, t.missingInfoMsg);
      return;
    }
    onAdd(name.trim(), phone.trim());
    setName("");
    setPhone("");
    onClose();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: c.background, paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.modalHandle, { backgroundColor: c.textTertiary }]} />
        <Text style={[styles.modalTitle, { color: c.text }]}>{t.addContactTitle}</Text>
        <Text style={[styles.modalSub, { color: c.textSecondary }]}>{t.contactInfoSub}</Text>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: c.textSecondary }]}>{t.labelName}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t.phFullName}
            placeholderTextColor={c.textTertiary}
            style={[styles.input, { color: c.text, backgroundColor: c.card, borderColor: c.cardBorder }]}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: c.textSecondary }]}>{t.labelPhone}</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="+1 555 0100"
            placeholderTextColor={c.textTertiary}
            keyboardType="phone-pad"
            style={[styles.input, { color: c.text, backgroundColor: c.card, borderColor: c.cardBorder }]}
          />
        </View>

        <Button label={`+ ${t.addContact}`} onPress={handleAdd} style={{ marginTop: 8 }} />
        <Button label={t.cancel} onPress={onClose} variant="ghost" style={{ marginTop: 4 }} />
      </View>
    </Modal>
  );
}

export default function EmergencyScreen() {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { settings, addContact, removeContact } = useApp();
  const t = STRINGS[settings.language];
  const features = TIER_FEATURES[settings.subscription];
  const isWeb = Platform.OS === "web";
  const paddingTop = isWeb ? Math.max(insets.top, 67) : insets.top;
  const paddingBottom = isWeb ? 34 + 84 : 100;

  const [showAdd, setShowAdd] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const handleAddPress = () => {
    if (settings.emergencyContacts.length >= (features.contactLimit === Infinity ? 999 : features.contactLimit)) {
      setShowPaywall(true);
      return;
    }
    setShowAdd(true);
  };

  const handleRemove = (id: string) => {
    Alert.alert(t.removeContactTitle, t.removeContactMsg, [
      { text: t.cancel, style: "cancel" },
      {
        text: t.remove, style: "destructive",
        onPress: () => { removeContact(id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); },
      },
    ]);
  };

  const infoText = t.emergencyInfoText.replace("{n}", settings.countdownSeconds.toString());

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <FlatList
        data={settings.emergencyContacts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingTop: paddingTop + 16, paddingBottom }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <Text style={[styles.pageTitle, { color: c.text }]}>{t.emergency}</Text>
            <EmergencySOSButton />
            <View style={[styles.infoCard, { backgroundColor: "rgba(255,107,26,0.08)", borderColor: "rgba(255,107,26,0.2)" }]}>
              <Ionicons name="information-circle" size={20} color={Colors.dark.tint} />
              <Text style={[styles.infoText, { color: c.textSecondary }]}>{infoText}</Text>
            </View>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: c.text }]}>{t.emergencyContacts}</Text>
              <Text style={[styles.contactCount, { color: c.textSecondary }]}>
                {settings.emergencyContacts.length}/{features.contactLimit === Infinity ? "∞" : features.contactLimit}
              </Text>
            </View>
          </>
        }
        ListFooterComponent={
          <Button label={`+ ${t.addContact}`} onPress={handleAddPress} variant="secondary" style={{ marginTop: 8 }} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={40} color={c.textTertiary} />
            <Text style={[styles.emptyText, { color: c.textSecondary }]}>{t.noContacts}</Text>
            <Text style={[styles.emptySubText, { color: c.textTertiary }]}>{t.noContactsSub}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <ContactItem contact={item} onRemove={() => handleRemove(item.id)} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />

      <AddContactModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={(name, phone) => addContact({ name, phone })}
        t={t}
      />
      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} featureName={t.emergencyContacts} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: 20, gap: 12 },
  pageTitle: { fontSize: 30, fontFamily: "Inter_700Bold", marginBottom: 4 },
  infoCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  contactCount: { fontSize: 14, fontFamily: "Inter_500Medium" },
  contactCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.dark.tint },
  contactInfo: { flex: 1, gap: 3 },
  contactName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  contactPhone: { fontSize: 13, fontFamily: "Inter_400Regular" },
  removeBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", gap: 8, paddingVertical: 32 },
  emptyText: { fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptySubText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  modalContainer: { flex: 1, padding: 24, paddingTop: 12, gap: 12 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  modalTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  modalSub: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 8 },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, fontFamily: "Inter_400Regular" },
});
