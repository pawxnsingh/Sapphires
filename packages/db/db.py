from prisma import Prisma
prisma = Prisma()

async def connectDB()->None:
    await prisma.connect()
    print("prisma connected successfully")

async def disconnectDB()->None:
    await prisma.disconnect()
    print("prisma disconnect successfully")


