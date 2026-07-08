import { useState, type CSSProperties } from "react";
import { Badge, Box, Heading, HStack, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import {
  useCreateMobileArtifactMutation,
  useDeleteMobileArtifactMutation,
  useGetMobileArtifactsQuery,
  useUpdateMobileArtifactMutation,
  type MobileArtifact,
  type MobileArtifactInput,
} from "@/entities/devops/api/devOpsInfoApi";
import { useLanguage } from "@/features/language/model";
import Button from "@/shared/ui/primitives/Button";

const copy = {
  en: {
    title: "Mobile App Artifact", help: "Upload or reference the mobile app once for all assigned testers.",
    referenceOnly: "File upload is not configured for project artifacts yet. Use an existing file reference or HTTPS download URL.",
    add: "Add mobile artifact", empty: "No mobile artifact has been added.", edit: "Edit", remove: "Delete",
    name: "Artifact name", type: "Artifact type", platform: "Mobile platform", version: "Version",
    build: "Build number", fileRef: "Existing file reference", download: "Download URL", checksum: "Checksum",
    packageName: "Android package name", bundleId: "iOS bundle ID", minOs: "Minimum OS version",
    deviceNotes: "Device / build notes", installNotes: "Installation notes", save: "Save artifact", saving: "Saving...",
    cancel: "Cancel", loading: "Loading mobile artifacts...", loadError: "Could not load mobile artifacts.",
    actionError: "The mobile artifact could not be saved.", required: "Name and a file reference or valid HTTPS download URL are required.",
    confirm: "Delete this mobile artifact?", saved: "Mobile artifact saved.",
  },
  fa: {
    title: "فایل برنامه موبایل", help: "فایل یا مرجع برنامه موبایل را یک‌بار برای همه تسترهای تخصیص‌یافته ثبت کنید.",
    referenceOnly: "آپلود فایل پروژه هنوز پیکربندی نشده است. از مرجع فایل موجود یا پیوند HTTPS استفاده کنید.",
    add: "افزودن فایل موبایل", empty: "هنوز فایل موبایلی ثبت نشده است.", edit: "ویرایش", remove: "حذف",
    name: "نام فایل", type: "نوع فایل", platform: "پلتفرم موبایل", version: "نسخه",
    build: "شماره بیلد", fileRef: "مرجع فایل موجود", download: "پیوند دریافت", checksum: "Checksum",
    packageName: "نام پکیج اندروید", bundleId: "Bundle ID آی‌اواس", minOs: "حداقل نسخه سیستم‌عامل",
    deviceNotes: "یادداشت دستگاه / بیلد", installNotes: "راهنمای نصب", save: "ذخیره فایل", saving: "در حال ذخیره...",
    cancel: "انصراف", loading: "در حال بارگذاری فایل‌های موبایل...", loadError: "بارگذاری فایل‌های موبایل انجام نشد.",
    actionError: "ذخیره فایل موبایل انجام نشد.", required: "نام و مرجع فایل یا پیوند معتبر HTTPS الزامی است.",
    confirm: "این فایل موبایل حذف شود؟", saved: "فایل موبایل ذخیره شد.",
  },
} as const;

const control = { width: "100%", border: "1px solid var(--apple-border)", borderRadius: 10, background: "var(--apple-surface-raised)", color: "var(--apple-text)", padding: "10px 12px", fontSize: 14, outline: "none" } satisfies CSSProperties;
const emptyArtifact = (): MobileArtifactInput => ({ artifactType: "apk", name: "", version: "", platform: "android", fileRef: "", downloadUrl: "", checksum: "", buildNumber: "", packageName: "", bundleId: "", minOsVersion: "", deviceNotes: "", installNotes: "" });

export default function MobileArtifactsSection({ projectId }: { projectId: string }) {
  const { language } = useLanguage();
  const l = copy[language];
  const { data = [], isLoading, error } = useGetMobileArtifactsQuery(projectId);
  const [create, createState] = useCreateMobileArtifactMutation();
  const [update, updateState] = useUpdateMobileArtifactMutation();
  const [remove, removeState] = useDeleteMobileArtifactMutation();
  const [draft, setDraft] = useState<MobileArtifactInput>(emptyArtifact);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const busy = createState.isLoading || updateState.isLoading || removeState.isLoading;
  const close = () => { setOpen(false); setEditingId(null); setDraft(emptyArtifact()); setFormError(""); };
  const edit = (item: MobileArtifact) => { const { artifactType, name, version, platform, fileRef, downloadUrl, checksum, buildNumber, packageName, bundleId, minOsVersion, deviceNotes, installNotes } = item; setDraft({ artifactType, name, version, platform, fileRef, downloadUrl, checksum, buildNumber, packageName, bundleId, minOsVersion, deviceNotes, installNotes }); setEditingId(item._id); setOpen(true); setMessage(""); };
  const validReferences = () => { try { if (draft.downloadUrl) { const url = new URL(draft.downloadUrl); if (url.protocol !== "https:" || url.username || url.password) return false; } if (draft.fileRef) { try { const ref = new URL(draft.fileRef); if (ref.username || ref.password) return false; } catch { /* Local/reference identifiers are allowed. */ } } return true; } catch { return false; } };
  const save = async () => { if (!draft.name.trim() || (!draft.fileRef && !draft.downloadUrl) || !validReferences()) return setFormError(l.required); try { if (editingId) await update({ projectId, artifactId: editingId, body: draft }).unwrap(); else await create({ projectId, body: draft }).unwrap(); close(); setMessage(l.saved); } catch { setFormError(l.actionError); } };
  const deleteItem = async (id: string) => { if (!window.confirm(l.confirm)) return; try { await remove({ projectId, artifactId: id }).unwrap(); } catch { setFormError(l.actionError); } };
  const set = <K extends keyof MobileArtifactInput>(key: K, value: MobileArtifactInput[K]) => setDraft((current) => ({ ...current, [key]: value }));

  return <Box bg="var(--apple-surface-raised)" border="1px solid var(--apple-border)" borderRadius="xl" p={{ base: 5, md: 7 }} boxShadow="var(--surface-shadow)">
    <HStack justify="space-between" align="start" gap={4} flexWrap="wrap"><Box><Heading size="md">{l.title}</Heading><Text mt={2} color="var(--apple-muted)">{l.help}</Text></Box><Button onClick={() => { close(); setOpen(true); }}>{l.add}</Button></HStack>
    <Text mt={4} p={3} borderRadius="md" bg="var(--apple-warning-bg)" color="var(--apple-warning-text)" fontSize="sm">{l.referenceOnly}</Text>
    {open && <Box mt={5} p={4} border="1px solid var(--apple-border-soft)" borderRadius="lg" bg="var(--apple-surface-subtle)"><SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={3}>
      <label><Text mb={1} fontSize="xs" fontWeight="800">{l.name}</Text><input style={control} value={draft.name} onChange={(e) => set("name", e.target.value)} /></label>
      <label><Text mb={1} fontSize="xs" fontWeight="800">{l.type}</Text><select style={control} value={draft.artifactType} onChange={(e) => set("artifactType", e.target.value as MobileArtifactInput["artifactType"])}><option value="apk">APK</option><option value="ipa">IPA</option><option value="file">File</option><option value="download_url">Download URL</option></select></label>
      <label><Text mb={1} fontSize="xs" fontWeight="800">{l.platform}</Text><select style={control} value={draft.platform} onChange={(e) => set("platform", e.target.value as MobileArtifactInput["platform"])}><option value="android">Android</option><option value="ios">iOS</option><option value="both">Android + iOS</option><option value="other">Other</option></select></label>
      <label><Text mb={1} fontSize="xs" fontWeight="800">{l.version}</Text><input dir="ltr" style={control} value={draft.version} onChange={(e) => set("version", e.target.value)} /></label>
      <label><Text mb={1} fontSize="xs" fontWeight="800">{l.build}</Text><input dir="ltr" style={control} value={draft.buildNumber} onChange={(e) => set("buildNumber", e.target.value)} /></label>
      <label><Text mb={1} fontSize="xs" fontWeight="800">{l.minOs}</Text><input dir="ltr" style={control} value={draft.minOsVersion} onChange={(e) => set("minOsVersion", e.target.value)} /></label>
      <label><Text mb={1} fontSize="xs" fontWeight="800">{l.fileRef}</Text><input dir="ltr" style={control} value={draft.fileRef} onChange={(e) => set("fileRef", e.target.value)} /></label>
      <label><Text mb={1} fontSize="xs" fontWeight="800">{l.download}</Text><input dir="ltr" style={control} value={draft.downloadUrl} onChange={(e) => set("downloadUrl", e.target.value)} /></label>
      <label><Text mb={1} fontSize="xs" fontWeight="800">{l.checksum}</Text><input dir="ltr" style={control} value={draft.checksum} onChange={(e) => set("checksum", e.target.value)} /></label>
      <label><Text mb={1} fontSize="xs" fontWeight="800">{l.packageName}</Text><input dir="ltr" style={control} value={draft.packageName} onChange={(e) => set("packageName", e.target.value)} /></label>
      <label><Text mb={1} fontSize="xs" fontWeight="800">{l.bundleId}</Text><input dir="ltr" style={control} value={draft.bundleId} onChange={(e) => set("bundleId", e.target.value)} /></label>
      <label><Text mb={1} fontSize="xs" fontWeight="800">{l.deviceNotes}</Text><textarea style={{ ...control, minHeight: 80 }} value={draft.deviceNotes} onChange={(e) => set("deviceNotes", e.target.value)} /></label>
      <label><Text mb={1} fontSize="xs" fontWeight="800">{l.installNotes}</Text><textarea style={{ ...control, minHeight: 80 }} value={draft.installNotes} onChange={(e) => set("installNotes", e.target.value)} /></label>
    </SimpleGrid>{formError && <Text mt={2} color="var(--apple-danger-text)" fontSize="sm">{formError}</Text>}<HStack justify="end" mt={3}><Button variant="secondary" onClick={close} disabled={busy}>{l.cancel}</Button><Button onClick={save} disabled={busy}>{busy ? l.saving : l.save}</Button></HStack></Box>}
    {message && <Text mt={4} color="var(--apple-success-text)" fontSize="sm" fontWeight="750">{message}</Text>}
    {!open && formError && <Text mt={4} color="var(--apple-danger-text)" fontSize="sm">{formError}</Text>}
    <Box mt={5}>{isLoading ? <Text color="var(--apple-muted)">{l.loading}</Text> : error ? <Text color="var(--apple-danger-text)">{l.loadError}</Text> : data.length === 0 ? <Box p={7} textAlign="center" border="1px dashed var(--apple-border)" borderRadius="lg"><Text color="var(--apple-muted)">{l.empty}</Text></Box> : <SimpleGrid columns={{ base: 1, xl: 2 }} gap={3}>{data.map((item) => <Box key={item._id} p={4} border="1px solid var(--apple-border-soft)" borderRadius="lg"><HStack justify="space-between"><Box><Text fontWeight="850">{item.name}</Text><Text fontSize="xs" color="var(--apple-muted)" dir="ltr">{item.version || item.buildNumber || "-"}</Text></Box><Badge colorPalette="blue">{item.artifactType.toUpperCase()}</Badge></HStack><Text mt={2} fontSize="xs" color="var(--apple-muted)" dir="ltr">{item.downloadUrl || item.fileRef}</Text><HStack justify="end" mt={3}><Button variant="secondary" onClick={() => edit(item)}>{l.edit}</Button><Button variant="secondary" onClick={() => deleteItem(item._id)} disabled={busy}>{l.remove}</Button></HStack></Box>)}</SimpleGrid>}</Box>
  </Box>;
}
