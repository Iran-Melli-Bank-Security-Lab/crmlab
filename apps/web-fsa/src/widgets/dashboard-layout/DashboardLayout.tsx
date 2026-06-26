import { Outlet } from "react-router-dom";
import { Box, Flex } from "@chakra-ui/react";
import AuthSessionSync from "@/features/auth/ui/AuthSessionSync";
import Sidebar from "@/widgets/sidebar/ui/Sidebar";
import Navbar from "@/widgets/navbar/ui/Navbar";
import { SocketProvider } from "@/shared/realtime/SocketProvider";

export default function DashboardLayout() {
  return (
    <Flex minH="100vh" direction={{ base: "column", md: "row" }} bg="var(--apple-bg)">
      <AuthSessionSync />
      <SocketProvider>
        <Sidebar />
        <Box flex="1" minW={0}>
          <Navbar />
          <Box
            as="main"
            p={{ base: 4, md: 7 }}
            maxW="1680px"
            mx="auto"
            w="full"
          >
            <Outlet />
          </Box>
        </Box>
      </SocketProvider>
    </Flex>
  );
}
