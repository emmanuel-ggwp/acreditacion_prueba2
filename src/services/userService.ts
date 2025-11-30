
import User from "@/models/User";

export class UserService {
    async getUserById(userId: string) {
        const user = await User.findByPk(userId, {
            attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive']
        });
        return user;
    }
}

export const userService = new UserService();
