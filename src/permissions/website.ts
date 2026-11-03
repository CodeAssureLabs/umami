import { hasPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/constants';
import { getEntity } from '@/lib/entity';
import prisma from '@/lib/prisma';
import type { Auth } from '@/lib/types';
import { getTeamUser, getWebsite } from '@/queries/prisma';

function hasShareAccess(shareToken: Auth['shareToken'], websiteId: string) {
  return (
    shareToken?.websiteId === websiteId ||
    shareToken?.pixelId === websiteId ||
    shareToken?.linkId === websiteId ||
    shareToken?.websiteIds?.includes(websiteId) ||
    shareToken?.pixelIds?.includes(websiteId) ||
    shareToken?.linkIds?.includes(websiteId)
  );
}

function getShareAllowedIds(shareToken: Auth['shareToken']) {
  return new Set(
    [
      shareToken?.websiteId,
      shareToken?.pixelId,
      shareToken?.linkId,
      ...(shareToken?.websiteIds ?? []),
      ...(shareToken?.pixelIds ?? []),
      ...(shareToken?.linkIds ?? []),
    ].filter((id): id is string => Boolean(id)),
  );
}

function isOwner(user: NonNullable<Auth['user']>, entity: { userId?: string | null }) {
  return user.id === entity.userId;
}

async function isTeamMember(user: NonNullable<Auth['user']>, teamId: string) {
  const teamUser = await getTeamUser(teamId, user.id);

  return !!teamUser;
}

async function getMemberTeamIds(userId: string, teamIds: string[]) {
  if (!teamIds.length) {
    return new Set<string>();
  }

  const teamUsers = await prisma.client.teamUser.findMany({
    where: {
      userId,
      teamId: {
        in: teamIds,
      },
      team: { deletedAt: null },
    },
    select: {
      teamId: true,
    },
  });

  return new Set(teamUsers.map(teamUser => teamUser.teamId));
}

export async function canViewWebsite({ user, shareToken }: Auth, websiteId: string) {
  if (user?.isAdmin) {
    return true;
  }

  if (hasShareAccess(shareToken, websiteId)) {
    return true;
  }

  const entity = await getEntity(websiteId);

  if (!entity || !user) {
    return false;
  }

  if (entity.userId) {
    return isOwner(user, entity);
  }

  if (entity.teamId) {
    return isTeamMember(user, entity.teamId);
  }

  return false;
}

export async function canViewBatchWebsites({ user, shareToken }: Auth, websiteIds: string[]) {
  if (!websiteIds.length) {
    return [];
  }

  const requestedIds = Array.from(new Set(websiteIds));

  if (user?.isAdmin) {
    return requestedIds;
  }

  const shareAllowedIds = getShareAllowedIds(shareToken);

  if (!user) {
    return requestedIds.filter(id => shareAllowedIds.has(id));
  }

  const websites = await prisma.client.website.findMany({
    where: {
      id: {
        in: requestedIds,
      },
    },
    select: {
      id: true,
      userId: true,
      teamId: true,
    },
  });

  const ownedIds = new Set(
    websites.filter(website => website.userId === user.id).map(website => website.id),
  );
  const teamIds = Array.from(
    new Set(
      websites.map(website => website.teamId).filter((teamId): teamId is string => Boolean(teamId)),
    ),
  );
  const allowedTeamIds = await getMemberTeamIds(user.id, teamIds);
  const teamOwnedIds = new Set(
    websites
      .filter(website => website.teamId && allowedTeamIds.has(website.teamId))
      .map(website => website.id),
  );

  return requestedIds.filter(
    id => shareAllowedIds.has(id) || ownedIds.has(id) || teamOwnedIds.has(id),
  );
}

export async function canViewAllWebsites({ user }: Auth) {
  return user?.isAdmin ?? false;
}

export async function canCreateWebsite({ user }: Auth) {
  if (!user) {
    return false;
  }

  if (user.isAdmin) {
    return true;
  }

  return hasPermission(user.role, PERMISSIONS.websiteCreate);
}

export async function canUpdateWebsite({ user }: Auth, websiteId: string) {
  if (!user) {
    return false;
  }

  if (user.isAdmin) {
    return true;
  }

  const website = await getWebsite(websiteId);

  if (!website) {
    return false;
  }

  if (website.userId) {
    return user.id === website.userId;
  }

  if (website.teamId) {
    const teamUser = await getTeamUser(website.teamId, user.id);

    return teamUser && hasPermission(teamUser.role, PERMISSIONS.websiteUpdate);
  }

  return false;
}

export async function canDeleteWebsite({ user }: Auth, websiteId: string) {
  if (!user) {
    return false;
  }

  if (user.isAdmin) {
    return true;
  }

  const website = await getWebsite(websiteId);

  if (!website) {
    return false;
  }

  if (website.userId) {
    return user.id === website.userId;
  }

  if (website.teamId) {
    const teamUser = await getTeamUser(website.teamId, user.id);

    return teamUser && hasPermission(teamUser.role, PERMISSIONS.websiteDelete);
  }

  return false;
}

export async function canTransferWebsiteToUser({ user }: Auth, websiteId: string, userId: string) {
  if (!user) {
    return false;
  }

  if (user.isAdmin) {
    return true;
  }

  const website = await getWebsite(websiteId);

  if (!website) {
    return false;
  }

  if (website.teamId && user.id === userId) {
    const teamUser = await getTeamUser(website.teamId, userId);

    return teamUser && hasPermission(teamUser.role, PERMISSIONS.websiteTransferToUser);
  }

  return false;
}

export async function canTransferWebsiteToTeam({ user }: Auth, websiteId: string, teamId: string) {
  if (!user) {
    return false;
  }

  if (user.isAdmin) {
    return true;
  }

  const website = await getWebsite(websiteId);

  if (!website) {
    return false;
  }

  if (website.userId && website.userId === user.id) {
    const teamUser = await getTeamUser(teamId, user.id);

    return teamUser && hasPermission(teamUser.role, PERMISSIONS.websiteTransferToTeam);
  }

  return false;
}
