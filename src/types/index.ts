import { Role } from "@/utils/constants";

export type FrontendUser = {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: Role;
};
