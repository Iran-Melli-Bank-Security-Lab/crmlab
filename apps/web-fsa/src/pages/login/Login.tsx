import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Box, Heading, Text, VStack } from "@chakra-ui/react";
import { loginSuccess } from "@/features/auth/model/authSlice";
import { useLoginUserMutation } from "@/features/auth/api/authApi";
import { getDashboardPathByPermissions } from "@/shared/lib/dashboard";
import Button from "@/shared/ui/primitives/Button";
import Input from "@/shared/ui/primitives/Input";
import type { ApiError, AuthResponse } from "@/shared/types";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = { username: string; password: string };
type LoginResponse = AuthResponse | { data?: AuthResponse };

const getAuthPayload = (response: LoginResponse): AuthResponse => {
  if ("user" in response && response.user) return response;
  if ("data" in response && response.data?.user) return response.data;
  throw new Error("Login response did not include a user");
};

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loginUser, { isLoading }] = useLoginUserMutation();

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
    toast.success("Login successful");
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
      toast.error(apiError?.data?.message || "Login failed");
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
          <Heading size="lg">Login</Heading>
          <Text color="var(--apple-muted)" mt={2}>
            Sign in with your username and password.
          </Text>
        </Box>

        <VStack as="form" onSubmit={handleSubmit(onSubmit)} align="stretch" gap={4}>
          <Input
            label="Username"
            autoComplete="username"
            {...register("username")}
            error={errors.username?.message}
          />
          <Input
            label="Password"
            type="password"
            {...register("password")}
            error={errors.password?.message}
          />
          <Button type="submit" isLoading={isLoading} loadingText="Logging in...">
            Login
          </Button>
        </VStack>
      </VStack>
    </Box>
  );
}
