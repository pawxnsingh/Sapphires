import asyncio
from db import connectDB, disconnectDB, prisma


async def test() -> None:
    await connectDB()
    await disconnectDB()


if __name__ == "__main__":
    asyncio.run(test())
