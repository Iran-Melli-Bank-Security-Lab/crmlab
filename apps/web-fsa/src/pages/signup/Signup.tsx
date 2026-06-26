import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Box, Heading, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import { loginSuccess } from "@/features/auth/model/authSlice";
import { useRegisterUserMutation } from "@/features/auth/api/authApi";
import { useUploadFileMutation } from "@/shared/api/uploadApi";
import { getDashboardPathByPermissions } from "@/shared/lib/dashboard";
import Input from "@/shared/ui/primitives/Input";
import Button from "@/shared/ui/primitives/Button";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const signupSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  avatar: z
    .any()
    .refine((files) => files?.length === 1, "Avatar image is required")
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, "Max image size is 2MB")
    .refine(
      (files) => ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
      "Only JPG, PNG, or WEBP images are allowed"
    ),
});

type SignupFormValues = {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  avatar: any;
};

export default function Signup() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [uploadFile, { isLoading: isUploading }] = useUploadFileMutation();
  const [registerUser, { isLoading: isRegistering }] = useRegisterUserMutation();

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
      toast.success("Account created successfully");
      navigate(getDashboardPathByPermissions(response.user.permissions));
    } catch (error: any) {
      toast.error(error?.data?.message || "Signup failed");
    }
  };

  const isLoading = isUploading || isRegistering;

  return (
    <Box
      bg="rgba(255, 255, 255, 0.92)"
      border="1px solid"
      borderColor="rgba(0, 0, 0, 0.12)"
      borderRadius="md"
      boxShadow="0 1px 2px rgba(0, 0, 0, 0.04), 0 10px 28px rgba(0, 0, 0, 0.06)"
      p={{ base: 6, md: 8 }}
    >
      <VStack align="stretch" gap={6}>
        <Box>
          <Heading size="lg">Create Account</Heading>
          <Text color="#6e6e73" mt={2}>
            Create your profile with a username and avatar.
          </Text>
        </Box>

        <VStack as="form" onSubmit={handleSubmit(onSubmit)} align="stretch" gap={4}>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            <Input
              label="First Name"
              autoComplete="given-name"
              {...register("firstName")}
              error={errors.firstName?.message}
            />
            <Input
              label="Last Name"
              autoComplete="family-name"
              {...register("lastName")}
              error={errors.lastName?.message}
            />
          </SimpleGrid>
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
          <Input
            label="Avatar Image"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            {...register("avatar")}
            error={errors.avatar?.message as string | undefined}
          />

          <Button type="submit" isLoading={isLoading} loadingText="Creating account...">
            Signup
          </Button>
        </VStack>
      </VStack>
    </Box>
  );
}
