
import { User } from "@/models";

export class UserService {
    async getUserById(userId: string) {
        const user = await User.findByPk(userId, {
            attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive']
        });
        return user;
    }
}

export const userService = new UserService();
