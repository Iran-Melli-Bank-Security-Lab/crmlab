import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Badge, Box, Heading, HStack, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import {
  emptyProjectDevOpsInfo,
  provisioningStatuses,
  useGetProjectDevOpsInfoQuery,
  useUpdateProjectDevOpsInfoMutation,
  type ProjectDevOpsInfoInput,
} from "@/entities/devops/api/devOpsInfoApi";
import { useLanguage } from "@/features/language/model";
import Button from "@/shared/ui/primitives/Button";
import ErrorState from "@/shared/ui/feedback/ErrorState";
import LoadingScreen from "@/shared/ui/feedback/LoadingScreen";
import DevOpsResourcesSection from "./DevOpsResourcesSection";
import DevOpsCredentialsSection from "./DevOpsCredentialsSection";
import MobileArtifactsSection from "./MobileArtifactsSection";

type SetupType =
  | "virtualized_environment"
  | "containerized_environment"
  | "external_client_environment"
  | "mobile_app"
  | "direct_installation"
  | "none"
  | "other";

const setupToDelivery: Record<SetupType, ProjectDevOpsInfoInput["deliveryMode"]> = {
  virtualized_environment: "ovf",
  containerized_environment: "docker",
  external_client_environment: "external_url",
  mobile_app: "mobile_files",
  direct_installation: "other",
  none: "none",
  other: "other",
};
const deliveryToSetup: Record<ProjectDevOpsInfoInput["deliveryMode"], SetupType> = {
  ovf: "virtualized_environment",
  docker: "containerized_environment",
  external_url: "external_client_environment",
  mobile_files: "mobile_app",
  none: "none",
  other: "other",
};
function setupFromBackend(info: ProjectDevOpsInfoInput): SetupType {
  return deliveryToSetup[info.deliveryMode];
}

const copy = {
  en: {
    title: "DevOps Setup", subtitle: "Prepare the project environment through one guided workflow.", project: "Project",
    steps: ["Setup Type", "Artifact / Source", "Environment / Instances", "Test Targets", "Access & Credentials", "Review & Save"],
    setupHelp: "How will testers receive and access this project environment?", artifactHelp: "Add the single source package or reference used to prepare the environment.",
    environmentHelp: "Record environment links and create only the runtime instances this setup needs.", targetsHelp: "Define exactly what testers should assess.",
    reviewHelp: "Review operational notes and save the overview. Resource and credential changes are saved in their own cards.",
    setupType: "Setup type", provisioning: "Provisioning status", artifactType: "Artifact type", artifactName: "Artifact name",
    version: "Version / build", location: "File or download reference", checksum: "Checksum", artifactNotes: "Build / device notes",
    environmentName: "Environment name", accessUrl: "Primary access URL", repositoryUrl: "Repository URL", branch: "Branch",
    pipelineUrl: "Pipeline URL", networkNotes: "Network / VPN / device notes", notes: "Operational notes", blockers: "Blockers",
    back: "Back", next: "Continue", save: "Save DevOps Setup", saving: "Saving...", cancel: "Reset changes",
    saved: "DevOps setup saved.", saveError: "Could not save DevOps setup.", invalidUrl: "URLs cannot contain embedded credentials.",
    completion: "Completion", platform: "Platform", status: "Project status", noArtifact: "This setup does not require a source artifact.",
    sharedMobile: "The mobile artifact is stored once at project level and shared with all assigned users.",
  },
  fa: {
    title: "راه‌اندازی DevOps", subtitle: "محیط پروژه را در یک فرایند مرحله‌به‌مرحله آماده کنید.", project: "پروژه",
    steps: ["نوع راه‌اندازی", "منبع / فایل", "محیط‌های اجرا", "اهداف آزمون", "دسترسی‌ها و احراز هویت", "بازبینی و ذخیره"],
    setupHelp: "تسترها چگونه محیط این پروژه را دریافت و استفاده می‌کنند؟", artifactHelp: "بسته یا مرجع اصلی مورد استفاده برای آماده‌سازی محیط را یک‌بار ثبت کنید.",
    environmentHelp: "پیوندهای محیط را ثبت کنید و فقط محیط‌های اجرایی موردنیاز را بسازید.", targetsHelp: "مواردی را که تسترها باید ارزیابی کنند دقیق مشخص کنید.",
    reviewHelp: "یادداشت‌های اجرایی را بازبینی و نمای کلی را ذخیره کنید. تغییرات محیط‌ها و اکانت‌ها داخل کارت خود ذخیره می‌شوند.",
    setupType: "نوع راه‌اندازی", provisioning: "وضعیت آماده‌سازی", artifactType: "نوع منبع", artifactName: "نام فایل یا منبع",
    version: "نسخه / بیلد", location: "فایل یا پیوند دریافت", checksum: "Checksum", artifactNotes: "یادداشت بیلد / دستگاه",
    environmentName: "نام محیط", accessUrl: "آدرس اصلی دسترسی", repositoryUrl: "آدرس مخزن", branch: "شاخه",
    pipelineUrl: "آدرس پایپ‌لاین", networkNotes: "یادداشت شبکه / VPN / دستگاه", notes: "یادداشت‌های اجرایی", blockers: "موانع",
    back: "قبلی", next: "ادامه", save: "ذخیره راه‌اندازی DevOps", saving: "در حال ذخیره...", cancel: "بازنشانی تغییرات",
    saved: "راه‌اندازی DevOps ذخیره شد.", saveError: "ذخیره راه‌اندازی انجام نشد.", invalidUrl: "اطلاعات ورود را داخل آدرس‌ها قرار ندهید.",
    completion: "تکمیل", platform: "پلتفرم", status: "وضعیت پروژه", noArtifact: "این نوع راه‌اندازی به فایل منبع نیاز ندارد.",
    sharedMobile: "فایل موبایل یک‌بار در سطح پروژه ثبت و برای همه کاربران تخصیص‌یافته استفاده می‌شود.",
  },
} as const;

const setupLabels = {
  en: { virtualized_environment: "Virtualized environment (OVF / OVA)", containerized_environment: "Containerized environment", external_client_environment: "External client environment", mobile_app: "Mobile application", direct_installation: "Direct installation", none: "No environment setup", other: "Other setup" },
  fa: { virtualized_environment: "محیط مجازی (OVF / OVA)", containerized_environment: "محیط کانتینری", external_client_environment: "محیط خارجی کارفرما", mobile_app: "برنامه موبایل", direct_installation: "نصب مستقیم", none: "بدون راه‌اندازی محیط", other: "سایر" },
} as const;
const valueLabels: Record<string, { en: string; fa: string }> = {
  not_started: { en: "Not started", fa: "شروع نشده" }, preparing: { en: "Preparing", fa: "در حال آماده‌سازی" }, partially_ready: { en: "Partially ready", fa: "تا حدی آماده" }, ready: { en: "Ready", fa: "آماده" }, blocked: { en: "Blocked", fa: "مسدود" }, failed: { en: "Failed", fa: "ناموفق" }, retired: { en: "Retired", fa: "خارج از سرویس" },
  empty: { en: "Empty", fa: "ثبت‌نشده" }, partial: { en: "Partial", fa: "ناقص" }, complete: { en: "Complete", fa: "کامل" },
  ovf: { en: "OVF / OVA package", fa: "بسته OVF / OVA" }, docker_image: { en: "Docker image", fa: "ایمیج داکر" }, docker_compose: { en: "Docker Compose", fa: "Docker Compose" }, apk: { en: "APK", fa: "فایل APK" }, ipa: { en: "IPA", fa: "فایل IPA" }, file: { en: "File / repository reference", fa: "فایل / مرجع مخزن" }, download_url: { en: "Download URL", fa: "پیوند دریافت" }, none: { en: "No artifact", fa: "بدون فایل" }, other: { en: "Other", fa: "سایر" },
};
const inputStyle = { width: "100%", border: "1px solid var(--apple-border)", borderRadius: 10, background: "var(--apple-surface-raised)", color: "var(--apple-text)", padding: "11px 13px", fontSize: 14, outline: "none" } satisfies CSSProperties;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <Box minW={0}><Text as="label" display="block" mb={1.5} fontSize="sm" fontWeight="800" color="var(--apple-secondary)">{label}</Text>{children}</Box>;
}
function Card({ title, help, children }: { title: string; help: string; children: ReactNode }) {
  return <Box bg="var(--apple-surface-raised)" border="1px solid var(--apple-border)" borderRadius="xl" p={{ base: 5, md: 7 }} boxShadow="var(--surface-shadow)"><Heading size="md">{title}</Heading><Text mt={2} mb={6} color="var(--apple-muted)" lineHeight="1.7">{help}</Text>{children}</Box>;
}
function embeddedCredentials(value: string) { if (!value) return false; try { const url = new URL(value); return Boolean(url.username || url.password); } catch { return false; } }

export default function DevOpsInfoSection({ projectId, projectName, projectPlatform, projectStatus, assignedUserIds }: { projectId: string; projectName: string; projectPlatform: string; projectStatus: string; assignedUserIds: string[] }) {
  const { language, dir } = useLanguage();
  const l = copy[language];
  const { data, error, isLoading } = useGetProjectDevOpsInfoQuery(projectId);
  const [saveInfo, { isLoading: isSaving }] = useUpdateProjectDevOpsInfoMutation();
  const [form, setForm] = useState<ProjectDevOpsInfoInput>(emptyProjectDevOpsInfo);
  const [setupType, setSetupType] = useState<SetupType>(projectPlatform.toLowerCase().includes("mobile") ? "mobile_app" : "none");
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const mobilePlatform = projectPlatform.toLowerCase().includes("mobile");

  useEffect(() => { if (!data) return; const resolvedSetup = !data.exists && mobilePlatform ? "mobile_app" : setupFromBackend(data); const sourceArtifact = !data.exists && resolvedSetup === "mobile_app" ? { ...data.sourceArtifact, type: "apk" as const } : data.sourceArtifact; setForm({ linkedDevOpsProjectId: data.linkedDevOpsProjectId, deliveryMode: setupToDelivery[resolvedSetup], provisioningStatus: data.provisioningStatus, sourceArtifact, environment: data.environment, notes: data.notes, blockers: data.blockers }); setSetupType(resolvedSetup); }, [data, mobilePlatform]);
  const artifactOptions = useMemo(() => setupType === "virtualized_environment" ? ["ovf"] : setupType === "containerized_environment" ? ["docker_image", "docker_compose"] : setupType === "mobile_app" ? ["apk", "ipa", "file", "download_url"] : setupType === "external_client_environment" ? ["none", "download_url"] : setupType === "direct_installation" ? ["file", "download_url"] : setupType === "other" ? ["none", "file", "download_url", "other"] : ["none"], [setupType]);
  const selectSetup = (value: SetupType) => { setSetupType(value); const options = value === "virtualized_environment" ? ["ovf"] : value === "containerized_environment" ? ["docker_image", "docker_compose"] : value === "mobile_app" ? ["apk", "ipa", "file", "download_url"] : value === "external_client_environment" ? ["none", "download_url"] : value === "direct_installation" ? ["file", "download_url"] : value === "other" ? ["none", "file", "download_url", "other"] : ["none"]; setForm((current) => ({ ...current, deliveryMode: setupToDelivery[value], sourceArtifact: { ...current.sourceArtifact, type: options.includes(current.sourceArtifact.type) ? current.sourceArtifact.type : options[0] as ProjectDevOpsInfoInput["sourceArtifact"]["type"] } })); };
  const reset = () => { if (data) { const resolvedSetup = !data.exists && mobilePlatform ? "mobile_app" : setupFromBackend(data); setForm({ linkedDevOpsProjectId: data.linkedDevOpsProjectId, deliveryMode: setupToDelivery[resolvedSetup], provisioningStatus: data.provisioningStatus, sourceArtifact: !data.exists && resolvedSetup === "mobile_app" ? { ...data.sourceArtifact, type: "apk" } : data.sourceArtifact, environment: data.environment, notes: data.notes, blockers: data.blockers }); setSetupType(resolvedSetup); } setMessage(""); setSaveError(""); };
  const save = async () => { setMessage(""); setSaveError(""); const urls = [form.sourceArtifact.location, form.environment.accessUrl, form.environment.repositoryUrl, form.environment.pipelineUrl]; if (urls.some(embeddedCredentials)) return setSaveError(l.invalidUrl); try { await saveInfo({ projectId, body: { ...form, deliveryMode: setupToDelivery[setupType] } }).unwrap(); setMessage(l.saved); } catch { setSaveError(l.saveError); } };
  if (isLoading) return <LoadingScreen text={language === "fa" ? "در حال آماده‌سازی فضای DevOps..." : "Loading DevOps setup..."} />;
  if (error) return <ErrorState title={l.saveError} error={error} />;
  const artifactLabel = (value: string) => valueLabels[value]?.[language] || value;
  const showInstances = setupType === "virtualized_environment" || setupType === "containerized_environment" || setupType === "direct_installation";
  const showBuildLinks = showInstances;

  return <VStack align="stretch" gap={5} dir={dir}>
    <Box p={{ base: 5, md: 7 }} borderRadius="xl" border="1px solid var(--apple-border)" bg="linear-gradient(135deg, var(--apple-surface-raised), var(--apple-blue-soft))">
      <Text color="var(--apple-blue)" fontSize="xs" fontWeight="900">{l.project}: {projectName}</Text><Heading mt={2} fontSize={{ base: "2xl", md: "3xl" }}>{l.title}</Heading><Text mt={2} color="var(--apple-secondary)">{l.subtitle}</Text>
      <HStack mt={4} gap={2} flexWrap="wrap"><Badge colorPalette="blue">{l.platform}: {projectPlatform || "-"}</Badge><Badge>{l.status}: {projectStatus}</Badge><Badge colorPalette={data?.completionStatus === "complete" ? "green" : "orange"}>{l.completion}: {artifactLabel(data?.completionStatus || "empty")}</Badge></HStack>
    </Box>
    <SimpleGrid columns={{ base: 2, md: 3, xl: 6 }} gap={2}>{l.steps.map((label, index) => <Box as="button" key={label} onClick={() => setStep(index)} textAlign="start" p={3} borderRadius="lg" border="1px solid" borderColor={step === index ? "var(--apple-blue-border)" : "var(--apple-border)"} bg={step === index ? "var(--apple-blue-soft)" : "var(--apple-surface-raised)"}><HStack><Box display="grid" placeItems="center" boxSize="6" borderRadius="full" bg={step === index ? "var(--apple-blue)" : "var(--apple-surface-hover)"} color={step === index ? "white" : "var(--apple-muted)"} fontSize="xs" fontWeight="900">{index + 1}</Box><Text fontSize="xs" fontWeight="850">{label}</Text></HStack></Box>)}</SimpleGrid>

    {step === 0 && <Card title={l.steps[0]} help={l.setupHelp}><SimpleGrid columns={{ base: 1, lg: 2 }} gap={3}>{(Object.keys(setupLabels.en) as SetupType[]).map((value) => <Box as="button" key={value} onClick={() => selectSetup(value)} textAlign="start" p={4} borderRadius="lg" border="1px solid" borderColor={setupType === value ? "var(--apple-blue-border)" : "var(--apple-border)"} bg={setupType === value ? "var(--apple-blue-soft)" : "var(--apple-surface-subtle)"}><Text fontWeight="850">{setupLabels[language][value]}</Text></Box>)}</SimpleGrid><Box mt={5} maxW="420px"><Field label={l.provisioning}><select style={inputStyle} value={form.provisioningStatus} onChange={(e) => setForm((v) => ({ ...v, provisioningStatus: e.target.value as ProjectDevOpsInfoInput["provisioningStatus"] }))}>{provisioningStatuses.map((value) => <option key={value} value={value}>{valueLabels[value]?.[language] || value}</option>)}</select></Field></Box></Card>}
    {step === 1 && (setupType === "mobile_app" ? <MobileArtifactsSection projectId={projectId} /> : <Card title={l.steps[1]} help={l.artifactHelp}>{setupType === "none" ? <Box p={6} textAlign="center" border="1px dashed var(--apple-border)" borderRadius="lg"><Text color="var(--apple-muted)">{l.noArtifact}</Text></Box> : <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}><Field label={l.artifactType}><select style={inputStyle} value={form.sourceArtifact.type} onChange={(e) => setForm((v) => ({ ...v, sourceArtifact: { ...v.sourceArtifact, type: e.target.value as ProjectDevOpsInfoInput["sourceArtifact"]["type"] } }))}>{artifactOptions.map((value) => <option key={value} value={value}>{artifactLabel(value)}</option>)}</select></Field><Field label={l.artifactName}><input style={inputStyle} value={form.sourceArtifact.name} onChange={(e) => setForm((v) => ({ ...v, sourceArtifact: { ...v.sourceArtifact, name: e.target.value } }))} /></Field><Field label={l.version}><input style={inputStyle} value={form.sourceArtifact.version} onChange={(e) => setForm((v) => ({ ...v, sourceArtifact: { ...v.sourceArtifact, version: e.target.value } }))} /></Field><Field label={l.location}><input dir="ltr" style={inputStyle} value={form.sourceArtifact.location} onChange={(e) => setForm((v) => ({ ...v, sourceArtifact: { ...v.sourceArtifact, location: e.target.value } }))} /></Field><Field label={l.checksum}><input dir="ltr" style={inputStyle} value={form.sourceArtifact.checksum} onChange={(e) => setForm((v) => ({ ...v, sourceArtifact: { ...v.sourceArtifact, checksum: e.target.value } }))} /></Field><Field label={l.artifactNotes}><textarea style={{ ...inputStyle, minHeight: 90 }} value={form.sourceArtifact.notes} onChange={(e) => setForm((v) => ({ ...v, sourceArtifact: { ...v.sourceArtifact, notes: e.target.value } }))} /></Field></SimpleGrid>}</Card>)}
    {step === 2 && <VStack align="stretch" gap={5}><Card title={l.steps[2]} help={l.environmentHelp}><SimpleGrid columns={{ base: 1, md: 2 }} gap={4}><Field label={l.environmentName}><input style={inputStyle} value={form.environment.environmentName} onChange={(e) => setForm((v) => ({ ...v, environment: { ...v.environment, environmentName: e.target.value } }))} /></Field><Field label={l.accessUrl}><input dir="ltr" style={inputStyle} value={form.environment.accessUrl} onChange={(e) => setForm((v) => ({ ...v, environment: { ...v.environment, accessUrl: e.target.value } }))} /></Field>{showBuildLinks && <><Field label={l.repositoryUrl}><input dir="ltr" style={inputStyle} value={form.environment.repositoryUrl} onChange={(e) => setForm((v) => ({ ...v, environment: { ...v.environment, repositoryUrl: e.target.value } }))} /></Field><Field label={l.branch}><input dir="ltr" style={inputStyle} value={form.environment.branch} onChange={(e) => setForm((v) => ({ ...v, environment: { ...v.environment, branch: e.target.value } }))} /></Field><Field label={l.pipelineUrl}><input dir="ltr" style={inputStyle} value={form.environment.pipelineUrl} onChange={(e) => setForm((v) => ({ ...v, environment: { ...v.environment, pipelineUrl: e.target.value } }))} /></Field></>}<Field label={l.networkNotes}><textarea style={{ ...inputStyle, minHeight: 90 }} value={form.environment.networkNotes} onChange={(e) => setForm((v) => ({ ...v, environment: { ...v.environment, networkNotes: e.target.value } }))} /></Field></SimpleGrid></Card>{showInstances && <DevOpsResourcesSection projectId={projectId} assignedUserIds={assignedUserIds} view="instances" />}</VStack>}
    {step === 3 && <VStack align="stretch" gap={5}><Card title={l.steps[3]} help={l.targetsHelp}><Text color="var(--apple-muted)" fontSize="sm">{setupLabels[language][setupType]}</Text></Card><DevOpsResourcesSection projectId={projectId} assignedUserIds={assignedUserIds} view="targets" /></VStack>}
    {step === 4 && <DevOpsCredentialsSection projectId={projectId} assignedUserIds={assignedUserIds} number={5} />}
    {step === 5 && <Card title={l.steps[5]} help={l.reviewHelp}><SimpleGrid columns={{ base: 1, md: 3 }} gap={3} mb={5}><Box p={3} bg="var(--apple-surface-subtle)" borderRadius="md"><Text fontSize="xs" color="var(--apple-muted)">{l.setupType}</Text><Text mt={1} fontWeight="850">{setupLabels[language][setupType]}</Text></Box><Box p={3} bg="var(--apple-surface-subtle)" borderRadius="md"><Text fontSize="xs" color="var(--apple-muted)">{l.provisioning}</Text><Text mt={1} fontWeight="850">{valueLabels[form.provisioningStatus]?.[language]}</Text></Box><Box p={3} bg="var(--apple-surface-subtle)" borderRadius="md"><Text fontSize="xs" color="var(--apple-muted)">{l.artifactType}</Text><Text mt={1} fontWeight="850">{artifactLabel(form.sourceArtifact.type)}</Text></Box></SimpleGrid><SimpleGrid columns={{ base: 1, md: 2 }} gap={4}><Field label={l.notes}><textarea style={{ ...inputStyle, minHeight: 130 }} value={form.notes} onChange={(e) => setForm((v) => ({ ...v, notes: e.target.value }))} /></Field><Field label={l.blockers}><textarea style={{ ...inputStyle, minHeight: 130 }} value={form.blockers} onChange={(e) => setForm((v) => ({ ...v, blockers: e.target.value }))} /></Field></SimpleGrid>{message && <Text mt={3} color="var(--apple-success-text)" fontWeight="750">{message}</Text>}{saveError && <Text mt={3} color="var(--apple-danger-text)" fontWeight="750">{saveError}</Text>}<HStack mt={5} justify="end"><Button variant="secondary" onClick={reset} disabled={isSaving}>{l.cancel}</Button><Button onClick={save} disabled={isSaving}>{isSaving ? l.saving : l.save}</Button></HStack></Card>}
    <HStack justify="space-between"><Button variant="secondary" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0}>{l.back}</Button>{step < 5 && <Button onClick={() => setStep((value) => Math.min(5, value + 1))}>{l.next}</Button>}</HStack>
  </VStack>;
}
