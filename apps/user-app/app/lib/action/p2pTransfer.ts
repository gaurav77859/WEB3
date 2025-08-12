"use server"
import { getServerSession } from "next-auth";
import { authOptions } from "../auth";
import prisma from "@repo/db/client";
// in that to means that phone number
export async function p2pTransfer(to: string, amount: number) {
    const session = await getServerSession(authOptions);
    const from = session?.user?.id;
    if (!from) {
        return {
            message: "Error while sending"
        }
    }
    const toUser = await prisma.user.findFirst({
        where: {
            number: to
        }
    });

    if (!toUser) {
        return {
            message: "User not found"
        }
    }
/*Prisma starts a database transaction and gives you a special Prisma transaction client (tx).
tx works exactly like your usual prisma client (prisma.user.findMany, prisma.balance.update, etc.).
The difference: all queries you run through tx are part of the same database transaction.
If any query inside throws an error, Prisma automatically rolls back all previous queries in that transaction.*/
    await prisma.$transaction(async (tx) => {
       await tx.$queryRaw`
    SELECT * 
    FROM "Balance" 
    WHERE "userId" = ${Number(from)} 
    FOR UPDATE
  `;

        /// check that how much balence that user hava
        // if it is sufficent then of good to go 
        const fromBalance = await tx.balance.findUnique({
            where: { userId: Number(from) },
          });
          if (!fromBalance || fromBalance.amount < amount) {
            throw new Error('Insufficient funds');
          }

          await tx.balance.update({
            where: { userId: Number(from) },
            data: { amount: { decrement: amount } },
          });

          await tx.balance.update({
            where: { userId: toUser.id },
            data: { amount: { increment: amount } },
          });
    });
}