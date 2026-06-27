import { useDispatch } from "react-redux";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Box, Heading, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import { loginSuccess } from "@/features/auth/model/authSlice";
import { useRegisterUserMutation } from "@/features/auth/api/authApi";
import { useLanguage } from "@/features/language/model";
import { useUploadFileMutation } from "@/shared/api/uploadApi";
import { getDashboardPathByPermissions } from "@/shared/lib/dashboard";
import Input from "@/shared/ui/primitives/Input";
import Button from "@/shared/ui/primitives/Button";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

type SignupFormValues = {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  avatar: any;
};

export default function Signup() {
  const { t } = useLanguage();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [uploadFile, { isLoading: isUploading }] = useUploadFileMutation();
  const [registerUser, { isLoading: isRegistering }] = useRegisterUserMutation();

  const signupSchema = useMemo(
    () =>
      z.object({
        firstName: z.string().min(2, t("auth.validation.firstNameMin")),
        lastName: z.string().min(2, t("auth.validation.lastNameMin")),
        username: z.string().min(3, t("auth.validation.usernameMin")),
        password: z.string().min(8, t("auth.validation.passwordMin", { count: 8 })),
        avatar: z
          .any()
          .refine((files) => files?.length === 1, t("auth.validation.avatarRequired"))
          .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, t("auth.validation.maxImageSize"))
          .refine(
            (files) => ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
            t("auth.validation.imageTypes")
          ),
      }),
    [t]
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { firstName: "", lastName: "", username: "", password: "" },
  });

  const onSubmit = async (values: SignupFormValues) => {
    try {
      const avatarFile = values.avatar[0];
      const uploadResponse = await uploadFile({ file: avatarFile }).unwrap();

      const response = await registerUser({
        firstName: values.firstName,
        lastName: values.lastName,
        username: values.username,
        password: values.password,
        avatarUrl: uploadResponse.url,
        avatarFileId: uploadResponse.fileId,
      }).unwrap();

      dispatch(loginSuccess(response));
      toast.success(t("auth.signup.success"));
      navigate(getDashboardPathByPermissions(response.user.permissions));
    } catch (error: any) {
      toast.error(error?.data?.message || t("auth.signup.error"));
    }
  };

  const isLoading = isUploading || isRegistering;

  return (
    <Box
      bg="var(--apple-surface-raised)"
      border="1px solid"
      borderColor="var(--apple-border)"
      borderRadius="md"
      boxShadow="var(--surface-shadow), 0 10px 28px var(--apple-border-soft)"
      p={{ base: 6, md: 8 }}
    >
      <VStack align="stretch" gap={6}>
        <Box>
          <Heading size="lg">{t("auth.signup.title")}</Heading>
          <Text color="var(--apple-muted)" mt={2}>
            {t("auth.signup.description")}
          </Text>
        </Box>

        <VStack as="form" onSubmit={handleSubmit(onSubmit)} align="stretch" gap={4}>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            <Input
              label={t("common.firstName")}
              autoComplete="given-name"
              {...register("firstName")}
              error={errors.firstName?.message}
            />
            <Input
              label={t("common.lastName")}
              autoComplete="family-name"
              {...register("lastName")}
              error={errors.lastName?.message}
            />
          </SimpleGrid>
          <Input
            label={t("common.username")}
            autoComplete="username"
            {...register("username")}
            error={errors.username?.message}
          />
          <Input
            label={t("common.password")}
            type="password"
            {...register("password")}
            error={errors.password?.message}
          />
          <Input
            label={t("common.avatarImage")}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            {...register("avatar")}
            error={errors.avatar?.message as string | undefined}
          />

          <Button type="submit" isLoading={isLoading} loadingText={t("auth.signup.loading")}>
            {t("auth.signup.submit")}
          </Button>
        </VStack>
      </VStack>
    </Box>
  );
}
