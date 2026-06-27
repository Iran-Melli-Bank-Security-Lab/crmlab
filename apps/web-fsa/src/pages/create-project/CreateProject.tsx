import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Box,
  chakra,
  Flex,
  Heading,
  HStack,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import Button from "@/shared/ui/primitives/Button";
import Input from "@/shared/ui/primitives/Input";
import { useLanguage } from "@/features/language/model";
import { useCreateProjectMutation } from "@/entities/project/api/projectsApi";
import { useGetUsersQuery } from "@/entities/user/api/usersApi";
import { getApiErrorMessage } from "@/shared/lib/getApiErrorMessage";
import type {
  CertificateAuthority,
  ProjectPlatform,
  ProjectType,
  User,
} from "@/shared/types";
import type { CreateProjectRequest } from "@/shared/types/api/projects";

type FormState = {
  name: string;
  version: string;
  letterNumber: string;
  type: ProjectType;
  platform: ProjectPlatform;
  certificateRequired: boolean;
  authorities: CertificateAuthority[];
  projectManagerId: string;
  devopsManagerId: string;
  testEndDate: string;
};

const initialForm: FormState = {
  name: "",
  version: "",
  letterNumber: "",
  type: "security",
  platform: "web",
  certificateRequired: false,
  authorities: ["bank"],
  projectManagerId: "",
  devopsManagerId: "",
  testEndDate: "",
};

const copy = {
  en: {
    eyebrow: "ADMIN WORKSPACE",
    title: "Create a new project",
    description:
      "Configure the project, certification path, and accountable leaders in one guided flow.",
    adminOnly: "Admin only",
    cancel: "Cancel",
    create: "Create project",
    creating: "Creating project...",
    success: "Project created successfully",
    error: "Project could not be created",
    required: "Complete all required fields and manager assignments.",
    step1: "Project profile",
    step1Hint: "Core identifiers and delivery surface",
    step2: "Certification",
    step2Hint: "Select the required issuing authorities",
    step3: "Leadership",
    step3Hint: "Assign accountable project owners",
    step4: "Timeline",
    step4Hint: "Define the testing expiration date",
    name: "Project name",
    namePlaceholder: "e.g. Atlas Internet Banking",
    version: "Project version",
    versionPlaceholder: "e.g. 2.4.0",
    letterNumber: "Letter number",
    letterPlaceholder: "e.g. SEC-1405-0182",
    projectType: "Project type",
    security: "Security",
    securityHint: "Penetration testing and security review",
    quality: "Quality assurance",
    qualityHint: "Functional and quality validation",
    platform: "Project platform",
    web: "Web",
    mobile: "Mobile",
    desktop: "Desktop",
    noCertificate: "No certificate issuance",
    noCertificateHint: "Testing and delivery without an external certificate",
    certificate: "Certificate issuance",
    certificateHint: "Prepare the project for selected certification authorities",
    bank: "Bank",
    bankHint: "Selected by default",
    afta: "AFTA",
    aftaHint: "Information technology security authority",
    standards: "National Standards Organization",
    standardsHint: "Standards certification package",
    securityManager: "Security manager",
    qualityManager: "Quality manager",
    devopsManager: "DevOps manager",
    securityManagerHint: "Pentesters and security project managers",
    qualityManagerHint: "QA members and quality project managers",
    devopsManagerHint: "Users assigned to the DevOps role",
    search: "Search by name or username...",
    active: "Active",
    inactive: "Inactive",
    unavailable: "No eligible users found",
    loadingUsers: "Loading eligible users...",
    selected: "Selected",
    testEndDate: "Test end date",
    testEndDateHint: "The project testing access expires at the end of this date.",
    summary: "Launch summary",
    summaryProject: "Project",
    summaryCertification: "Certification",
    summaryManagers: "Managers assigned",
    summaryExpiry: "Test expiry",
    notSet: "Not set",
    certificates: "authorities",
    none: "None",
  },
  fa: {
    eyebrow: "فضای کاری مدیر",
    title: "ایجاد پروژه جدید",
    description:
      "مشخصات پروژه، مسیر صدور گواهی و مدیران مسئول را در یک فرایند یکپارچه تعیین کنید.",
    adminOnly: "ویژه مدیر سیستم",
    cancel: "انصراف",
    create: "ایجاد پروژه",
    creating: "در حال ایجاد پروژه...",
    success: "پروژه با موفقیت ایجاد شد",
    error: "ایجاد پروژه انجام نشد",
    required: "تمام فیلدهای ضروری و مدیران پروژه را تکمیل کنید.",
    step1: "مشخصات پروژه",
    step1Hint: "شناسه‌های اصلی و بستر ارائه",
    step2: "صدور گواهی",
    step2Hint: "مراجع صادرکننده مورد نیاز را انتخاب کنید",
    step3: "تعیین مدیران",
    step3Hint: "مسئولان اصلی پروژه را مشخص کنید",
    step4: "زمان‌بندی",
    step4Hint: "تاریخ انقضای تست را تعیین کنید",
    name: "نام پروژه",
    namePlaceholder: "برای مثال بانکداری اینترنتی اطلس",
    version: "نسخه پروژه",
    versionPlaceholder: "برای مثال 2.4.0",
    letterNumber: "شماره نامه",
    letterPlaceholder: "برای مثال SEC-1405-0182",
    projectType: "نوع پروژه",
    security: "امنیت",
    securityHint: "تست نفوذ و ارزیابی امنیتی",
    quality: "تضمین کیفیت",
    qualityHint: "اعتبارسنجی عملکرد و کیفیت",
    platform: "پلتفرم پروژه",
    web: "وب",
    mobile: "موبایل",
    desktop: "دسکتاپ",
    noCertificate: "بدون صدور گواهی",
    noCertificateHint: "تست و تحویل بدون گواهی خارجی",
    certificate: "صدور گواهی",
    certificateHint: "آماده‌سازی پروژه برای مراجع انتخاب‌شده",
    bank: "بانک",
    bankHint: "به صورت پیش‌فرض انتخاب شده",
    afta: "افتا",
    aftaHint: "مرجع امنیت فناوری اطلاعات",
    standards: "سازمان ملی استاندارد",
    standardsHint: "بسته گواهی استاندارد",
    securityManager: "مدیر امنیت",
    qualityManager: "مدیر کیفیت",
    devopsManager: "مدیر دواپس",
    securityManagerHint: "کاربران تست نفوذ و مدیران پروژه امنیت",
    qualityManagerHint: "کاربران تضمین کیفیت و مدیران پروژه کیفیت",
    devopsManagerHint: "کاربران دارای نقش دواپس",
    search: "جستجو با نام یا نام کاربری...",
    active: "فعال",
    inactive: "غیرفعال",
    unavailable: "کاربر واجد شرایطی پیدا نشد",
    loadingUsers: "در حال دریافت کاربران...",
    selected: "انتخاب شده",
    testEndDate: "تاریخ پایان تست",
    testEndDateHint: "دسترسی تست پروژه در پایان این تاریخ منقضی می‌شود.",
    summary: "خلاصه ایجاد",
    summaryProject: "پروژه",
    summaryCertification: "گواهی",
    summaryManagers: "مدیر انتخاب‌شده",
    summaryExpiry: "انقضای تست",
    notSet: "تعیین نشده",
    certificates: "مرجع",
    none: "بدون گواهی",
  },
} as const;

function Section({
  number,
  title,
  hint,
  children,
}: {
  number: string;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <Box
      bg="var(--apple-surface-raised)"
      border="1px solid"
      borderColor="var(--apple-border)"
      borderRadius="md"
      overflow="hidden"
      boxShadow="var(--surface-shadow)"
      backdropFilter="blur(18px)"
    >
      <Flex
        align="center"
        gap={4}
        px={{ base: 5, md: 7 }}
        py={5}
        borderBottom="1px solid"
        borderColor="var(--apple-border-soft)"
        bg="var(--apple-surface-subtle)"
      >
        <Flex
          w="42px"
          h="42px"
          borderRadius="md"
          bg="var(--apple-text)"
          color="var(--apple-surface)"
          align="center"
          justify="center"
          fontWeight="800"
        >
          {number}
        </Flex>
        <Box>
          <Heading as="h2" size="md">
            {title}
          </Heading>
          <Text color="var(--apple-muted)" fontSize="sm" mt={1}>
            {hint}
          </Text>
        </Box>
      </Flex>
      <Box p={{ base: 5, md: 7 }}>{children}</Box>
    </Box>
  );
}

function ChoiceCard({
  selected,
  title,
  hint,
  onClick,
  compact = false,
}: {
  selected: boolean;
  title: string;
  hint?: string;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <chakra.button
      type="button"
      onClick={onClick}
      textAlign="start"
      w="100%"
      p={compact ? 4 : 5}
      border="1px solid"
      borderColor={selected ? "var(--apple-blue-border-strong)" : "var(--apple-border)"}
      bg={selected ? "var(--apple-blue-soft)" : "var(--apple-surface)"}
      borderRadius="md"
      transition="all .18s ease"
      _hover={{
        borderColor: selected ? "var(--apple-blue-border-strong)" : "var(--apple-border)",
        boxShadow: "0 4px 14px var(--apple-border-soft)",
      }}
      aria-pressed={selected}
    >
      <Flex align="start" justify="space-between" gap={3}>
        <Box>
          <Text fontWeight="800" color={selected ? "var(--apple-blue)" : "var(--apple-text)"}>
            {title}
          </Text>
          {hint && (
            <Text color="var(--apple-muted)" fontSize="sm" mt={1}>
              {hint}
            </Text>
          )}
        </Box>
        <Flex
          flex="0 0 auto"
          w="22px"
          h="22px"
          borderRadius="full"
          border="2px solid"
          borderColor={selected ? "var(--apple-blue)" : "var(--apple-border)"}
          align="center"
          justify="center"
        >
          {selected && <Box w="10px" h="10px" borderRadius="full" bg="var(--apple-blue)" />}
        </Flex>
      </Flex>
    </chakra.button>
  );
}

function getUserDisplayName(user: User) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return user.name?.trim() || fullName || user.username?.trim() || user.id;
}

function getUserInitials(user: User) {
  return getUserDisplayName(user)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function UserPicker({
  title,
  hint,
  users,
  value,
  onChange,
  loading,
  labels,
}: {
  title: string;
  hint: string;
  users: User[];
  value: string;
  onChange: (id: string) => void;
  loading: boolean;
  labels: typeof copy.en | typeof copy.fa;
}) {
  const [search, setSearch] = useState("");
  const visibleUsers = users.filter((user) =>
    `${getUserDisplayName(user)} ${user.username || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <Box
      border="1px solid"
      borderColor="var(--apple-border)"
      borderRadius="md"
      p={5}
      bg="var(--apple-surface-subtle)"
    >
      <Text fontWeight="800" fontSize="lg">
        {title}
      </Text>
      <Text color="var(--apple-muted)" fontSize="sm" mt={1} mb={4}>
        {hint}
      </Text>
      <Input
        aria-label={`${title} search`}
        placeholder={labels.search}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        bg="var(--apple-surface)"
      />
      <VStack align="stretch" gap={2} mt={4} maxH="310px" overflowY="auto">
        {loading && (
          <Flex align="center" gap={3} color="var(--apple-muted)" py={5} justify="center">
            <Spinner size="sm" />
            {labels.loadingUsers}
          </Flex>
        )}
        {!loading && visibleUsers.length === 0 && (
          <Text color="var(--apple-muted)" textAlign="center" py={5}>
            {labels.unavailable}
          </Text>
        )}
        {visibleUsers.map((user) => {
          const displayName = getUserDisplayName(user);
          const selected = value === user.id;
          const active = user.status !== "Inactive";
          return (
            <chakra.button
              type="button"
              key={user.id}
              disabled={!active}
              onClick={() => onChange(user.id)}
              display="flex"
              width="100%"
              alignItems="center"
              gap={3}
              textAlign="start"
              p={3}
              border="1px solid"
              borderColor={
                selected ? "var(--apple-blue-border-strong)" : "var(--apple-border)"
              }
              bg={selected ? "var(--apple-blue-soft)" : "var(--apple-surface)"}
              borderRadius="md"
              opacity={active ? 1 : 0.55}
              cursor={active ? "pointer" : "not-allowed"}
              _hover={active ? { borderColor: "var(--apple-blue-border)" } : undefined}
            >
              <Flex
                flex="0 0 auto"
                w="44px"
                h="44px"
                borderRadius="md"
                bg={selected ? "var(--apple-blue)" : "var(--apple-text)"}
                color="var(--apple-surface)"
                align="center"
                justify="center"
                fontWeight="800"
              >
                {getUserInitials(user)}
              </Flex>
              <Box minW={0} flex="1">
                <Text fontWeight="800" lineClamp={1}>
                  {displayName}
                </Text>
                <Text fontSize="sm" color="var(--apple-muted)" lineClamp={1}>
                  @{user.username || user.id}
                </Text>
              </Box>
              <Box
                px={2.5}
                py={1}
                borderRadius="full"
                fontSize="xs"
                fontWeight="800"
                bg={active ? "var(--apple-success-bg)" : "var(--apple-surface-hover)"}
                color={active ? "var(--apple-success-text)" : "var(--apple-muted)"}
              >
                {selected ? labels.selected : active ? labels.active : labels.inactive}
              </Box>
            </chakra.button>
          );
        })}
      </VStack>
    </Box>
  );
}

type UserRole = User["roles"][number];

function userHasRole(user: User, role: UserRole) {
  return Array.isArray(user.roles) && user.roles.includes(role);
}

function isAssignableNonAdminUser(user: User) {
  return user.status !== "Inactive" && !userHasRole(user, "admin");
}

function isSecurityManagerCandidate(user: User) {
  return isAssignableNonAdminUser(user) && userHasRole(user, "pentester");
}

function isQualityManagerCandidate(user: User) {
  return isAssignableNonAdminUser(user) && userHasRole(user, "qa");
}

function isDevOpsManagerCandidate(user: User) {
  return isAssignableNonAdminUser(user) && userHasRole(user, "devops");
}

export default function CreateProject() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const labels = copy[language];
  const [form, setForm] = useState<FormState>(initialForm);
  const { data: users = [], isLoading: usersLoading } = useGetUsersQuery();
  const [createProject, { isLoading: isCreating }] = useCreateProjectMutation();

const disciplineUsers = useMemo(() => {
  if (form.type === "security") {
    return users.filter(isSecurityManagerCandidate);
  }

  return users.filter(isQualityManagerCandidate);
}, [form.type, users]);

const devopsUsers = useMemo(
  () => users.filter(isDevOpsManagerCandidate),
  [users]
);


  const update = <Key extends keyof FormState>(key: Key, value: FormState[Key]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const selectType = (type: ProjectType) =>
    setForm((current) => ({ ...current, type, projectManagerId: "" }));
  const toggleAuthority = (authority: CertificateAuthority) =>
    setForm((current) => ({
      ...current,
      authorities: current.authorities.includes(authority)
        ? current.authorities.filter((item) => item !== authority)
        : [...current.authorities, authority],
    }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (
      !form.name.trim() ||
      !form.version.trim() ||
      !form.letterNumber.trim() ||
      !form.projectManagerId ||
      !form.devopsManagerId ||
      !form.testEndDate ||
      (form.certificateRequired && form.authorities.length === 0)
    ) {
      toast.error(labels.required);
      return;
    }

    try {
      const payload: CreateProjectRequest = {
        projectName: form.name.trim(),
        sourceProjectId: searchParams.get("sourceProjectId") || undefined,
        projectGroupId: searchParams.get("projectGroupId") || undefined,
        version: form.version.trim(),
        letterNumber: form.letterNumber.trim(),
        type: form.type,
        platform: form.platform,
        certificateRequired: form.certificateRequired,
        certificateAuthorities: form.certificateRequired ? form.authorities : [],
        projectManagerId: form.projectManagerId,
        devopsManagerId: form.devopsManagerId,
        testEndDate: form.testEndDate,
      };

      await createProject(payload).unwrap();
      toast.success(labels.success);
      navigate("/projects");
    } catch (error) {
      toast.error(getApiErrorMessage(error, labels.error));
    }
  };

  const minDate = new Date().toISOString().slice(0, 10);
  const managerCount =
    Number(Boolean(form.projectManagerId)) + Number(Boolean(form.devopsManagerId));

  return (
    <Box maxW="1440px" mx="auto">
      <Flex mb={7} justify="space-between" align="start" gap={5} flexWrap="wrap">
        <Box>
          <HStack gap={3} mb={3}>
            <Text color="var(--apple-blue)" fontSize="xs" letterSpacing="0" fontWeight="900">
              {labels.eyebrow}
            </Text>
            <Box
              bg="var(--apple-blue-soft)"
              color="var(--apple-blue)"
              px={2.5}
              py={1}
              borderRadius="full"
              fontSize="xs"
              fontWeight="800"
            >
              {labels.adminOnly}
            </Box>
          </HStack>
          <Heading size={{ base: "2xl", md: "3xl" }} letterSpacing="0">
            {labels.title}
          </Heading>
          <Text color="var(--apple-muted)" mt={3} maxW="720px" fontSize={{ base: "md", md: "lg" }}>
            {labels.description}
          </Text>
        </Box>
        <Button variant="secondary" onClick={() => navigate("/projects")}>
          {labels.cancel}
        </Button>
      </Flex>

      <form onSubmit={handleSubmit}>
        <SimpleGrid columns={{ base: 1, xl: 3 }} gap={6} alignItems="start">
          <VStack align="stretch" gap={6} gridColumn={{ xl: "span 2" }}>
            <Section number="01" title={labels.step1} hint={labels.step1Hint}>
              <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
                <Input
                  label={labels.name}
                  placeholder={labels.namePlaceholder}
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                  required
                />
                <Input
                  label={labels.version}
                  placeholder={labels.versionPlaceholder}
                  value={form.version}
                  onChange={(event) => update("version", event.target.value)}
                  required
                />
                <Input
                  label={labels.letterNumber}
                  placeholder={labels.letterPlaceholder}
                  value={form.letterNumber}
                  onChange={(event) => update("letterNumber", event.target.value)}
                  required
                />
              </SimpleGrid>
              <Text fontWeight="800" mt={7} mb={3}>
                {labels.projectType}
              </Text>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                <ChoiceCard
                  selected={form.type === "security"}
                  title={labels.security}
                  hint={labels.securityHint}
                  onClick={() => selectType("security")}
                />
                <ChoiceCard
                  selected={form.type === "quality"}
                  title={labels.quality}
                  hint={labels.qualityHint}
                  onClick={() => selectType("quality")}
                />
              </SimpleGrid>
              <Text fontWeight="800" mt={7} mb={3}>
                {labels.platform}
              </Text>
              <SimpleGrid columns={{ base: 1, sm: 3 }} gap={3}>
                {(["web", "mobile", "desktop"] as ProjectPlatform[]).map((platform) => (
                  <ChoiceCard
                    key={platform}
                    compact
                    selected={form.platform === platform}
                    title={labels[platform]}
                    onClick={() => update("platform", platform)}
                  />
                ))}
              </SimpleGrid>
            </Section>

            <Section number="02" title={labels.step2} hint={labels.step2Hint}>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                <ChoiceCard
                  selected={!form.certificateRequired}
                  title={labels.noCertificate}
                  hint={labels.noCertificateHint}
                  onClick={() => update("certificateRequired", false)}
                />
                <ChoiceCard
                  selected={form.certificateRequired}
                  title={labels.certificate}
                  hint={labels.certificateHint}
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      certificateRequired: true,
                      authorities: current.authorities.length
                        ? current.authorities
                        : ["bank"],
                    }))
                  }
                />
              </SimpleGrid>
              {form.certificateRequired && (
                <SimpleGrid columns={{ base: 1, md: 3 }} gap={3} mt={6}>
                  {(["bank", "afta", "standards"] as CertificateAuthority[]).map(
                    (authority) => (
                      <ChoiceCard
                        key={authority}
                        compact
                        selected={form.authorities.includes(authority)}
                        title={labels[authority]}
                        hint={
                          labels[
                            `${authority}Hint` as
                              | "bankHint"
                              | "aftaHint"
                              | "standardsHint"
                          ]
                        }
                        onClick={() => toggleAuthority(authority)}
                      />
                    )
                  )}
                </SimpleGrid>
              )}
            </Section>

            <Section number="03" title={labels.step3} hint={labels.step3Hint}>
              <SimpleGrid columns={{ base: 1, lg: 2 }} gap={5}>
                <UserPicker
                  title={
                    form.type === "security"
                      ? labels.securityManager
                      : labels.qualityManager
                  }
                  hint={
                    form.type === "security"
                      ? labels.securityManagerHint
                      : labels.qualityManagerHint
                  }
                  users={disciplineUsers}
                  value={form.projectManagerId}
                  onChange={(id) => update("projectManagerId", id)}
                  loading={usersLoading}
                  labels={labels}
                />
                <UserPicker
                  title={labels.devopsManager}
                  hint={labels.devopsManagerHint}
                  users={devopsUsers}
                  value={form.devopsManagerId}
                  onChange={(id) => update("devopsManagerId", id)}
                  loading={usersLoading}
                  labels={labels}
                />
              </SimpleGrid>
            </Section>

            <Section number="04" title={labels.step4} hint={labels.step4Hint}>
              <Box maxW="440px">
                <Input
                  type="date"
                  min={minDate}
                  label={labels.testEndDate}
                  value={form.testEndDate}
                  onChange={(event) => update("testEndDate", event.target.value)}
                  required
                />
                <Text color="var(--apple-muted)" fontSize="sm" mt={2}>
                  {labels.testEndDateHint}
                </Text>
              </Box>
            </Section>
          </VStack>

          <Box position={{ xl: "sticky" }} top={{ xl: "96px" }}>
            <Box
              bg="var(--apple-text)"
              color="var(--apple-surface)"
              borderRadius="md"
              p={6}
              boxShadow="0 24px 60px rgba(0, 0, 0, .18)"
              overflow="hidden"
              position="relative"
            >
              <Text
                fontSize="xs"
                color="#9fd0ff"
                fontWeight="900"
                letterSpacing="0"
              >
                {labels.summary}
              </Text>
              <Heading size="lg" mt={3} lineClamp={2}>
                {form.name || labels.notSet}
              </Heading>
              <VStack align="stretch" gap={4} mt={7}>
                <Flex justify="space-between" gap={4}>
                  <Text color="#a1a1a6">{labels.summaryProject}</Text>
                  <Text fontWeight="800" textAlign="end">
                    {labels[form.type]} / {labels[form.platform]}
                  </Text>
                </Flex>
                <Box h="1px" bg="whiteAlpha.200" />
                <Flex justify="space-between" gap={4}>
                  <Text color="#a1a1a6">{labels.summaryCertification}</Text>
                  <Text fontWeight="800" textAlign="end">
                    {form.certificateRequired
                      ? `${form.authorities.length} ${labels.certificates}`
                      : labels.none}
                  </Text>
                </Flex>
                <Box h="1px" bg="whiteAlpha.200" />
                <Flex justify="space-between" gap={4}>
                  <Text color="#a1a1a6">{labels.summaryManagers}</Text>
                  <Text fontWeight="800">{managerCount}/2</Text>
                </Flex>
                <Box h="1px" bg="whiteAlpha.200" />
                <Flex justify="space-between" gap={4}>
                  <Text color="#a1a1a6">{labels.summaryExpiry}</Text>
                  <Text fontWeight="800">{form.testEndDate || labels.notSet}</Text>
                </Flex>
              </VStack>
              <Button
                type="submit"
                w="100%"
                mt={7}
                size="lg"
                isLoading={isCreating}
                disabled={isCreating}
              >
                {isCreating ? labels.creating : labels.create}
              </Button>
              <Button
                type="button"
                variant="ghost"
                color="#d2d2d7"
                w="100%"
                mt={2}
                onClick={() => navigate("/projects")}
              >
                {labels.cancel}
              </Button>
            </Box>
          </Box>
        </SimpleGrid>
      </form>
    </Box>
  );
}
