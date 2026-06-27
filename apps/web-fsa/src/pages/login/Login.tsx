import { useDispatch } from "react-redux";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Box, Heading, Text, VStack } from "@chakra-ui/react";
import { loginSuccess } from "@/features/auth/model/authSlice";
import { useLoginUserMutation } from "@/features/auth/api/authApi";
import { useLanguage } from "@/features/language/model";
import { getDashboardPathByPermissions } from "@/shared/lib/dashboard";
import Button from "@/shared/ui/primitives/Button";
import Input from "@/shared/ui/primitives/Input";
import type { ApiError, AuthResponse } from "@/shared/types";

type LoginFormValues = { username: string; password: string };
type LoginResponse = AuthResponse | { data?: AuthResponse };

const getAuthPayload = (response: LoginResponse): AuthResponse => {
  if ("user" in response && response.user) return response;
  if ("data" in response && response.data?.user) return response.data;
  throw new Error("Login response did not include a user");
};

export default function Login() {
  const { t } = useLanguage();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loginUser, { isLoading }] = useLoginUserMutation();

  const loginSchema = useMemo(
    () =>
      z.object({
        username: z.string().min(3, t("auth.validation.usernameMin")),
        password: z.string().min(6, t("auth.validation.passwordMin", { count: 6 })),
      }),
    [t]
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const saveAuthAndRedirect = async (payload: AuthResponse) => {
    dispatch(loginSuccess(payload));
    navigate(getDashboardPathByPermissions(payload.user.permissions));
    toast.success(t("auth.login.success"));
  };

  const onSubmit = async (values: LoginFormValues) => {
    let response: LoginResponse;

    try {
      response = await loginUser({
        username: values.username,
        password: values.password,
      }).unwrap();
    } catch (error) {
      const apiError = error as ApiError;
      toast.error(apiError?.data?.message || t("auth.login.error"));
      return;
    }

    await saveAuthAndRedirect(getAuthPayload(response));
  };

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
          <Heading size="lg">{t("auth.login.title")}</Heading>
          <Text color="var(--apple-muted)" mt={2}>
            {t("auth.login.description")}
          </Text>
        </Box>

        <VStack as="form" onSubmit={handleSubmit(onSubmit)} align="stretch" gap={4}>
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
          <Button type="submit" isLoading={isLoading} loadingText={t("auth.login.loading")}>
            {t("auth.login.submit")}
          </Button>
        </VStack>
      </VStack>
    </Box>
  );
}
