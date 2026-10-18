import { OAuthProvider } from "@prisma/client";
import { prisma } from "../config/database";
import { AppError } from "../utils/errors";
import { hashPassword } from "../utils/password";

export type SocialProfile = {
  provider: OAuthProvider;
  providerId: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
};

/**
 * Stub OAuth verification. In production, verify idToken with Google/Apple SDKs.
 */
export const verifySocialToken = async (
  provider: OAuthProvider,
  idToken: string,
  profile?: Partial<SocialProfile>
): Promise<SocialProfile> => {
  if (!idToken.trim()) {
    throw new AppError(400, "Token social requerido");
  }

  if (process.env.NODE_ENV === "production" && !profile?.email) {
    throw new AppError(
      501,
      "Verificación OAuth en producción pendiente de configurar"
    );
  }

  const email =
    profile?.email ?? `${provider.toLowerCase()}_${idToken.slice(0, 8)}@social.local`;
  const firstName = profile?.firstName ?? "Usuario";
  const lastName = profile?.lastName ?? provider;
  const username =
    profile?.username ??
    `${provider.toLowerCase()}_${idToken.slice(0, 12)}`.replace(/[^a-z0-9_]/gi, "_");

  return {
    provider,
    providerId: profile?.providerId ?? idToken,
    email,
    firstName,
    lastName,
    username,
  };
};

export const findOrCreateSocialUser = async (
  profile: SocialProfile
) => {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { oauthProvider: profile.provider, oauthId: profile.providerId },
        { email: profile.email },
      ],
    },
  });

  if (existing) {
    if (!existing.oauthProvider) {
      return prisma.user.update({
        where: { id: existing.id },
        data: {
          oauthProvider: profile.provider,
          oauthId: profile.providerId,
          emailVerified: true,
        },
      });
    }
    return existing;
  }

  let username = profile.username;
  let suffix = 1;
  while (await prisma.user.findUnique({ where: { username } })) {
    username = `${profile.username}_${suffix++}`;
  }

  return prisma.user.create({
    data: {
      username,
      firstName: profile.firstName,
      lastName: profile.lastName,
      name: `${profile.firstName} ${profile.lastName}`.trim(),
      email: profile.email,
      emailVerified: true,
      oauthProvider: profile.provider,
      oauthId: profile.providerId,
      password: await hashPassword(randomPassword()),
    },
  });
};

const randomPassword = (): string =>
  `oauth_${Math.random().toString(36).slice(2)}_${Date.now()}`;
