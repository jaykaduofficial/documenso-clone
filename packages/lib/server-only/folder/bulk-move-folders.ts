import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { prisma } from '@documenso/prisma';

import { buildTeamWhereQuery } from '../../utils/teams';
import { getTeamById } from '../team/get-team';

export type BulkMoveFoldersOptions = {
  userId: number;
  teamId: number;
  folderIds: string[];
  parentId?: string | null;
};

export const bulkMoveFolders = async ({ userId, teamId, folderIds, parentId }: BulkMoveFoldersOptions) => {
  const _team = await getTeamById({ userId, teamId });

  if (parentId) {
    const parentFolder = await prisma.folder.findFirst({
      where: {
        id: parentId,
        team: buildTeamWhereQuery({ teamId, userId }),
      },
    });

    if (!parentFolder) {
      throw new AppError(AppErrorCode.NOT_FOUND, {
        message: 'Parent folder not found',
      });
    }

    if (folderIds.includes(parentId)) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, {
        message: 'Cannot move a folder into itself',
      });
    }

    let currentParentId = parentFolder.parentId;

    while (currentParentId) {
      if (folderIds.includes(currentParentId)) {
        throw new AppError(AppErrorCode.INVALID_REQUEST, {
          message: 'Cannot move a folder into its descendant',
        });
      }

      const currentParent = await prisma.folder.findUnique({
        where: {
          id: currentParentId,
        },
        select: {
          parentId: true,
        },
      });

      if (!currentParent) {
        break;
      }

      currentParentId = parentFolder.parentId;
    }
  }

  const folders = await prisma.folder.findMany({
    where: {
      id: {
        in: folderIds,
      },
    },
  });

  if (folders.length !== folderIds.length) {
    throw new AppError(AppErrorCode.NOT_FOUND, {
      message: 'One or more folders not found',
    });
  }

  const result = await prisma.folder.updateMany({
    where: {
      id: {
        in: folderIds,
      },
    },
    data: {
      parentId,
    },
  });

  return {
    movedCount: result.count,
  };
};
