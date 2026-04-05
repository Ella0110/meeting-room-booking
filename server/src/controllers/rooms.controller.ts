import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'

export async function listRooms(_req: Request, res: Response, next: NextFunction) {
  try {
    const rooms = await prisma.room.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })
    res.json(rooms)
  } catch (err) { next(err) }
}
