import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, initials } from "@/lib/utils";
import type { User } from "@/lib/types";

export function UserAvatar({
  user,
  className,
}: {
  user: Pick<User, "username" | "avatar_url" | "full_name">;
  className?: string;
}) {
  return (
    <Avatar className={cn(className)}>
      {user.avatar_url ? <AvatarImage src={user.avatar_url} alt={user.username} /> : null}
      <AvatarFallback>{initials(user.full_name ?? user.username)}</AvatarFallback>
    </Avatar>
  );
}
