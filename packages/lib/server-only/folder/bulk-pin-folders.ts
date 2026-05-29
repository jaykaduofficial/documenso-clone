import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { prisma } from '@documenso/prisma';

import { buildTeamWhereQuery } from '../../utils/teams';
import { getTeamById } from '../team/get-team';

export type BulkPinFoldersOptions = {
  userId: number;
  teamId: number;
  folderIds: string[];
  pinned: boolean;
};

export const bulkPinFolders = async ({ userId, teamId, folderIds, pinned }: BulkPinFoldersOptions) => {
  await getTeamById({ userId, teamId });

  const results = [];

  for (const folderId of folderIds) {
    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        team: buildTeamWhereQuery({ teamId, userId }),
      },
    });

    if (!folder) {
      throw new AppError(AppErrorCode.NOT_FOUND, {
        message: `Folder ${folderId} not found`,
      });
    }

    const updated = await prisma.folder.update({
      where: {
        id: folderId,
      },
      data: {
        pinned,
      },
    });

    results.push(updated);
  }

  return {
    pinnedCount: results.length,
  };
};
